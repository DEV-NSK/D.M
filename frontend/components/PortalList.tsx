"use client";
import Link from "next/link";
import { label } from "./useWorkspace";
export function Progress({ value }: { value: number }) {
  return (
    <div className="progress large">
      <span style={{ width: `${value}%` }} />
    </div>
  );
}
export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="empty">{children}</div>;
}
export function TaskRows({ tasks }: { tasks: any[] }) {
  return tasks.length ? (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Task</th>
            <th>Campaign</th>
            <th>Status</th>
            <th>Progress</th>
            <th>Due</th>
            <th>Review</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id}>
              <td>
                <Link className="record-link" href={`/portal/tasks/${t.id}`}>
                  {t.title}
                </Link>
              </td>
              <td>{t.campaign.name}</td>
              <td>
                <span className="pill green">{label(t.status)}</span>
              </td>
              <td>{t.progressPercentage}%</td>
              <td>
                {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}
              </td>
              <td>
                {t.submissions?.[0] ? label(t.submissions[0].status) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty>No client-visible tasks found.</Empty>
  );
}
