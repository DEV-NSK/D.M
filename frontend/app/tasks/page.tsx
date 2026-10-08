"use client";
import { Layout } from "../../components/Layout";
import { TaskBoard } from "../../components/TaskBoard";
import { useWorkspace } from "../../components/useWorkspace";
export default function Tasks() { const me = useWorkspace(); return me ? <Layout me={me}><TaskBoard me={me} /></Layout> : <div className="loading">Loading task board…</div>; }
