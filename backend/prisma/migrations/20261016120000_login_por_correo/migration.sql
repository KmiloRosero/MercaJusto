-- Los códigos viejos (por SMS) no sirven con el nuevo formato.
DELETE FROM "OtpCode";

-- DropForeignKey
ALTER TABLE "OtpCode" DROP CONSTRAINT "OtpCode_userId_fkey";

-- DropIndex
DROP INDEX "OtpCode_phone_consumedAt_idx";

-- DropIndex
DROP INDEX "User_phone_key";

-- AlterTable
ALTER TABLE "OtpCode" DROP COLUMN "code",
DROP COLUMN "phone",
DROP COLUMN "userId",
ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "codeHash" TEXT NOT NULL,
ADD COLUMN     "email" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "OtpCode_email_consumedAt_idx" ON "OtpCode"("email", "consumedAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

