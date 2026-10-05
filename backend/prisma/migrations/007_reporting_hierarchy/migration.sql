ALTER TABLE "Membership" ADD COLUMN "reportsToId" TEXT;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_reportsToId_fkey" FOREIGN KEY ("reportsToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Membership_organizationId_reportsToId_idx" ON "Membership"("organizationId", "reportsToId");

-- Preserve the inviter chain as the initial reporting hierarchy for accepted invitations.
UPDATE "Membership" m
SET "reportsToId" = i."invitedById"
FROM "Invitation" i, "User" u
WHERE i."organizationId" = m."organizationId"
  AND i."status" = 'ACCEPTED'
  AND u.id = m."userId"
  AND lower(u.email) = lower(i.email)
  AND i."createdAt" = (
    SELECT max(i2."createdAt") FROM "Invitation" i2
    WHERE i2."organizationId" = i."organizationId"
      AND lower(i2.email) = lower(i.email)
      AND i2."status" = 'ACCEPTED'
  );
