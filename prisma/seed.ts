// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as bcrypt from 'bcrypt'
import 'dotenv/config'

// ✅ CORRETO para Prisma ORM v7 com PostgreSQL
const connectionString = process.env.DATABASE_URL

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Iniciando seed...')

  try {
    // Admin
    const adminPassword = await bcrypt.hash('123456', 10)
    const admin = await prisma.user.upsert({
      where: { email: 'admin@atendimento.com' },
      update: {},
      create: {
        email: 'admin@atendimento.com',
        password: adminPassword,
        name: 'Administrador',
        role: 'ADMIN',
        department: 'TI',
        isActive: true,
      },
    })
    console.log(`✅ Admin: ${admin.email}`)

    // Atendente
    const atendente = await prisma.user.upsert({
      where: { email: 'atendente@atendimento.com' },
      update: {},
      create: {
        email: 'atendente@atendimento.com',
        password: await bcrypt.hash('123456', 10),
        name: 'Atendente',
        role: 'ATTENDANT',
        department: 'Suporte',
        isActive: true,
      },
    })
    console.log(`✅ Atendente: ${atendente.email}`)

    // Tags
    const tags = [
      { name: 'Suporte', color: '#3b82f6' },
      { name: 'Vendas', color: '#22c55e' },
      { name: 'Financeiro', color: '#ef4444' },
      { name: 'Reclamação', color: '#f59e0b' },
      { name: 'Dúvida', color: '#8b5cf6' },
    ]

    for (const tag of tags) {
      await prisma.tag.upsert({
        where: { name: tag.name },
        update: {},
        create: tag,
      })
    }
    console.log(`✅ ${tags.length} tags criadas`)

    console.log('🎉 Seed concluído!')
  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()