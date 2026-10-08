-- CreateEnum
CREATE TYPE "SopTemplateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SopExecutionStatus" AS ENUM ('NOT_STARTED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SopResponsibilityType" AS ENUM ('INTERNAL', 'CLIENT', 'SHARED', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "SopSourceType" AS ENUM ('COM', 'CLIENT', 'COM_AND_CLIENT', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "SopApprovalType" AS ENUM ('NONE', 'INTERNAL', 'CLIENT', 'BOTH');

-- CreateEnum
CREATE TYPE "SopDependencyType" AS ENUM ('BLOCKING');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "blocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sopExecutionDayId" TEXT,
ADD COLUMN     "sopExecutionId" TEXT,
ADD COLUMN     "sopTemplateTaskId" TEXT;

-- CreateTable
CREATE TABLE "SopTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "SopTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL,
    "parentTemplateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SopTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SopTemplateDay" (
    "id" TEXT NOT NULL,
    "sopTemplateId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SopTemplateDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SopTemplateTask" (
    "id" TEXT NOT NULL,
    "sopTemplateDayId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "responsibilityType" "SopResponsibilityType" NOT NULL DEFAULT 'INTERNAL',
    "responsibilityTeamId" TEXT,
    "responsibilityRole" "Role",
    "operationalLabel" TEXT,
    "sourceType" "SopSourceType" NOT NULL DEFAULT 'COM',
    "sourceDescription" TEXT,
    "sequenceOrder" INTEGER NOT NULL,
    "defaultPriority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "estimatedDurationSeconds" INTEGER,
    "requiresDeliverable" BOOLEAN NOT NULL DEFAULT false,
    "approvalType" "SopApprovalType" NOT NULL DEFAULT 'NONE',
    "clientVisible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SopTemplateTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SopTaskDependency" (
    "id" TEXT NOT NULL,
    "sopTemplateTaskId" TEXT NOT NULL,
    "dependsOnSopTemplateTaskId" TEXT NOT NULL,
    "dependencyType" "SopDependencyType" NOT NULL DEFAULT 'BLOCKING',

    CONSTRAINT "SopTaskDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SopExecution" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "sopTemplateId" TEXT NOT NULL,
    "sopTemplateVersion" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "targetEndDate" DATE,
    "status" "SopExecutionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SopExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SopExecutionDay" (
    "id" TEXT NOT NULL,
    "sopExecutionId" TEXT NOT NULL,
    "sopTemplateDayId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "scheduledDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SopExecutionDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SopActivity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sopExecutionId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "activityType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SopActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SopTemplate_organizationId_status_idx" ON "SopTemplate"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SopTemplate_organizationId_name_version_key" ON "SopTemplate"("organizationId", "name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "SopTemplateDay_sopTemplateId_dayNumber_key" ON "SopTemplateDay"("sopTemplateId", "dayNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SopTemplateTask_sopTemplateDayId_sequenceOrder_key" ON "SopTemplateTask"("sopTemplateDayId", "sequenceOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SopTaskDependency_sopTemplateTaskId_dependsOnSopTemplateTas_key" ON "SopTaskDependency"("sopTemplateTaskId", "dependsOnSopTemplateTaskId");

-- CreateIndex
CREATE INDEX "SopExecution_organizationId_status_idx" ON "SopExecution"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SopExecution_campaignId_sopTemplateId_key" ON "SopExecution"("campaignId", "sopTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "SopExecutionDay_sopExecutionId_dayNumber_key" ON "SopExecutionDay"("sopExecutionId", "dayNumber");

-- CreateIndex
CREATE INDEX "SopActivity_organizationId_sopExecutionId_createdAt_idx" ON "SopActivity"("organizationId", "sopExecutionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Task_sopExecutionId_sopTemplateTaskId_key" ON "Task"("sopExecutionId", "sopTemplateTaskId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_sopExecutionId_fkey" FOREIGN KEY ("sopExecutionId") REFERENCES "SopExecution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_sopTemplateTaskId_fkey" FOREIGN KEY ("sopTemplateTaskId") REFERENCES "SopTemplateTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_sopExecutionDayId_fkey" FOREIGN KEY ("sopExecutionDayId") REFERENCES "SopExecutionDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SopTemplate" ADD CONSTRAINT "SopTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SopTemplate" ADD CONSTRAINT "SopTemplate_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SopTemplate" ADD CONSTRAINT "SopTemplate_parentTemplateId_fkey" FOREIGN KEY ("parentTemplateId") REFERENCES "SopTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SopTemplateDay" ADD CONSTRAINT "SopTemplateDay_sopTemplateId_fkey" FOREIGN KEY ("sopTemplateId") REFERENCES "SopTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SopTemplateTask" ADD CONSTRAINT "SopTemplateTask_sopTemplateDayId_fkey" FOREIGN KEY ("sopTemplateDayId") REFERENCES "SopTemplateDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SopTemplateTask" ADD CONSTRAINT "SopTemplateTask_responsibilityTeamId_fkey" FOREIGN KEY ("responsibilityTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SopTaskDependency" ADD CONSTRAINT "SopTaskDependency_sopTemplateTaskId_fkey" FOREIGN KEY ("sopTemplateTaskId") REFERENCES "SopTemplateTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SopTaskDependency" ADD CONSTRAINT "SopTaskDependency_dependsOnSopTemplateTaskId_fkey" FOREIGN KEY ("dependsOnSopTemplateTaskId") REFERENCES "SopTemplateTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SopExecution" ADD CONSTRAINT "SopExecution_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SopExecution" ADD CONSTRAINT "SopExecution_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SopExecution" ADD CONSTRAINT "SopExecution_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SopExecution" ADD CONSTRAINT "SopExecution_sopTemplateId_fkey" FOREIGN KEY ("sopTemplateId") REFERENCES "SopTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SopExecution" ADD CONSTRAINT "SopExecution_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SopExecutionDay" ADD CONSTRAINT "SopExecutionDay_sopExecutionId_fkey" FOREIGN KEY ("sopExecutionId") REFERENCES "SopExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SopActivity" ADD CONSTRAINT "SopActivity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SopActivity" ADD CONSTRAINT "SopActivity_sopExecutionId_fkey" FOREIGN KEY ("sopExecutionId") REFERENCES "SopExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
