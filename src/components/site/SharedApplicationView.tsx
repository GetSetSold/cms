"use client";

type Field = { label: string; value: unknown; heading?: boolean };
type Section = { heading: string; fields: Field[] };
type Share = {
  expires_at: string;
  branding: Record<string, string>;
  snapshot: { sections: Section[]; submitted_at: string };
};

function Value({ value, fieldLabel }: { value: unknown; fieldLabel?: string }) {
  // Subform: array of labeled entries → organized tables
  if (value && typeof value === "object" && !Array.isArray(value) && "subform" in value) {
    const entries = (value as { subform: Record<string, string>[] }).subform;
    // Order: First Name first, then Last Name, then the rest.
    const ordered = entries.map((entry) => {
      const o: Record<string, string> = {};
      const firstKey = Object.keys(entry).find((k) => /first.?name/i.test(k));
      const lastKey = Object.keys(entry).find((k) => /last.?name/i.test(k));
      if (firstKey) o[firstKey] = entry[firstKey];
      if (lastKey) o[lastKey] = entry[lastKey];
      for (const [k, v] of Object.entries(entry)) if (!(k in o)) o[k] = v;
      return o;
    });
    const cols = entries.length === 1 ? "grid-cols-1" : entries.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
    return (
      <div className={`grid gap-3 ${cols}`}>
        {ordered.map((entry, i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-line">
            <div className="bg-[#111] px-3 py-1.5 text-[12px] font-semibold text-white">Entry {i + 1}</div>
            <table className="w-full text-[14px]">
              <tbody>
                {Object.entries(entry).map(([label, val]) => (
                  <tr key={label} className="border-t border-line/60 first:border-0">
                    <td className="w-2/5 bg-[#f7f7f7] px-3 py-2 align-top text-[12px] font-medium uppercase tracking-wide text-muted">{label}</td>
                    <td className="px-3 py-2">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    );
  }
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

/** Groups occupant count fields into a summary table. */
function OccupantTable({ fields }: { fields: { label: string; value: unknown }[] }) {
  const get = (match: RegExp) => {
    const f = fields.find((x) => match.test(x.label));
    return f ? String(f.value) : "—";
  };
  const total = get(/total.*occupants/i);
  const adults = get(/number of adults/i);
  const working = get(/how many working/i);
  // Children = total - adults (if numeric).
  const t = parseInt(total), a = parseInt(adults);
  const children = !isNaN(t) && !isNaN(a) ? String(t - a) : "—";
  const rows: [string, string][] = [
    ["Total Occupants", total],
    ["Adults", adults],
    ["Children", children],
    ["Working Occupants", working],
  ];
  return (
    <div className="overflow-hidden rounded-lg border border-line sm:col-span-2">
      <table className="w-full text-[14px]">
        <thead>
          <tr className="bg-[#111] text-white">
            {rows.map(([label]) => (
              <th key={label} className="px-3 py-2 text-left text-[12px] font-semibold">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {rows.map(([label, val]) => (
              <td key={label} className="border-t border-line/60 bg-[#f7f7f7] px-3 py-2 text-center text-[16px] font-bold">{val}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** Branded, print-friendly rental application. Header/footer come from the
 *  branding snapshot taken when the share was created (Settings → Documents). */
export function SharedApplicationView({ share, formName }: { share: Share; formName: string }) {
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
            {b.header_name ? (
              <p className="text-[13px] font-medium uppercase tracking-wide text-[#666]">{b.header_name}</p>
            ) : null}
            <h1 className="mt-1 text-2xl font-bold text-[#111]">{formName}</h1>
            {b.header_tagline ? <p className="mt-1 text-[15px] text-[#333]">{b.header_tagline}</p> : null}
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-[#666]">
              {b.header_phone ? <span>{b.header_phone}</span> : null}
              {b.header_email ? <span>{b.header_email}</span> : null}
              {b.header_address ? <span>{b.header_address}</span> : null}
            </div>
          </header>

          <div className="px-8 py-6">
            <div className="mb-6 flex items-baseline justify-between">
              <p className="text-[13px] text-[#666]">Submitted {submitted}</p>
            </div>

            {share.snapshot.sections.map((sec, si) => {
              // Group occupant count fields into a summary table.
              const occupantFields = sec.fields.filter((f) =>
                !f.heading && /total.*occupants|number of adults|how many working/i.test(f.label)
              );
              const otherFields = sec.fields.filter((f) =>
                f.heading || !/total.*occupants|number of adults|how many working/i.test(f.label)
              );
              return (
              <section key={si} className="mb-8 break-inside-avoid">
                {sec.heading ? (
                  <h3 className="mb-3 border-b border-[#e5e5e5] pb-2 text-[16px] font-bold text-[#111]">{sec.heading}</h3>
                ) : null}
                <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  {occupantFields.length >= 2 ? <OccupantTable fields={occupantFields} /> : null}
                  {otherFields.map((f, fi) =>
                    f.heading ? (
                      <div key={fi} className="sm:col-span-2">
                        <p className="text-[14px] font-semibold text-[#333]">{f.label}</p>
                      </div>
                    ) : occupantFields.includes(f) ? null : (
                      <div key={fi} className={f.value && typeof f.value === "object" && "subform" in (f.value as object) ? "sm:col-span-2" : "sm:col-span-1"}>
                        <dt className="text-[12px] uppercase tracking-wide text-[#888]">{f.label}</dt>
                        <dd className="mt-0.5"><Value value={f.value} fieldLabel={f.label} /></dd>
                      </div>
                    ),
                  )}
                </dl>
              </section>
              );
            })}
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
