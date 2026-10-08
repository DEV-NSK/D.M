import { z } from "zod";
import {
  dayStatus,
  executionHealth,
  hasCycle,
  sopProgress,
} from "./sopRules.js";
const taskInput = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(240),
  description: z.string().nullish(),
  responsibilityType: z
    .enum(["INTERNAL", "CLIENT", "SHARED", "EXTERNAL"])
    .default("INTERNAL"),
  responsibilityTeamId: z.string().nullish(),
  responsibilityRole: z
    .enum(["CEO", "MANAGER", "TEAM_LEAD", "EMPLOYEE", "CLIENT"])
    .nullish(),
  operationalLabel: z.string().nullish(),
  sourceType: z
    .enum(["COM", "CLIENT", "COM_AND_CLIENT", "EXTERNAL"])
    .default("COM"),
  sourceDescription: z.string().nullish(),
  defaultPriority: z
    .enum(["LOW", "MEDIUM", "HIGH", "URGENT"])
    .default("MEDIUM"),
  estimatedDurationSeconds: z.number().int().positive().nullish(),
  requiresDeliverable: z.boolean().default(false),
  approvalType: z.enum(["NONE", "INTERNAL", "CLIENT", "BOTH"]).default("NONE"),
  clientVisible: z.boolean().default(false),
  dependsOn: z.array(z.string()).default([]),
});
const templateInput = z.object({
  name: z.string().min(2).max(180),
  description: z.string().nullish(),
  days: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().nullish(),
        tasks: z.array(taskInput),
      }),
    )
    .min(1),
});
const fullInclude = {
  days: {
    orderBy: { dayNumber: "asc" as const },
    include: {
      tasks: {
        orderBy: { sequenceOrder: "asc" as const },
        include: { responsibilityTeam: true, dependencies: true },
      },
    },
  },
};

