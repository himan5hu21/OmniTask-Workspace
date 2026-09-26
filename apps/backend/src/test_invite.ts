import 'dotenv/config';
import { prisma } from './lib/database';
import { OrganizationService } from './modules/organizations/organization.service';

// Mock JWT
const mockJwt = {
  sign: (payload: any, options?: any) => {
    return `mock_jwt_token_${Buffer.from(JSON.stringify(payload)).toString('base64')}`;
  },
  verify: (token: string) => {
    const base64 = token.replace('mock_jwt_token_', '');
    return JSON.parse(Buffer.from(base64, 'base64').toString('ascii'));
  }
};

async function test() {
  console.log('🧪 Starting manual email invitation test...');
  
  // Find owner Alice
  const alice = await prisma.user.findUnique({
    where: { email: 'alice@test.com' }
  });
  
  if (!alice) {
    console.error('❌ Alice not found in database. Make sure db is seeded.');
    return;
  }
  
  // Find Airwix Technologies organization
  const org = await prisma.organization.findFirst({
    where: { name: 'Airwix Technologies' }
  });
  
  if (!org) {
    console.error('❌ Airwix Technologies organization not found in database. Make sure db is seeded.');
    return;
  }
  
  console.log(`ℹ️  Found Org: ${org.name} (${org.id})`);
  console.log(`ℹ️  Found User: ${alice.name} (${alice.id})`);
  
  // Trigger generateInvitation
  const result = await OrganizationService.generateInvitation(
    org.id,
    'invitee@test.com',
    'MEMBER',
    alice.id,
    mockJwt
  );
  
  console.log('✅ Invitation Generated successfully!');
  console.log('🔗 Invite Link:', result.inviteLink);
  
  // Wait a moment for any async logs/promises to finish
  await new Promise(resolve => setTimeout(resolve, 2000));
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
