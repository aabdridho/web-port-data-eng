interface ImportMetaEnv {
  readonly SITE_URL?: string;
  readonly RESEND_API_KEY?: string;
  readonly CONTACT_TO_EMAIL?: string;
  readonly CONTACT_FROM_EMAIL?: string;
  readonly TURNSTILE_SECRET_KEY?: string;
  readonly UPSTASH_REDIS_REST_URL?: string;
  readonly UPSTASH_REDIS_REST_TOKEN?: string;
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  turnstile?: {
    render: (
      el: HTMLElement,
      opts: { sitekey: string; theme?: string; callback?: (t: string) => void; 'expired-callback'?: () => void },
    ) => string;
    reset: (id?: string) => void;
  };
}
