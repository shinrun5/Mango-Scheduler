-- CreateTable
CREATE TABLE "Schedule" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMP(3),
    "publishedById" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);
