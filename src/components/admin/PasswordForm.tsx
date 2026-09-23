"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function PasswordForm() {
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  async function save() {
    const { error } = await createClient().auth.updateUser({ password: pw });
    setMsg(error ? error.message : "Password updated"); if (!error) setPw("");
  }
  return (
    <div className="card flex flex-col gap-3">
      <label className="label">New password<input type="password" autoComplete="new-password" minLength={10} className="input" value={pw} onChange={(e) => setPw(e.target.value)} /></label>
      <button className="btn-primary self-start" disabled={pw.length < 10} onClick={save}>Set password</button>
      <p className="text-xs text-muted">At least 10 characters.</p>
      {msg ? <p className="text-sm text-muted" role="status">{msg}</p> : null}
    </div>
  );
}
