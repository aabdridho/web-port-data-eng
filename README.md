# Web Portofolio Data Engineer

Website portofolio Rasyid (Abdurrasyid Ridho) — menampilkan hasil olahan data dari repo GitHub sebagai visualisasi animasi, dengan form kontak untuk klien.

Spesifikasi: `docs/Requirement.md` · `docs/code.md` · `docs/security.md` · `docs/task.md`

## Jalankan lokal

```bash
pnpm install
cp .env.example .env      # boleh dibiarkan kosong untuk mencoba
pnpm dev                  # http://localhost:4321
```

Tanpa `GITHUB_TOKEN`, website memakai **data contoh** dari `examples/` (ditandai badge *SAMPLE DATA*). Form tetap bisa dicoba; email tidak dikirim, isinya dicetak di terminal.

| Perintah | Fungsi |
|---|---|
| `pnpm dev` | tarik data + dev server |
| `pnpm build` | tarik data GitHub → build statis + fungsi `/api/contact` |
| `pnpm test` | unit test (Vitest) |
| `pnpm test:e2e` | E2E Playwright (jalankan `pnpm build` dulu) |
| `pnpm typecheck` / `pnpm lint` | cek tipe & lint |
| `pnpm check:bundle` | pastikan tidak ada token di file browser |

## Menampilkan project asli

Di **setiap repo project** yang mau ditampilkan:

1. Tambahkan topic **`portfolio`** (About → ⚙ → Topics).
2. Buat folder `portfolio/` — salin dari contoh di `examples/sample-batch-etl/portfolio/`:
   ```
   portfolio/
   ├─ meta.json        # nama, jenis, tahun, stack, ringkasan
   ├─ charts/*.json    # 1–4 chart: bar, grouped-bar, line, area, ring, progress, heatmap, kpi
   └─ README.md        # isi halaman case study
   ```
3. Idealnya `charts/*.json` **ditulis oleh pipeline itu sendiri** (task terakhir DAG/notebook), jadi website selalu menampilkan output asli.
4. Salin `examples/_workflow-for-project-repos/portfolio-sync.yml` ke `.github/workflows/` repo tersebut agar website rebuild otomatis saat `portfolio/` berubah.

Format lengkap & aturan validasi: `docs/code.md §4` dan `src/lib/schema.ts`. File yang tidak valid **dilewati** (build tetap jalan) dan alasannya muncul di log build.

## Setup produksi (Fase 0 & 7 di task.md)

1. **GitHub token** — Settings → Developer settings → Fine-grained token → *Public repositories (read-only)*, kedaluwarsa 90 hari.
2. **Resend** — verifikasi domain (SPF/DKIM/DMARC), buat API key.
3. **Cloudflare Turnstile** — buat widget untuk domainmu → site key + secret key.
4. **Upstash Redis** — buat database → REST URL + token (untuk rate limit).
5. **Vercel** — import repo ini, isi semua variabel di `.env.example`, lalu buat **Deploy Hook** (Settings → Git) dan simpan sebagai secret `VERCEL_DEPLOY_HOOK` di repo ini dan di setiap repo project.
6. Ganti semua placeholder `[ ... ]` di `src/data/site.config.ts`, `src/data/form.config.ts` dan `public/.well-known/security.txt`.
7. Aktifkan GitHub secret scanning + push protection.

Di production, form **menolak berjalan** bila Resend/Turnstile/Upstash belum dikonfigurasi (gagal aman, bukan diam-diam lolos).

## Mengubah tampilan

- Warna & ukuran: `src/styles/tokens.css` (satu-satunya sumber token).
- Teks, layanan, tech stack, pipeline: `src/data/site.config.ts`.
- Pilihan dropdown & batas panjang form: `src/data/form.config.ts` (dipakai client dan server sekaligus).
