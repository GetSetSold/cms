"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { resetPassword, sendMagicLink, signIn } from "./actions";

type State = { error?: string; message?: string } | undefined;

export function LoginForm({ next }: { next?: string }) {
  const [mode, setMode] = useState<"password" | "magic" | "reset">("password");
  const [pwState, pwAction, pwPending] = useActionState<State, FormData>(signIn, undefined);
  const [mlState, mlAction, mlPending] = useActionState<State, FormData>(sendMagicLink, undefined);
  const [rsState, rsAction, rsPending] = useActionState<State, FormData>(resetPassword, undefined);

  const action = mode === "password" ? pwAction : mode === "magic" ? mlAction : rsAction;
  const state = mode === "password" ? pwState : mode === "magic" ? mlState : rsState;
  const pending = pwPending || mlPending || rsPending;

  return (
    <form action={action} className="flex w-full max-w-[400px] flex-col gap-[18px]">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[28px] font-semibold">{mode === "reset" ? "Reset password" : "Sign in"}</h2>
        <p className="text-muted">Use your work email.</p>
      </div>
      <input type="hidden" name="next" value={next ?? "/admin"} />
      <label className="label">Email
        <input name="email" type="email" required autoComplete="email" className="input h-12 text-[15px]" />
      </label>
      {mode === "password" ? (
        <>
          <label className="label">
            <span className="flex justify-between">Password
              <button type="button" onClick={() => setMode("reset")} className="text-primary">Forgot password?</button>
            </span>
            <input name="password" type="password" required autoComplete="current-password" className="input h-12 text-[15px]" />
          </label>
        </>
      ) : null}

      {state?.error ? <p className="text-sm text-red-700" role="alert">{state.error}</p> : null}
      {state?.message ? <p className="text-sm text-primary" role="status">{state.message}</p> : null}

      <button disabled={pending} className="btn-primary h-[50px] text-[15px]">
        {mode === "password" ? "Sign in" : mode === "magic" ? "Email me a sign-in link" : "Send reset link"}
      </button>

      <div className="flex items-center gap-3 text-[13px] text-muted">
        <div className="h-px flex-1 bg-line" />or<div className="h-px flex-1 bg-line" />
      </div>
      <button type="button" className="btn h-[50px] text-[15px]" onClick={() => setMode(mode === "password" ? "magic" : "password")}>
        {mode === "password" ? "Email me a sign-in link instead" : "Sign in with a password"}
      </button>
      <p className="text-[13px] text-muted">No account? Ask an admin to invite you. <Link href="/" className="text-primary">Back to website</Link></p>
    </form>
  );
}
