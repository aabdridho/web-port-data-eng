/**
 * Dijalankan otomatis sebelum `astro build` (prebuild) — code.md §5.
 *
 *  - GITHUB_TOKEN + GITHUB_USERNAME ada  → tarik data asli dari GitHub
 *  - GitHub gagal total                  → pakai cache build sebelumnya
 *  - tidak ada token (dev lokal)         → pakai contoh di /examples (ditandai "sample")
 */
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGitHub, loadProject } from '../src/lib/github';
import type { ContributionWeek, Project, SiteData } from '../src/lib/schema';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src/data/projects.json');
// Vercel menyimpan node_modules/.cache di antara build → dipakai sebagai cache fallback.
const CACHE = path.join(ROOT, 'node_modules/.cache/portfolio/projects.json');

const log = (msg: string) => console.log(`[fetch-github] ${msg}`);
const warn = (msg: string) => console.warn(`[fetch-github] ⚠ ${msg}`);

async function main() {
  const token = process.env.GITHUB_TOKEN?.trim();
  const user = process.env.GITHUB_USERNAME?.trim();
  const topic = process.env.GITHUB_TOPIC?.trim() || 'portfolio';

  let data: SiteData;
  if (!token || !user) {
    log('GITHUB_TOKEN/GITHUB_USERNAME belum di-set → memakai data contoh dari /examples');
    data = await loadSamples();
  } else {
    try {
      data = await loadFromGitHub(token, user, topic);
      await writeJson(CACHE, data);
    } catch (e) {
      warn(`Gagal menarik data GitHub: ${(e as Error).message}`);
      const cached = await readJson<SiteData>(CACHE);
      if (!cached) {
        throw new Error('GitHub tidak bisa diakses dan belum ada cache build sebelumnya. Build dihentikan.', {
          cause: e,
        });
      }
      log(`Memakai cache dari ${cached.lastSyncedAt}`);
      data = { ...cached, source: 'cache' };
    }
  }

  await writeJson(OUT, data);
  log(`Selesai: ${data.projects.length} project (${data.source}) → src/data/projects.json`);
}

async function loadFromGitHub(token: string, user: string, topic: string): Promise<SiteData> {
  const gh = createGitHub({ token });
  const repos = await gh.listPortfolioRepos(user, topic);
  log(`${repos.length} repo ber-topic "${topic}" ditemukan`);

  const projects: Project[] = [];
  for (const r of repos) {
    const { project, errors } = await loadProject(gh, user, r.name, r.html_url, r.pushed_at);
    errors.forEach(warn); // repo bermasalah dilewati, build tetap jalan
    if (project) projects.push(project);
  }
  ensureUniqueSlugs(projects);

  let contributions: ContributionWeek[];
  try {
    contributions = await gh.contributions(user);
  } catch (e) {
    warn(`Heatmap kontribusi dilewati: ${(e as Error).message}`);
    contributions = sampleContributions();
  }

  return { lastSyncedAt: new Date().toISOString(), source: 'github', projects: sortProjects(projects), contributions };
}

/** Membaca /examples/<repo>/portfolio dengan interface yang sama seperti GitHub. */
async function loadSamples(): Promise<SiteData> {
  const base = path.join(ROOT, 'examples');
  const local = {
    async listDir(_o: string, repo: string, dir: string) {
      const full = path.join(base, repo, dir);
      const names = await readdir(full);
      return Promise.all(
        names.map(async (name) => ({
          name,
          path: `${dir}/${name}`,
          type: (await stat(path.join(full, name))).isDirectory() ? ('dir' as const) : ('file' as const),
        })),
      );
    },
    raw: (_o: string, repo: string, file: string) => readFile(path.join(base, repo, file), 'utf8'),
  };

  const projects: Project[] = [];
  for (const repo of (await readdir(base)).filter((n) => !n.startsWith('_'))) {
    const { project, errors } = await loadProject(
      local,
      '[username]',
      repo,
      `https://github.com/[username]/${repo}`,
      new Date().toISOString(),
    );
    errors.forEach(warn);
    if (project) projects.push(project);
  }
  return {
    lastSyncedAt: new Date().toISOString(),
    source: 'sample',
    projects: sortProjects(projects),
    contributions: sampleContributions(),
  };
}

function sortProjects(p: Project[]) {
  return p.filter((x) => x.featured).sort((a, b) => a.order - b.order || b.year - a.year);
}

function ensureUniqueSlugs(projects: Project[]) {
  const seen = new Set<string>();
  for (const p of projects) {
    if (seen.has(p.slug)) throw new Error(`Slug duplikat: "${p.slug}" (repo ${p.repo})`);
    seen.add(p.slug);
  }
}

/** Pola tetap (bukan acak) agar build deterministik. */
function sampleContributions(): ContributionWeek[] {
  const seq = [0, 1, 2, 0, 3, 1, 4, 2, 0, 1, 3, 2, 1, 0, 2, 4, 1, 3, 0, 2, 4, 1, 2, 3];
  return Array.from({ length: 12 }, (_, w) => ({
    days: Array.from({ length: 7 }, (_, d) => seq[(w * 7 + d * 5) % seq.length]!),
  }));
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T;
  } catch {
    return null;
  }
}

async function writeJson(file: string, data: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 2) + '\n');
}

main().catch((e) => {
  console.error(`[fetch-github] ✖ ${(e as Error).message}`);
  process.exit(1);
});
