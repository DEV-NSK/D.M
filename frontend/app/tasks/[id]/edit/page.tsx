"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Layout } from "../../../../components/Layout";
import { TaskForm } from "../../../../components/TaskForm";
import { api, useWorkspace } from "../../../../components/useWorkspace";
export default function EditTask() {
  const me = useWorkspace(), { id } = useParams(), [task, setTask] = useState<any>();
  useEffect(() => { fetch(`${api}/tasks/${id}`, { credentials: "include" }).then(r => r.json()).then(x => setTask(x.data)); }, [id]);
  if (!me || !task) return <div className="loading">Loading task…</div>;
  return <Layout me={me}><header className="page-head"><div><p className="eyebrow">EDIT TASK</p><h1>{task.title}</h1><p>Update task details, assignment, and schedule.</p></div></header><TaskForm task={task} role={me.role} /></Layout>;
}
