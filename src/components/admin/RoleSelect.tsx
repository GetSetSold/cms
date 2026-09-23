"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/types";

export function RoleSelect({ id, role }: { id: string; role: Role }) {
  const [value, setValue] = useState(role);
  const [msg, setMsg] = useState("");
  async function change(r: Role) {
    setValue(r);
    const { error } = await createClient().from("profiles").update({ role: r }).eq("id", id);
    setMsg(error ? "Failed" : "Saved");
  }
  return (
    <span className="flex items-center gap-2">
      <select className="input w-36" value={value} onChange={(e) => change(e.target.value as Role)}>
        <option value="admin">Admin</option><option value="editor">Editor</option><option value="sales">Sales</option>
      </select>
      <span className="text-xs text-muted">{msg}</span>
    </span>
  );
}
