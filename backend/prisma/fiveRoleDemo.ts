import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
export const DEMO_SLUG = "dm-five-role-demo";
export const accounts = [
  ["D.M Demo CEO", "ceo.demo@dm-test.local", "DM@DemoCEO2026!", Role.CEO],
  [
    "D.M Demo Manager",
    "manager.demo@dm-test.local",
    "DM@DemoManager2026!",
    Role.MANAGER,
  ],
  [
    "D.M Demo Team Lead",
    "lead.demo@dm-test.local",
    "DM@DemoLead2026!",
    Role.TEAM_LEAD,
  ],
  [
    "D.M Demo Employee 01",
    "employee01.demo@dm-test.local",
    "DM@Employee01!",
    Role.EMPLOYEE,
  ],
  [
    "D.M Demo Employee 02",
    "employee02.demo@dm-test.local",
    "DM@Employee02!",
    Role.EMPLOYEE,
  ],
] as const;
const ago = (n: number) => new Date(Date.now() - n * 86400000),
  ahead = (n: number) => new Date(Date.now() + n * 86400000);
export async function resetFiveRoleDemo(db: PrismaClient) {
  const org = await db.organization.findUnique({ where: { slug: DEMO_SLUG } });
  if (!org) return false;
  const o = org.id,
    users = (
      await db.membership.findMany({
        where: { organizationId: o },
        select: { userId: true },
      })
    ).map((x) => x.userId);
  await db.$transaction(async (tx) => {
    await tx.clientReview.deleteMany({ where: { organizationId: o } });
    await tx.taskReview.deleteMany({ where: { organizationId: o } });
    await tx.taskDeliverable.deleteMany({ where: { organizationId: o } });
    await tx.taskSubmission.deleteMany({ where: { organizationId: o } });
    await tx.taskWorkSession.deleteMany({ where: { organizationId: o } });
    await tx.taskAssignmentHistory.deleteMany({ where: { organizationId: o } });
    await tx.taskAssignee.deleteMany({ where: { organizationId: o } });
    await tx.taskSubtask.deleteMany({ where: { organizationId: o } });
    await tx.taskComment.deleteMany({ where: { organizationId: o } });
    await tx.taskActivity.deleteMany({ where: { organizationId: o } });
    await tx.sopActivity.deleteMany({ where: { organizationId: o } });
    await tx.task.deleteMany({ where: { organizationId: o } });
    await tx.sopExecutionDay.deleteMany({
      where: { execution: { organizationId: o } },
    });
    await tx.sopExecution.deleteMany({ where: { organizationId: o } });
    await tx.sopTaskDependency.deleteMany({
      where: { task: { day: { template: { organizationId: o } } } },
    });
    await tx.sopTemplateTask.deleteMany({
      where: { day: { template: { organizationId: o } } },
    });
    await tx.sopTemplateDay.deleteMany({
      where: { template: { organizationId: o } },
    });
    await tx.sopTemplate.deleteMany({ where: { organizationId: o } });
    await tx.notification.deleteMany({ where: { organizationId: o } });
    await tx.report.deleteMany({ where: { organizationId: o } });
    await tx.campaignActivity.deleteMany({ where: { organizationId: o } });
    await tx.campaignObjective.deleteMany({ where: { organizationId: o } });
    await tx.campaignTeamAssignment.deleteMany({
      where: { organizationId: o },
    });
    await tx.campaign.deleteMany({ where: { organizationId: o } });
    await tx.clientMembership.deleteMany({ where: { organizationId: o } });
    await tx.clientActivity.deleteMany({ where: { organizationId: o } });
    await tx.clientContact.deleteMany({ where: { organizationId: o } });
    await tx.client.deleteMany({ where: { organizationId: o } });
    await tx.teamMember.deleteMany({ where: { team: { organizationId: o } } });
    await tx.team.deleteMany({ where: { organizationId: o } });
    await tx.invitation.deleteMany({ where: { organizationId: o } });
    await tx.activityLog.deleteMany({ where: { organizationId: o } });
    await tx.membership.deleteMany({ where: { organizationId: o } });
    await tx.organization.delete({ where: { id: o } });
    for (const id of users)
      if (!(await tx.membership.findFirst({ where: { userId: id } })))
        await tx.user.delete({ where: { id } });
  });
  return true;
}
export async function seedFiveRoleDemo(db: PrismaClient) {
  await resetFiveRoleDemo(db);
  const users: any[] = [];
  for (const [name, email, password] of accounts)
    users.push(
      await db.user.upsert({
        where: { email },
        create: {
          name,
          email,
          passwordHash: await bcrypt.hash(password, 12),
          timezone: "Asia/Kolkata",
        },
        update: {
          name,
          passwordHash: await bcrypt.hash(password, 12),
          timezone: "Asia/Kolkata",
        },
      }),
    );
  const org = await db.organization.create({
    data: {
      name: "D.M Demo Marketing Agency",
      slug: DEMO_SLUG,
      timezone: "Asia/Kolkata",
      industry: "Digital Marketing",
      currency: "INR",
    },
  });
  for (let i = 0; i < users.length; i++)
    await db.membership.create({
      data: {
        organizationId: org.id,
        userId: users[i].id,
        role: accounts[i][3],
        reportsToId:
          i === 1
            ? users[0].id
            : i === 2
              ? users[1].id
              : i > 2
                ? users[2].id
                : null,
      },
    });
  const team = await db.team.create({
    data: {
      organizationId: org.id,
      name: "Digital Marketing",
      description: "Integrated marketing delivery team.",
      managerId: users[1].id,
      teamLeadId: users[2].id,
    },
  });
  await db.teamMember.createMany({
    data: [2, 3, 4].map((i) => ({ teamId: team.id, userId: users[i].id })),
  });
  const clients: any[] = [];
  for (const [i, name, industry] of [
    [0, "Nova Fitness", "Health & Fitness"],
    [1, "Urban Brew Cafe", "Food & Beverage"],
    [2, "TechSphere Solutions", "B2B Technology"],
  ] as const) {
    clients.push(
      await db.client.create({
        data: {
          organizationId: org.id,
          name,
          companyName: `${name} Pvt Ltd`,
          industry,
          primaryEmail: `marketing@${name.toLowerCase().replaceAll(" ", "")}.test`,
          primaryPhone: `+91 987650001${i}`,
          city: ["Bengaluru", "Mumbai", "Hyderabad"][i],
          countryCode: "IN",
          timezone: "Asia/Kolkata",
          status: "ACTIVE",
          ownerUserId: users[1].id,
          createdBy: users[0].id,
          notes: "Five-role production QA client.",
        },
      }),
    );
  }
  const specs = [
      ["October Social Media Growth", "SOCIAL_MEDIA", 350000],
      ["Festive Digital Marketing Campaign", "CONTENT_MARKETING", 225000],
      ["B2B Lead Generation Campaign", "PAID_ADVERTISING", 500000],
    ] as const,
    campaigns: any[] = [];
  for (let i = 0; i < 3; i++) {
    const [name, campaignType, budgetAmount] = specs[i],
      c = await db.campaign.create({
        data: {
          organizationId: org.id,
          clientId: clients[i].id,
          name,
          slug: `${DEMO_SLUG}-${i}`,
          description: "Production-like campaign data.",
          campaignType,
          status: i === 2 ? "PLANNED" : "ACTIVE",
          objectiveSummary: "Grow qualified reach and conversions.",
          startDate: ago(20 - i * 3),
          endDate: ahead(40 + i * 5),
          budgetAmount,
          currencyCode: "INR",
          createdBy: users[1].id,
          updatedBy: users[1].id,
        },
      });
    campaigns.push(c);
    await db.campaignTeamAssignment.create({
      data: {
        organizationId: org.id,
        campaignId: c.id,
        teamId: team.id,
        assignmentRole: "PRIMARY",
        assignedBy: users[1].id,
      },
    });
  }
  const sop = await db.sopTemplate.create({
      data: {
        organizationId: org.id,
        name: "COM Client Onboarding",
        description: "Five-day onboarding workflow.",
        version: 1,
        status: "ACTIVE",
        createdBy: users[0].id,
      },
    }),
    dayNames = [
      "Client onboarding",
      "Research and planning",
      "Strategy and setup",
      "Creative production",
      "Launch and reporting",
    ],
    dayTasks = [
      [
        "Client onboarding call",
        "Internal discussion",
        "Project board creation",
      ],
      [
        "Brand guideline review",
        "Competitor research",
        "Digital marketing plan",
      ],
      ["Content strategy", "Creative planning", "Campaign setup"],
      ["Creative production", "Instagram campaign creative", "Client review"],
      ["Campaign scheduling", "Weekly report", "Performance analysis"],
    ],
    defs: any[] = [],
    days: any[] = [];
  for (let d = 0; d < 5; d++) {
    const day = await db.sopTemplateDay.create({
      data: { sopTemplateId: sop.id, dayNumber: d + 1, title: dayNames[d] },
    });
    days.push(day);
    for (let n = 0; n < 3; n++) {
      const title = dayTasks[d][n];
      defs.push(
        await db.sopTemplateTask.create({
          data: {
            sopTemplateDayId: day.id,
            title,
            sequenceOrder: n + 1,
            responsibilityType: title.includes("Client")
              ? "SHARED"
              : "INTERNAL",
            responsibilityTeamId: team.id,
            sourceType: title.includes("Client") ? "COM_AND_CLIENT" : "COM",
            defaultPriority: d === 3 ? "HIGH" : "MEDIUM",
            estimatedDurationSeconds: (n + 1) * 3600,
            requiresDeliverable: /research|plan|creative|report/i.test(title),
            approvalType:
              title === "Client review"
                ? "CLIENT"
                : /creative|report/i.test(title)
                  ? "INTERNAL"
                  : "NONE",
            clientVisible: title === "Client review",
          },
        }),
      );
    }
  }
  const execution = await db.sopExecution.create({
      data: {
        organizationId: org.id,
        campaignId: campaigns[0].id,
        clientId: clients[0].id,
        sopTemplateId: sop.id,
        sopTemplateVersion: 1,
        startDate: ago(5),
        targetEndDate: ahead(1),
        status: "ACTIVE",
        createdBy: users[1].id,
      },
    }),
    execDays: any[] = [];
  for (let d = 0; d < 5; d++)
    execDays.push(
      await db.sopExecutionDay.create({
        data: {
          sopExecutionId: execution.id,
          sopTemplateDayId: days[d].id,
          dayNumber: d + 1,
          title: dayNames[d],
          scheduledDate: ago(5 - d),
        },
      }),
    );
  const titles = [
      ...dayTasks.flat(),
      "Instagram content calendar",
      "Keyword research",
      "Social media strategy",
      "Creative brief",
      "Instagram reel design",
      "Poster design",
      "Ad creative preparation",
      "Meta Ads setup",
      "Campaign optimization",
      "Monthly report",
      "MOM preparation",
      "Lead generation research",
      "Landing page audit",
      "Audience research",
      "Conversion tracking review",
    ],
    tasks: any[] = [];
  for (let i = 0; i < titles.length; i++) {
    const status: any = [
        "TODO",
        "ASSIGNED",
        "IN_PROGRESS",
        "COMPLETED",
        "IN_REVIEW",
        "REVISION_REQUIRED",
      ][i % 6],
      assignee = users[3 + (i % 2)],
      duration = status === "COMPLETED" ? ((i % 3) + 1) * 2700 : 0,
      t = await db.task.create({
        data: {
          organizationId: org.id,
          campaignId: campaigns[i % 3].id,
          teamId: team.id,
          title: titles[i],
          description: `Operational brief for ${titles[i].toLowerCase()}.`,
          taskType: /research|audit|analysis/i.test(titles[i])
            ? "RESEARCH"
            : "OTHER",
          priority: i % 5 === 0 ? "HIGH" : i % 4 === 0 ? "LOW" : "MEDIUM",
          status,
          progressPercentage:
            status === "COMPLETED"
              ? 100
              : status === "IN_PROGRESS"
                ? 45
                : status === "IN_REVIEW"
                  ? 85
                  : 20,
          startDate: ago(10 - (i % 5)),
          dueDate: i % 6 === 0 ? ago(2) : ahead(2 + (i % 8)),
          estimatedDurationSeconds: ((i % 4) + 1) * 3600,
          actualDurationSeconds: duration,
          firstStartedAt: status !== "TODO" ? ago(4) : null,
          completedBy: status === "COMPLETED" ? assignee.id : null,
          completedAt: status === "COMPLETED" ? ago(1) : null,
          createdBy: users[2].id,
          updatedBy: assignee.id,
          visibility: i === 10 ? "CLIENT_VISIBLE" : "INTERNAL",
          requiresClientReview: i === 10,
          sopExecutionId: i < 15 ? execution.id : null,
          sopTemplateTaskId: i < 15 ? defs[i].id : null,
          sopExecutionDayId: i < 15 ? execDays[Math.floor(i / 3)].id : null,
          blocked: i === 11,
        },
      });
    tasks.push(t);
    await db.taskAssignee.create({
      data: {
        organizationId: org.id,
        taskId: t.id,
        userId: assignee.id,
        assignmentType: "PRIMARY",
        assignedBy: users[2].id,
      },
    });
    await db.taskAssignmentHistory.create({
      data: {
        organizationId: org.id,
        taskId: t.id,
        assignedTo: assignee.id,
        assignedBy: users[2].id,
      },
    });
    await db.taskActivity.createMany({
      data: [
        {
          organizationId: org.id,
          taskId: t.id,
          actorUserId: users[2].id,
          activityType: "TASK_CREATED",
          description: "Task created",
        },
        {
          organizationId: org.id,
          taskId: t.id,
          actorUserId: users[2].id,
          activityType: "TASK_ASSIGNED",
          description: `Assigned to ${assignee.name}`,
        },
      ],
    });
    if (duration) {
      const a = Math.floor(duration * 0.55);
      await db.taskWorkSession.createMany({
        data: [
          {
            organizationId: org.id,
            taskId: t.id,
            employeeId: assignee.id,
            startedAt: ago(3),
            endedAt: new Date(ago(3).getTime() + a * 1000),
            durationSeconds: a,
            status: "COMPLETED",
          },
          {
            organizationId: org.id,
            taskId: t.id,
            employeeId: assignee.id,
            startedAt: ago(2),
            endedAt: new Date(ago(2).getTime() + (duration - a) * 1000),
            durationSeconds: duration - a,
            status: "COMPLETED",
          },
        ],
      });
      await db.taskActivity.create({
        data: {
          organizationId: org.id,
          taskId: t.id,
          actorUserId: assignee.id,
          activityType: "TASK_COMPLETED",
          description: "Completed with recorded sessions",
        },
      });
    }
  }
  await db.sopTaskDependency.create({
    data: {
      sopTemplateTaskId: defs[11].id,
      dependsOnSopTemplateTaskId: defs[10].id,
    },
  });
  for (const [index, status] of [
    [4, "APPROVED"],
    [10, "PENDING_REVIEW"],
    [13, "APPROVED"],
    [24, "REVISION_REQUIRED"],
  ] as const) {
    const s = await db.taskSubmission.create({
      data: {
        organizationId: org.id,
        taskId: tasks[index].id,
        submittedBy: users[3 + (index % 2)].id,
        submissionNumber: 1,
        description: `Deliverable for ${tasks[index].title}`,
        status,
        clientVisible: index === 10,
        reviewedBy: status === "PENDING_REVIEW" ? null : users[2].id,
        reviewedAt: status === "PENDING_REVIEW" ? null : ago(1),
        reviewComment:
          status === "REVISION_REQUIRED"
            ? "Please revise."
            : status === "APPROVED"
              ? "Approved."
              : null,
      },
    });
    await db.taskDeliverable.create({
      data: {
        organizationId: org.id,
        taskId: tasks[index].id,
        submissionId: s.id,
        uploadedBy: users[3 + (index % 2)].id,
        fileName: `deliverable-${index}.pdf`,
        fileSize: 200000 + index,
        mimeType: "application/pdf",
        storageKey: `demo/${org.id}/${s.id}.pdf`,
      },
    });
    if (status !== "PENDING_REVIEW")
      await db.taskReview.create({
        data: {
          organizationId: org.id,
          taskId: tasks[index].id,
          submissionId: s.id,
          reviewerId: users[2].id,
          action: status === "APPROVED" ? "APPROVE" : "REQUEST_REVISION",
          comment: "QA review",
        },
      });
  }
  await db.notification.createMany({
    data: [
      {
        organizationId: org.id,
        recipientId: users[3].id,
        type: "TASK_ASSIGNED",
        title: "New task assigned",
        message: tasks[0].title,
        entityType: "task",
        entityId: tasks[0].id,
      },
      {
        organizationId: org.id,
        recipientId: users[2].id,
        type: "SUBMISSION_CREATED",
        title: "Deliverable ready",
        message: tasks[10].title,
        entityType: "task",
        entityId: tasks[10].id,
      },
      {
        organizationId: org.id,
        recipientId: users[1].id,
        type: "SOP_PROGRESS",
        title: "SOP active",
        message: campaigns[0].name,
        entityType: "sop_execution",
        entityId: execution.id,
      },
    ],
  });
  await db.sopActivity.create({
    data: {
      organizationId: org.id,
      sopExecutionId: execution.id,
      actorUserId: users[1].id,
      activityType: "SOP_EXECUTION_STARTED",
      description: "Generated 15 SOP tasks",
    },
  });
  await db.activityLog.create({
    data: {
      organizationId: org.id,
      actorUserId: users[0].id,
      action: "FIVE_ROLE_DEMO_SEEDED",
      entityType: "organization",
      entityId: org.id,
    },
  });
  return {
    organization: 1,
    users: 5,
    teams: 1,
    clients: 3,
    campaigns: 3,
    tasks: tasks.length,
    sopTemplates: 1,
    sopExecutions: 1,
    deliverables: 4,
    activities: await db.taskActivity.count({
      where: { organizationId: org.id },
    }),
    notifications: 3,
  };
}
