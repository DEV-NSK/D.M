import { z } from "zod";
import { canTransition, validProgress, validSchedule } from "./taskRules.js";
import { publish } from "./realtime.js";

const taskTypes = [
  "CONTENT_CREATION",
  "SOCIAL_MEDIA",
  "GRAPHIC_DESIGN",
  "VIDEO_EDITING",
  "COPYWRITING",
  "SEO",
  "PAID_ADVERTISING",
  "EMAIL_MARKETING",
  "WEB_DEVELOPMENT",
  "RESEARCH",
  "CLIENT_COMMUNICATION",
  "OTHER",
] as const;
const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const statuses = [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "REVISION_REQUIRED",
  "COMPLETED",
  "CANCELLED",
] as const;
const input = z.object({
  campaignId: z.string(),
  teamId: z.string(),
  assigneeId: z.string().nullish(),
  title: z.string().trim().min(2).max(250),
  description: z.string().max(20000).nullish(),
  taskType: z.enum(taskTypes).default("OTHER"),
  priority: z.enum(priorities).default("MEDIUM"),
  startDate: z.coerce.date().nullish(),
  dueDate: z.coerce.date().nullish(),
  estimatedHours: z.coerce.number().min(0).max(100000).nullish(),
  visibility: z.enum(["INTERNAL", "CLIENT_VISIBLE"]).default("INTERNAL"),
  requiresClientReview: z.boolean().default(false),
});
const listInput = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(statuses).optional(),
  priority: z.enum(priorities).optional(),
  campaign_id: z.string().optional(),
  client_id: z.string().optional(),
  team_id: z.string().optional(),
  assignee_id: z.string().optional(),
  due: z.enum(["today", "overdue", "upcoming"]).optional(),
  sort: z
    .enum(["updatedAt", "createdAt", "dueDate", "priority", "title"])
    .default("updatedAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export async function registerTaskRoutes(
  app: any,
  db: any,
  guard: any,
  ok: any,
  fail: any,
) {
  const isManager = (m: any) => ["OWNER", "MANAGER"].includes(m.role);
  const taskScope = (m: any): any =>
    isManager(m)
      ? {}
      : m.role === "TEAM_LEAD"
        ? { team: { teamLeadId: m.userId } }
        : { assignees: { some: { userId: m.userId } } };
  const visible = (m: any, id: string) =>
    db.task.findFirst({
      where: {
        id,
        organizationId: m.organizationId,
        archivedAt: null,
        ...taskScope(m),
      },
    });
  const event = (
    tx: any,
    m: any,
    taskId: string,
    type: string,
    description: string,
    previousValue?: any,
    newValue?: any,
  ) =>
    tx.taskActivity.create({
      data: {
        organizationId: m.organizationId,
        taskId,
        actorUserId: m.userId,
        activityType: type,
        description,
        previousValue,
        newValue,
      },
    });
  const ensureTeamAccess = async (m: any, teamId: string) =>
    isManager(m) ||
    !!(await db.team.findFirst({
      where: {
        id: teamId,
        organizationId: m.organizationId,
        teamLeadId: m.userId,
      },
    }));
  const validateRelations = async (
    m: any,
    campaignId: string,
    teamId: string,
    assigneeId?: string | null,
  ) => {
    const campaign = await db.campaign.findFirst({
      where: {
        id: campaignId,
        organizationId: m.organizationId,
        archivedAt: null,
        teamAssignments: { some: { teamId, removedAt: null } },
      },
    });
    if (!campaign)
      return "Campaign and team must be related and belong to your organization.";
    if (!(await ensureTeamAccess(m, teamId)))
      return "You cannot create or assign work for this team.";
    if (
      assigneeId &&
      !(await db.teamMember.findFirst({
        where: {
          teamId,
          userId: assigneeId,
          team: { organizationId: m.organizationId },
        },
      }))
    )
      return "Assignee must be an organization member of the selected team.";
    return null;
  };

  app.get(
    "/api/v1/tasks",
    { preHandler: guard("tasks.view") },
    async (q: any) => {
      const v = listInput.parse(q.query),
        where: any = {
          organizationId: q.member.organizationId,
          archivedAt: null,
          ...taskScope(q.member),
        };
      if (v.status) where.status = v.status;
      if (v.priority) where.priority = v.priority;
      if (v.campaign_id) where.campaignId = v.campaign_id;
      if (v.client_id) where.campaign = { clientId: v.client_id };
      if (v.team_id) where.teamId = v.team_id;
      if (v.assignee_id) where.assignees = { some: { userId: v.assignee_id } };
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      if (v.due === "today") where.dueDate = { gte: start, lt: end };
      if (v.due === "overdue") where.dueDate = { lt: start };
      if (v.due === "upcoming") where.dueDate = { gte: end };
      if (v.search)
        where.OR = [
          { title: { contains: v.search, mode: "insensitive" } },
          { campaign: { name: { contains: v.search, mode: "insensitive" } } },
          {
            campaign: {
              client: { name: { contains: v.search, mode: "insensitive" } },
            },
          },
          {
            assignees: {
              some: {
                user: { name: { contains: v.search, mode: "insensitive" } },
              },
            },
          },
        ];
      const include = {
        campaign: { include: { client: { select: { id: true, name: true } } } },
        team: { select: { id: true, name: true } },
        assignees: { include: { user: { select: { id: true, name: true } } } },
      };
      const [data, total] = await Promise.all([
        db.task.findMany({
          where,
          include,
          skip: (v.page - 1) * v.page_size,
          take: v.page_size,
          orderBy: { [v.sort]: v.order },
        }),
        db.task.count({ where }),
      ]);
      return {
        ...ok(data),
        pagination: {
          page: v.page,
          page_size: v.page_size,
          total,
          total_pages: Math.ceil(total / v.page_size),
        },
      };
    },
  );
  app.post(
    "/api/v1/tasks",
    { preHandler: guard("tasks.create") },
    async (q: any, r: any) => {
      const v = input.parse(q.body);
      if (!validSchedule(v.startDate, v.dueDate))
        return r
          .status(422)
          .send(
            fail(
              "INVALID_DATES",
              "Due date must be on or after the start date.",
            ),
          );
      const relationError = await validateRelations(
        q.member,
        v.campaignId,
        v.teamId,
        v.assigneeId,
      );
      if (relationError)
        return r.status(422).send(fail("INVALID_RELATION", relationError));
      const { assigneeId, ...data } = v;
      const task = await db.$transaction(async (tx: any) => {
        const task = await tx.task.create({
          data: {
            ...data,
            organizationId: q.member.organizationId,
            createdBy: q.member.userId,
            updatedBy: q.member.userId,
          },
        });
        if (assigneeId)
          await tx.taskAssignee.create({
            data: {
              organizationId: q.member.organizationId,
              taskId: task.id,
              userId: assigneeId,
              assignmentType: "PRIMARY",
              assignedBy: q.member.userId,
            },
          });
        await event(
          tx,
          q.member,
          task.id,
          "TASK_CREATED",
          "Task created",
          undefined,
          { title: task.title },
        );
        if (assigneeId)
          await event(
            tx,
            q.member,
            task.id,
            "TASK_ASSIGNED",
            "Primary assignee assigned",
            undefined,
            { userId: assigneeId },
          );
        return task;
      });
      return r.status(201).send(ok(task));
    },
  );
  app.get(
    "/api/v1/tasks/:id",
    { preHandler: guard("tasks.view") },
    async (q: any, r: any) => {
      if (!(await visible(q.member, q.params.id)))
        return r.status(404).send(fail("NOT_FOUND", "Task not found."));
      return ok(
        await db.task.findFirst({
          where: { id: q.params.id, organizationId: q.member.organizationId },
          include: {
            campaign: { include: { client: true } },
            team: true,
            creator: { select: { id: true, name: true } },
            updater: { select: { id: true, name: true } },
            assignees: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, jobTitle: true },
                },
              },
            },
            subtasks: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] },
            comments: {
              where: { deletedAt: null },
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    memberships: {
                      where: { organizationId: q.member.organizationId },
                      select: { role: true },
                    },
                  },
                },
              },
              orderBy: { createdAt: "asc" },
            },
            activities: {
              include: { actor: { select: { id: true, name: true } } },
              orderBy: { createdAt: "desc" },
            },
            submissions: {
              include: {
                submitter: { select: { id: true, name: true } },
                reviewer: { select: { id: true, name: true } },
                reviews: {
                  include: { reviewer: { select: { id: true, name: true } } },
                },
                deliverables: true,
              },
              orderBy: { submissionNumber: "desc" },
            },
          },
        }),
      );
    },
  );
  app.patch(
    "/api/v1/tasks/:id",
    { preHandler: guard("tasks.manage") },
    async (q: any, r: any) => {
      const current: any = await visible(q.member, q.params.id);
      if (!current)
        return r.status(404).send(fail("NOT_FOUND", "Task not found."));
      const v = input.partial().parse(q.body);
      const campaignId = v.campaignId || current.campaignId,
        teamId = v.teamId || current.teamId;
      if (
        !validSchedule(
          v.startDate ?? current.startDate,
          v.dueDate ?? current.dueDate,
        )
      )
        return r
          .status(422)
          .send(
            fail(
              "INVALID_DATES",
              "Due date must be on or after the start date.",
            ),
          );
      const relationError = await validateRelations(
        q.member,
        campaignId,
        teamId,
        v.assigneeId,
      );
      if (relationError)
        return r.status(422).send(fail("INVALID_RELATION", relationError));
      const { assigneeId, ...data } = v;
      const updated = await db.$transaction(async (tx: any) => {
        const task = await tx.task.update({
          where: { id: current.id },
          data: { ...data, updatedBy: q.member.userId },
        });
        if (assigneeId !== undefined) {
          await tx.taskAssignee.deleteMany({
            where: { taskId: current.id, assignmentType: "PRIMARY" },
          });
          if (assigneeId)
            await tx.taskAssignee.create({
              data: {
                organizationId: q.member.organizationId,
                taskId: current.id,
                userId: assigneeId,
                assignmentType: "PRIMARY",
                assignedBy: q.member.userId,
              },
            });
        }
        await event(
          tx,
          q.member,
          current.id,
          "TASK_UPDATED",
          "Task details updated",
          current,
          task,
        );
        return task;
      });
      return ok(updated);
    },
  );
  app.delete(
    "/api/v1/tasks/:id",
    { preHandler: guard("tasks.manage") },
    async (q: any, r: any) => {
      const task = await visible(q.member, q.params.id);
      if (!task)
        return r.status(404).send(fail("NOT_FOUND", "Task not found."));
      const updated = await db.task.update({
        where: { id: task.id },
        data: { archivedAt: new Date(), updatedBy: q.member.userId },
      });
      return ok(updated);
    },
  );
  app.post(
    "/api/v1/tasks/:id/status",
    { preHandler: guard("tasks.status") },
    async (q: any, r: any) => {
      const task: any = await visible(q.member, q.params.id);
      if (!task)
        return r.status(404).send(fail("NOT_FOUND", "Task not found."));
      const { status } = z.object({ status: z.enum(statuses) }).parse(q.body);
      if (!canTransition(task.status, status))
        return r
          .status(422)
          .send(
            fail(
              "INVALID_STATUS_TRANSITION",
              `${task.status} cannot transition to ${status}.`,
            ),
          );
      if (["IN_REVIEW", "COMPLETED", "REVISION_REQUIRED"].includes(status))
        return r
          .status(422)
          .send(
            fail(
              "REVIEW_REQUIRED",
              "Review states must be changed through submission and review endpoints.",
            ),
          );
      if (
        status === "CANCELLED" &&
        !["OWNER", "MANAGER", "TEAM_LEAD"].includes(q.member.role)
      )
        return r
          .status(403)
          .send(
            fail("FORBIDDEN", "Only managers and team leads can cancel tasks."),
          );
      const updated = await db.$transaction(async (tx: any) => {
        const x = await tx.task.update({
          where: { id: task.id },
          data: { status, updatedBy: q.member.userId },
        });
        await event(
          tx,
          q.member,
          task.id,
          status === "CANCELLED" ? "TASK_CANCELLED" : "STATUS_CHANGED",
          `Status changed from ${task.status} to ${status}`,
          task.status,
          status,
        );
        return x;
      });
      return ok(updated);
    },
  );
  app.post(
    "/api/v1/tasks/:id/progress",
    { preHandler: guard("tasks.progress") },
    async (q: any, r: any) => {
      const task: any = await visible(q.member, q.params.id);
      if (!task)
        return r.status(404).send(fail("NOT_FOUND", "Task not found."));
      const { progress } = z.object({ progress: z.number() }).parse(q.body);
      if (!validProgress(progress))
        return r
          .status(422)
          .send(
            fail(
              "INVALID_PROGRESS",
              "Progress must be a whole number from 0 to 100.",
            ),
          );
      if (["COMPLETED", "CANCELLED"].includes(task.status))
        return r
          .status(422)
          .send(
            fail(
              "INVALID_TASK_STATE",
              "Progress cannot be changed in this task state.",
            ),
          );
      const updated = await db.$transaction(async (tx: any) => {
        const x = await tx.task.update({
          where: { id: task.id },
          data: {
            progressPercentage: progress,
            status:
              task.status === "TODO" && progress > 0
                ? "IN_PROGRESS"
                : task.status,
            updatedBy: q.member.userId,
          },
        });
        await event(
          tx,
          q.member,
          task.id,
          "PROGRESS_UPDATED",
          `Progress changed from ${task.progressPercentage}% to ${progress}%`,
          task.progressPercentage,
          progress,
        );
        return x;
      });
      return ok(updated);
    },
  );

  app.get(
    "/api/v1/tasks/:id/assignees",
    { preHandler: guard("tasks.view") },
    async (q: any, r: any) =>
      !(await visible(q.member, q.params.id))
        ? r.status(404).send(fail("NOT_FOUND", "Task not found."))
        : ok(
            await db.taskAssignee.findMany({
              where: {
                taskId: q.params.id,
                organizationId: q.member.organizationId,
              },
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            }),
          ),
  );
  app.post(
    "/api/v1/tasks/:id/assignees",
    { preHandler: guard("tasks.manage") },
    async (q: any, r: any) => {
      const task: any = await visible(q.member, q.params.id);
      if (!task)
        return r.status(404).send(fail("NOT_FOUND", "Task not found."));
      const v = z
        .object({
          userId: z.string(),
          assignmentType: z
            .enum(["PRIMARY", "COLLABORATOR"])
            .default("PRIMARY"),
        })
        .parse(q.body);
      if (
        !(await db.teamMember.findFirst({
          where: {
            teamId: task.teamId,
            userId: v.userId,
            team: { organizationId: q.member.organizationId },
          },
        }))
      )
        return r
          .status(422)
          .send(
            fail("INVALID_ASSIGNEE", "Assignee must belong to the task team."),
          );
      const result = await db.$transaction(async (tx: any) => {
        if (v.assignmentType === "PRIMARY")
          await tx.taskAssignee.deleteMany({
            where: { taskId: task.id, assignmentType: "PRIMARY" },
          });
        const a = await tx.taskAssignee.upsert({
          where: { taskId_userId: { taskId: task.id, userId: v.userId } },
          create: {
            ...v,
            organizationId: q.member.organizationId,
            taskId: task.id,
            assignedBy: q.member.userId,
          },
          update: {
            assignmentType: v.assignmentType,
            assignedBy: q.member.userId,
            assignedAt: new Date(),
          },
        });
        await event(
          tx,
          q.member,
          task.id,
          "TASK_ASSIGNED",
          "Task assignee updated",
          undefined,
          v,
        );
        return a;
      });
      return r.status(201).send(ok(result));
    },
  );
  app.delete(
    "/api/v1/tasks/:id/assignees/:userId",
    { preHandler: guard("tasks.manage") },
    async (q: any, r: any) => {
      const task = await visible(q.member, q.params.id);
      if (!task)
        return r.status(404).send(fail("NOT_FOUND", "Task not found."));
      await db.taskAssignee.deleteMany({
        where: {
          taskId: task.id,
          userId: q.params.userId,
          organizationId: q.member.organizationId,
        },
      });
      return ok({});
    },
  );

  app.post(
    "/api/v1/tasks/:id/subtasks",
    { preHandler: guard("tasks.progress") },
    async (q: any, r: any) => {
      const task = await visible(q.member, q.params.id);
      if (!task)
        return r.status(404).send(fail("NOT_FOUND", "Task not found."));
      const v = z
        .object({
          title: z.string().trim().min(1).max(250),
          description: z.string().max(5000).nullish(),
          position: z.number().int().min(0).optional(),
        })
        .parse(q.body);
      const item = await db.$transaction(async (tx: any) => {
        const x = await tx.taskSubtask.create({
          data: {
            ...v,
            organizationId: q.member.organizationId,
            taskId: task.id,
            createdBy: q.member.userId,
          },
        });
        await event(
          tx,
          q.member,
          task.id,
          "SUBTASK_CREATED",
          `Subtask created: ${x.title}`,
        );
        return x;
      });
      return r.status(201).send(ok(item));
    },
  );
  app.patch(
    "/api/v1/tasks/:id/subtasks/:subtaskId",
    { preHandler: guard("tasks.progress") },
    async (q: any, r: any) => {
      const task = await visible(q.member, q.params.id),
        sub = await db.taskSubtask.findFirst({
          where: {
            id: q.params.subtaskId,
            taskId: q.params.id,
            organizationId: q.member.organizationId,
          },
        });
      if (!task || !sub)
        return r
          .status(404)
          .send(fail("NOT_FOUND", "Task or subtask not found."));
      const v = z
        .object({
          title: z.string().min(1).max(250).optional(),
          description: z.string().max(5000).nullish(),
          completed: z.boolean().optional(),
          position: z.number().int().min(0).optional(),
        })
        .parse(q.body);
      const x = await db.$transaction(async (tx: any) => {
        const updated = await tx.taskSubtask.update({
          where: { id: sub.id },
          data: {
            ...v,
            completedAt:
              v.completed === true
                ? new Date()
                : v.completed === false
                  ? null
                  : sub.completedAt,
          },
        });
        if (v.completed !== undefined && v.completed !== sub.completed)
          await event(
            tx,
            q.member,
            task.id,
            v.completed ? "SUBTASK_COMPLETED" : "SUBTASK_REOPENED",
            `${updated.title} ${v.completed ? "completed" : "reopened"}`,
            sub.completed,
            v.completed,
          );
        return updated;
      });
      return ok(x);
    },
  );
  app.delete(
    "/api/v1/tasks/:id/subtasks/:subtaskId",
    { preHandler: guard("tasks.progress") },
    async (q: any, r: any) => {
      if (!(await visible(q.member, q.params.id)))
        return r.status(404).send(fail("NOT_FOUND", "Task not found."));
      await db.taskSubtask.deleteMany({
        where: {
          id: q.params.subtaskId,
          taskId: q.params.id,
          organizationId: q.member.organizationId,
        },
      });
      return ok({});
    },
  );

  app.post(
    "/api/v1/tasks/:id/comments",
    { preHandler: guard("tasks.view") },
    async (q: any, r: any) => {
      const task = await visible(q.member, q.params.id);
      if (!task)
        return r.status(404).send(fail("NOT_FOUND", "Task not found."));
      const { content, visibility } = z
        .object({
          content: z.string().trim().min(1).max(10000),
          visibility: z
            .enum(["INTERNAL", "CLIENT_VISIBLE"])
            .default("INTERNAL"),
        })
        .parse(q.body);
      if (
        visibility === "CLIENT_VISIBLE" &&
        task.visibility !== "CLIENT_VISIBLE"
      )
        return r
          .status(422)
          .send(
            fail(
              "INVALID_VISIBILITY",
              "Comments cannot be shared on an internal task.",
            ),
          );
      const comment = await db.$transaction(async (tx: any) => {
        const x = await tx.taskComment.create({
          data: {
            organizationId: q.member.organizationId,
            taskId: task.id,
            authorId: q.member.userId,
            content,
            visibility,
          },
        });
        await event(tx, q.member, task.id, "COMMENT_ADDED", "Comment added");
        return x;
      });
      return r.status(201).send(ok(comment));
    },
  );
  app.patch(
    "/api/v1/tasks/:id/comments/:commentId",
    { preHandler: guard("tasks.view") },
    async (q: any, r: any) => {
      if (!(await visible(q.member, q.params.id)))
        return r.status(404).send(fail("NOT_FOUND", "Task not found."));
      const c = await db.taskComment.findFirst({
        where: {
          id: q.params.commentId,
          taskId: q.params.id,
          organizationId: q.member.organizationId,
          authorId: q.member.userId,
          deletedAt: null,
        },
      });
      if (!c)
        return r
          .status(403)
          .send(fail("FORBIDDEN", "You may only edit your own comment."));
      const { content } = z
        .object({ content: z.string().trim().min(1).max(10000) })
        .parse(q.body);
      return ok(
        await db.taskComment.update({ where: { id: c.id }, data: { content } }),
      );
    },
  );
  app.delete(
    "/api/v1/tasks/:id/comments/:commentId",
    { preHandler: guard("tasks.view") },
    async (q: any, r: any) => {
      if (!(await visible(q.member, q.params.id)))
        return r.status(404).send(fail("NOT_FOUND", "Task not found."));
      const c = await db.taskComment.findFirst({
        where: {
          id: q.params.commentId,
          taskId: q.params.id,
          organizationId: q.member.organizationId,
          authorId: q.member.userId,
          deletedAt: null,
        },
      });
      if (!c)
        return r
          .status(403)
          .send(fail("FORBIDDEN", "You may only delete your own comment."));
      await db.taskComment.update({
        where: { id: c.id },
        data: { deletedAt: new Date() },
      });
      return ok({});
    },
  );

  app.post(
    "/api/v1/tasks/:id/submissions",
    { preHandler: guard("tasks.submit") },
    async (q: any, r: any) => {
      const task: any = await visible(q.member, q.params.id);
      if (!task)
        return r.status(404).send(fail("NOT_FOUND", "Task not found."));
      if (
        !(await db.taskAssignee.findFirst({
          where: {
            taskId: task.id,
            userId: q.member.userId,
            organizationId: q.member.organizationId,
          },
        }))
      )
        return r
          .status(403)
          .send(fail("FORBIDDEN", "Only an assignee can submit this task."));
      if (!["IN_PROGRESS", "REVISION_REQUIRED"].includes(task.status))
        return r
          .status(422)
          .send(
            fail(
              "INVALID_TASK_STATE",
              "Task must be in progress or revision required before submission.",
            ),
          );
      if (
        await db.taskSubmission.findFirst({
          where: { taskId: task.id, status: "PENDING_REVIEW" },
        })
      )
        return r
          .status(409)
          .send(
            fail(
              "PENDING_SUBMISSION",
              "This task already has a pending submission.",
            ),
          );
      const { description } = z
        .object({ description: z.string().trim().min(1).max(20000) })
        .parse(q.body);
      const result = await db.$transaction(async (tx: any) => {
        const last = await tx.taskSubmission.findFirst({
          where: { taskId: task.id },
          orderBy: { submissionNumber: "desc" },
        });
        const s = await tx.taskSubmission.create({
          data: {
            organizationId: q.member.organizationId,
            taskId: task.id,
            submittedBy: q.member.userId,
            submissionNumber: (last?.submissionNumber || 0) + 1,
            description,
            clientVisible:
              task.visibility === "CLIENT_VISIBLE" &&
              task.requiresClientReview,
          },
        });
        await tx.task.update({
          where: { id: task.id },
          data: { status: "IN_REVIEW", updatedBy: q.member.userId },
        });
        await event(
          tx,
          q.member,
          task.id,
          "SUBMISSION_CREATED",
          `Submission #${s.submissionNumber} created`,
          task.status,
          "IN_REVIEW",
        );
        return s;
      });
      if (result.clientVisible) {
        const recipients = await db.clientMembership.findMany({
          where: {
            organizationId: q.member.organizationId,
            clientId: task.campaignId
              ? (await db.campaign.findUnique({ where: { id: task.campaignId } }))
                  ?.clientId
              : undefined,
            status: "ACTIVE",
          },
          select: { userId: true },
        });
        const userIds = recipients.map((x: any) => x.userId);
        if (userIds.length)
          await db.notification.createMany({
            data: userIds.map((recipientId: string) => ({
              organizationId: q.member.organizationId,
              recipientId,
              type: "SUBMISSION_CREATED",
              title: "New version ready",
              message: `Version ${result.submissionNumber} is ready for review.`,
              entityType: "task",
              entityId: task.id,
            })),
          });
        publish(userIds, "submission.created", {
          entityType: "task",
          entityId: task.id,
          submissionId: result.id,
        });
      }
      return r.status(201).send(ok(result));
    },
  );
  async function review(
    q: any,
    r: any,
    action: "APPROVE" | "REQUEST_REVISION",
  ) {
    const task: any = await visible(q.member, q.params.id);
    if (!task) return r.status(404).send(fail("NOT_FOUND", "Task not found."));
    if (!["OWNER", "MANAGER", "TEAM_LEAD"].includes(q.member.role))
      return r
        .status(403)
        .send(
          fail("FORBIDDEN", "Only managers and team leads can review work."),
        );
    const submission = await db.taskSubmission.findFirst({
      where: {
        id: q.params.submissionId,
        taskId: task.id,
        organizationId: q.member.organizationId,
        status: "PENDING_REVIEW",
      },
    });
    if (!submission)
      return r
        .status(404)
        .send(fail("NOT_FOUND", "Pending submission not found."));
    if (submission.submittedBy === q.member.userId)
      return r
        .status(403)
        .send(fail("SELF_REVIEW", "You cannot review your own submission."));
    const body = z
      .object({ comment: z.string().trim().max(10000).optional() })
      .parse(q.body || {});
    if (action === "REQUEST_REVISION" && !body.comment)
      return r
        .status(422)
        .send(fail("COMMENT_REQUIRED", "Revision comments are required."));
    const approved = action === "APPROVE";
    const result = await db.$transaction(async (tx: any) => {
      const s = await tx.taskSubmission.update({
        where: { id: submission.id },
        data: {
          status: approved ? "APPROVED" : "REVISION_REQUIRED",
          reviewComment: body.comment,
          reviewedBy: q.member.userId,
          reviewedAt: new Date(),
        },
      });
      await tx.taskReview.create({
        data: {
          organizationId: q.member.organizationId,
          taskId: task.id,
          submissionId: s.id,
          reviewerId: q.member.userId,
          action,
          comment: body.comment,
        },
      });
      await tx.task.update({
        where: { id: task.id },
        data: {
          status: approved ? "COMPLETED" : "REVISION_REQUIRED",
          progressPercentage: approved ? 100 : task.progressPercentage,
          completedAt: approved ? new Date() : null,
          updatedBy: q.member.userId,
        },
      });
      await event(
        tx,
        q.member,
        task.id,
        approved ? "TASK_APPROVED" : "REVISION_REQUESTED",
        approved
          ? `Submission #${s.submissionNumber} approved`
          : `Revision requested for submission #${s.submissionNumber}`,
        task.status,
        approved ? "COMPLETED" : "REVISION_REQUIRED",
      );
      return s;
    });
    return ok(result);
  }
  app.post(
    "/api/v1/tasks/:id/submissions/:submissionId/approve",
    { preHandler: guard("tasks.review") },
    (q: any, r: any) => review(q, r, "APPROVE"),
  );
  app.post(
    "/api/v1/tasks/:id/submissions/:submissionId/request-revision",
    { preHandler: guard("tasks.review") },
    (q: any, r: any) => review(q, r, "REQUEST_REVISION"),
  );
  app.get(
    "/api/v1/tasks/:id/activities",
    { preHandler: guard("tasks.view") },
    async (q: any, r: any) =>
      !(await visible(q.member, q.params.id))
        ? r.status(404).send(fail("NOT_FOUND", "Task not found."))
        : ok(
            await db.taskActivity.findMany({
              where: {
                taskId: q.params.id,
                organizationId: q.member.organizationId,
              },
              include: { actor: { select: { id: true, name: true } } },
              orderBy: { createdAt: "desc" },
            }),
          ),
  );

  app.get(
    "/api/v1/task-dashboard",
    { preHandler: guard("tasks.view") },
    async (q: any) => {
      const where: any = {
          organizationId: q.member.organizationId,
          archivedAt: null,
          ...taskScope(q.member),
        },
        today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const [total, inProgress, inReview, overdue, completed, dueToday] =
        await Promise.all([
          db.task.count({ where }),
          db.task.count({ where: { ...where, status: "IN_PROGRESS" } }),
          db.task.count({ where: { ...where, status: "IN_REVIEW" } }),
          db.task.count({
            where: {
              ...where,
              dueDate: { lt: today },
              status: { notIn: ["COMPLETED", "CANCELLED"] },
            },
          }),
          db.task.count({ where: { ...where, status: "COMPLETED" } }),
          db.task.count({
            where: {
              ...where,
              dueDate: { gte: today, lt: tomorrow },
              status: { notIn: ["COMPLETED", "CANCELLED"] },
            },
          }),
        ]);
      return ok({ total, inProgress, inReview, overdue, completed, dueToday });
    },
  );
  app.get(
    "/api/v1/teams/:id/tasks/summary",
    { preHandler: guard("tasks.view") },
    async (q: any, r: any) => {
      const team = await db.team.findFirst({
        where: {
          id: q.params.id,
          organizationId: q.member.organizationId,
          ...(!isManager(q.member) ? { teamLeadId: q.member.userId } : {}),
        },
      });
      if (!team)
        return r.status(404).send(fail("NOT_FOUND", "Team not found."));
      const active = ["TODO", "IN_PROGRESS", "IN_REVIEW", "REVISION_REQUIRED"];
      const members = await db.teamMember.findMany({
        where: { teamId: team.id },
        include: { user: { select: { id: true, name: true } } },
      });
      const workload = await Promise.all(
        members.map(async (m: any) => ({
          ...m.user,
          activeTasks: await db.task.count({
            where: {
              organizationId: q.member.organizationId,
              teamId: team.id,
              status: { in: active },
              assignees: { some: { userId: m.userId } },
            },
          }),
        })),
      );
      const [activeTasks, overdue, awaitingReview, completed] =
        await Promise.all([
          db.task.count({
            where: {
              organizationId: q.member.organizationId,
              teamId: team.id,
              status: { in: active },
            },
          }),
          db.task.count({
            where: {
              organizationId: q.member.organizationId,
              teamId: team.id,
              dueDate: { lt: new Date() },
              status: { in: active },
            },
          }),
          db.task.count({
            where: {
              organizationId: q.member.organizationId,
              teamId: team.id,
              status: "IN_REVIEW",
            },
          }),
          db.task.count({
            where: {
              organizationId: q.member.organizationId,
              teamId: team.id,
              status: "COMPLETED",
            },
          }),
        ]);
      return ok({
        team,
        activeTasks,
        overdue,
        awaitingReview,
        completed,
        workload,
      });
    },
  );
}
