export type SessionLike = { durationSeconds?: number | null; startedAt: Date; endedAt?: Date | null };

export function elapsedSeconds(startedAt: Date, endedAt: Date = new Date()) {
  return Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000));
}

export function totalDurationSeconds(sessions: SessionLike[], now = new Date()) {
  return sessions.reduce((total, session) => total + (session.durationSeconds ?? elapsedSeconds(session.startedAt, session.endedAt ?? now)), 0);
}

export function variance(actual: number, estimated?: number | null) {
  if (!estimated) return { varianceSeconds: null, variancePercentage: null };
  const varianceSeconds = actual - estimated;
  return { varianceSeconds, variancePercentage: Math.round((varianceSeconds / estimated) * 1000) / 10 };
}

export function isOverdue(dueDate?: Date | null, status?: string, now = new Date()) {
  return !!dueDate && dueDate < now && !["COMPLETED", "CANCELLED"].includes(status || "");
}

export function completedOnTime(dueDate?: Date | null, completedAt?: Date | null) {
  return !!completedAt && (!dueDate || completedAt <= dueDate);
}
