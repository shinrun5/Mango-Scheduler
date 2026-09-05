-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "maxShifts" INTEGER NOT NULL DEFAULT 6;

-- AlterTable
ALTER TABLE "EmployeeStore" ADD COLUMN     "canOpen" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ShiftRequirement" ADD COLUMN     "needOpen" BOOLEAN NOT NULL DEFAULT false;
