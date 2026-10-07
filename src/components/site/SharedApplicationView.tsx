"use client";

type Field = { label: string; value: unknown; heading?: boolean };
type Section = { heading: string; fields: Field[] };
type Share = {
  expires_at: string;
  branding: Record<string, string>;
  snapshot: { sections: Section[]; submitted_at: string };
};

function Value({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    const rows = value as { label: string; value: string }[];
    return (
      <ul className="flex flex-col gap-1.5">
        {rows.map((r, i) => (
          <li key={i} className="rounded-lg bg-[#f7f7f7] px-3 py-2 text-[14px]">{r.label}</li>
        ))}
      </ul>
    );
  }
  return <p className="text-[15px] font-medium text-[#111]">{String(value)}</p>;
}

/** Branded, print-friendly rental application. Header/footer come from the
 *  branding snapshot taken when the share was created (Settings → Documents). */
export function SharedApplicationView({ share }: { share: Share }) {
  const b = share.branding ?? {};
  const submitted = new Date(share.snapshot.submitted_at).toLocaleDateString("en-CA", {
    year: "numeric", month: "long", day: "numeric",
  });
  const expires = new Date(share.expires_at).toLocaleDateString("en-CA", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#f7f7f7] print:bg-white">
      <div className="mx-auto max-w-3xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
        {/* Screen-only toolbar */}
        <div className="mb-6 flex items-center justify-between print:hidden">
          <p className="text-sm text-[#666]">This link expires {expires}.</p>
          <button onClick={() => window.print()} className="rounded-lg bg-[#111] px-5 py-2.5 text-sm font-semibold text-white hover:bg-black">
            Download PDF
          </button>
        </div>

        <article className="overflow-hidden rounded-2xl bg-white shadow-sm print:rounded-none print:shadow-none">
          {/* Branded header */}
          <header className="border-b-4 border-[#0066cc] px-8 py-6">
            <h1 className="text-2xl font-bold text-[#111]">{b.header_name || "Rental Application"}</h1>
            {b.header_tagline ? <p className="mt-1 text-[15px] text-[#333]">{b.header_tagline}</p> : null}
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-[#666]">
              {b.header_phone ? <span>{b.header_phone}</span> : null}
              {b.header_email ? <span>{b.header_email}</span> : null}
              {b.header_address ? <span>{b.header_address}</span> : null}
            </div>
          </header>

          <div className="px-8 py-6">
            <div className="mb-6 flex items-baseline justify-between">
              <h2 className="text-xl font-bold text-[#111]">Rental Application</h2>
              <p className="text-[13px] text-[#666]">Submitted {submitted}</p>
            </div>

            {share.snapshot.sections.map((sec, si) => (
              <section key={si} className="mb-8 break-inside-avoid">
                {sec.heading ? (
                  <h3 className="mb-3 border-b border-[#e5e5e5] pb-2 text-[16px] font-bold text-[#111]">{sec.heading}</h3>
                ) : null}
                <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  {sec.fields.map((f, fi) =>
                    f.heading ? (
                      <div key={fi} className="sm:col-span-2">
                        <p className="text-[14px] font-semibold text-[#333]">{f.label}</p>
                      </div>
                    ) : (
                      <div key={fi} className="sm:col-span-1">
                        <dt className="text-[12px] uppercase tracking-wide text-[#888]">{f.label}</dt>
                        <dd className="mt-0.5"><Value value={f.value} /></dd>
                      </div>
                    ),
                  )}
                </dl>
              </section>
            ))}
          </div>

          {/* Branded footer */}
          <footer className="border-t border-[#e5e5e5] bg-[#f7f7f7] px-8 py-5 print:bg-white">
            <p className="text-[12px] leading-relaxed text-[#888]">
              {b.footer_text || "Confidential — for the named recipient only."}
            </p>
          </footer>
        </article>
      </div>

      <style>{`@media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @page { margin: 18mm 14mm; }
      }`}</style>
    </div>
  );
}
