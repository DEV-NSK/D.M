ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'ASSIGNED' AFTER 'TODO';

CREATE TABLE "TaskAssignmentHistory" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "assignedTo" TEXT NOT NULL,
  "assignedBy" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "unassignedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskAssignmentHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TaskAssignmentHistory_organizationId_taskId_assignedAt_idx" ON "TaskAssignmentHistory"("organizationId", "taskId", "assignedAt");
CREATE INDEX "TaskAssignmentHistory_organizationId_assignedTo_idx" ON "TaskAssignmentHistory"("organizationId", "assignedTo");
ALTER TABLE "TaskAssignmentHistory" ADD CONSTRAINT "TaskAssignmentHistory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskAssignmentHistory" ADD CONSTRAINT "TaskAssignmentHistory_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskAssignmentHistory" ADD CONSTRAINT "TaskAssignmentHistory_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaskAssignmentHistory" ADD CONSTRAINT "TaskAssignmentHistory_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "TaskAssignmentHistory" ("id", "organizationId", "taskId", "assignedTo", "assignedBy", "assignedAt", "createdAt")
SELECT 'hist_' || "id", "organizationId", "taskId", "userId", "assignedBy", "assignedAt", "assignedAt"
FROM "TaskAssignee" WHERE "assignmentType" = 'PRIMARY';
