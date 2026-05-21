ALTER TABLE "Post" ADD COLUMN "isOperatorContent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Post" ADD COLUMN "operatorSourceName" TEXT;
ALTER TABLE "Post" ADD COLUMN "operatorSourceUrl" TEXT;
ALTER TABLE "Post" ADD COLUMN "operatorLastVerifiedAt" TIMESTAMP(3);
