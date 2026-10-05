"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PortalLayout } from "../../../../components/PortalLayout";
import { Progress } from "../../../../components/PortalList";
import {
  api,
  label,
  request,
  useWorkspace,
} from "../../../../components/useWorkspace";
import { useRealtime } from "../../../../components/useRealtime";
export default function Task() {
  const me = useWorkspace(),
    { id } = useParams(),
    [task, setTask] = useState<any>(),
    [error, setError] = useState(""),
    [comment, setComment] = useState("");
  const load = useCallback(
    () =>
      fetch(`${api}/portal/tasks/${id}`, { credentials: "include" })
        .then((r) => r.json())
        .then((x) => (x.success ? setTask(x.data) : setError(x.error.message))),
    [id],
  );
  useEffect(() => { void load(); }, [load]);
  const live = useRealtime(load);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    try {
      await request(`/portal/tasks/${id}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: comment }),
      });
      setComment("");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }
  if (!me || (!task && !error))
    return <div className="loading">Loading task…</div>;
  return (
    <PortalLayout me={me} live={live}>
      {!task ? (
        <section className="card error-state">{error}</section>
      ) : (
        <>
          <header className="page-head">
            <div>
              <p className="eyebrow">{task.campaign.name}</p>
              <h1>{task.title}</h1>
              <p>
                <span className="pill green">{label(task.status)}</span> · Due{" "}
                {task.dueDate
                  ? new Date(task.dueDate).toLocaleDateString()
                  : "not set"}
              </p>
            </div>
          </header>
          <section className="card">
            <h2>Progress · {task.progressPercentage}%</h2>
            <Progress value={task.progressPercentage} />
            <p>{task.description || "No description provided."}</p>
          </section>
          <div className="detail-grid">
            <section className="card">
              <h2>Deliverables</h2>
              {task.submissions.map((s: any) => (
                <article className="submission" key={s.id}>
                  <b>Version {s.submissionNumber}</b>{" "}
                  <span className="pill green">{label(s.status)}</span>
                  <p>{s.description}</p>
                  {s.deliverables.map((d: any) => (
                    <p key={d.id}>📎 {d.fileName}</p>
                  ))}
                  {s.status === "PENDING_REVIEW" && (
                    <Link className="button" href={`/portal/reviews/${s.id}`}>
                      Review version
                    </Link>
                  )}
                </article>
              ))}
            </section>
            <section className="card">
              <h2>Discussion</h2>
              {task.comments.map((c: any) => (
                <article className="comment" key={c.id}>
                  <span className="table-avatar">{c.author.name[0]}</span>
                  <div>
                    <b>{c.author.name}</b>
                    <small>{new Date(c.createdAt).toLocaleString()}</small>
                    <p>{c.content}</p>
                  </div>
                </article>
              ))}
              <form className="inline-form" onSubmit={send}>
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  required
                  placeholder="Add a shared comment"
                />
                <button>Send</button>
              </form>
            </section>
          </div>
        </>
      )}
    </PortalLayout>
  );
}
