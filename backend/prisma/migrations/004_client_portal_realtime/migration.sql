CREATE TYPE "ResourceVisibility" AS ENUM ('INTERNAL', 'CLIENT_VISIBLE');
CREATE TYPE "ClientMembershipRole" AS ENUM ('CLIENT_ADMIN', 'CLIENT_MEMBER');
CREATE TYPE "ClientReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'CHANGES_REQUESTED');

ALTER TABLE "Task" ADD COLUMN "visibility" "ResourceVisibility" NOT NULL DEFAULT 'INTERNAL',
ADD COLUMN "requiresClientReview" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TaskComment" ADD COLUMN "visibility" "ResourceVisibility" NOT NULL DEFAULT 'INTERNAL';
ALTER TABLE "TaskSubmission" ADD COLUMN "clientVisible" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "ClientMembership" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "clientId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "role" "ClientMembershipRole" NOT NULL DEFAULT 'CLIENT_MEMBER', "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientMembership_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ClientMembership_clientId_userId_key" ON "ClientMembership"("clientId", "userId");
CREATE INDEX "ClientMembership_organizationId_userId_status_idx" ON "ClientMembership"("organizationId", "userId", "status");

CREATE TABLE "ClientReview" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "clientId" TEXT NOT NULL, "taskId" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL, "reviewerId" TEXT NOT NULL, "status" "ClientReviewStatus" NOT NULL,
  "comment" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ClientReview_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ClientReview_organizationId_clientId_createdAt_idx" ON "ClientReview"("organizationId", "clientId", "createdAt");
CREATE INDEX "ClientReview_submissionId_createdAt_idx" ON "ClientReview"("submissionId", "createdAt");

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "recipientId" TEXT NOT NULL, "type" TEXT NOT NULL,
  "title" TEXT NOT NULL, "message" TEXT NOT NULL, "entityType" TEXT NOT NULL, "entityId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Notification_organizationId_recipientId_readAt_createdAt_idx" ON "Notification"("organizationId", "recipientId", "readAt", "createdAt");

ALTER TABLE "ClientMembership" ADD CONSTRAINT "ClientMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientMembership" ADD CONSTRAINT "ClientMembership_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientMembership" ADD CONSTRAINT "ClientMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientReview" ADD CONSTRAINT "ClientReview_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientReview" ADD CONSTRAINT "ClientReview_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientReview" ADD CONSTRAINT "ClientReview_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientReview" ADD CONSTRAINT "ClientReview_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "TaskSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientReview" ADD CONSTRAINT "ClientReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
