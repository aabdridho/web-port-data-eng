# Security — Kebijakan Keamanan

## 1. Ancaman yang Diantisipasi

| Ancaman | Titik masuk | Mitigasi |
|---|---|---|
| Spam / bot form | `/api/contact` | Turnstile, honeypot, rate limit (§3) |
| Email injection / header injection | field form | Validasi Zod, tolak `\r\n` di name/email/company |
| XSS lewat data GitHub | `README.md`, `meta.json`, chart JSON | Sanitasi markdown, skema ketat, tanpa `set:html` mentah (§4) |
| Kebocoran token | env, log, bundle client | Token hanya di build/server, scope minimal (§2) |
| Abuse kuota email (Resend) | form | Rate limit + batas harian |
| Supply-chain (dependency jahat) | npm | Lockfile, Dependabot, audit di CI (§6) |
| Clickjacking / sniffing | browser | Security headers (§5) |

## 2. Rahasia & Token

- `GITHUB_TOKEN`: **fine-grained PAT**, akses **Public repositories (read-only)**, kedaluwarsa 90 hari, diperbarui terjadwal.
- Semua rahasia hanya di **Vercel Environment Variables** dan **GitHub Secrets** — tidak pernah di-commit.
- Hanya variabel berawalan `PUBLIC_` yang boleh sampai ke browser. CI memeriksa bundle hasil build: gagal jika menemukan pola `ghp_`, `github_pat_`, `re_` (Resend).
- `.env` masuk `.gitignore`; sediakan `.env.example` tanpa nilai.
- Aktifkan **GitHub secret scanning + push protection** di repo website dan repo project.
- Log server tidak boleh mencetak isi body form secara utuh maupun token.

## 3. Form Kontak

**Validasi server (sumber kebenaran; validasi client hanya UX):**

| Field | Aturan |
|---|---|
| name | wajib, 2–80 karakter, tanpa `<>` dan newline |
| email | wajib, format email valid, ≤ 254 karakter |
| company | opsional, ≤ 100 karakter, tanpa newline |
| service / budget / timeline | wajib, harus salah satu nilai enum yang ditentukan |
| message | wajib, 20–3000 karakter |
| website (honeypot) | harus kosong |

**Lapisan anti-abuse:**
1. Body > 10 KB atau bukan `application/json` → 415/413.
2. Rate limit: **5 request / 10 menit per IP**, **50 email / hari total** (Upstash Redis, sliding window).
3. Honeypot terisi → balas sukses palsu, tidak kirim email.
4. Turnstile wajib lolos (verifikasi server-side, cek `hostname` = domain sendiri). Di production, jika Turnstile/Resend/Upstash belum dikonfigurasi, endpoint **menolak** (gagal aman).
5. Email keluar:
   - Isi user dikirim sebagai **teks**, atau HTML yang di-escape.
   - Alamat klien dipakai di `reply_to`, **bukan** di `from`.
   - Subjek dibentuk dari template tetap, bukan dari input user mentah.
6. Pesan error ke user bersifat umum; detail error hanya di log server.

## 4. Data dari GitHub (konten tidak tepercaya)

Walaupun repo milik sendiri, semua data diperlakukan sebagai **tidak tepercaya** (repo bisa di-PR orang lain atau token bisa bocor):
- Semua JSON divalidasi Zod dengan `.strict()`; field tidak dikenal ditolak.
- Warna chart hanya token enum, bukan CSS/hex bebas.
- URL di `meta.json` hanya boleh `https://github.com/{username}/…`.
- `README.md` dirender lewat markdown → HTML lalu **sanitasi** (`sanitize-html`, heading diturunkan satu tingkat, tanpa `<script>`, `<iframe>`, `on*`, `javascript:`). Gambar hanya dari `raw.githubusercontent.com/{username}`.
- Teks di chart dirender sebagai text node SVG, tidak pernah `innerHTML`.

## 5. HTTP Security Headers

**CSP** dibuat oleh Astro (`security.csp` di `astro.config.mjs`) sebagai `<meta>` di setiap halaman, dengan **hash** untuk tiap script yang di-bundle — jadi tidak perlu `'unsafe-inline'` untuk script:
```
default-src 'self';
script-src 'self' https://challenges.cloudflare.com 'sha256-…';
style-src 'self' 'unsafe-inline';          ← animasi Motion menulis style inline saat render
img-src 'self' data: https://raw.githubusercontent.com https://avatars.githubusercontent.com;
font-src 'self'; connect-src 'self'; frame-src https://challenges.cloudflare.com;
base-uri 'self'; form-action 'self'
```
Header lain di `vercel.json` (karena `frame-ancestors` tidak berlaku lewat `<meta>`):
```
Content-Security-Policy: frame-ancestors 'none'
X-Frame-Options: DENY
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```
Font Urbanist & JetBrains Mono di-*self-host* (`@fontsource`) dan tidak pernah di-inline sebagai `data:` URI, sehingga `font-src 'self'` cukup.

## 6. Dependency & Supply Chain

- `pnpm` dengan lockfile di-commit; CI pakai `pnpm install --frozen-lockfile`.
- Dependabot mingguan + `pnpm audit --audit-level=high` di CI (gagal jika ada high/critical).
- GitHub Actions di-pin ke **commit SHA**, bukan tag.
- `permissions: contents: read` sebagai default di setiap workflow.

## 7. Privasi Data Klien

- Data form **tidak disimpan** di database; hanya diteruskan ke email.
- Tidak ada cookie tracking. Jika butuh analitik, pakai yang cookieless (Vercel Analytics / Umami).
- Teks di bawah form menjelaskan penggunaan data (sudah ada di mockup).

## 8. Checklist Sebelum Rilis

- [ ] Tidak ada rahasia di repo (`gitleaks detect` bersih)
- [ ] Bundle client bebas token (cek CI lolos)
- [ ] Form menolak input invalid, honeypot, dan request ke-6 dalam 10 menit
- [ ] Turnstile aktif di production
- [ ] Header §5 aktif (cek di securityheaders.com → minimal nilai A)
- [ ] README berisi `<script>` di repo uji tidak tereksekusi
- [ ] `pnpm audit` bersih dari high/critical
- [ ] SPF, DKIM, DMARC domain pengirim terverifikasi di Resend

## 9. Pelaporan Celah

Laporan celah keamanan dikirim ke `[your@email.com]` dengan subjek `[SECURITY]`. File `/.well-known/security.txt` berisi kontak tersebut.
