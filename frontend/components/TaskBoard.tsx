"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, label } from "./useWorkspace";
import { useRealtime } from "./useRealtime";

const columns = ["TODO", "ASSIGNED", "IN_PROGRESS", "COMPLETED"];
export function TaskBoard({ me }: { me: any }) {
  const [tasks, setTasks] = useState<any[]>([]), [options, setOptions] = useState<any>({ teams: [], campaigns: [], employees: [], teamLeads: [] });
  const [filters, setFilters] = useState<any>({ search: "", team_id: "", team_lead_id: "", campaign_id: "", assignee_id: "", priority: "" });
  const [state, setState] = useState<"loading" | "ready" | "error">("loading"), [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page_size: "100", ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) } as any);
      const [taskRes, optionRes] = await Promise.all([fetch(`${api}/tasks?${params}`, { credentials: "include" }), fetch(`${api}/task-board/options`, { credentials: "include" })]);
      const [taskJson, optionJson] = await Promise.all([taskRes.json(), optionRes.json()]);
      if (!taskRes.ok) throw new Error(taskJson.error?.message || "Unable to load tasks");
      setTasks(taskJson.data); if (optionJson.success) setOptions(optionJson.data); setState("ready"); setError("");
    } catch (e: any) { setError(e.message); setState("error"); }
  }, [filters]);
  useEffect(() => { const timer = setTimeout(load, 200); return () => clearTimeout(timer); }, [load]);
  useRealtime(load);
  const grouped = useMemo(() => Object.fromEntries(columns.map(c => [c, tasks.filter(t => t.status === c)])), [tasks]);
  const heading = me.role === "EMPLOYEE" ? "My Tasks" : me.role === "CEO" ? "Task Overview" : `${label(me.role)} Task Board`;
  const set = (key: string, value: string) => setFilters((x: any) => ({ ...x, [key]: value }));
  return <>
    <header className="page-head"><div><p className="eyebrow">OPERATIONS</p><h1>{heading}</h1><p>{me.role === "EMPLOYEE" ? "Your assigned work, in one place." : "Live execution across your authorized teams."}</p></div>{me.role === "TEAM_LEAD" && <Link className="button" href="/tasks/new">+ Create task</Link>}</header>
    <div className="board-filters">
      <input aria-label="Search tasks" placeholder="Search tasks, campaigns, or employees…" value={filters.search} onChange={e => set("search", e.target.value)} />
      {me.role !== "EMPLOYEE" && <select aria-label="Team" value={filters.team_id} onChange={e => set("team_id", e.target.value)}><option value="">All teams</option>{options.teams.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>}
      {(["CEO", "MANAGER"].includes(me.role)) && <select aria-label="Team Lead" value={filters.team_lead_id} onChange={e => set("team_lead_id", e.target.value)}><option value="">All team leads</option>{options.teamLeads.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>}
      <select aria-label="Campaign" value={filters.campaign_id} onChange={e => set("campaign_id", e.target.value)}><option value="">All campaigns</option>{options.campaigns.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
      {me.role !== "EMPLOYEE" && <select aria-label="Employee" value={filters.assignee_id} onChange={e => set("assignee_id", e.target.value)}><option value="">All employees</option>{options.employees.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>}
      <select aria-label="Priority" value={filters.priority} onChange={e => set("priority", e.target.value)}><option value="">All priorities</option>{["LOW", "MEDIUM", "HIGH", "URGENT"].map(x => <option key={x}>{label(x)}</option>)}</select>
    </div>
    {state === "loading" && <div className="board-skeleton">{columns.map(x => <div key={x} />)}</div>}
    {state === "error" && <section className="card error-state"><h2>Unable to load tasks</h2><p>{error}</p><button onClick={load}>Try again</button></section>}
    {state === "ready" && <div className="task-board">{columns.map(column => <section className="board-column" key={column}><header><span>{label(column)}</span><b>{grouped[column].length}</b></header><div>{grouped[column].length ? grouped[column].map((task: any) => <Link href={`/tasks/${task.id}`} className="task-card" key={task.id}><h3>{task.title}</h3><p>{task.campaign.name}</p><small>{task.team.name}</small><div className="task-owner"><span>{task.assignees[0]?.user.name?.[0] || "–"}</span>{task.assignees[0]?.user.name || "Unassigned"}</div><footer><span className={`pill priority-${task.priority.toLowerCase()}`}>{label(task.priority)}</span><time>{task.dueDate ? `Due ${new Date(task.dueDate).toLocaleDateString()}` : "No due date"}</time></footer></Link>) : <div className="column-empty"><b>No tasks here</b><span>{me.role === "EMPLOYEE" ? "Your assigned tasks will appear here." : "You're all caught up."}</span></div>}</div></section>)}</div>}
  </>;
}
