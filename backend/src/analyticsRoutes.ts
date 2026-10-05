import { z } from "zod";
import { csv, parseDateRange, rate } from "./analyticsRules.js";
const ok = (data: any) => ({ success: true, data }),
  fail = (code: string, message: string) => ({
    success: false,
    error: { code, message },
  });
const query = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().max(100).optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  campaignId: z.string().optional(),
  clientId: z.string().optional(),
  employeeId: z.string().optional(),
  teamId: z.string().optional(),
});
export async function registerAnalyticsRoutes(app: any, db: any, context: any) {
  async function auth(q: any, r: any) {
    const m = await context(q, r);
    if (!m) return;
    if (m.role === "CLIENT")
      return r
        .status(403)
        .send(fail("FORBIDDEN", "Use client reports for client analytics."));
    q.member = m;
  }
  async function portal(q: any, r: any) {
    const m = await context(q, r);
    if (!m) return;
    const cm = await db.clientMembership.findFirst({
      where: {
        organizationId: m.organizationId,
        userId: m.userId,
        status: "ACTIVE",
      },
    });
    if (m.role !== "CLIENT" || !cm)
      return r
        .status(403)
        .send(fail("FORBIDDEN", "Active client access is required."));
    q.member = m;
    q.client = cm;
  }
  const range = (q: any) => {
    const v = query.parse(q.query);
    return { ...v, ...parseDateRange(v) };
  };
  const scope = (m: any) =>
    m.role === "EMPLOYEE"
      ? { assignees: { some: { userId: m.userId } } }
      : m.role === "TEAM_LEAD"
        ? {
            team: {
              OR: [
                { teamLeadId: m.userId },
                { members: { some: { userId: m.userId } } },
              ],
            },
          }
        : {};
  const where = (q: any, v: any) => {
    const w: any = {
      organizationId: q.member.organizationId,
      archivedAt: null,
      ...scope(q.member),
      createdAt: { gte: v.start, lte: v.end },
    };
    if (v.status) w.status = v.status;
    if (v.priority) w.priority = v.priority;
    if (v.campaignId) w.campaignId = v.campaignId;
    if (v.teamId) w.teamId = v.teamId;
    if (v.clientId) w.campaign = { clientId: v.clientId };
    if (v.employeeId) {
      if (q.member.role === "EMPLOYEE" && v.employeeId !== q.member.userId)
        throw Object.assign(new Error("Employee analytics are private."), {
          statusCode: 403,
        });
      w.assignees = { some: { userId: v.employeeId } };
    }
    if (v.search)
      w.OR = [
        { title: { contains: v.search, mode: "insensitive" } },
        { campaign: { name: { contains: v.search, mode: "insensitive" } } },
      ];
    return w;
  };
  async function overview(q: any) {
    const v = range(q),
      tw = where(q, v),
      cw: any = {
        organizationId: q.member.organizationId,
        archivedAt: null,
        createdAt: { gte: v.start, lte: v.end },
        ...(q.member.role === "EMPLOYEE"
          ? {
              tasks: {
                some: { assignees: { some: { userId: q.member.userId } } },
              },
            }
          : q.member.role === "TEAM_LEAD"
            ? {
                teamAssignments: {
                  some: {
                    removedAt: null,
                    team: {
                      OR: [
                        { teamLeadId: q.member.userId },
                        { members: { some: { userId: q.member.userId } } },
                      ],
                    },
                  },
                },
              }
            : {}),
      };
    const now = new Date();
    const [campaigns, totalTasks, completed, overdue, pendingReviews, reviews] =
      await Promise.all([
        db.campaign.groupBy({ by: ["status"], where: cw, _count: true }),
        db.task.count({ where: tw }),
        db.task.count({ where: { ...tw, status: "COMPLETED" } }),
        db.task.count({
          where: {
            ...tw,
            dueDate: { lt: now },
            status: { notIn: ["COMPLETED", "CANCELLED"] },
          },
        }),
        db.taskSubmission.count({
          where: {
            organizationId: q.member.organizationId,
            status: "PENDING_REVIEW",
            task: tw,
          },
        }),
        db.clientReview.groupBy({
          by: ["status"],
          where: {
            organizationId: q.member.organizationId,
            createdAt: { gte: v.start, lte: v.end },
            task: tw,
          },
          _count: true,
        }),
      ]);
    const rc = Object.fromEntries(
      reviews.map((x: any) => [x.status, x._count]),
    );
    const decided = (rc.APPROVED || 0) + (rc.CHANGES_REQUESTED || 0);
    return {
      range: { startDate: v.start, endDate: v.end },
      campaigns: {
        total: campaigns.reduce((n: number, x: any) => n + x._count, 0),
        active: campaigns.find((x: any) => x.status === "ACTIVE")?._count || 0,
        completed:
          campaigns.find((x: any) => x.status === "COMPLETED")?._count || 0,
      },
      tasks: { total: totalTasks, completed, overdue },
      reviews: {
        pending: pendingReviews,
        approved: rc.APPROVED || 0,
        changesRequested: rc.CHANGES_REQUESTED || 0,
        approvalRate: rate(rc.APPROVED || 0, decided),
      },
    };
  }
  app.get("/api/v1/analytics/overview", { preHandler: auth }, async (q: any) =>
    ok(await overview(q)),
  );
  app.get("/api/v1/analytics/tasks", { preHandler: auth }, async (q: any) => {
    const v = range(q),
      w = where(q, v),
      now = new Date(),
      [groups, overdue, visible, rows, total, trend] = await Promise.all([
        db.task.groupBy({ by: ["status"], where: w, _count: true }),
        db.task.count({
          where: {
            ...w,
            dueDate: { lt: now },
            status: { notIn: ["COMPLETED", "CANCELLED"] },
          },
        }),
        db.task.count({ where: { ...w, visibility: "CLIENT_VISIBLE" } }),
        db.task.findMany({
          where: w,
          skip: (v.page - 1) * v.limit,
          take: v.limit,
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            visibility: true,
            campaign: {
              select: {
                id: true,
                name: true,
                client: { select: { id: true, name: true } },
              },
            },
            assignees: {
              select: { user: { select: { id: true, name: true } } },
            },
          },
        }),
        db.task.count({ where: w }),
        db.task.findMany({
          where: { ...w, status: "COMPLETED", completedAt: { not: null } },
          select: { completedAt: true },
        }),
      ]);
    const counts = Object.fromEntries(
        groups.map((x: any) => [x.status, x._count]),
      ),
      byDay: Record<string, number> = {};
    trend.forEach((x: any) => {
      const d = x.completedAt.toISOString().slice(0, 10);
      byDay[d] = (byDay[d] || 0) + 1;
    });
    return {
      ...ok({
        metrics: {
          total,
          completed: counts.COMPLETED || 0,
          inProgress: counts.IN_PROGRESS || 0,
          pending: counts.TODO || 0,
          blocked: counts.REVISION_REQUIRED || 0,
          overdue,
          clientVisible: visible,
          internal: total - visible,
        },
        trend: Object.entries(byDay).map(([date, count]) => ({ date, count })),
        rows,
      }),
      pagination: {
        page: v.page,
        limit: v.limit,
        total,
        totalPages: Math.ceil(total / v.limit),
      },
    };
  });
  app.get(
    "/api/v1/analytics/campaigns",
    { preHandler: auth },
    async (q: any) => {
      const v = range(q),
        tw = where(q, v),
        cw: any = {
          organizationId: q.member.organizationId,
          archivedAt: null,
          tasks: { some: tw },
        };
      if (v.status) cw.status = v.status;
      if (v.clientId) cw.clientId = v.clientId;
      if (v.search) cw.name = { contains: v.search, mode: "insensitive" };
      const [rows, total] = await Promise.all([
        db.campaign.findMany({
          where: cw,
          skip: (v.page - 1) * v.limit,
          take: v.limit,
          orderBy: { updatedAt: "desc" },
          include: {
            client: { select: { id: true, name: true } },
            tasks: {
              where: tw,
              select: {
                status: true,
                dueDate: true,
                submissions: {
                  where: { status: "PENDING_REVIEW" },
                  select: { id: true },
                },
                clientReviews: { select: { status: true } },
              },
            },
          },
        }),
        db.campaign.count({ where: cw }),
      ]);
      const data = rows.map((c: any) => {
        const completed = c.tasks.filter(
            (t: any) => t.status === "COMPLETED",
          ).length,
          approved = c.tasks
            .flatMap((t: any) => t.clientReviews)
            .filter((x: any) => x.status === "APPROVED").length,
          changes = c.tasks
            .flatMap((t: any) => t.clientReviews)
            .filter((x: any) => x.status === "CHANGES_REQUESTED").length;
        return {
          id: c.id,
          name: c.name,
          status: c.status,
          startDate: c.startDate,
          endDate: c.endDate,
          client: c.client,
          tasks: c.tasks.length,
          completed,
          pending: c.tasks.filter((t: any) =>
            ["TODO", "IN_PROGRESS"].includes(t.status),
          ).length,
          overdue: c.tasks.filter(
            (t: any) =>
              t.dueDate &&
              t.dueDate < new Date() &&
              !["COMPLETED", "CANCELLED"].includes(t.status),
          ).length,
          pendingReviews: c.tasks.reduce(
            (n: number, t: any) => n + t.submissions.length,
            0,
          ),
          progress: rate(completed, c.tasks.length),
          approvalRate: rate(approved, approved + changes),
        };
      });
      return {
        ...ok(data),
        pagination: {
          page: v.page,
          limit: v.limit,
          total,
          totalPages: Math.ceil(total / v.limit),
        },
      };
    },
  );
  app.get(
    "/api/v1/analytics/campaigns/:id",
    { preHandler: auth },
    async (q: any, r: any) => {
      const v = range(q),
        campaign = await db.campaign.findFirst({
          where: {
            id: q.params.id,
            organizationId: q.member.organizationId,
            tasks: { some: where(q, v) },
          },
          include: {
            client: { select: { id: true, name: true } },
            teamAssignments: {
              where: { removedAt: null },
              include: { team: { select: { id: true, name: true } } },
            },
            tasks: {
              where: where(q, v),
              include: {
                submissions: { include: { clientReviews: true } },
                comments: { where: { deletedAt: null } },
                activities: { orderBy: { createdAt: "desc" }, take: 30 },
              },
            },
            activities: { orderBy: { createdAt: "desc" }, take: 30 },
          },
        });
      if (!campaign)
        return r.status(404).send(fail("NOT_FOUND", "Campaign not found."));
      const tasks = campaign.tasks,
        completed = tasks.filter((x: any) => x.status === "COMPLETED").length,
        subs = tasks.flatMap((x: any) => x.submissions),
        reviews = subs.flatMap((x: any) => x.clientReviews),
        approved = reviews.filter((x: any) => x.status === "APPROVED").length,
        changes = reviews.filter(
          (x: any) => x.status === "CHANGES_REQUESTED",
        ).length;
      return ok({
        campaign: {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          client: campaign.client,
          teams: campaign.teamAssignments.map((x: any) => x.team),
        },
        performance: {
          totalTasks: tasks.length,
          completed,
          inProgress: tasks.filter((x: any) => x.status === "IN_PROGRESS")
            .length,
          pending: tasks.filter((x: any) => x.status === "TODO").length,
          overdue: tasks.filter(
            (x: any) =>
              x.dueDate &&
              x.dueDate < new Date() &&
              !["COMPLETED", "CANCELLED"].includes(x.status),
          ).length,
          progress: rate(completed, tasks.length),
          submissions: subs.length,
          reviews: reviews.length,
          approved,
          changesRequested: changes,
          pendingReviews: subs.filter((x: any) => x.status === "PENDING_REVIEW")
            .length,
          comments: tasks.reduce(
            (n: number, x: any) => n + x.comments.length,
            0,
          ),
          approvalRate: rate(approved, approved + changes),
        },
        timeline: [
          ...campaign.activities,
          ...tasks.flatMap((x: any) => x.activities),
        ]
          .sort((a: any, b: any) => +b.createdAt - +a.createdAt)
          .slice(0, 50),
      });
    },
  );
  app.get("/api/v1/analytics/team", { preHandler: auth }, async (q: any) => {
    const v = range(q);
    if (q.member.role === "EMPLOYEE") {
      q.query = { ...q.query, employeeId: q.member.userId };
    }
    const w = where(q, v),
      members = await db.membership.findMany({
        where: {
          organizationId: q.member.organizationId,
          status: "ACTIVE",
          role: { not: "CLIENT" },
          ...(q.member.role === "TEAM_LEAD"
            ? {
                user: {
                  teamMemberships: {
                    some: { team: { teamLeadId: q.member.userId } },
                  },
                },
              }
            : {}),
        },
        select: { user: { select: { id: true, name: true } }, status: true },
      });
    const rows = await Promise.all(
      members.map(async (m: any) => {
        const mw = { ...w, assignees: { some: { userId: m.user.id } } },
          [assigned, completed, overdue, done] = await Promise.all([
            db.task.count({ where: mw }),
            db.task.count({ where: { ...mw, status: "COMPLETED" } }),
            db.task.count({
              where: {
                ...mw,
                dueDate: { lt: new Date() },
                status: { notIn: ["COMPLETED", "CANCELLED"] },
              },
            }),
            db.task.findMany({
              where: { ...mw, status: "COMPLETED", completedAt: { not: null } },
              select: { createdAt: true, completedAt: true },
            }),
          ]);
        return {
          id: m.user.id,
          name: m.user.name,
          assigned,
          completed,
          overdue,
          completionRate: rate(completed, assigned),
          averageCompletionHours: done.length
            ? Math.round(
                (done.reduce(
                  (n: number, x: any) =>
                    n + (+x.completedAt - +x.createdAt) / 36e5,
                  0,
                ) /
                  done.length) *
                  10,
              ) / 10
            : 0,
        };
      }),
    );
    return ok({
      totalMembers: rows.length,
      activeMembers: rows.length,
      tasksAssigned: rows.reduce((n: number, x: any) => n + x.assigned, 0),
      tasksCompleted: rows.reduce((n: number, x: any) => n + x.completed, 0),
      tasksOverdue: rows.reduce((n: number, x: any) => n + x.overdue, 0),
      members: rows,
    });
  });
  app.get(
    "/api/v1/analytics/team/:id",
    { preHandler: auth },
    async (q: any, r: any) => {
      if (q.member.role === "EMPLOYEE" && q.params.id !== q.member.userId)
        return r
          .status(403)
          .send(fail("FORBIDDEN", "Employee analytics are private."));
      q.query = { ...q.query, employeeId: q.params.id };
      const v = range(q),
        w = where(q, v),
        user = await db.user.findFirst({
          where: {
            id: q.params.id,
            memberships: { some: { organizationId: q.member.organizationId } },
          },
          select: { id: true, name: true },
        });
      if (!user)
        return r.status(404).send(fail("NOT_FOUND", "Team member not found."));
      const tasks = await db.task.findMany({
          where: w,
          select: {
            status: true,
            createdAt: true,
            completedAt: true,
            campaign: { select: { id: true, name: true } },
          },
        }),
        completed = tasks.filter((x: any) => x.status === "COMPLETED"),
        campaigns = new Map();
      tasks.forEach((x: any) => {
        const a = campaigns.get(x.campaign.id) || {
          campaign: x.campaign,
          tasks: 0,
          completed: 0,
        };
        a.tasks++;
        if (x.status === "COMPLETED") a.completed++;
        campaigns.set(x.campaign.id, a);
      });
      return ok({
        user,
        assigned: tasks.length,
        completed: completed.length,
        overdue: await db.task.count({
          where: {
            ...w,
            dueDate: { lt: new Date() },
            status: { notIn: ["COMPLETED", "CANCELLED"] },
          },
        }),
        completionRate: rate(completed.length, tasks.length),
        averageCompletionHours: completed.length
          ? Math.round(
              (completed.reduce(
                (n: number, x: any) =>
                  n + (+x.completedAt - +x.createdAt) / 36e5,
                0,
              ) /
                completed.length) *
                10,
            ) / 10
          : 0,
        campaigns: [...campaigns.values()],
      });
    },
  );
  app.get("/api/v1/analytics/clients", { preHandler: auth }, async (q: any) => {
    const v = range(q),
      clients = await db.client.findMany({
        where: {
          organizationId: q.member.organizationId,
          status: { not: "ARCHIVED" },
          ...(v.clientId ? { id: v.clientId } : {}),
          ...(q.member.role === "EMPLOYEE"
            ? {
                campaigns: {
                  some: {
                    tasks: {
                      some: {
                        assignees: { some: { userId: q.member.userId } },
                      },
                    },
                  },
                },
              }
            : {}),
        },
        include: {
          campaigns: {
            where: { archivedAt: null },
            include: {
              tasks: {
                where: where(q, v),
                include: {
                  clientReviews: true,
                  submissions: { where: { status: "PENDING_REVIEW" } },
                },
              },
            },
          },
        },
      });
    const rows = clients.map((c: any) => {
      const tasks = c.campaigns.flatMap((x: any) => x.tasks),
        reviews = tasks.flatMap((x: any) => x.clientReviews);
      return {
        id: c.id,
        name: c.name,
        campaigns: c.campaigns.length,
        activeCampaigns: c.campaigns.filter((x: any) => x.status === "ACTIVE")
          .length,
        pendingReviews: tasks.reduce(
          (n: number, x: any) => n + x.submissions.length,
          0,
        ),
        approved: reviews.filter((x: any) => x.status === "APPROVED").length,
        changesRequested: reviews.filter(
          (x: any) => x.status === "CHANGES_REQUESTED",
        ).length,
      };
    });
    return ok({
      totalClients: rows.length,
      activeClients: clients.filter((x: any) => x.status === "ACTIVE").length,
      rows,
    });
  });
  app.get("/api/v1/analytics/reviews", { preHandler: auth }, async (q: any) => {
    const v = range(q),
      w = {
        organizationId: q.member.organizationId,
        createdAt: { gte: v.start, lte: v.end },
        task: where(q, v),
      },
      reviews = await db.clientReview.findMany({
        where: w,
        select: {
          status: true,
          createdAt: true,
          submission: { select: { createdAt: true, submissionNumber: true } },
          taskId: true,
        },
      }),
      approved = reviews.filter((x: any) => x.status === "APPROVED").length,
      changes = reviews.filter(
        (x: any) => x.status === "CHANGES_REQUESTED",
      ).length,
      times = reviews.map(
        (x: any) => (+x.createdAt - +x.submission.createdAt) / 36e5,
      ),
      completed = approved + changes,
      firstPass = new Set(
        reviews
          .filter(
            (x: any) =>
              x.status === "APPROVED" && x.submission.submissionNumber === 1,
          )
          .map((x: any) => x.taskId),
      ).size;
    return ok({
      total: reviews.length,
      approved,
      changesRequested: changes,
      approvalRate: rate(approved, completed),
      revisionRate: rate(changes, completed),
      firstPassApprovalRate: rate(
        firstPass,
        new Set(reviews.map((x: any) => x.taskId)).size,
      ),
      averageReviewHours: times.length
        ? Math.round(
            (times.reduce((a: number, b: number) => a + b, 0) / times.length) *
              10,
          ) / 10
        : 0,
      fastestReviewHours: times.length
        ? Math.round(Math.min(...times) * 10) / 10
        : 0,
      slowestReviewHours: times.length
        ? Math.round(Math.max(...times) * 10) / 10
        : 0,
    });
  });
  app.get(
    "/api/v1/analytics/submissions",
    { preHandler: auth },
    async (q: any) => {
      const v = range(q),
        subs = await db.taskSubmission.findMany({
          where: {
            organizationId: q.member.organizationId,
            createdAt: { gte: v.start, lte: v.end },
            task: where(q, v),
          },
          select: { status: true, submissionNumber: true, taskId: true },
        }),
        tasks = new Set(subs.map((x: any) => x.taskId));
      return ok({
        total: subs.length,
        versionsSubmitted: subs.length,
        approvedVersions: subs.filter((x: any) => x.status === "APPROVED")
          .length,
        revisionRequests: subs.filter(
          (x: any) => x.status === "REVISION_REQUIRED",
        ).length,
        averageVersionsPerTask: tasks.size
          ? Math.round((subs.length / tasks.size) * 100) / 100
          : 0,
      });
    },
  );
  app.get(
    "/api/v1/analytics/workload",
    { preHandler: auth },
    async (q: any) => {
      const v = range(q),
        w = where(q, v),
        members = await db.membership.findMany({
          where: {
            organizationId: q.member.organizationId,
            status: "ACTIVE",
            role: { not: "CLIENT" },
          },
          select: { user: { select: { id: true, name: true } } },
        }),
        rows = await Promise.all(
          members.map(async (m: any) => {
            const mw = { ...w, assignees: { some: { userId: m.user.id } } };
            return {
              id: m.user.id,
              name: m.user.name,
              assigned: await db.task.count({ where: mw }),
              inProgress: await db.task.count({
                where: { ...mw, status: "IN_PROGRESS" },
              }),
              upcoming: await db.task.count({
                where: {
                  ...mw,
                  dueDate: {
                    gte: new Date(),
                    lte: new Date(Date.now() + 7 * 86400000),
                  },
                  status: { notIn: ["COMPLETED", "CANCELLED"] },
                },
              }),
              overdue: await db.task.count({
                where: {
                  ...mw,
                  dueDate: { lt: new Date() },
                  status: { notIn: ["COMPLETED", "CANCELLED"] },
                },
              }),
            };
          }),
        );
      return ok(rows);
    },
  );
  app.get("/api/v1/analytics/overdue", { preHandler: auth }, async (q: any) => {
    const v = range(q),
      w = where(q, v);
    w.dueDate = { lt: new Date() };
    w.status = { notIn: ["COMPLETED", "CANCELLED"] };
    const [rows, total] = await Promise.all([
      db.task.findMany({
        where: w,
        skip: (v.page - 1) * v.limit,
        take: v.limit,
        orderBy: { dueDate: "asc" },
        select: {
          id: true,
          title: true,
          dueDate: true,
          priority: true,
          campaign: {
            select: {
              id: true,
              name: true,
              client: { select: { name: true } },
            },
          },
          assignees: { select: { user: { select: { id: true, name: true } } } },
        },
      }),
      db.task.count({ where: w }),
    ]);
    return {
      ...ok(
        rows.map((x: any) => ({
          ...x,
          daysOverdue: Math.floor((Date.now() - +x.dueDate) / 86400000),
        })),
      ),
      pagination: {
        page: v.page,
        limit: v.limit,
        total,
        totalPages: Math.ceil(total / v.limit),
      },
    };
  });
  const reportTypes = [
    "CAMPAIGN",
    "CLIENT",
    "TEAM",
    "TASK",
    "MONTHLY_ORGANIZATION",
  ];
  const reportInput = z.object({
    name: z.string().min(2).max(150),
    type: z.enum(reportTypes as [string, ...string[]]),
    filters: z.record(z.any()).default({}),
  });
  app.get("/api/v1/reports", { preHandler: auth }, async (q: any) =>
    ok(
      await db.report.findMany({
        where: {
          organizationId: q.member.organizationId,
          ...(q.member.role === "EMPLOYEE"
            ? { createdBy: q.member.userId }
            : {}),
        },
        include: { creator: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ),
  );
  app.post("/api/v1/reports", { preHandler: auth }, async (q: any, r: any) => {
    const v = reportInput.parse(q.body),
      item = await db.report.create({
        data: {
          ...v,
          organizationId: q.member.organizationId,
          createdBy: q.member.userId,
        },
      });
    await db.activityLog.create({
      data: {
        organizationId: q.member.organizationId,
        actorUserId: q.member.userId,
        action: "REPORT_CREATED",
        entityType: "report",
        entityId: item.id,
      },
    });
    return r.status(201).send(ok(item));
  });
  async function getReport(q: any) {
    return db.report.findFirst({
      where: {
        id: q.params.id,
        organizationId: q.member.organizationId,
        ...(q.member.role === "EMPLOYEE" ? { createdBy: q.member.userId } : {}),
      },
    });
  }
  app.get(
    "/api/v1/reports/:id",
    { preHandler: auth },
    async (q: any, r: any) => {
      const x = await getReport(q);
      return x
        ? ok(x)
        : r.status(404).send(fail("NOT_FOUND", "Report not found."));
    },
  );
  app.delete(
    "/api/v1/reports/:id",
    { preHandler: auth },
    async (q: any, r: any) => {
      const x = await getReport(q);
      if (!x) return r.status(404).send(fail("NOT_FOUND", "Report not found."));
      await db.report.delete({ where: { id: x.id } });
      return ok({});
    },
  );
  app.post(
    "/api/v1/reports/:id/export",
    { preHandler: auth },
    async (q: any, r: any) => {
      const rep = await getReport(q);
      if (!rep)
        return r.status(404).send(fail("NOT_FOUND", "Report not found."));
      const format = z
          .object({ format: z.enum(["csv", "pdf"]).default("csv") })
          .parse(q.body || {}).format,
        data = await overview({ ...q, query: rep.filters });
      await db.activityLog.create({
        data: {
          organizationId: q.member.organizationId,
          actorUserId: q.member.userId,
          action: "REPORT_EXPORTED",
          entityType: "report",
          entityId: rep.id,
          metadata: { format },
        },
      });
      if (format === "csv") {
        r.header("Content-Type", "text/csv").header(
          "Content-Disposition",
          `attachment; filename="${rep.name.replace(/[^a-z0-9]/gi, "-")}.csv"`,
        );
        return csv([
          {
            report: rep.name,
            ...data.campaigns,
            ...Object.fromEntries(
              Object.entries(data.tasks).map(([k, v]) => [`tasks_${k}`, v]),
            ),
            ...Object.fromEntries(
              Object.entries(data.reviews).map(([k, v]) => [`reviews_${k}`, v]),
            ),
          },
        ]);
      }
      const lines = [
          rep.name,
          `Generated ${new Date().toISOString()}`,
          ...Object.entries({
            ...data.campaigns,
            ...data.tasks,
            ...data.reviews,
          }).map(([k, v]) => `${k}: ${v}`),
        ],
        text = lines.join(" | ").replace(/[()\\]/g, " "),
        body = `BT /F1 12 Tf 40 760 Td (${text}) Tj ET`,
        pdf = `%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n5 0 obj << /Length ${body.length} >> stream\n${body}\nendstream endobj\ntrailer << /Root 1 0 R >>\n%%EOF`;
      r.header("Content-Type", "application/pdf").header(
        "Content-Disposition",
        `attachment; filename="report.pdf"`,
      );
      return r.send(Buffer.from(pdf));
    },
  );
  app.get("/api/v1/portal/reports", { preHandler: portal }, async (q: any) => {
    const clientId = q.client.clientId,
      tw = {
        organizationId: q.member.organizationId,
        visibility: "CLIENT_VISIBLE",
        archivedAt: null,
        campaign: { clientId },
      },
      [campaigns, tasks, completed, pendingReviews, reviews] =
        await Promise.all([
          db.campaign.count({
            where: {
              organizationId: q.member.organizationId,
              clientId,
              archivedAt: null,
            },
          }),
          db.task.count({ where: tw }),
          db.task.count({ where: { ...tw, status: "COMPLETED" } }),
          db.taskSubmission.count({
            where: {
              organizationId: q.member.organizationId,
              clientVisible: true,
              status: "PENDING_REVIEW",
              task: tw,
            },
          }),
          db.clientReview.groupBy({
            by: ["status"],
            where: { organizationId: q.member.organizationId, clientId },
            _count: true,
          }),
        ]);
    const rc = Object.fromEntries(
      reviews.map((x: any) => [x.status, x._count]),
    );
    return ok({
      campaigns,
      tasks,
      completed,
      progress: rate(completed, tasks),
      pendingReviews,
      approved: rc.APPROVED || 0,
      changesRequested: rc.CHANGES_REQUESTED || 0,
      approvalRate: rate(
        rc.APPROVED || 0,
        (rc.APPROVED || 0) + (rc.CHANGES_REQUESTED || 0),
      ),
    });
  });
}
