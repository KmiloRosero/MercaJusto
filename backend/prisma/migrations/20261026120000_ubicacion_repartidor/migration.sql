-- Ubicación en vivo del repartidor para el seguimiento del pedido.
ALTER TABLE "User" ADD COLUMN "lastLat" DOUBLE PRECISION;
ALTER TABLE "User" ADD COLUMN "lastLng" DOUBLE PRECISION;
ALTER TABLE "User" ADD COLUMN "lastLocationAt" TIMESTAMP(3);
