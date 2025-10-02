import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Fetching GtcPoints with sectorId...')
  const points = await prisma.gtcPoint.findMany({ where: { sectorId: { not: undefined } }, select: { id: true, sectorId: true } })
  console.log(`Found ${points.length} points with sectorId`)

  if (points.length === 0) {
    console.log('Nothing to populate.')
    return
  }

  const data = points.map(p => ({ id: cryptoRandomId(), gtcPointId: p.id, sectorId: p.sectorId as string, createdAt: new Date() }))

  // Use createMany with skipDuplicates to be safe
  // prisma.gtcPointSector typing sometimes mismatches after client regen; cast to any to be robust
  // @ts-ignore
  const res = await (prisma as any).gtcPointSector.createMany({ data, skipDuplicates: true })
  console.log(`Inserted ${res.count} GtcPointSector rows (skipped duplicates)`)

  // @ts-ignore
  const total = await (prisma as any).gtcPointSector.count()
  console.log(`Total GtcPointSector rows: ${total}`)
}

function cryptoRandomId() {
  // Use crypto.randomUUID when available, fallback to timestamp+random
  try {
    // @ts-ignore
    return (globalThis.crypto && (globalThis.crypto as any).randomUUID) ? (globalThis.crypto as any).randomUUID() : `id_${Date.now()}_${Math.floor(Math.random() * 100000)}`
  } catch (e) {
    return `id_${Date.now()}_${Math.floor(Math.random() * 100000)}`
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
