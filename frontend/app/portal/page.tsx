"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PortalLayout } from "../../components/PortalLayout";
import { api, label, useWorkspace } from "../../components/useWorkspace";
import { useRealtime } from "../../components/useRealtime";
export default function Portal() {
  const me = useWorkspace(),
    [data, setData] = useState<any>();
  const load = useCallback(() => {
    fetch(api + "/portal/dashboard", { credentials: "include" })
      .then((r) => r.json())
      .then((x) => x.success && setData(x.data));
  }, []);
  useEffect(() => { void load(); }, [load]);
  const live = useRealtime(load);
  if (!me || !data) return <div className="loading">Loading your portal…</div>;
  return (
    <PortalLayout me={me} live={live}>
      <header className="page-head">
        <div>
          <p className="eyebrow">{data.client.name}</p>
          <h1>
            Good {new Date().getHours() < 12 ? "morning" : "afternoon"},{" "}
            {me.user.name.split(" ")[0]}.
          </h1>
          <p>Here’s what’s happening with your campaigns.</p>
        </div>
      </header>
      <section className="metrics">
        <Metric title="Active campaigns" value={data.activeCampaigns} />
        <Metric title="Pending reviews" value={data.pendingReviews} />
        <Metric title="Awaiting your action" value={data.awaitingAction} />
        <Metric title="Completed" value={data.completed} />
      </section>
      <section className="card attention">
        <div className="card-title">
          <div>
            <h2>Needs your attention</h2>
            <p>Your current action queue.</p>
          </div>
          <Link href="/portal/reviews" className="button">
            Open reviews
          </Link>
        </div>
        <strong>{data.pendingReviews}</strong> deliverable
        {data.pendingReviews === 1 ? "" : "s"} awaiting review ·{" "}
        {data.unreadNotifications} unread notification
        {data.unreadNotifications === 1 ? "" : "s"}
      </section>
      <section className="card activity">
        <h2>Recent activity</h2>
        {data.recentActivity.length ? (
          <ul>
            {data.recentActivity.map((a: any) => (
              <li key={a.id}>
                <span className="activity-icon">✦</span>
                <div>
                  <b>{label(a.activityType)}</b>
                  <p>
                    {a.task.title} · {a.description} ·{" "}
                    {new Date(a.createdAt).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty">No shared activity yet.</div>
        )}
      </section>
    </PortalLayout>
  );
}
function Metric({ title, value }: { title: string; value: number }) {
  return (
    <article className="metric">
      <small>{title}</small>
      <strong>{value}</strong>
      <p>Current</p>
    </article>
  );
}
