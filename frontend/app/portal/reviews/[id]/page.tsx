"use client";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PortalLayout } from "../../../../components/PortalLayout";
import {
  api,
  label,
  request,
  useWorkspace,
} from "../../../../components/useWorkspace";
import { useRealtime } from "../../../../components/useRealtime";
export default function Review() {
  const me = useWorkspace(),
    { id } = useParams(),
    router = useRouter(),
    [item, setItem] = useState<any>(),
    [feedback, setFeedback] = useState(""),
    [error, setError] = useState("");
  const load = useCallback(
    () =>
      fetch(`${api}/portal/reviews/${id}`, { credentials: "include" })
        .then((r) => r.json())
        .then((x) => (x.success ? setItem(x.data) : setError(x.error.message))),
    [id],
  );
  useEffect(() => { void load(); }, [load]);
  const live = useRealtime(load);
  async function act(action: string) {
    try {
      setError("");
      await request(`/portal/reviews/${id}/${action}`, {
        method: "POST",
        body: JSON.stringify({ comment: feedback }),
      });
      router.push("/portal/reviews");
    } catch (e: any) {
      setError(e.message);
    }
  }
  if (!me || (!item && !error))
    return <div className="loading">Loading review…</div>;
  return (
    <PortalLayout me={me} live={live}>
      {!item ? (
        <section className="card error-state">{error}</section>
      ) : (
        <>
          <header className="page-head">
            <div>
              <p className="eyebrow">{item.task.campaign.name}</p>
              <h1>{item.task.title}</h1>
              <p>
                Version {item.submissionNumber} · {label(item.status)}
              </p>
            </div>
          </header>
          {error && <p className="form-error">{error}</p>}
          <section className="card review-document">
            <h2>Submission</h2>
            <p>{item.description}</p>
            {item.deliverables.length ? (
              <div>
                {item.deliverables.map((d: any) => (
                  <article className="contact" key={d.id}>
                    📎 {d.fileName}{" "}
                    <small>
                      {Math.ceil(d.fileSize / 1024)} KB · {d.mimeType}
                    </small>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty">No file deliverables attached.</p>
            )}
          </section>
          <section className="card">
            <h2>Previous feedback</h2>
            {item.clientReviews.length ? (
              item.clientReviews.map((x: any) => (
                <article className="contact" key={x.id}>
                  <b>{label(x.status)}</b>
                  <p>
                    {x.comment || "No comment"} · {x.reviewer.name}
                  </p>
                </article>
              ))
            ) : (
              <p>No previous client feedback.</p>
            )}
          </section>
          {item.status === "PENDING_REVIEW" && (
            <section className="card">
              <label>
                Feedback
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Required when requesting changes"
                />
              </label>
              <div className="button-row">
                <button onClick={() => act("approve")}>Approve version</button>
                <button
                  className="secondary"
                  onClick={() => act("request-changes")}
                >
                  Request changes
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </PortalLayout>
  );
}
