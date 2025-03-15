/*
  Warnings:

  - Added the required column `categoryId` to the `Product` table without a default value. This is not possible if the table is not empty.

*/

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Size" (
    "id" SERIAL NOT NULL,
    "size" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Size_pkey" PRIMARY KEY ("id")
);

-- Create a default category
INSERT INTO "Category" (name, "updatedAt")
VALUES ('Uncategorized', CURRENT_TIMESTAMP);

-- Add categoryId to Product table with default value
ALTER TABLE "Product" 
ADD COLUMN "categoryId" INTEGER;

-- Set default category for existing products
UPDATE "Product" 
SET "categoryId" = (SELECT id FROM "Category" WHERE name = 'Uncategorized');

-- Now make categoryId required
ALTER TABLE "Product" 
ALTER COLUMN "categoryId" SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE "Product" 
ADD CONSTRAINT "Product_categoryId_fkey" 
FOREIGN KEY ("categoryId") 
REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create junction table for Product and Size
CREATE TABLE "_ProductToSize" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_ProductToSize_A_fkey" FOREIGN KEY ("A") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ProductToSize_B_fkey" FOREIGN KEY ("B") REFERENCES "Size"("id") ON DELETE CASCADE ON UPDATE CASCADE
);


-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Size_size_key" ON "Size"("size");

-- CreateIndex
CREATE INDEX "_ProductToSize_B_index" ON "_ProductToSize"("B");


