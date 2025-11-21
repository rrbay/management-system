-- CreateTable
CREATE TABLE "CrewMember" (
    "id" TEXT NOT NULL,
    "employeeCode" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "fullName" TEXT,
    "rank" TEXT,
    "position" TEXT,
    "department" TEXT,
    "nationality" TEXT,
    "passportNumber" TEXT,
    "passportExpiry" TIMESTAMP(3),
    "email" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "rawData" JSONB,
    "importId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrewMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrewImport" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "headers" JSONB NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrewImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CrewMember_employeeCode_key" ON "CrewMember"("employeeCode");

-- CreateIndex
CREATE INDEX "CrewMember_employeeCode_idx" ON "CrewMember"("employeeCode");

-- CreateIndex
CREATE INDEX "CrewMember_status_idx" ON "CrewMember"("status");

-- CreateIndex
CREATE INDEX "CrewImport_uploadedAt_idx" ON "CrewImport"("uploadedAt");

-- AddForeignKey
ALTER TABLE "CrewMember" ADD CONSTRAINT "CrewMember_importId_fkey" FOREIGN KEY ("importId") REFERENCES "CrewImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
