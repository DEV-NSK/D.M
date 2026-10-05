"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PortalLayout } from "../../../../components/PortalLayout";
import { Progress, TaskRows } from "../../../../components/PortalList";
import { api, label, useWorkspace } from "../../../../components/useWorkspace";
import { useRealtime } from "../../../../components/useRealtime";
export default function Campaign() {
  const me = useWorkspace(),
    { id } = useParams(),
    [item, setItem] = useState<any>(),
    [error, setError] = useState("");
  const load = useCallback(
    () =>
      fetch(`${api}/portal/campaigns/${id}`, { credentials: "include" })
        .then((r) => r.json())
        .then((x) => (x.success ? setItem(x.data) : setError(x.error.message))),
    [id],
  );
  useEffect(() => { void load(); }, [load]);
  const live = useRealtime(load);
  if (!me || (!item && !error))
    return <div className="loading">Loading campaign…</div>;
  if (!item)
    return (
      <PortalLayout me={me} live={live}>
        <section className="card error-state">{error}</section>
      </PortalLayout>
    );
  const done = item.tasks.filter((t: any) => t.status === "COMPLETED").length,
    progress = item.tasks.length
      ? Math.round((done / item.tasks.length) * 100)
      : 0;
  return (
    <PortalLayout me={me} live={live}>
      <header className="page-head">
        <div>
          <p className="eyebrow">CAMPAIGN</p>
          <h1>{item.name}</h1>
          <p>
            <span className="pill green">{label(item.status)}</span> ·{" "}
            {item.startDate
              ? new Date(item.startDate).toLocaleDateString()
              : "Open"}{" "}
            –{" "}
            {item.endDate
              ? new Date(item.endDate).toLocaleDateString()
              : "Open"}
          </p>
        </div>
      </header>
      <section className="card">
        <div className="card-title">
          <div>
            <h2>Overview</h2>
            <p>
              {item.description ||
                item.objectiveSummary ||
                "No description provided."}
            </p>
          </div>
          <strong>{progress}%</strong>
        </div>
        <Progress value={progress} />
      </section>
      <section className="card table-card">
        <div className="card-title">
          <div>
            <h2>Shared tasks</h2>
            <p>Only client-visible work is included.</p>
          </div>
        </div>
        <TaskRows
          tasks={item.tasks.map((t: any) => ({
            ...t,
            campaign: { id: item.id, name: item.name },
          }))}
        />
      </section>
      <section className="card">
        <h2>Objectives</h2>
        {item.objectives.length ? (
          item.objectives.map((o: any) => (
            <article className="contact" key={o.id}>
              <b>{o.title}</b>
              <p>{o.description}</p>
            </article>
          ))
        ) : (
          <div className="empty">No client-facing objectives.</div>
        )}
      </section>
      <Link className="record-link" href="/portal/campaigns">
        ← Back to campaigns
      </Link>
    </PortalLayout>
  );
}
