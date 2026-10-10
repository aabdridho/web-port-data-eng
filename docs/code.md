# Code — Arsitektur & Cara Kerja

## 1. Tech Stack

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Framework | **Astro 7** + TypeScript | Statis & cepat, sama seperti referensi jestsee.com |
| Komponen interaktif | React 19 (Astro islands) | Hanya chart & form yang butuh JS |
| Styling | Tailwind CSS 4 + `tokens.css` | Token desain terpusat |
| Animasi | **Motion** (`motion/react`) | Animasi deklaratif, dukung reduced-motion |
| Chart | **D3** (`d3-scale`, `d3-shape`) + SVG milik sendiri | Kontrol penuh atas animasi tiap elemen |
| Validasi | Zod | Satu skema untuk data GitHub & form |
| Form backend | Astro API route (serverless) + **Resend** | Kirim email tanpa server sendiri |
| Anti-spam | Cloudflare Turnstile | Gratis, tanpa puzzle |
| Hosting | **Vercel** | Static + serverless function dalam satu tempat |
| CI/CD | GitHub Actions + Vercel Deploy Hook | Rebuild saat data berubah |

## 2. Alur Kerja Sistem

```
 Repo project (GitHub)                 Repo website
 ├─ pipeline code                      ├─ src/
 └─ portfolio/                         └─ .github/workflows/
    ├─ meta.json  ─┐
    ├─ charts/*.json│   (1) push ke main
    └─ README.md   ─┘          │
            │                  ▼
            │   (2) Action di repo project memanggil Deploy Hook Vercel
            ▼                  │
   GitHub API ◄─── (3) Vercel build: scripts/fetch-github.ts
                       ├─ cari repo ber-topic "portfolio"
                       ├─ ambil portfolio/* → validasi Zod
                       ├─ simpan ke src/data/projects.json (cache)
                       └─ ambil contribution heatmap (GraphQL)
                               │
                               ▼
                    (4) Astro render HTML statis + island chart
                               │
 Pengunjung ──► CDN Vercel ──► halaman (tanpa panggilan GitHub di browser)
      │
      └─ submit form ──► /api/contact ──► Turnstile verify ──► Resend ──► Inbox
```

**Poin penting:** browser pengunjung **tidak pernah** memanggil GitHub API. Semua data diambil saat build, sehingga token aman, tidak kena rate limit, dan halaman tetap cepat.

## 3. Struktur Folder

```
web-port-data-eng/
├─ src/
│  ├─ pages/
│  │  ├─ index.astro              # halaman utama
│  │  ├─ projects/[slug].astro    # case study
│  │  └─ api/contact.ts           # endpoint form (server)
│  ├─ components/
│  │  ├─ layout/ (Nav, Footer, Section)
│  │  ├─ bento/ (PipelineCard, LocationCard, HeatmapCard, StackCard)
│  │  ├─ projects/ (ProjectList, VizPanel)   # React island
│  │  ├─ charts/ (Bar, GroupedBar, Line, Area, Ring, Progress, Heatmap, Kpi, ChartFrame)
│  │  └─ contact/ContactForm.tsx              # React island
│  ├─ lib/
│  │  ├─ schema.ts         # skema Zod (meta, chart, form)
│  │  ├─ github.ts         # klien GitHub REST/GraphQL
│  │  └─ motion.ts         # preset animasi + reduced-motion
│  ├─ data/
│  │  ├─ site.config.ts    # nama, status, stack, services, sosial
│  │  └─ projects.json     # hasil fetch (di-generate, tidak di-commit)
│  └─ styles/tokens.css
├─ scripts/fetch-github.ts
├─ .github/workflows/ (ci.yml, scheduled-rebuild.yml)
└─ .env.example
```

## 4. Kontrak Data dari Repo Project

Setiap repo project yang ingin tampil **wajib** punya topic `portfolio` dan folder berikut:

```
portfolio/
├─ meta.json
├─ charts/
│  └─ <id>.json        # 1..4 chart
└─ README.md           # isi case study
```

### `meta.json`
```json
{
  "slug": "sales-etl-pipeline",
  "name": "[Nama Project]",
  "kind": "BATCH ETL",
  "year": 2026,
  "stack": ["Airflow", "dbt", "BigQuery"],
  "summary": "Satu kalimat masalah → solusi.",
  "order": 1,
  "featured": true
}
```

### `charts/<id>.json`
```json
{
  "id": "monthly-revenue",
  "type": "grouped-bar",
  "title": "Revenue per month",
  "source": { "table": "marts.fct_monthly", "path": "output/fct_monthly.csv" },
  "x": { "field": "month", "label": "Month" },
  "y": { "field": "value", "label": "IDR (juta)", "format": ",.0f" },
  "series": [
    { "name": "2026", "color": "accent", "data": [{ "month": "Jan", "value": 120 }] },
    { "name": "2025", "color": "neutral", "data": [{ "month": "Jan", "value": 98 }] }
  ],
  "updatedAt": "2026-10-01T00:00:00Z"
}
```

- `color` hanya boleh token (`accent`, `teal`, `sage`, `neutral`), bukan hex bebas, supaya palet tetap konsisten.
  Palet soft punya beda warna yang tipis, jadi untuk 2 seri pakai **`accent` + `neutral`** (beda terang jelas, lolos uji buta warna). Chart multi-seri selalu punya legenda + label langsung.
