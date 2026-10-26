"use client";
/**
 * Referral link generator block — /refer Block 3, Stage 1.
 *
 * No backend, no new tables, no edge-function change:
 * - Generator mode: name (+ optional email) -> personal link
 *   {origin}/refer?ref=slug -> copy + WhatsApp / text / email share.
 *   Nothing is sent to the server in this mode; the link is built locally.
 * - Friend mode: when the page loads with ?ref=slug, shows who referred them
 *   and a short form that submits to submit-lead with
 *   custom_fields.referred_by, so the referral is recorded on the CRM lead.
 *   The path sent includes the query string, so the ref also survives in the
 *   lead activity for contacts who already exist.
 */
import { useEffect, useRef, useState } from "react";

const SERVICES = [
  "Buying a home",
  "Selling a home",
  "Investment property",
  "Leasing out a property (landlord)",
  "Renting a home (tenant)",
];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const unslug = (slug: string) =>
  slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

type Props = {
  heading?: string;
  description?: string;
  promiseText?: string;
  successMessage?: string;
  pageId?: string;
  siteName?: string;
  dark?: boolean;
};

export function ReferralLinkClient({
  heading,
  description,
  promiseText,
  successMessage,
  pageId,
  siteName,
  dark,
}: Props) {
  const started = useRef(Date.now());
  const [ref, setRef] = useState<string | null>(null);
  const [view, setView] = useState<"generator" | "friend">("generator");

  // Generator state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [genError, setGenError] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Friend form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("");
  const [fstate, setFstate] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [ferror, setFerror] = useState("");

  // Read ?ref= once on mount (window.location, not useSearchParams, so no
  // Suspense boundary is needed around this block).
  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("ref");
    if (r) {
      setRef(r);
      setView("friend");
    }
  }, []);

  const title = heading || "Get your referral link";
  const lede =
    description ||
    "Enter your name and email. Your personal link is generated instantly — share it with anyone, as many times as you like.";
  const promise =
    promiseText || "Our promise: we'll reach out once, mention your name, and never spam them.";
  const doneMsg =
    successMessage || "Thanks! We'll reach out with personalized, no-pressure guidance.";
  const brand = siteName || "Rohit Sharma Real Estate";

  const cardCls = dark
    ? "rounded-[var(--radius-lg)] border border-white/20 bg-white/10"
    : "rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line bg-white shadow-[var(--shadow-card)]";
  const titleCls = `text-xl font-semibold md:text-[22px] ${dark ? "text-ground" : "text-ink"}`;
  const bodyCls = `text-[15px] leading-relaxed ${dark ? "text-ground/75" : "text-muted"}`;
  const inputCls = `h-12 w-full rounded-[var(--radius-btn)] border px-4 text-[15px] outline-none focus:border-primary ${
    dark
      ? "border-white/20 bg-white/10 text-ground placeholder:text-ground/50"
      : "border-line bg-white text-ink placeholder:text-muted/70"
  }`;
  const labelCls = `text-sm font-medium ${dark ? "text-ground" : "text-ink"}`;
  const shareBtnCls = `flex h-12 flex-1 items-center justify-center rounded-[var(--radius-btn)] border px-3 text-sm font-medium transition ${
    dark
      ? "border-white/20 text-ground hover:bg-white/10"
      : "border-line text-ink hover:bg-ground"
  }`;

  function generate(e: React.FormEvent) {
    e.preventDefault();
    const slug = slugify(`${firstName} ${lastName}`);
    if (!slug) {
      setGenError("Please enter your name so we can build your link.");
      setLink(null);
      return;
    }
    setGenError("");
    setCopied(false);
    setLink(`${window.location.origin}/refer?ref=${slug}`);
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function submitFriend(e: React.FormEvent) {
    e.preventDefault();
    setFerror("");
    if (!name.trim()) {
      setFerror("Please enter your name.");
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setFerror("Please enter an email or phone number so we can reach you.");
      return;
    }
    if (!service) {
      setFerror("Please pick what you're looking for.");
      return;
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    if (!url || !anon) {
      setFerror("This form isn't fully set up yet. Please contact us another way.");
      setFstate("error");
      return;
    }
    setFstate("sending");
    try {
      const res = await fetch(`${url}/functions/v1/submit-lead`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anon,
          Authorization: `Bearer ${anon}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          service,
          form_key: "referral",
          page_id: pageId,
          path: window.location.pathname + window.location.search,
          custom_fields: { referred_by: ref, referral_link: window.location.href },
          sms_opt_in: false,
          website: "",
          elapsed_ms: Date.now() - started.current,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setFerror(body?.error || `Something went wrong (error ${res.status}). Please try again.`);
        setFstate("error");
        return;
      }
      setFstate("done");
    } catch {
      setFerror("Couldn't reach the server. Please check your connection and try again.");
      setFstate("error");
    }
  }

  const referrerName = ref ? unslug(ref) : "";
  const previewName =
    `${firstName.trim()} ${lastName.trim()}`.trim() || "Your name";
  const shareMsg = link
    ? `${firstName.trim() || "I"} thought ${brand} could help you — ${link}`
    : "";

  const generator = (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className={`${cardCls} flex flex-col gap-5 p-6 md:p-8`}>
        <div className="flex flex-col gap-2">
          <h3 className={titleCls}>{title}</h3>
          <p className={bodyCls}>{lede}</p>
        </div>
        <form onSubmit={generate} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>First name</span>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
                autoComplete="given-name"
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Last name</span>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
                autoComplete="family-name"
                className={inputCls}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Email (optional)</span>
            <input
              type="email"
              placeholder="jane@example.com"
              autoComplete="email"
              className={inputCls}
            />
          </label>
          {genError ? <p className="text-sm text-red-600">{genError}</p> : null}
          <button type="submit" className="btn-primary h-13 text-[15px]">
            Generate my link
          </button>
        </form>
        {link ? (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Your referral link</span>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  readOnly
                  value={link}
                  onFocus={(e) => e.currentTarget.select()}
                  className={`${inputCls} flex-1`}
                  aria-label="Your referral link"
                />
                <button
                  type="button"
                  onClick={copyLink}
                  className="btn-primary h-12 shrink-0 px-6 text-sm"
                >
                  {copied ? "Copied!" : "Copy link"}
                </button>
              </div>
            </label>
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareMsg)}`}
                target="_blank"
                rel="noreferrer"
                className={shareBtnCls}
              >
                WhatsApp
              </a>
              <a href={`sms:?body=${encodeURIComponent(shareMsg)}`} className={shareBtnCls}>
                Text
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent("A real estate introduction")}&body=${encodeURIComponent(shareMsg)}`}
                className={shareBtnCls}
              >
                Email
              </a>
            </div>
            <p className={`text-[13px] leading-relaxed ${dark ? "text-ground/60" : "text-muted"}`}>
              {promise}
            </p>
          </div>
        ) : null}
      </div>
      <div className={`${cardCls} flex flex-col gap-4 p-6 md:p-8`}>
        <div className="text-sm font-semibold uppercase tracking-wide text-primary">Preview</div>
        <h3 className={titleCls}>What your friend sees</h3>
        <div
          className={`flex flex-col gap-2 rounded-[var(--radius-md)] p-5 ${
            dark ? "bg-white/10" : "bg-soft"
          }`}
        >
          <p className={`font-semibold ${dark ? "text-ground" : "text-ink"}`}>
            {previewName} thought we could help you.
          </p>
          <p className={bodyCls}>
            {brand} — buy, sell, rent, or invest with confidence. Your friend will get a
            short form here, and we&apos;ll reach out once with personalized, no-pressure
            guidance.
          </p>
        </div>
        <p className={bodyCls}>
          When a friend opens your link, this block switches to their welcome message and
          form automatically — and their submission is tagged with your link in the CRM.
        </p>
      </div>
    </div>
  );

  const friend = (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2 rounded-[var(--radius-lg)] bg-ink p-6 text-white md:p-8">
        <p className="text-xl font-semibold md:text-[22px]">
          {referrerName} thought we could help you.
        </p>
        <p className="text-[15px] leading-relaxed text-white/75">
          Tell us a little about what you&apos;re looking for — we&apos;ll reach out once,
          mention {referrerName.split(" ")[0] || "your friend"}&apos;s name, and never spam
          you.
        </p>
      </div>
      {fstate === "done" ? (
        <div className={`${cardCls} p-6 text-center md:p-8`} role="status">
          <p className={`font-display text-2xl font-bold ${dark ? "text-ground" : "text-ink"}`}>
            {doneMsg}
          </p>
        </div>
      ) : (
        <form onSubmit={submitFriend} className={`${cardCls} flex flex-col gap-3 p-6 md:p-8`}>
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Your name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              autoComplete="name"
              className={inputCls}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Phone</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(416) 555-0100"
                autoComplete="tel"
                className={inputCls}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>What are you looking for?</span>
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              className={inputCls}
            >
              <option value="">Choose one…</option>
              {SERVICES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          {ferror ? <p className="text-sm text-red-600">{ferror}</p> : null}
          <button
            type="submit"
            disabled={fstate === "sending"}
            className="btn-primary h-13 text-[15px] disabled:opacity-60"
          >
            {fstate === "sending" ? "Sending…" : "Get in touch"}
          </button>
        </form>
      )}
      <button
        type="button"
        onClick={() => setView("generator")}
        className="self-center text-sm font-medium text-primary underline"
      >
        Want your own referral link?
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 py-7 md:py-20">
      {view === "friend" && ref ? (
        friend
      ) : (
        <>
          {generator}
          {ref ? (
            <button
              type="button"
              onClick={() => setView("friend")}
              className="self-center text-sm font-medium text-primary underline"
            >
              ← Back to {referrerName}&apos;s referral form
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
