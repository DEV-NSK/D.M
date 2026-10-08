import { publish } from "./realtime.js";
import { elapsedSeconds, isOverdue, totalDurationSeconds, variance } from "./taskTimeRules.js";

export async function registerTaskTimeRoutes(app: any, db: any, guard: any, ok: any, fail: any) {
  const scope = (m: any): any => m.role === "CEO" ? {} : m.role === "MANAGER" ? { team: { managerId: m.userId } } : m.role === "TEAM_LEAD" ? { team: { teamLeadId: m.userId } } : { assignees: { some: { userId: m.userId } } };
  const visible = (m: any, id: string) => db.task.findFirst({ where: { id, organizationId: m.organizationId, archivedAt: null, ...scope(m) } });
  const owned = (tx: any, m: any, id: string) => tx.task.findFirst({ where: { id, organizationId: m.organizationId, archivedAt: null, assignees: { some: { userId: m.userId } } } });
  const emit = async (tx: any, m: any, taskId: string, type: string, description: string, metadata?: any) => {
    await tx.taskActivity.create({ data: { organizationId: m.organizationId, taskId, actorUserId: m.userId, activityType: type, description, metadata } });
    await tx.activityLog.create({ data: { organizationId: m.organizationId, actorUserId: m.userId, action: type, entityType: "task", entityId: taskId, metadata } });
  };
  const recipients = async (taskId: string, organizationId: string) => {
    const task = await db.task.findFirst({ where: { id: taskId, organizationId }, select: { team: { select: { managerId: true, teamLeadId: true } }, assignees: { select: { userId: true } } } });
    const ceos = await db.membership.findMany({ where: { organizationId, role: "CEO", status: "ACTIVE" }, select: { userId: true } });
    return [...ceos.map((x: any) => x.userId), task?.team.managerId, task?.team.teamLeadId, ...(task?.assignees.map((x: any) => x.userId) || [])].filter(Boolean);
  };
  const notify = async (taskId: string, organizationId: string, event: string, payload: any) => publish(await recipients(taskId, organizationId), event, { taskId, ...payload });
  const employeeOnly = (q: any, r: any) => q.member.role === "EMPLOYEE" ? true : (r.status(403).send(fail("FORBIDDEN", "Only the assigned employee can control task time.")), false);

  app.get("/api/v1/tasks/:id/time", { preHandler: guard("tasks.view") }, async (q: any, r: any) => {
    const task: any = await visible(q.member, q.params.id);
    if (!task) return r.status(404).send(fail("NOT_FOUND", "Task not found."));
    const sessions = await db.taskWorkSession.findMany({ where: { taskId: task.id, organizationId: q.member.organizationId }, orderBy: { startedAt: "asc" } });
    const activeSession = sessions.find((x: any) => x.status === "ACTIVE") || null;
    const actualDurationSeconds = totalDurationSeconds(sessions);
    return ok({ estimatedDurationSeconds: task.estimatedDurationSeconds, actualDurationSeconds, serverTime: new Date(), ...variance(actualDurationSeconds, task.estimatedDurationSeconds), isOverdue: isOverdue(task.dueDate, task.status), activeSession, sessions });
  });

  async function begin(q: any, r: any, resumed: boolean) {
    if (!employeeOnly(q, r)) return;
    try {
      const result = await db.$transaction(async (tx: any) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${q.params.id}))`;
        const task: any = await owned(tx, q.member, q.params.id);
        if (!task) throw Object.assign(new Error("Task not found or not assigned to you."), { statusCode: 403, code: "FORBIDDEN" });
        if (["COMPLETED", "CANCELLED", "IN_REVIEW"].includes(task.status)) throw Object.assign(new Error("This task cannot be started in its current state."), { statusCode: 422, code: "INVALID_TASK_STATE" });
        if (await tx.taskWorkSession.findFirst({ where: { taskId: task.id, status: "ACTIVE" } })) throw Object.assign(new Error("This task already has an active work session."), { statusCode: 409, code: "ACTIVE_SESSION_EXISTS" });
        const now = new Date();
        const session = await tx.taskWorkSession.create({ data: { organizationId: q.member.organizationId, taskId: task.id, employeeId: q.member.userId, startedAt: now } });
        await tx.task.update({ where: { id: task.id }, data: { status: "IN_PROGRESS", firstStartedAt: task.firstStartedAt || now, updatedBy: q.member.userId } });
        await emit(tx, q.member, task.id, resumed || task.firstStartedAt ? "TASK_TIMER_RESUMED" : "TASK_TIMER_STARTED", resumed || task.firstStartedAt ? "Resumed task timer" : "Started task timer", { sessionId: session.id });
        return session;
      });
      await notify(q.params.id, q.member.organizationId, resumed ? "TASK_TIMER_RESUMED" : "TASK_TIMER_STARTED", { sessionId: result.id, startedAt: result.startedAt });
      return ok({ taskId: q.params.id, sessionId: result.id, startedAt: result.startedAt, status: result.status });
    } catch (e: any) { return r.status(e.statusCode || (e.code === "P2002" ? 409 : 500)).send(fail(e.code || "TIMER_START_FAILED", e.statusCode ? e.message : "Unable to start task timer.")); }
  }
  app.post("/api/v1/tasks/:id/time/start", { preHandler: guard("tasks.view") }, (q: any, r: any) => begin(q, r, false));
  app.post("/api/v1/tasks/:id/time/resume", { preHandler: guard("tasks.view") }, (q: any, r: any) => begin(q, r, true));

  app.post("/api/v1/tasks/:id/time/pause", { preHandler: guard("tasks.view") }, async (q: any, r: any) => {
    if (!employeeOnly(q, r)) return;
    try {
      const result = await db.$transaction(async (tx: any) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${q.params.id}))`;
        const task: any = await owned(tx, q.member, q.params.id);
        if (!task) throw Object.assign(new Error("Task not found or not assigned to you."), { statusCode: 403, code: "FORBIDDEN" });
        const session = await tx.taskWorkSession.findFirst({ where: { taskId: task.id, employeeId: q.member.userId, status: "ACTIVE" } });
        if (!session) throw Object.assign(new Error("This task has no active work session."), { statusCode: 409, code: "NO_ACTIVE_SESSION" });
        const now = new Date(), durationSeconds = elapsedSeconds(session.startedAt, now);
        const closed = await tx.taskWorkSession.update({ where: { id: session.id }, data: { endedAt: now, durationSeconds, status: "COMPLETED" } });
        const aggregate: any = await tx.taskWorkSession.aggregate({ where: { taskId: task.id, status: "COMPLETED" }, _sum: { durationSeconds: true } });
        const actualDurationSeconds = aggregate._sum.durationSeconds || 0;
        await tx.task.update({ where: { id: task.id }, data: { actualDurationSeconds, updatedBy: q.member.userId } });
        await emit(tx, q.member, task.id, "TASK_TIMER_PAUSED", "Paused task timer", { sessionId: session.id, durationSeconds });
        return { closed, durationSeconds, actualDurationSeconds };
      });
      await notify(q.params.id, q.member.organizationId, "TASK_TIMER_PAUSED", result);
      return ok({ taskId: q.params.id, sessionId: result.closed.id, durationSeconds: result.durationSeconds, actualDurationSeconds: result.actualDurationSeconds });
    } catch (e: any) { return r.status(e.statusCode || 500).send(fail(e.code || "TIMER_PAUSE_FAILED", e.statusCode ? e.message : "Unable to pause task timer.")); }
  });

  app.post("/api/v1/tasks/:id/complete", { preHandler: guard("tasks.view") }, async (q: any, r: any) => {
    if (!employeeOnly(q, r)) return;
    try {
      const result = await db.$transaction(async (tx: any) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${q.params.id}))`;
        const task: any = await owned(tx, q.member, q.params.id);
        if (!task) throw Object.assign(new Error("Task not found or not assigned to you."), { statusCode: 403, code: "FORBIDDEN" });
        if (["COMPLETED", "CANCELLED"].includes(task.status)) throw Object.assign(new Error("This task cannot be completed in its current state."), { statusCode: 422, code: "INVALID_TASK_STATE" });
        if (task.requiresClientReview) throw Object.assign(new Error("This task must be submitted and approved before completion."), { statusCode: 422, code: "REVIEW_REQUIRED" });
        const now = new Date(), active = await tx.taskWorkSession.findFirst({ where: { taskId: task.id, status: "ACTIVE" } });
        if (active) await tx.taskWorkSession.update({ where: { id: active.id }, data: { endedAt: now, durationSeconds: elapsedSeconds(active.startedAt, now), status: "COMPLETED" } });
        const aggregate: any = await tx.taskWorkSession.aggregate({ where: { taskId: task.id, status: "COMPLETED" }, _sum: { durationSeconds: true } });
        const actualDurationSeconds = aggregate._sum.durationSeconds || 0;
        const updated = await tx.task.update({ where: { id: task.id }, data: { status: "COMPLETED", progressPercentage: 100, completedAt: now, completedBy: q.member.userId, actualDurationSeconds, updatedBy: q.member.userId } });
        await emit(tx, q.member, task.id, "TASK_COMPLETED", "Completed task", { actualDurationSeconds, estimatedDurationSeconds: task.estimatedDurationSeconds });
        return updated;
      });
      await notify(q.params.id, q.member.organizationId, "TASK_COMPLETED", { completedAt: result.completedAt, actualDurationSeconds: result.actualDurationSeconds });
      return ok({ taskId: result.id, status: result.status, completedAt: result.completedAt, estimatedDurationSeconds: result.estimatedDurationSeconds, actualDurationSeconds: result.actualDurationSeconds });
    } catch (e: any) { return r.status(e.statusCode || 500).send(fail(e.code || "TASK_COMPLETION_FAILED", e.statusCode ? e.message : "Unable to complete task.")); }
  });
}
