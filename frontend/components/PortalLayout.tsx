"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "./useWorkspace";
export function PortalLayout({
  me,
  live,
  children,
}: {
  me: any;
  live?: string;
  children: React.ReactNode;
}) {
  const path = usePathname(),
    router = useRouter(),
    items = [
      ["Dashboard", "/portal"],
      ["Campaigns", "/portal/campaigns"],
      ["Tasks", "/portal/tasks"],
      ["Reviews", "/portal/reviews"],
      ["Notifications", "/portal/notifications"],
      ["Profile", "/portal/profile"],
    ];
  async function logout() {
    await fetch(api + "/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    router.push("/login");
  }
  return (
    <main className="app-shell portal-shell">
      <aside className="sidebar portal-sidebar">
        <Link className="brand" href="/portal">
          <i>✦</i> D.M
        </Link>
        <p className="workspace">CLIENT PORTAL</p>
        <nav>
          {items.map(([t, u]) => (
            <Link
              className={
                path === u || (u != "/portal" && path.startsWith(u))
                  ? "active"
                  : ""
              }
              href={u}
              key={u}
            >
              {t}
            </Link>
          ))}
        </nav>
        <div className="side-user">
          <span>{me.user.name[0]}</span>
          <div>
            <b>{me.user.name}</b>
            <small>Client</small>
          </div>
          <button onClick={logout} title="Sign out">
            ↗
          </button>
        </div>
      </aside>
      <section className="main">
        <div className="topbar">
          <span className={`live-status ${live || ""}`}>
            ●{" "}
            {live === "connected"
              ? "Live"
              : live === "reconnecting"
                ? "Reconnecting…"
                : "Connecting…"}
          </span>
          <Link href="/portal/notifications">Notifications</Link>
        </div>
        <div className="page">{children}</div>
      </section>
    </main>
  );
}
