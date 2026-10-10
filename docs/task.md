# Task — Rencana Pengerjaan

> Status: `[ ]` belum · `[~]` sebagian · `[x]` selesai — diperbarui 10 Oktober 2026
> Rujukan: Requirement.md (F/NF), code.md, security.md
> Item bertanda **(kamu)** butuh akun/akses milikmu, tidak bisa dikerjakan dari kode.

## Fase 0 — Persiapan
- [ ] **(kamu)** Tentukan domain, email penerima, range budget, bahasa copy (Requirement §8)
- [ ] **(kamu)** Pilih **3 project** data yang akan ditampilkan pertama kali
- [ ] **(kamu)** Buat akun: Vercel, Resend (verifikasi domain), Cloudflare Turnstile, Upstash Redis
- [ ] **(kamu)** Buat fine-grained PAT GitHub read-only (security §2)
- [ ] **(kamu)** Buat repo `web-port-data-eng`, push kode ini, aktifkan secret scanning + push protection

## Fase 1 — Fondasi
- [x] Init Astro 7 + TypeScript strict + Tailwind 4 + React
- [x] Prettier, ESLint, Vitest, Playwright terpasang
- [x] `tokens.css` + self-host Urbanist & JetBrains Mono
- [x] `site.config.ts` + `form.config.ts`
- [x] Layout: `Nav`, `Footer`, `Base` + scroll halus ke anchor + skip link
- [x] Header keamanan (`vercel.json`) + CSP berbasis hash (`astro.config.mjs`)
- [ ] **(kamu)** Deploy pertama ke Vercel
- [x] Workflow `ci.yml` (audit, lint, test, build, typecheck, cek bundle, E2E)

## Fase 2 — Data GitHub
- [x] `lib/schema.ts`: skema Zod `meta`, `chart`, `contact`
- [x] `lib/github.ts`: list repo ber-topic, ambil isi `portfolio/`, GraphQL kontribusi, render README tersanitasi
- [x] `scripts/fetch-github.ts` + fallback cache + mode data contoh
- [x] Tes unit: JSON valid, JSON invalid dilewati, sanitasi, filter repo
- [ ] **(kamu)** Siapkan 3 repo project: topic `portfolio`, folder `portfolio/`, task pipeline yang menulis `charts/*.json` (contoh: `examples/`)
- [x] Template workflow untuk repo project (`examples/_workflow-for-project-repos/portfolio-sync.yml`) — **(kamu)** salin ke tiap repo
- [x] `scheduled-rebuild.yml` harian — **(kamu)** isi secret `VERCEL_DEPLOY_HOOK`

## Fase 3 — Halaman Utama Statis
- [x] Hero (F1)
- [x] Bento: Pipeline, Location, GitHub Activity, Tech Stack (F2)
- [x] Services (F4)
- [x] Responsif 360 / 768 / 1280 px (dicek dengan screenshot + tes E2E tanpa scroll horizontal)

## Fase 4 — Chart Animasi
- [x] `ChartFrame` (judul, legenda, sumber, link repo, tooltip, tabel sr-only)
- [x] `Bar` + `GroupedBar`
- [x] `Line` + `Area` (crosshair + navigasi keyboard ←/→)
- [x] `Ring` + `Progress` + `Kpi` (count-up)
- [x] `Heatmap` (chart project) + heatmap kontribusi di bento
- [x] `lib/motion.ts`: preset + `prefers-reduced-motion`
- [x] `ProjectShowcase` island: klik/↑↓ → ganti chart + animasi ulang (F3.2, F3.6)
- [x] Halaman `/projects/[slug]` + README tersanitasi (F3.5, security §4)

## Fase 5 — Contact Form
- [x] `ContactForm.tsx`: field, validasi client, state idle/sending/success/error (F5)
- [x] Turnstile widget (aktif bila site key di-set) + honeypot
- [x] `/api/contact`: batas ukuran, rate limit, honeypot, validasi, Turnstile, kirim 2 email via Resend
- [x] Template email notifikasi & auto-reply (teks, input di-escape)
- [x] Tes: unit endpoint (9 kasus) + E2E (validasi, sukses, rate limit)

## Fase 6 — Polish & SEO
- [x] Meta tag, Open Graph, sitemap, `robots.txt`, JSON-LD `Person`
- [ ] **(kamu)** Gambar OG `public/og.png` (1200×630)
- [x] `/.well-known/security.txt` — **(kamu)** isi email
- [x] Ukuran JS awal ≈ 112 KB gzip (target < 150 KB)
- [ ] Audit Lighthouse di URL production (NF1, NF3)
- [~] Uji keyboard & screen reader — navigasi keyboard + label ARIA sudah ada dan dites; uji screen reader manual belum

## Fase 7 — Rilis
- [ ] Checklist security.md §8 semua tercentang
- [ ] Definition of Done (Requirement §7) tercentang
- [ ] **(kamu)** Hubungkan domain + HTTPS
- [ ] **(kamu)** Kirim form uji dari luar jaringan → cek inbox (bukan spam)
- [ ] **(kamu)** Pasang link website di GitHub profile & LinkedIn

## Backlog (setelah v1)
- [ ] Revisi desain lanjutan
- [ ] Toggle bahasa EN/ID
- [ ] Halaman `/projects` berisi semua project + filter tipe
- [ ] Testimoni klien
- [ ] Blog / catatan teknis
