"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, request } from "./useWorkspace";
import { useRealtime } from "./useRealtime";

export function formatDuration(seconds?: number | null) {
  const value = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(value / 3600), m = Math.floor((value % 3600) / 60), s = value % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s` : `${m}m ${String(s).padStart(2, "0")}s`;
}

export function TaskTimer({ task, me, onChanged }: any) {
  const [time, setTime] = useState<any>(), [now, setNow] = useState(Date.now()), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const load = useCallback(async () => { const r = await fetch(`${api}/tasks/${task.id}/time`, { credentials: "include" }); const x = await r.json(); if (r.ok) setTime(x.data); }, [task.id]);
  useEffect(() => { load(); }, [load]);
  useRealtime(load);
  useEffect(() => { if (!time?.activeSession) return; const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [time?.activeSession]);
  const actual = useMemo(() => (time?.actualDurationSeconds || 0) + (time?.activeSession && time?.serverTime ? Math.max(0, Math.floor((now - new Date(time.serverTime).getTime()) / 1000)) : 0), [time, now]);
  async function command(path: string) { try { setBusy(true); setError(""); await request(`/tasks/${task.id}${path}`, { method: "POST", body: "{}" }); await load(); await onChanged?.(); } catch (e: any) { setError(e.message); } finally { setBusy(false); } }
  const assigned = task.assignees.some((a: any) => a.userId === me.user.id), canControl = me.role === "EMPLOYEE" && assigned && !["COMPLETED", "CANCELLED", "IN_REVIEW"].includes(task.status);
  const hasHistory = !!time?.sessions?.length, active = time?.activeSession;
  return <section className="card time-card"><div className="card-title"><div><p className="eyebrow">TIME TRACKING</p><h2>{active ? "Tracking in progress" : task.status === "COMPLETED" ? "Task completed" : hasHistory ? "Timer paused" : "Ready to start"}</h2></div><strong className={active ? "live-timer" : ""}>{formatDuration(actual)}</strong></div>
    <div className="time-metrics"><div><small>Estimated</small><b>{time?.estimatedDurationSeconds ? formatDuration(time.estimatedDurationSeconds) : "Not set"}</b></div><div><small>Actual</small><b>{formatDuration(actual)}</b></div><div><small>Variance</small><b>{time?.varianceSeconds == null ? "—" : `${time.varianceSeconds > 0 ? "+" : time.varianceSeconds < 0 ? "−" : ""}${formatDuration(Math.abs(time.varianceSeconds))}`}</b></div><div><small>Deadline</small><b className={time?.isOverdue ? "overdue" : ""}>{task.dueDate ? new Date(task.dueDate).toLocaleString() : "Not set"}{time?.isOverdue ? " · Overdue" : ""}</b></div></div>
    {canControl && <div className="button-row timer-actions">{active ? <button disabled={busy} onClick={() => command("/time/pause")}>Pause</button> : <button disabled={busy} onClick={() => command(hasHistory ? "/time/resume" : "/time/start")}>{hasHistory ? "Resume" : "Start task"}</button>}<button className="secondary" disabled={busy} onClick={() => command("/complete")}>Complete task</button></div>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {hasHistory && <div className="session-list"><h3>Work sessions</h3>{time.sessions.map((s: any) => <div key={s.id}><span>{new Date(s.startedAt).toLocaleString()} → {s.endedAt ? new Date(s.endedAt).toLocaleTimeString() : "Now"}</span><b>{formatDuration(s.durationSeconds ?? Math.floor((now - new Date(s.startedAt).getTime()) / 1000))}</b></div>)}</div>}
  </section>;
}
