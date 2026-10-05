"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PortalLayout } from "../../../components/PortalLayout";
import {
  api,
  label,
  request,
  useWorkspace,
} from "../../../components/useWorkspace";
import { useRealtime } from "../../../components/useRealtime";
export default function Notifications() {
  const me = useWorkspace(),
    [rows, setRows] = useState<any[]>(),
    [unread, setUnread] = useState(0);
  const load = useCallback(
    () =>
      fetch(api + "/notifications", { credentials: "include" })
        .then((r) => r.json())
        .then((x) => {
          if (x.success) {
            setRows(x.data);
            setUnread(x.unread);
          }
        }),
    [],
  );
  useEffect(() => { void load(); }, [load]);
  const live = useRealtime(load);
  async function read(id: string) {
    await request(`/notifications/${id}/read`, { method: "PATCH" });
    load();
  }
  async function all() {
    await request("/notifications/read-all", { method: "POST" });
    load();
  }
  if (!me || !rows)
    return <div className="loading">Loading notifications…</div>;
  return (
    <PortalLayout me={me} live={live}>
      <header className="page-head">
        <div>
          <p className="eyebrow">INBOX</p>
          <h1>
            Notifications <span className="pill green">{unread} unread</span>
          </h1>
        </div>
        {unread > 0 && (
          <button className="secondary" onClick={all}>
            Mark all as read
          </button>
        )}
      </header>
      <section className="card notification-list">
        {rows.length ? (
          rows.map((n) => (
            <article
              className={`contact ${n.readAt ? "" : "unread"}`}
              key={n.id}
            >
              <div>
                <b>{n.title}</b>
                <p>{n.message}</p>
                <small>
                  {label(n.type)} · {new Date(n.createdAt).toLocaleString()}
                </small>
              </div>
              <div>
                {n.entityType === "task" && (
                  <Link
                    className="record-link"
                    href={`/portal/tasks/${n.entityId}`}
                  >
                    Open
                  </Link>
                )}
                {!n.readAt && (
                  <button className="secondary" onClick={() => read(n.id)}>
                    Mark read
                  </button>
                )}
              </div>
            </article>
          ))
        ) : (
          <div className="empty">You’re all caught up.</div>
        )}
      </section>
    </PortalLayout>
  );
}
