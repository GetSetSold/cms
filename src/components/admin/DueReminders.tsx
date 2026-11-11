"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export type DueReminder = {
  id: string;
  lead_id: string;
  remind_at: string;
  note: string;
  lead: { first_name: string | null; last_name: string | null; email: string | null } | null;
};

/** Follow-ups due today or overdue, on the Leads page. Done clears the reminder. */
export function DueReminders({ initial }: { initial: DueReminder[] }) {
  const [items, setItems] = useState(initial);
  if (!items.length) return null;
  const name = (r: DueReminder) =>
    [r.lead?.first_name, r.lead?.last_name].filter(Boolean).join(" ") || r.lead?.email || "Unnamed lead";
  const overdue = (iso: string) => new Date(iso).getTime() < Date.now();

  async function markDone(id: string) {
    const { error } = await createClient().from("lead_reminders").update({ done: true }).eq("id", id);
    if (!error) setItems(items.filter((r) => r.id !== id));
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <strong className="text-[15px]">Follow-ups due ({items.length})</strong>
      <ul className="mt-2 flex flex-col gap-2">
        {items.map((r) => (
          <li key={r.id} className="flex items-start justify-between gap-3 rounded-lg bg-white p-3">
            <div>
              <Link href={`/admin/leads/${r.lead_id}`} className="font-medium hover:text-primary">
                {name(r)}
              </Link>
              <div className="text-[13px]">{r.note || "Follow up"}</div>
              <div className={`text-xs ${overdue(r.remind_at) ? "font-medium text-red-600" : "text-muted"}`}>
                {overdue(r.remind_at) ? "Overdue — " : "Due — "}
                {new Date(r.remind_at).toLocaleString()}
              </div>
            </div>
            <button className="btn h-8 shrink-0 px-3 text-[12px]" onClick={() => markDone(r.id)}>Done</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
