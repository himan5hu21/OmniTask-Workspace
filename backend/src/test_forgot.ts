import 'dotenv/config';
import { prisma } from './lib/database';
import { AuthService } from './modules/auth/auth.service';

async function test() {
  console.log('🧪 Starting manual Password Reset flow test...');

  // 1. Seed or find a test user (e.g. Alice)
  let alice = await prisma.user.findUnique({
    where: { email: 'alice@test.com' }
  });

  if (!alice) {
    console.log('ℹ️ Alice not found. Creating a test user...');
    // Create a temporary user for this test
    alice = await prisma.user.create({
      data: {
        name: 'Alice Smith',
        email: 'alice@test.com',
        password: 'initial_test_password',
        is_active: true
      }
    });
  }

  console.log(`ℹ️ Test User found: ${alice.name} (${alice.email})`);
  console.log(`ℹ️ User token version initially: ${alice.token_version}`);

  // 2. Trigger forgotPassword
  console.log('\n--- Step 1: Requesting Password Reset ---');
  const forgotResult = await AuthService.forgotPassword('alice@test.com');
  console.log('✅ ForgotPassword call succeeded:', forgotResult);

  // 3. Inspect user in database to verify token and expiry are set
  const userAfterForgot = await prisma.user.findUnique({
    where: { id: alice.id }
  });

  if (!userAfterForgot || !userAfterForgot.reset_token || !userAfterForgot.reset_token_expires_at) {
    console.error('❌ Error: Hashed reset token or expiry was not saved in the database!');
    return;
  }

  console.log('✅ Hashed reset token saved in DB successfully!');
  console.log(`🔑 Hashed token: ${userAfterForgot.reset_token}`);
  console.log(`⏰ Expiry: ${userAfterForgot.reset_token_expires_at.toISOString()}`);

  // 4. Test with a fake/invalid token
  console.log('\n--- Step 2: Testing Reset with Invalid Token ---');
  try {
    await AuthService.resetPassword('fake_token_123', 'new_secure_pass');
    console.error('❌ Error: AuthService allowed password reset with a fake token!');
  } catch (error: any) {
    console.log('✅ Prevented invalid reset as expected:', error.message);
  }

  // 5. Run the actual password reset using the generated token
  // Since forgotPassword prints the mail with the token, we can extract the token
  // from the database directly since it is stored as SHA-256 hash. But wait!
  // The email prints the raw random token (the database stores the hashed version).
  // In our test, since we cannot easily parse console outputs, let's simulate the flow
  // by generating a token, hashing it, updating the DB, and verifying that AuthService.resetPassword succeeds!
  console.log('\n--- Step 3: Performing Valid Password Reset ---');
  const token = '1234567890abcdef1234567890abcdef';
  const crypto = await import('node:crypto');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Manually update the token so we know the raw token is '1234567890abcdef1234567890abcdef'
  await prisma.user.update({
    where: { id: alice.id },
    data: {
      reset_token: hashedToken,
      reset_token_expires_at: new Date(Date.now() + 1000 * 3600) // 1 hour
    }
  });

  // Call the resetPassword method using the raw token
  const resetResult = await AuthService.resetPassword(token, 'new_super_secret_password');
  console.log('✅ ResetPassword call succeeded:', resetResult);

  // 6. Verify user in database after reset
  const userAfterReset = await prisma.user.findUnique({
    where: { id: alice.id }
  });

  if (!userAfterReset) {
    console.error('❌ User not found after reset');
    return;
  }

  console.log('\n--- Step 4: Verification ---');
  console.log(`🔐 Hashed reset token in DB after reset: ${userAfterReset.reset_token} (Expected: null)`);
  console.log(`⏰ Expiry in DB after reset: ${userAfterReset.reset_token_expires_at} (Expected: null)`);
  console.log(`🔄 Token version in DB after reset: ${userAfterReset.token_version} (Expected: incremented from ${alice.token_version})`);

  if (userAfterReset.reset_token === null && userAfterReset.token_version === alice.token_version + 1) {
    console.log('\n🎉 ALL PASSWORD RESET TESTS PASSED SUCCESSFULLY! 🎉');
  } else {
    console.error('❌ Verification failed: Token not cleared or token version not incremented.');
  }
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
