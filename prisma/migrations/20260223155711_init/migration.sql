-- CreateTable
CREATE TABLE "sheet_imports" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sheet_imports_pkey" PRIMARY KEY ("id")
);
