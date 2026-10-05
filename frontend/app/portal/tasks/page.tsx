"use client";
import { useCallback, useEffect, useState } from "react";
import { PortalLayout } from "../../../components/PortalLayout";
import { TaskRows } from "../../../components/PortalList";
import { api, useWorkspace } from "../../../components/useWorkspace";
import { useRealtime } from "../../../components/useRealtime";
export default function Tasks() {
  const me = useWorkspace(),
    [rows, setRows] = useState<any[]>(),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("");
  const load = useCallback(
    () =>
      fetch(
        `${api}/portal/tasks?search=${encodeURIComponent(search)}&status=${status}`,
        { credentials: "include" },
      )
        .then((r) => r.json())
        .then((x) => x.success && setRows(x.data)),
    [search, status],
  );
  useEffect(() => { void load(); }, [load]);
  const live = useRealtime(load);
  if (!me || !rows) return <div className="loading">Loading tasks…</div>;
  return (
    <PortalLayout me={me} live={live}>
      <header className="page-head">
        <div>
          <p className="eyebrow">SHARED EXECUTION</p>
          <h1>Tasks</h1>
          <p>Only work explicitly shared with your team appears here.</p>
        </div>
      </header>
      <div className="filter-bar">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option>TODO</option>
          <option>IN_PROGRESS</option>
          <option>IN_REVIEW</option>
          <option>REVISION_REQUIRED</option>
          <option>COMPLETED</option>
        </select>
      </div>
      <section className="card table-card">
        <TaskRows tasks={rows} />
      </section>
    </PortalLayout>
  );
}
