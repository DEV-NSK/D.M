CREATE TYPE "TaskWorkSessionStatus" AS ENUM ('ACTIVE', 'COMPLETED');

ALTER TABLE "Task"
  ALTER COLUMN "dueDate" TYPE TIMESTAMP(3) USING "dueDate"::timestamp,
  ADD COLUMN "estimatedDurationSeconds" INTEGER,
  ADD COLUMN "actualDurationSeconds" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "firstStartedAt" TIMESTAMP(3),
  ADD COLUMN "completedBy" TEXT;

UPDATE "Task"
SET "estimatedDurationSeconds" = ROUND("estimatedHours" * 3600)::integer
WHERE "estimatedHours" IS NOT NULL;

CREATE TABLE "TaskWorkSession" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "durationSeconds" INTEGER,
  "status" "TaskWorkSessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaskWorkSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TaskWorkSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TaskWorkSession_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TaskWorkSession_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TaskWorkSession_duration_nonnegative" CHECK ("durationSeconds" IS NULL OR "durationSeconds" >= 0)
);

CREATE UNIQUE INDEX "TaskWorkSession_one_active_per_task" ON "TaskWorkSession"("taskId") WHERE "status" = 'ACTIVE';
CREATE INDEX "TaskWorkSession_taskId_idx" ON "TaskWorkSession"("taskId");
CREATE INDEX "TaskWorkSession_employeeId_idx" ON "TaskWorkSession"("employeeId");
CREATE INDEX "TaskWorkSession_organizationId_idx" ON "TaskWorkSession"("organizationId");
CREATE INDEX "TaskWorkSession_status_idx" ON "TaskWorkSession"("status");
CREATE INDEX "TaskWorkSession_startedAt_idx" ON "TaskWorkSession"("startedAt");
CREATE INDEX "TaskWorkSession_endedAt_idx" ON "TaskWorkSession"("endedAt");
CREATE INDEX "TaskWorkSession_organizationId_taskId_startedAt_idx" ON "TaskWorkSession"("organizationId", "taskId", "startedAt");
CREATE INDEX "Task_actualDurationSeconds_idx" ON "Task"("organizationId", "actualDurationSeconds");
