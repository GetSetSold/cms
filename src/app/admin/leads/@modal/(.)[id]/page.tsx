import { redirect } from "next/navigation";

/** Lead detail now always renders as a full page, not a modal.
 *  This intercepting route redirects client-side list clicks to the real page. */
export default async function LeadModalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/leads/${id}`);
}
