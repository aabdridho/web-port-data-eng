import { useEffect, useRef, useState, type FormEvent } from 'react';
import { formOptions } from '../../data/form.config';
import { validateContact } from '../../lib/contact-client';

type Status = 'idle' | 'sending' | 'success' | 'error';
type Errors = Partial<Record<string, string>>;

/** Form kontak (Requirement F5). Validasi client hanya untuk UX — server tetap memvalidasi ulang. */
export default function ContactForm({ siteKey, email }: { siteKey?: string; email: string }) {
  const [status, setStatus] = useState<Status>('idle');
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState('');
  const [token, setToken] = useState('');
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  const statusRef = useRef<HTMLDivElement>(null);
  // Tombol baru aktif setelah hydration: mencegah submit HTML biasa (data form bisa bocor ke URL).
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  // Cloudflare Turnstile (security.md §3). Dimuat hanya jika site key di-set.
  useEffect(() => {
    if (!siteKey || !widgetRef.current) return;
    const render = () => {
      if (widgetRef.current && window.turnstile && !widgetId.current) {
        widgetId.current = window.turnstile.render(widgetRef.current, {
          sitekey: siteKey,
          theme: 'dark',
          callback: setToken,
          'expired-callback': () => setToken(''),
        });
      }
    };
    if (window.turnstile) return render();
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = render;
    document.head.appendChild(s);
  }, [siteKey, status]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = { ...Object.fromEntries(fd.entries()), turnstileToken: token } as Record<string, string>;

    const next = validateContact(payload);
    if (Object.keys(next).length) {
      setErrors(next);
      setMessage('Please check the highlighted fields.');
      setStatus('error');
      document.getElementById(`f-${Object.keys(next)[0]}`)?.focus();
      return;
    }
    if (siteKey && !token) {
      setErrors({});
      setMessage('Please complete the verification first.');
      setStatus('error');
      return;
    }

    setErrors({});
    setStatus('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; errors?: Errors };
      if (res.ok && body.ok) {
        setStatus('success');
        return;
      }
      setErrors(body.errors ?? {});
      setMessage(body.message ?? 'Something went wrong.');
      setStatus('error');
    } catch {
      setMessage('Network error. Please try again or email me directly.');
      setStatus('error');
    } finally {
      if (widgetId.current) window.turnstile?.reset(widgetId.current);
      setToken('');
    }
  }

  useEffect(() => {
    if (status === 'success' || status === 'error') statusRef.current?.focus();
  }, [status]);

  if (status === 'success') {
    return (
      <div
        ref={statusRef}
        tabIndex={-1}
        role="status"
        className="flex flex-col items-start gap-3 rounded-[20px] border border-line-strong p-10 outline-none"
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--sage)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="m8 12 3 3 5-6" />
        </svg>
        <div className="text-2xl font-semibold">Thanks — message received.</div>
        <p className="m-0 text-fg-2">
          I’ll get back to you within 1–2 business days. A confirmation is on its way to your inbox.
        </p>
        <button
          type="button"
          onClick={() => {
            widgetId.current = undefined;
            setStatus('idle');
          }}
          className="min-h-11 cursor-pointer rounded-xl border border-line-strong bg-transparent px-[18px] font-[inherit] text-[15px] text-accent"
        >
          Send another
        </button>
      </div>
    );
  }

  const sending = status === 'sending';

  return (
    <form
      onSubmit={onSubmit}
      method="post"
      action="/api/contact"
      noValidate
      className="flex flex-col gap-4"
      aria-describedby="form-note"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field name="name" label="Name" required autoComplete="name" placeholder="Your name" error={errors.name} />
        <Field
          name="email"
          label="Email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          error={errors.email}
        />
        <Field
          name="company"
          label="Company"
          autoComplete="organization"
          placeholder="Optional"
          error={errors.company}
        />
        <Select name="service" label="Service needed" options={formOptions.service} error={errors.service} />
        <Select name="budget" label="Budget" options={formOptions.budget} error={errors.budget} />
        <Select name="timeline" label="Timeline" options={formOptions.timeline} error={errors.timeline} />
      </div>
      <Field
        name="message"
        label="Project details"
        required
        textarea
        placeholder="Data sources, current pain points, what you want to see at the end…"
        error={errors.message}
      />

      {/* Honeypot: tersembunyi dari manusia & screen reader (security.md §3) */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      {siteKey && <div ref={widgetRef} />}

      {status === 'error' && (
        <div
          ref={statusRef}
          tabIndex={-1}
          role="alert"
          className="rounded-xl border border-[#e8a3a3]/40 px-4 py-3 text-[15px] text-[#f0c4c4] outline-none"
        >
          {message} {!Object.keys(errors).length && <a href={`mailto:${email}`}>{email}</a>}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <span id="form-note" className="text-[13px] text-muted">
          Your details are only used to reply to you.
        </span>
        <button
          type="submit"
          disabled={sending || !ready}
          className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border-0 bg-accent px-[26px] font-[inherit] text-base font-semibold text-bg hover:bg-accent-hover disabled:cursor-wait disabled:opacity-70"
        >
          {sending && (
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-bg border-t-transparent"
            />
          )}
          {sending ? 'Sending…' : 'Send inquiry →'}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  'rounded-xl border bg-bg px-3.5 py-3.5 font-[inherit] text-fg placeholder:text-[#6b7385] focus:outline-2 focus:outline-offset-1 focus:outline-accent';

function Field(props: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  textarea?: boolean;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
}) {
  const id = `f-${props.name}`;
  const common = {
    id,
    name: props.name,
    placeholder: props.placeholder,
    'aria-invalid': props.error ? true : undefined,
    'aria-describedby': props.error ? `${id}-err` : undefined,
    className: `${inputCls} ${props.error ? 'border-[#e8a3a3]' : 'border-line-strong'}`,
  };
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-fg-2">
        {props.label}
        {props.required && <span aria-hidden="true"> *</span>}
      </label>
      {props.textarea ? (
        <textarea {...common} rows={5} required={props.required} className={`${common.className} resize-y`} />
      ) : (
        <input {...common} type={props.type ?? 'text'} required={props.required} autoComplete={props.autoComplete} />
      )}
      {props.error && (
        <span id={`${id}-err`} className="text-[13px] text-[#f0c4c4]">
          {props.error}
        </span>
      )}
    </div>
  );
}

function Select({
  name,
  label,
  options,
  error,
}: {
  name: string;
  label: string;
  options: readonly string[];
  error?: string;
}) {
  const id = `f-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-fg-2">
        {label}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={options[0]}
        className={`${inputCls} ${error ? 'border-[#e8a3a3]' : 'border-line-strong'}`}
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      {error && <span className="text-[13px] text-[#f0c4c4]">{error}</span>}
    </div>
  );
}
