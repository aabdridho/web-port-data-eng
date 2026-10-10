import { describe, expect, it } from 'vitest';
import { createGitHub, loadProject, renderReadme } from '../src/lib/github';

const meta = JSON.stringify({ slug: 'p1', name: 'P1', kind: 'ETL', year: 2026, stack: ['dbt'], summary: 'S' });
const chart = JSON.stringify({
  id: 'c1',
  type: 'bar',
  title: 'C1',
  source: { table: 't' },
  series: [{ name: 'A', data: [{ label: 'x', value: 1 }] }],
});

function fakeRepo(files: Record<string, string>) {
  return {
    async listDir(_o: string, _r: string, dir: string) {
      const entries = Object.keys(files).filter((f) => f.startsWith(dir + '/'));
      if (!entries.length) throw new Error('404');
      return entries.map((p) => ({ name: p.split('/').pop()!, path: p, type: 'file' as const }));
    },
    async raw(_o: string, _r: string, path: string) {
      if (!(path in files)) throw new Error('404');
      return files[path]!;
    },
  };
}

describe('loadProject', () => {
  it('memuat project valid', async () => {
    const gh = fakeRepo({
      'portfolio/meta.json': meta,
      'portfolio/charts/a.json': chart,
      'portfolio/README.md': '# Hi',
    });
    const { project, errors } = await loadProject(gh, 'me', 'repo', 'https://github.com/me/repo', '2026-01-01');
    expect(errors).toEqual([]);
    expect(project?.charts).toHaveLength(1);
    expect(project?.readmeHtml).toContain('<h2>Hi</h2>'); // heading diturunkan satu tingkat
  });

  it('melewati chart invalid tapi tetap memuat yang valid', async () => {
    const gh = fakeRepo({
      'portfolio/meta.json': meta,
      'portfolio/charts/a.json': chart,
      'portfolio/charts/b.json': '{"id":"b","type":"nope"}',
    });
    const { project, errors } = await loadProject(gh, 'me', 'repo', '', '');
    expect(project?.charts).toHaveLength(1);
    expect(errors.some((e) => e.includes('b.json'))).toBe(true);
  });

  it('melewati project tanpa chart valid (tidak throw)', async () => {
    const gh = fakeRepo({ 'portfolio/meta.json': meta });
    const { project, errors } = await loadProject(gh, 'me', 'repo', '', '');
    expect(project).toBeUndefined();
    expect(errors.length).toBeGreaterThan(0);
  });

  it('melaporkan meta.json invalid', async () => {
    const gh = fakeRepo({ 'portfolio/meta.json': '{"slug":"BAD SLUG"}' });
    const { project, errors } = await loadProject(gh, 'me', 'repo', '', '');
    expect(project).toBeUndefined();
    expect(errors[0]).toContain('meta.json');
  });
});

describe('renderReadme (sanitasi)', () => {
  it('membuang script, event handler dan javascript: URL', async () => {
    const html = await renderReadme(
      '<script>alert(1)</script>\n\n<img src="x" onerror="alert(1)">\n\n[x](javascript:alert(1))',
      'me',
      'repo',
    );
    expect(html).not.toMatch(/<script|onerror|javascript:/i);
  });
  it('mengarahkan gambar relatif ke raw.githubusercontent milik owner', async () => {
    const html = await renderReadme('![d](./img/arch.png)', 'me', 'repo');
    expect(html).toContain('https://raw.githubusercontent.com/me/repo/HEAD/portfolio/img/arch.png');
  });
  it('membuang gambar dari host lain', async () => {
    const html = await renderReadme('![d](https://evil.example/x.png)', 'me', 'repo');
    expect(html).not.toContain('evil.example');
  });
  it('link eksternal mendapat rel noopener', async () => {
    const html = await renderReadme('[a](https://example.com)', 'me', 'repo');
    expect(html).toContain('rel="noopener noreferrer nofollow"');
  });
});

describe('createGitHub', () => {
  it('memfilter repo berdasarkan topic, tanpa fork/archived', async () => {
    const fetchImpl = (async () =>
      new Response(
        JSON.stringify([
          { name: 'a', topics: ['portfolio'], archived: false, fork: false },
          { name: 'b', topics: ['other'], archived: false, fork: false },
          { name: 'c', topics: ['portfolio'], archived: true, fork: false },
          { name: 'd', topics: ['portfolio'], archived: false, fork: true },
        ]),
      )) as unknown as typeof fetch;
    const gh = createGitHub({ token: 't', fetchImpl });
    const repos = await gh.listPortfolioRepos('me', 'portfolio');
    expect(repos.map((r) => r.name)).toEqual(['a']);
  });

  it('mengirim token hanya di header Authorization', async () => {
    let seen: Headers | undefined;
    const fetchImpl = (async (_u: string, init?: RequestInit) => {
      seen = new Headers(init?.headers);
      return new Response('[]');
    }) as unknown as typeof fetch;
    await createGitHub({ token: 'secret', fetchImpl }).listPortfolioRepos('me', 'portfolio');
    expect(seen?.get('authorization')).toBe('Bearer secret');
  });
});
