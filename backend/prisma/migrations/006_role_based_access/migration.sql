-- Normalize the product-facing owner role without recreating memberships.
ALTER TYPE "Role" RENAME VALUE 'OWNER' TO 'CEO';
ALTER TABLE "Team" ADD COLUMN "managerId" TEXT;
ALTER TABLE "Team" ADD CONSTRAINT "Team_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Team_organizationId_managerId_idx" ON "Team"("organizationId", "managerId");
