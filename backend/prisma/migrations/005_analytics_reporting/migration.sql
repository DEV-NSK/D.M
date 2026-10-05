CREATE TABLE "Report" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "filters" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Report" ADD CONSTRAINT "Report_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Report_organizationId_createdAt_idx" ON "Report"("organizationId", "createdAt");
CREATE INDEX "Report_organizationId_createdBy_idx" ON "Report"("organizationId", "createdBy");
CREATE INDEX "TaskSubmission_organizationId_createdAt_idx" ON "TaskSubmission"("organizationId", "createdAt");
CREATE INDEX "ClientReview_organizationId_status_createdAt_idx" ON "ClientReview"("organizationId", "status", "createdAt");
