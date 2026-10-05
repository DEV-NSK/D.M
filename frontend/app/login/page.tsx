"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
export default function Login() {
  const [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const router = useRouter();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const r = await fetch(api + "/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
      }),
      x = await r.json();
    setLoading(false);
    if (!x.success) return setError(x.error.message);
    router.push(x.data.role === "CLIENT" ? "/portal" : "/dashboard");
  }
  return (
    <main className="auth">
      <Link className="brand" href="/">
        <i>✦</i> D.M
      </Link>
      <section>
        <p className="eyebrow">WELCOME TO D.M</p>
        <h1>Welcome back</h1>
        <p>Sign in to your D.M workspace.</p>
        <form onSubmit={submit}>
          <label>
            Email
            <input
              required
              name="email"
              type="email"
              placeholder="you@company.com"
            />
          </label>
          <label>
            Password<Link href="/forgot-password">Forgot password?</Link>
            <input
              required
              name="password"
              type="password"
              placeholder="••••••••"
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button disabled={loading}>
            {loading ? "Signing in…" : "Sign in to D.M"}
          </button>
        </form>
        <p className="switch">
          New to D.M? <Link href="/register">Create your organization</Link>
        </p>
      </section>
      <aside>
        <div>
          <p className="eyebrow">ONE WORKSPACE</p>
          <h2>Marketing teams move better together.</h2>
          <p>
            Organize your campaigns, reviews and conversations from a single
            calm, focused home.
          </p>
        </div>
      </aside>
    </main>
  );
}
