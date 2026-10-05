"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PortalLayout } from "../../../components/PortalLayout";
import { Progress, Empty } from "../../../components/PortalList";
import { api, label, useWorkspace } from "../../../components/useWorkspace";
import { useRealtime } from "../../../components/useRealtime";
export default function Campaigns() {
  const me = useWorkspace(),
    [rows, setRows] = useState<any[]>(),
    [search, setSearch] = useState("");
  const load = useCallback(
    () =>
      fetch(`${api}/portal/campaigns?search=${encodeURIComponent(search)}`, {
        credentials: "include",
      })
        .then((r) => r.json())
        .then((x) => x.success && setRows(x.data)),
    [search],
  );
  useEffect(() => { void load(); }, [load]);
  const live = useRealtime(load);
  if (!me || !rows) return <div className="loading">Loading campaigns…</div>;
  return (
    <PortalLayout me={me} live={live}>
      <header className="page-head">
        <div>
          <p className="eyebrow">MY WORK</p>
          <h1>Campaigns</h1>
          <p>Progress and deliverables shared with you.</p>
        </div>
      </header>
      <div className="filter-bar">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search campaigns"
        />
      </div>
      <section className="portal-grid">
        {rows.map((c) => (
          <Link
            className="card portal-card"
            href={`/portal/campaigns/${c.id}`}
            key={c.id}
          >
            <span className="pill green">{label(c.status)}</span>
            <h2>{c.name}</h2>
            <p>{c.description || "No description provided."}</p>
            <Progress value={c.progress} />
            <small>
              {c.progress}% complete · {c.pendingReviews} pending review
              {c.pendingReviews === 1 ? "" : "s"}
            </small>
          </Link>
        ))}
      </section>
      {!rows.length && <Empty>No campaigns are available yet.</Empty>}
    </PortalLayout>
  );
}
