"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PortalLayout } from "../../../components/PortalLayout";
import { Empty } from "../../../components/PortalList";
import { api, label, useWorkspace } from "../../../components/useWorkspace";
import { useRealtime } from "../../../components/useRealtime";
export default function Reviews() {
  const me = useWorkspace(),
    [rows, setRows] = useState<any[]>();
  const load = useCallback(
    () =>
      fetch(api + "/portal/reviews", { credentials: "include" })
        .then((r) => r.json())
        .then((x) => x.success && setRows(x.data)),
    [],
  );
  useEffect(() => { void load(); }, [load]);
  const live = useRealtime(load);
  if (!me || !rows) return <div className="loading">Loading reviews…</div>;
  return (
    <PortalLayout me={me} live={live}>
      <header className="page-head">
        <div>
          <p className="eyebrow">ACTION CENTER</p>
          <h1>Reviews</h1>
          <p>Approve ready work or send clear revision feedback.</p>
        </div>
      </header>
      <section className="portal-grid">
        {rows.map((s) => (
          <article className="card portal-card" key={s.id}>
            <span
              className={`pill ${s.status === "PENDING_REVIEW" ? "gold" : "green"}`}
            >
              {label(s.status)}
            </span>
            <h2>{s.task.title}</h2>
            <p>
              {s.task.campaign.name} · Version {s.submissionNumber}
            </p>
            <small>{new Date(s.createdAt).toLocaleString()}</small>
            <Link className="button" href={`/portal/reviews/${s.id}`}>
              {s.status === "PENDING_REVIEW" ? "Review" : "View review"}
            </Link>
          </article>
        ))}
      </section>
      {!rows.length && (
        <Empty>You’re all caught up. No reviews are waiting for you.</Empty>
      )}
    </PortalLayout>
  );
}
