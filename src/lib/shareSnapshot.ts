/** Context sections prepended to a form-share snapshot.
 *
 * Form answers alone often miss two things the recipient needs:
 *  - WHICH property a listing inquiry is about. The listing page stores
 *    `listing_key` + `address` in the lead's custom_fields (extraFields
 *    from ListingContactCard), and the lead's source_path is the listing
 *    page path — together they give the full public listing URL.
 *  - The lead's contact details. Name / email / phone live on the lead
 *    row, not in the form answers, so a share built only from answers
 *    can end up showing just the message text.
 *
 * Both sections render in the shared view's normal form style
 * (label + value). Fields the form sections already show (matched by
 * label) are skipped so nothing appears twice.
 */

export type SnapshotField = { label: string; value: unknown; href?: string };
export type SnapshotSection = { heading: string; fields: SnapshotField[] };

export type LeadContext = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  source_path: string | null;
  custom_fields: Record<string, unknown> | null;
};

export const LEAD_CONTEXT_COLUMNS =
  "first_name,last_name,email,phone,source_path,custom_fields";

export function buildContextSections(
  lead: LeadContext | null,
  formSections: SnapshotSection[],
): SnapshotSection[] {
  if (!lead) return [];
  const out: SnapshotSection[] = [];

  // ---- Property (listing inquiries) ----
  const cf = lead.custom_fields ?? {};
  const listingKey = typeof cf.listing_key === "string" ? cf.listing_key : "";
  const address = typeof cf.address === "string" ? cf.address.trim() : "";
  const path = lead.source_path ?? "";
  const listingPath = path.startsWith("/real-estate/") ? path : "";
  if (listingKey || listingPath) {
    const fields: SnapshotField[] = [];
    if (address) fields.push({ label: "Property", value: address });
    if (listingPath) {
      const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.getsetsold.ca";
      const url = `${base.replace(/\/$/, "")}${listingPath}`;
      fields.push({ label: "Listing", value: url, href: url });
    } else if (listingKey) {
      fields.push({ label: "Listing Key", value: listingKey });
    }
    if (fields.length) out.push({ heading: "Property", fields });
  }

  // ---- Contact (lead row, skipped when the form already shows it) ----
  const shownLabels = formSections.flatMap((s) => s.fields.map((f) => f.label.toLowerCase()));
  const alreadyShown = (re: RegExp) => shownLabels.some((l) => re.test(l));
  const contact: SnapshotField[] = [];
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ").trim();
  if (name && !alreadyShown(/name/)) contact.push({ label: "Name", value: name });
  if (lead.email && !alreadyShown(/e-?mail/)) contact.push({ label: "Email", value: lead.email });
  if (lead.phone && !alreadyShown(/phone|tel/)) contact.push({ label: "Phone", value: lead.phone });
  if (contact.length) out.push({ heading: "Contact", fields: contact });

  return out;
}
