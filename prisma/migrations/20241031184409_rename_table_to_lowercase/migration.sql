/*
  Warnings:

  - You are about to drop the `LegalPrompt` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "LegalPrompt";

-- CreateTable
CREATE TABLE "legalprompt" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "systemMessage" TEXT,

    CONSTRAINT "legalprompt_pkey" PRIMARY KEY ("id")
);
