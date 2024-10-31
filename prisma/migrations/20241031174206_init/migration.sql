-- CreateTable
CREATE TABLE "LegalPrompt" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "systemMessage" TEXT,

    CONSTRAINT "LegalPrompt_pkey" PRIMARY KEY ("id")
);
