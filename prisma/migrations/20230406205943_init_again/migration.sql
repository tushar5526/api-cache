/*
  Warnings:

  - Made the column `title` on table `Song` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Song" ALTER COLUMN "title" SET NOT NULL;
