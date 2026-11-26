-- AlterEnum
ALTER TYPE "WorkspaceRole" ADD VALUE IF NOT EXISTS 'ADMIN';

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE IF NOT EXISTS "WorkspaceInvitation" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "invitedById" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WorkspaceInvitation_tokenHash_key" ON "WorkspaceInvitation"("tokenHash");
CREATE UNIQUE INDEX IF NOT EXISTS "WorkspaceInvitation_code_key" ON "WorkspaceInvitation"("code");
CREATE INDEX IF NOT EXISTS "WorkspaceInvitation_workspaceId_idx" ON "WorkspaceInvitation"("workspaceId");
CREATE INDEX IF NOT EXISTS "WorkspaceInvitation_code_idx" ON "WorkspaceInvitation"("code");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "WorkspaceInvitation" ADD CONSTRAINT "WorkspaceInvitation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "WorkspaceInvitation" ADD CONSTRAINT "WorkspaceInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