function createTemplate(db: any, management: any, ok: any, fail: any) {
  return async (q: any, r: any) => {
    if (!management(q, r)) return;
    const v = templateInput.parse(q.body),
      org = q.member.organizationId;
    const teamIds = v.days.flatMap((d) =>
      d.tasks.map((t) => t.responsibilityTeamId).filter(Boolean),
    );
    if (
      (await db.team.count({
        where: { organizationId: org, id: { in: teamIds } },
      })) !== new Set(teamIds).size
    )
      return r
        .status(422)
        .send(
          fail(
            "INVALID_TEAM",
            "A responsible team does not belong to this organization.",
          ),
        );
    const created = await db.$transaction(async (tx: any) => {
      const latest = await tx.sopTemplate.findFirst({
        where: { organizationId: org, name: v.name },
        orderBy: { version: "desc" },
      });
      const template = await tx.sopTemplate.create({
        data: {
          organizationId: org,
          name: v.name,
          description: v.description,
          version: (latest?.version || 0) + 1,
          createdBy: q.member.userId,
          parentTemplateId: latest?.id,
        },
      });
      const aliases = new Map<string, string>(),
        pending: Array<[string, string]> = [];
      for (let dayIndex = 0; dayIndex < v.days.length; dayIndex++) {
        const sourceDay = v.days[dayIndex];
        const day = await tx.sopTemplateDay.create({
          data: {
            sopTemplateId: template.id,
            dayNumber: dayIndex + 1,
            title: sourceDay.title,
            description: sourceDay.description,
          },
        });
        for (
          let taskIndex = 0;
          taskIndex < sourceDay.tasks.length;
          taskIndex++
        ) {
          const source = sourceDay.tasks[taskIndex];
          const task = await tx.sopTemplateTask.create({
            data: {
              sopTemplateDayId: day.id,
              title: source.title,
              description: source.description,
              responsibilityType: source.responsibilityType,
              responsibilityTeamId: source.responsibilityTeamId,
              responsibilityRole: source.responsibilityRole,
              operationalLabel: source.operationalLabel,
              sourceType: source.sourceType,
              sourceDescription: source.sourceDescription,
              sequenceOrder: taskIndex + 1,
              defaultPriority: source.defaultPriority,
              estimatedDurationSeconds: source.estimatedDurationSeconds,
              requiresDeliverable: source.requiresDeliverable,
              approvalType: source.approvalType,
              clientVisible: source.clientVisible,
            },
          });
          if (source.id) aliases.set(source.id, task.id);
          source.dependsOn.forEach((dependency) =>
            pending.push([task.id, dependency]),
          );
        }
      }
      const edges = pending.map(
        ([task, dependency]) =>
          [task, aliases.get(dependency) || dependency] as [string, string],
      );
      if (hasCycle(edges))
        throw Object.assign(new Error("Circular SOP dependency."), {
          statusCode: 422,
        });
      if (edges.length)
        await tx.sopTaskDependency.createMany({
          data: edges.map(
            ([sopTemplateTaskId, dependsOnSopTemplateTaskId]) => ({
              sopTemplateTaskId,
              dependsOnSopTemplateTaskId,
            }),
          ),
        });
      return template;
    });
    return r.status(201).send(
      ok(
        await db.sopTemplate.findUnique({
          where: { id: created.id },
          include: fullInclude,
        }),
      ),
    );
  };
}
export function registerSopRoutes(
  app: any,
  db: any,
  guard: any,
  ok: any,
  fail: any,
) {
  const taskScope = (m: any) =>
    m.role === "CEO"
      ? {}
      : m.role === "EMPLOYEE"
        ? { assignees: { some: { userId: m.userId } } }
        : m.role === "TEAM_LEAD"
          ? { team: { teamLeadId: m.userId } }
          : {
              team: { OR: [{ managerId: m.userId }, { teamLeadId: m.userId }] },
            };
  const executionScope = (m: any) =>
    m.role === "CEO" ? {} : { tasks: { some: taskScope(m) } };
  const management = (q: any, r: any) =>
    ["CEO", "MANAGER"].includes(q.member.role) ||
    r
      .status(403)
      .send(
        fail(
          "FORBIDDEN",
          "Only organization managers can manage SOP templates.",
        ),
      );
  app.get(
    "/api/v1/sop-templates",
    { preHandler: guard("sop.view") },
    async (q: any) =>
      ok(
        await db.sopTemplate.findMany({
          where: { organizationId: q.member.organizationId },
          orderBy: [{ name: "asc" }, { version: "desc" }],
          include: { _count: { select: { days: true, executions: true } } },
        }),
      ),
  );
  app.get(
    "/api/v1/sop-templates/:id",
    { preHandler: guard("sop.view") },
    async (q: any, r: any) => {
      const x = await db.sopTemplate.findFirst({
        where: { id: q.params.id, organizationId: q.member.organizationId },
        include: fullInclude,
      });
      return x
        ? ok(x)
        : r.status(404).send(fail("NOT_FOUND", "SOP template not found."));
    },
  );
  app.post(
    "/api/v1/sop-templates",
    { preHandler: guard("sop.manage") },
    createTemplate(db, management, ok, fail),
  );
  app.post(
    "/api/v1/sop-templates/:id/publish",
    { preHandler: guard("sop.manage") },
    async (q: any, r: any) => {
      if (!management(q, r)) return;
      const t = await db.sopTemplate.findFirst({
        where: { id: q.params.id, organizationId: q.member.organizationId },
      });
      if (!t)
        return r.status(404).send(fail("NOT_FOUND", "SOP template not found."));
      if (t.status !== "DRAFT")
        return r
          .status(409)
          .send(
            fail("IMMUTABLE_VERSION", "Only draft versions can be published."),
          );
      await db.$transaction([
        db.sopTemplate.updateMany({
          where: {
            organizationId: t.organizationId,
            name: t.name,
            status: "ACTIVE",
          },
          data: { status: "ARCHIVED" },
        }),
        db.sopTemplate.update({
          where: { id: t.id },
          data: { status: "ACTIVE" },
        }),
      ]);
      return ok({ id: t.id, status: "ACTIVE" });
    },
  );
  app.post(
    "/api/v1/sop-templates/:id/archive",
    { preHandler: guard("sop.manage") },
    async (q: any, r: any) => {
      if (!management(q, r)) return;
      const x = await db.sopTemplate.updateMany({
        where: { id: q.params.id, organizationId: q.member.organizationId },
        data: { status: "ARCHIVED" },
      });
      return x.count
        ? ok({ id: q.params.id, status: "ARCHIVED" })
        : r.status(404).send(fail("NOT_FOUND", "SOP template not found."));
    },
  );
  app.get(
    "/api/v1/sop-executions",
    { preHandler: guard("sop.view") },
    async (q: any) => {
      const rows = await db.sopExecution.findMany({
        where: {
          organizationId: q.member.organizationId,
          ...executionScope(q.member),
        },
        take: 100,
        orderBy: { updatedAt: "desc" },
        include: {
          campaign: { include: { client: true } },
          template: true,
          days: {
            orderBy: { dayNumber: "asc" },
            include: {
              tasks: {
                where: taskScope(q.member),
                select: { status: true, blocked: true, dueDate: true },
              },
            },
          },
          tasks: {
            where: taskScope(q.member),
            select: { status: true, blocked: true, dueDate: true },
          },
        },
      });
      return ok(
        rows.map((x: any) => ({
          ...x,
          progress: sopProgress(x.tasks),
          health: executionHealth(x.tasks),
          days: x.days.map((d: any) => ({
            ...d,
            progress: sopProgress(d.tasks),
            derivedStatus: dayStatus(d.tasks),
          })),
        })),
      );
    },
  );
  app.get(
    "/api/v1/sop-executions/:id",
    { preHandler: guard("sop.view") },
    async (q: any, r: any) => {
      const x = await db.sopExecution.findFirst({
        where: {
          id: q.params.id,
          organizationId: q.member.organizationId,
          ...executionScope(q.member),
        },
        include: {
          campaign: { include: { client: true } },
          template: true,
          days: {
            orderBy: { dayNumber: "asc" },
            include: {
              tasks: {
                where: taskScope(q.member),
                orderBy: { createdAt: "asc" },
                include: {
                  team: true,
                  assignees: {
                    include: { user: { select: { id: true, name: true } } },
                  },
                  sopTemplateTask: true,
                },
              },
            },
          },
          tasks: { where: taskScope(q.member) },
          activities: { orderBy: { createdAt: "desc" }, take: 50 },
        },
      });
      if (!x)
        return r
          .status(404)
          .send(fail("NOT_FOUND", "SOP execution not found."));
      return ok({
        ...x,
        progress: sopProgress(x.tasks),
        health: executionHealth(x.tasks),
        days: x.days.map((d: any) => ({
          ...d,
          progress: sopProgress(d.tasks),
          derivedStatus: dayStatus(d.tasks),
        })),
      });
    },
  );
  app.post(
    "/api/v1/sop-executions",
    { preHandler: guard("sop.execute") },
    async (q: any, r: any) => {
      if (!management(q, r)) return;
      const v = z
          .object({
            campaignId: z.string(),
            sopTemplateId: z.string(),
            startDate: z.coerce.date(),
          })
          .parse(q.body),
        org = q.member.organizationId;
      const [campaign, template] = await Promise.all([
        db.campaign.findFirst({
          where: { id: v.campaignId, organizationId: org },
          include: { teamAssignments: { where: { removedAt: null } } },
        }),
        db.sopTemplate.findFirst({
          where: { id: v.sopTemplateId, organizationId: org, status: "ACTIVE" },
          include: {
            days: {
              orderBy: { dayNumber: "asc" },
              include: {
                tasks: {
                  orderBy: { sequenceOrder: "asc" },
                  include: { dependencies: true },
                },
              },
            },
          },
        }),
      ]);
      if (!campaign || !template)
        return r
          .status(422)
          .send(
            fail(
              "INVALID_CONFIGURATION",
              "Campaign or active SOP template was not found.",
            ),
          );
      const all = template.days.flatMap((d: any) => d.tasks),
        missing = all.filter(
          (t: any) =>
            !t.responsibilityTeamId ||
            !campaign.teamAssignments.some(
              (a: any) => a.teamId === t.responsibilityTeamId,
            ),
        );
      if (missing.length)
        return r
          .status(422)
          .send(
            fail(
              "TEAM_MAPPING_REQUIRED",
              `${missing.length} activities need teams assigned to this campaign.`,
            ),
          );
      try {
        const execution = await db.$transaction(async (tx: any) => {
          const ex = await tx.sopExecution.create({
            data: {
              organizationId: org,
              campaignId: campaign.id,
              clientId: campaign.clientId,
              sopTemplateId: template.id,
              sopTemplateVersion: template.version,
              startDate: v.startDate,
              createdBy: q.member.userId,
            },
          });
          const taskIds = new Map<string, string>();
          for (const day of template.days) {
            const scheduled = new Date(v.startDate);
            scheduled.setUTCDate(scheduled.getUTCDate() + day.dayNumber - 1);
            const ed = await tx.sopExecutionDay.create({
              data: {
                sopExecutionId: ex.id,
                sopTemplateDayId: day.id,
                dayNumber: day.dayNumber,
                title: day.title,
                scheduledDate: scheduled,
              },
            });
            for (const t of day.tasks) {
              const blocked = t.dependencies.length > 0;
              const task = await tx.task.create({
                data: {
                  organizationId: org,
                  campaignId: campaign.id,
                  teamId: t.responsibilityTeamId,
                  title: t.title,
                  description: t.description,
                  priority: t.defaultPriority,
                  status: "TODO",
                  startDate: scheduled,
                  dueDate: new Date(scheduled.getTime() + 86399999),
                  estimatedDurationSeconds: t.estimatedDurationSeconds,
                  createdBy: q.member.userId,
                  updatedBy: q.member.userId,
                  visibility: t.clientVisible ? "CLIENT_VISIBLE" : "INTERNAL",
                  requiresClientReview: ["CLIENT", "BOTH"].includes(
                    t.approvalType,
                  ),
                  sopExecutionId: ex.id,
                  sopTemplateTaskId: t.id,
                  sopExecutionDayId: ed.id,
                  blocked,
                },
              });
              taskIds.set(t.id, task.id);
              await tx.taskActivity.create({
                data: {
                  organizationId: org,
                  taskId: task.id,
                  actorUserId: q.member.userId,
                  activityType: "SOP_TASK_GENERATED",
                  description: `Generated from ${template.name} v${template.version}`,
                },
              });
            }
          }
          await tx.sopActivity.create({
            data: {
              organizationId: org,
              sopExecutionId: ex.id,
              actorUserId: q.member.userId,
              activityType: "SOP_EXECUTION_STARTED",
              description: `Generated ${all.length} tasks from ${template.name} v${template.version}`,
            },
          });
          return ex;
        });
        return r.status(201).send(ok(execution));
      } catch (e: any) {
        if (e.code === "P2002")
          return r
            .status(409)
            .send(
              fail(
                "EXECUTION_ALREADY_GENERATED",
                "This SOP has already been generated for the campaign.",
              ),
            );
        throw e;
      }
    },
  );
  app.post(
    "/api/v1/sop-executions/:id/status",
    { preHandler: guard("sop.execute") },
    async (q: any, r: any) => {
      if (!management(q, r)) return;
      const { status } = z
        .object({
          status: z.enum(["ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]),
        })
        .parse(q.body);
      const ex = await db.sopExecution.findFirst({
        where: { id: q.params.id, organizationId: q.member.organizationId },
      });
      if (!ex)
        return r
          .status(404)
          .send(fail("NOT_FOUND", "SOP execution not found."));
      if (
        status === "COMPLETED" &&
        (await db.task.count({
          where: { sopExecutionId: ex.id, status: { not: "COMPLETED" } },
        }))
      )
        return r
          .status(409)
          .send(
            fail(
              "INCOMPLETE_TASKS",
              "All required tasks must be completed first.",
            ),
          );
      return ok(
        await db.sopExecution.update({
          where: { id: ex.id },
          data: { status },
        }),
      );
    },
  );
}