- Chart `kpi`: tiap titik boleh punya field `unit` (mis. `"rows"`, `"%"`).
- Batas: maks 500 titik data per chart, file ≤ 200 KB.
- File diproduksi oleh **pipeline project itu sendiri** (misalnya task terakhir di DAG Airflow menulis JSON ini), jadi website selalu menampilkan output asli.

## 5. Skrip Build: `scripts/fetch-github.ts`

1. `GET /users/{user}/repos?per_page=100` → filter `topics` berisi `portfolio`.
2. Untuk tiap repo: `GET /repos/{owner}/{repo}/contents/portfolio` → unduh `meta.json`, `charts/*.json`, `README.md`.
3. Validasi dengan Zod. Repo yang gagal validasi **dilewati + dicatat di log build** (build tidak gagal).
4. GraphQL `contributionsCollection` → 12 minggu terakhir untuk heatmap.
5. Tulis `src/data/projects.json` + `lastSyncedAt`.
6. Jika GitHub API error total → pakai `projects.json` dari cache build sebelumnya (Vercel build cache). Jika cache juga tidak ada → build gagal dengan pesan jelas.

## 6. Komponen Chart & Animasi

Semua chart dibungkus `ChartFrame` (judul, legenda, sumber data, link repo).

| Chart | Animasi (Motion) |
|---|---|
| Bar / Grouped bar | `scaleY 0→1`, origin bawah, stagger 60 ms |
| Line / Area | `pathLength 0→1` 1,8 s, area fade-in setelahnya, titik terakhir pop |
| Ring | `strokeDashoffset` dari penuh ke nilai, angka count-up |
| Progress | `scaleX 0→1`, stagger 150 ms |
| Heatmap | sel `scale 0→1` + fade, stagger 20 ms |
| KPI | angka count-up 1,2 s |
| Pipeline | paket bergerak `translateX` loop |

Aturan:
- Animasi dipicu `useInView({ once: true })`; saat ganti project, `key={slug}` memaksa remount agar animasi ulang.
- `useReducedMotion()` → semua durasi 0, chart langsung tampil final.
- Hanya animasikan `transform`/`opacity`/`pathLength` (tanpa layout thrash).
- Setiap SVG chart punya `role="img"` + `aria-label` ringkasan, plus tabel data tersembunyi (`sr-only`) untuk screen reader.

## 7. Endpoint Form: `POST /api/contact`

```
Request (JSON): { name, email, company?, service, budget, timeline, message, website (honeypot), turnstileToken }

1. Cek Content-Type & ukuran body ≤ 10 KB
2. Rate limit per IP (lihat security.md)
3. Honeypot `website` terisi → balas 200 palsu, tidak kirim apa-apa
4. Validasi Zod (schema.ts → contactSchema)
5. Verifikasi turnstileToken ke Cloudflare (setelah validasi: token sekali pakai tidak terbuang untuk input yang salah)
6. Kirim 2 email via Resend: notifikasi ke owner, konfirmasi ke klien
7. Response: 200 { ok: true } | 400 { ok:false, errors } | 429 | 500 { ok:false, message }
```

Logika endpoint ada di `src/lib/contact.ts` (murni, mudah dites); route `src/pages/api/contact.ts` hanya menyambungkan Upstash, Turnstile dan Resend. Di browser, validasi memakai `src/lib/contact-client.ts` (tanpa Zod agar bundle kecil) dengan batas dari `form.config.ts` yang sama — ada tes yang memastikan hasilnya sejalan dengan skema server. Tombol kirim baru aktif setelah hydration, supaya form tidak pernah terkirim sebagai submit HTML biasa.

## 8. Environment Variables

| Nama | Dipakai di | Keterangan |
|---|---|---|
| `GITHUB_TOKEN` | build | Fine-grained PAT, **read-only** public repos |
| `GITHUB_USERNAME` | build | username GitHub |
| `GITHUB_TOPIC` | build | topic penanda repo (default `portfolio`) |
| `SITE_URL` | build + server | URL production (canonical, sitemap, cek hostname Turnstile) |
| `RESEND_API_KEY` | server | kirim email |
| `CONTACT_TO_EMAIL` | server | inbox penerima |
| `CONTACT_FROM_EMAIL` | server | alamat di domain terverifikasi |
| `TURNSTILE_SECRET_KEY` | server | verifikasi anti-spam |
| `PUBLIC_TURNSTILE_SITE_KEY` | client | aman dipublikasikan |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | server | rate limit |

## 9. CI/CD

- **ci.yml** (setiap PR): `pnpm lint` → `pnpm typecheck` → `pnpm test` → `pnpm build` → Lighthouse CI.
- **scheduled-rebuild.yml**: cron harian 02:00 WIB memanggil Vercel Deploy Hook.
- **Di tiap repo project**: workflow kecil `on: push (paths: portfolio/**)` → `curl -X POST $VERCEL_DEPLOY_HOOK`.
- Merge ke `main` = deploy production; PR = preview deploy otomatis.

## 10. Konvensi Kode

- TypeScript `strict: true`; tidak ada `any` tanpa komentar alasan.
- Komponen PascalCase, util camelCase, file chart = nama tipe chart.
- Commit: Conventional Commits (`feat:`, `fix:`, `chore:` …).
- Formatter: Prettier + `prettier-plugin-astro`; linter: ESLint.
- Tes: Vitest untuk `schema.ts`, `github.ts`, `api/contact.ts`; Playwright untuk alur form & klik project.
