-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "dataPagamento" TIMESTAMP(3),
ADD COLUMN     "metodoPagamento" TEXT,
ADD COLUMN     "valorPago" DOUBLE PRECISION;
