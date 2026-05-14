// prisma/seed.ts
import { prisma } from '../src/lib/database';
import * as bcrypt from 'bcrypt';

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Create Demo Users
  const hashedPassword = await bcrypt.hash('123', 10);

  const owner = await prisma.user.upsert({
    where: { email: 'alice@test.com' },
    update: {},
    create: {
      name: 'Alice Owner',
      email: 'alice@test.com',
      password: hashedPassword,
    },
  });

  const member = await prisma.user.upsert({
    where: { email: 'bob@test.com' },
    update: {},
    create: {
      name: 'Bob Member',
      email: 'bob@test.com',
      password: hashedPassword,
    },
  });

  console.log('✅ Users created');

  // 2. Create Demo Organization
  const organization = await prisma.organization.create({
    data: {
      name: 'Airwix Technologies',
      owner_id: owner.id,
      members: {
        create: [
          { user_id: owner.id, role: 'OWNER' },
          { user_id: member.id, role: 'MEMBER' },
        ],
      },
    },
  });

  console.log('✅ Organization created');

  // 3. Create Demo Channels
  const generalChannel = await prisma.channel.create({
    data: {
      name: 'General',
      org_id: organization.id,
      isDefault: true,
      members: {
        create: [
          { user_id: owner.id, role: 'MANAGER' },
          { user_id: member.id, role: 'CONTRIBUTOR' },
        ],
      },
    },
  });

  const engineeringChannel = await prisma.channel.create({
    data: {
      name: 'Engineering',
      org_id: organization.id,
      isDefault: false,
      members: {
        create: [
          { user_id: owner.id, role: 'MANAGER' },
          { user_id: member.id, role: 'CONTRIBUTOR' },
        ],
      },
    },
  });

  console.log('✅ Channels created');

  console.log('🎉 Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });