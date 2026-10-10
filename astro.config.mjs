// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

const SITE = process.env.SITE_URL ?? 'https://example.com';

export default defineConfig({
  site: SITE,
  // Halaman di-prerender (statis); hanya /api/contact yang berjalan sebagai serverless.
  output: 'static',
  adapter: vercel(),
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
    // Font tidak boleh di-inline sebagai data: URI — CSP hanya mengizinkan font-src 'self'.
    build: { assetsInlineLimit: (file) => (/\.(woff2?|ttf|otf)$/.test(file) ? false : undefined) },
  },
  markdown: { syntaxHighlight: false },
  security: {
    checkOrigin: true,
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data: https://raw.githubusercontent.com https://avatars.githubusercontent.com",
        "font-src 'self'",
        "connect-src 'self'",
        'frame-src https://challenges.cloudflare.com',
        "base-uri 'self'",
        "form-action 'self'",
      ],
      scriptDirective: {
        resources: ["'self'", 'https://challenges.cloudflare.com'],
      },
      // Motion menulis style inline saat SSR → butuh 'unsafe-inline' untuk style saja (lihat security.md §5).
      styleDirective: {
        resources: ["'self'", "'unsafe-inline'"],
      },
    },
  },
});
