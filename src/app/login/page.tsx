"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <main className="min-h-screen grid place-items-center px-5">
      <div className="w-full max-w-sm">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-[var(--accent)] text-white text-lg font-bold">
            R
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Retail BI</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Sign in to your shop dashboard</p>
        </div>

        <form action={formAction} className="card p-6 space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="username" required className="field" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
          </div>

          {state?.error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">{state.error}</p>
          ) : null}

          <button type="submit" disabled={pending} className="btn btn-primary w-full">
            {pending ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-[var(--muted)]">
          First time here? Set INITIAL_EMAIL and INITIAL_PASSWORD, then run <code>npm run db:seed</code>.
        </p>
      </div>
    </main>
  );
}
