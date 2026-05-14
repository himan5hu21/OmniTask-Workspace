import { prisma } from './src/lib/database';

async function clearDatabase() {
  console.log('🗑️ Clearing database...');
  
  // Get all table names in the public schema
  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT LIKE '_prisma_migrations';`;

  const tables = tablenames
    .map(({ tablename }) => `public."${tablename}"`)
    .filter((name) => name !== 'public."_prisma_migrations"')
    .join(', ');

  if (!tables) {
    console.log('✅ No tables found to clear.');
    return;
  }

  try {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
    console.log('✅ Database cleared successfully!');
  } catch (error) {
    console.error('❌ Failed to clear database:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

clearDatabase();
