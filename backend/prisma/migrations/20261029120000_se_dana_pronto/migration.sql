-- Fecha hasta la que el producto está bueno, según el productor.
ALTER TABLE "Product" ADD COLUMN "expiresAt" TIMESTAMP(3);
