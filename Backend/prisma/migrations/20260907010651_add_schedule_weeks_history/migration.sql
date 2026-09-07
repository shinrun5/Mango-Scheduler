-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "weekStart" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ScheduleSnapshot" (
    "id" SERIAL NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "label" TEXT,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "savedById" INTEGER,
    "shifts" JSONB NOT NULL,

    CONSTRAINT "ScheduleSnapshot_pkey" PRIMARY KEY ("id")
);
