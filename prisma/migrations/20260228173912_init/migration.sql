-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "assunto" TEXT,
    "totalTickets" INTEGER NOT NULL DEFAULT 0,
    "urgente" TEXT NOT NULL,
    "vip" TEXT NOT NULL,
    "especializado" TEXT NOT NULL,
    "scoreRisco" TEXT NOT NULL,
    "recorrencia" TEXT NOT NULL,
    "classificacao" TEXT NOT NULL,
    "recomendacao" TEXT NOT NULL,
    "cancelouAntes" TEXT NOT NULL,
    "precisouIntegracao" TEXT NOT NULL,
    "problemaPagamento" TEXT,
    "clienteDesde" TIMESTAMP(3),
    "diasComoCliente" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "prazo" TIMESTAMP(3),
    "idConversa" TEXT,
    "chat" TEXT,
    "mensagens" TEXT,
    "categoria" TEXT,
    "pilar" TEXT,
    "confianca" DOUBLE PRECISION,
    "acao" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_ticketId_key" ON "Ticket"("ticketId");

-- CreateIndex
CREATE INDEX "Ticket_ticketId_idx" ON "Ticket"("ticketId");

-- CreateIndex
CREATE INDEX "Ticket_email_idx" ON "Ticket"("email");

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");

-- CreateIndex
CREATE INDEX "Ticket_scoreRisco_idx" ON "Ticket"("scoreRisco");

-- CreateIndex
CREATE INDEX "Ticket_createdAt_idx" ON "Ticket"("createdAt");
