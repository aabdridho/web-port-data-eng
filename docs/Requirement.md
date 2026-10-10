# Requirement — Web Portofolio Data Engineer

> Versi 1.0 · 10 Oktober 2026 · Pemilik: Abdurrasyid Ridho (Rasyid)
> Referensi desain: jestsee.com · Mockup: canvas "Data Engineer Portfolio"

## 1. Tujuan

1. **Mendapatkan klien freelance** untuk jasa Data Engineering — semua elemen halaman mengarah ke form kontak.
2. **Membuktikan kemampuan** lewat hasil olahan data asli yang divisualisasikan dengan animasi.
3. **Minim perawatan**: data project ditarik otomatis dari GitHub, tanpa edit manual di website.

## 2. Target Pengguna

| Persona | Kebutuhan | Yang harus mereka temukan dalam < 30 detik |
|---|---|---|
| Calon klien (UMKM, startup, tim bisnis) | Tahu apa yang bisa dikerjakan & seberapa bisa dipercaya | Layanan, contoh hasil, tombol "Start a project" |
| Recruiter / tech lead | Menilai skill teknis | Tech stack, repo GitHub, case study |

## 3. Ruang Lingkup

### Termasuk (v1)
- Halaman utama satu halaman (single page) sesuai mockup.
- Halaman detail project `/projects/[slug]` (case study).
- Penarikan data project dari GitHub saat build.
- Visualisasi data animasi (bar, line, ring/donut, progress, heatmap, pipeline flow).
- Form kontak dengan notifikasi email.
- Responsif (mobile ≥ 360 px, tablet, desktop).

### Tidak termasuk (v1)
- Blog, CMS, login/admin panel, multi-bahasa, dark/light toggle (v1 tema gelap saja).

## 4. Kebutuhan Fungsional

### F1 — Navigasi & Hero
- F1.1 Navbar: logo, link Projects, Services, tombol "Hire me" (scroll ke #contact).
- F1.2 Pill status "Available for data projects" — teks & status bisa diubah via config.
- F1.3 Hero: sapaan, peran, deskripsi singkat, CTA utama + sekunder, ikon GitHub & LinkedIn.

### F2 — Bento Overview
- F2.1 Kartu **Live Pipeline**: animasi alur Source → Ingest → Transform → Serve.
- F2.2 Kartu **Location**: kota, zona waktu.
- F2.3 Kartu **GitHub Activity**: heatmap kontribusi dari GitHub API (data asli).
- F2.4 Kartu **Tech Stack**: daftar dari config.

### F3 — Projects (inti)
- F3.1 Daftar project diambil dari repo GitHub yang memiliki topic `portfolio` **dan** folder `portfolio/` (lihat code.md §4).
- F3.2 Klik project → panel visualisasi memutar animasi chart project tersebut.
- F3.3 Tipe chart yang didukung: `bar`, `grouped-bar`, `line`, `area`, `ring`, `progress`, `heatmap`, `kpi`.
- F3.4 Setiap chart wajib menampilkan **sumber data** (nama tabel/file + link ke repo).
- F3.5 Link "Read the case study" → `/projects/[slug]` yang merender `portfolio/README.md` dari repo.
- F3.6 Animasi dijalankan saat chart masuk viewport (sekali), dan diulang saat ganti project.
- F3.7 Jika data gagal ditarik, tampilkan data cache build terakhir — halaman tidak boleh kosong/error.

### F4 — Services
- F4.1 Empat kartu layanan dari config: ETL/ELT, Data Warehouse, Dashboard, Data Quality.

### F5 — Contact Form
- F5.1 Field: Nama*, Email*, Perusahaan, Layanan (select), Budget (select), Timeline (select), Detail project*.
- F5.2 Validasi di client **dan** server (aturan di security.md §3).
- F5.3 Submit → email notifikasi ke Rasyid + email balasan otomatis ke klien.
- F5.4 State: idle → sending (tombol disabled + spinner) → success / error dengan pesan jelas.
- F5.5 Anti-spam: Cloudflare Turnstile + honeypot + rate limit.

### F6 — Footer
- F6.1 Nama, tagline, link site, link sosial, link source code, tanggal sinkronisasi data terakhir.

## 5. Kebutuhan Non-Fungsional

| Kode | Aspek | Target |
|---|---|---|
| NF1 | Performa | Lighthouse Performance ≥ 90 (mobile), LCP < 2,5 s, CLS < 0,1 |
| NF2 | Ukuran | JS awal < 150 KB gzip; chart di-load sebagai island saat terlihat |
| NF3 | Aksesibilitas | WCAG 2.1 AA: kontras ≥ 4,5:1, navigasi keyboard, label form, `prefers-reduced-motion` mematikan animasi |
| NF4 | SEO | Meta title/description, Open Graph image, sitemap, JSON-LD `Person` |
| NF5 | Ketersediaan | Situs statis di CDN; form punya fallback link `mailto:` |
| NF6 | Kesegaran data | Rebuild otomatis harian + saat repo project di-push |
| NF7 | Keamanan | Lihat security.md |

## 6. Identitas Visual (dari mockup yang disetujui)

| Token | Nilai |
|---|---|
| Font utama | **Urbanist** (400/500/600/700, italic 500/600) |
| Font data/label | JetBrains Mono (400/500) |
| Background | `#0C0F14` · Surface `#131820` · Border `#222B38` |
| Teks | Utama `#E7E9EE` · Sekunder `#B4BAC6` · Muted `#8A93A3` |
| Aksen utama | Periwinkle `#A9B8F5` (hover `#CAD4FA`) |
| Aksen data | Soft teal `#8CCFD8` · Soft sage `#9ED9AE` · Netral chart `#3A4256` |
| Radius | Kartu 20 px · tombol/input 12 px · pill 999 px |

> Catatan: desain masih akan direvisi; token di atas dipusatkan di satu file (`tokens.css`) agar perubahan cukup di satu tempat.

## 7. Kriteria Selesai (Definition of Done v1)

- [ ] Semua F1–F6 berjalan di production.
- [ ] Minimal **3 project asli** tampil dengan data dari GitHub.
- [ ] Form terkirim end-to-end (email masuk ke inbox, bukan spam).
- [ ] NF1, NF3 lolos audit Lighthouse.
- [ ] Checklist security.md §8 terpenuhi.

## 8. Asumsi & Pertanyaan Terbuka

- Copy website berbahasa Inggris (target klien lebih luas). → *perlu konfirmasi*
- Domain: `[domain-kamu]` → *perlu ditentukan*
- Email penerima form: `[your@email.com]` → *perlu ditentukan*
- Range budget di form → *perlu ditentukan*
