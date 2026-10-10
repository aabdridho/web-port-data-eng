import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { chartSchema, metaSchema, type Chart, type ContributionWeek, type Project } from './schema';

/**
 * Klien GitHub untuk build time (code.md §5). Tidak pernah dijalankan di browser.
 * `fetchImpl` bisa diganti di tes.
 */
export interface GitHubOptions {
  token?: string;
  fetchImpl?: typeof fetch;
  apiBase?: string;
}

const MAX_FILE_BYTES = 200 * 1024;
const MAX_CHARTS = 4;

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'GitHubError';
  }
}

export function createGitHub({ token, fetchImpl = fetch, apiBase = 'https://api.github.com' }: GitHubOptions = {}) {
  const headers = (accept = 'application/vnd.github+json'): Record<string, string> => ({
    Accept: accept,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'web-port-data-eng-build',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  async function request(path: string, accept?: string): Promise<Response> {
    const res = await fetchImpl(`${apiBase}${path}`, { headers: headers(accept) });
    if (!res.ok) throw new GitHubError(`GitHub ${res.status} on ${path}`, res.status);
    return res;
  }

  async function json<T>(path: string): Promise<T> {
    return (await request(path)).json() as Promise<T>;
  }

  async function raw(owner: string, repo: string, filePath: string): Promise<string> {
    const res = await request(`/repos/${owner}/${repo}/contents/${filePath}`, 'application/vnd.github.raw+json');
    const text = await res.text();
    if (new TextEncoder().encode(text).length > MAX_FILE_BYTES) {
      throw new GitHubError(`${filePath} melebihi 200 KB`);
    }
    return text;
  }

  return {
    async listPortfolioRepos(user: string, topic: string) {
      type Repo = {
        name: string;
        html_url: string;
        topics?: string[];
        archived: boolean;
        fork: boolean;
        pushed_at: string;
      };
      const repos = await json<Repo[]>(`/users/${encodeURIComponent(user)}/repos?per_page=100&type=owner&sort=pushed`);
      return repos.filter((r) => !r.archived && !r.fork && (r.topics ?? []).includes(topic));
    },

    async listDir(owner: string, repo: string, dir: string) {
      type Entry = { name: string; path: string; type: 'file' | 'dir' };
      return json<Entry[]>(`/repos/${owner}/${repo}/contents/${dir}`);
    },

    raw,

    /** GraphQL butuh token. Mengembalikan 12 minggu terakhir, level 0..4. */
    async contributions(user: string, weeks = 12): Promise<ContributionWeek[]> {
      if (!token) throw new GitHubError('GraphQL contributions membutuhkan GITHUB_TOKEN');
      const query = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{weeks{contributionDays{contributionLevel}}}}}}`;
      const res = await fetchImpl(`${apiBase}/graphql`, {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { login: user } }),
      });
      if (!res.ok) throw new GitHubError(`GitHub GraphQL ${res.status}`, res.status);
      const body = (await res.json()) as {
        data?: {
          user?: {
            contributionsCollection: {
              contributionCalendar: { weeks: { contributionDays: { contributionLevel: string }[] }[] };
            };
          };
        };
      };
      const all = body.data?.user?.contributionsCollection.contributionCalendar.weeks ?? [];
      return all.slice(-weeks).map((w) => ({ days: w.contributionDays.map((d) => LEVEL[d.contributionLevel] ?? 0) }));
    },
  };
}

const LEVEL: Record<string, number> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

export type GitHub = ReturnType<typeof createGitHub>;

export interface LoadResult {
  project?: Project;
  errors: string[];
}

/** Membaca folder portfolio/ satu repo dan memvalidasinya. Tidak pernah throw — error dikumpulkan. */
export async function loadProject(
  gh: Pick<GitHub, 'listDir' | 'raw'>,
  owner: string,
  repo: string,
  repoUrl: string,
  updatedAt: string,
): Promise<LoadResult> {
  const errors: string[] = [];
  const where = `${owner}/${repo}`;
  try {
    const meta = metaSchema.safeParse(JSON.parse(await gh.raw(owner, repo, 'portfolio/meta.json')));
    if (!meta.success) return { errors: [`${where} meta.json: ${formatIssues(meta.error.issues)}`] };

    let chartFiles: string[] = [];
    try {
      chartFiles = (await gh.listDir(owner, repo, 'portfolio/charts'))
        .filter((e) => e.type === 'file' && e.name.endsWith('.json'))
        .map((e) => e.path)
        .sort()
        .slice(0, MAX_CHARTS);
    } catch {
      errors.push(`${where}: folder portfolio/charts tidak ditemukan`);
    }

    const charts: Chart[] = [];
    for (const file of chartFiles) {
      try {
        const parsed = chartSchema.safeParse(JSON.parse(await gh.raw(owner, repo, file)));
        if (parsed.success) charts.push(parsed.data);
        else errors.push(`${where} ${file}: ${formatIssues(parsed.error.issues)}`);
      } catch (e) {
        errors.push(`${where} ${file}: ${(e as Error).message}`);
      }
    }
    if (charts.length === 0) return { errors: [...errors, `${where}: tidak ada chart valid, project dilewati`] };

    let readmeHtml = '';
    try {
      readmeHtml = await renderReadme(await gh.raw(owner, repo, 'portfolio/README.md'), owner, repo);
    } catch {
      errors.push(`${where}: portfolio/README.md tidak ada (case study kosong)`);
    }

    return {
      project: { ...meta.data, repo, repoUrl, charts, readmeHtml, updatedAt },
      errors,
    };
  } catch (e) {
    return { errors: [`${where}: ${(e as Error).message}`] };
  }
}

function formatIssues(issues: { path: PropertyKey[]; message: string }[]) {
  return issues.map((i) => `${i.path.join('.') || '(root)'} ${i.message}`).join('; ');
}

/**
 * Markdown → HTML tersanitasi (security.md §4).
 * Gambar relatif diarahkan ke raw.githubusercontent.com milik owner; host lain dibuang.
 */
export async function renderReadme(md: string, owner: string, repo: string): Promise<string> {
  const html = await marked.parse(md, { gfm: true, async: true });
  const rawBase = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/portfolio/`;
  const allowedImg = `https://raw.githubusercontent.com/${owner}/`;

  return sanitizeHtml(html, {
    allowedTags: [
      'h1',
      'h2',
      'h3',
      'h4',
      'p',
      'a',
      'ul',
      'ol',
      'li',
      'strong',
      'em',
      'del',
      'blockquote',
      'code',
      'pre',
      'hr',
      'br',
      'img',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'rel', 'target'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      th: ['align'],
      td: ['align'],
    },
    allowedSchemes: ['https', 'mailto'],
    allowedSchemesByTag: { img: ['https'] },
    allowProtocolRelative: false,
    transformTags: {
      // Halaman sudah punya <h1>; turunkan satu tingkat agar struktur heading tetap benar.
      h1: 'h2',
      h2: 'h3',
      h3: 'h4',
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, rel: 'noopener noreferrer nofollow', target: '_blank' },
      }),
      img: (tagName, attribs) => {
        let src = attribs.src ?? '';
        if (src && !/^[a-z]+:/i.test(src) && !src.startsWith('//')) {
          src = new URL(src.replace(/^\.\//, ''), rawBase).href;
        }
        return { tagName, attribs: { ...attribs, src: src.startsWith(allowedImg) ? src : '', loading: 'lazy' } };
      },
    },
    exclusiveFilter: (frame) => frame.tag === 'img' && !frame.attribs.src,
  });
}
