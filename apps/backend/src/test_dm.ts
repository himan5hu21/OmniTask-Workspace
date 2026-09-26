import 'dotenv/config';
import { prisma } from './lib/database';
import { MessageService } from './modules/message/message.service';

async function test() {
  console.log('🧪 Starting manual Direct Messaging (DM) flow test...');

  // 1. Find or create two test users: Alice and Bob
  let alice = await prisma.user.findUnique({
    where: { email: 'alice@test.com' }
  });
  if (!alice) {
    console.log('ℹ️ Creating test user Alice...');
    alice = await prisma.user.create({
      data: {
        name: 'Alice DM Test',
        email: 'alice@test.com',
        password: 'alice_secure_pass',
        is_active: true
      }
    });
  }

  let bob = await prisma.user.findUnique({
    where: { email: 'bob@test.com' }
  });
  if (!bob) {
    console.log('ℹ️ Creating test user Bob...');
    bob = await prisma.user.create({
      data: {
        name: 'Bob DM Test',
        email: 'bob@test.com',
        password: 'bob_secure_pass',
        is_active: true
      }
    });
  }

  console.log(`ℹ️ Alice User ID: ${alice.id}`);
  console.log(`ℹ️ Bob User ID: ${bob.id}`);

  // 2. Resolve Conversation (Alice -> Bob)
  console.log('\n--- Step 1: Resolving Direct Conversation (Alice to Bob) ---');
  const conv1 = await MessageService.getOrCreateConversation(alice.id, bob.id);
  console.log('✅ Resolved Conversation ID:', conv1.id);
  console.log('✅ Other User Details:', conv1.otherUser);

  // 3. Resolve Conversation (Bob -> Alice) - SHOULD return the identical conversation ID!
  console.log('\n--- Step 2: Resolving Direct Conversation (Bob to Alice) ---');
  const conv2 = await MessageService.getOrCreateConversation(bob.id, alice.id);
  console.log('✅ Resolved Conversation ID:', conv2.id);
  console.log('✅ Other User Details:', conv2.otherUser);

  if (conv1.id !== conv2.id) {
    console.error('❌ FAILURE: Separate conversations were created! Expected identical IDs (Unique sorting constraint check failed)');
    return;
  }
  console.log('🎉 SUCCESS: Sorting constraint satisfied. Single, unique thread matches both directions.');

  // 4. List conversations for Alice
  console.log('\n--- Step 3: Listing Conversations for Alice ---');
  const conversations = await MessageService.getUserConversations(alice.id);
  console.log('✅ Active conversations list count:', conversations.length);
  const foundConv = conversations.find(c => c.id === conv1.id);
  if (!foundConv) {
    console.error('❌ FAILURE: Created conversation not found in user list!');
    return;
  }
  console.log('✅ Found conversation with:', foundConv.otherUser.name);

  // 5. Send message from Alice to Bob
  console.log('\n--- Step 4: Sending Message (Alice to Bob) ---');
  const messageContent = 'Hello Bob! This is an automated DM test.';
  const msg = await MessageService.createDirectMessage({ content: messageContent }, conv1.id, alice.id);
  console.log('✅ Message created successfully:', msg);

  // 6. Fetch messages in conversation for Bob (marks messages as read)
  console.log('\n--- Step 5: Fetching Messages for Bob ---');
  const messagesResult = await MessageService.getDirectMessages(conv1.id, bob.id);
  console.log('✅ Messages count fetched:', messagesResult.messages.length);
  const fetchedMsg = messagesResult.messages.find(m => m.id === msg.id);
  if (!fetchedMsg) {
    console.error('❌ FAILURE: Sent message not retrieved in direct messages!');
    return;
  }
  console.log('✅ Fetched message content:', fetchedMsg.content);

  // 7. Edit message (Alice edits her own message)
  console.log('\n--- Step 6: Editing message (Alice) ---');
  const updatedContent = 'Hello Bob! This is an updated automated DM test.';
  const editedMsg = await MessageService.editDirectMessage(msg.id, updatedContent, alice.id);
  console.log('✅ Message edited successfully:', editedMsg.content);

  // 8. Prevent editing other users' messages (Bob attempts to edit Alice's message)
  console.log('\n--- Step 7: Attempting unauthorized edit (Bob on Alice\'s message) ---');
  try {
    await MessageService.editDirectMessage(msg.id, 'Hacked!', bob.id);
    console.error('❌ FAILURE: Bob was unauthorized but message edit was allowed!');
    return;
  } catch (error: any) {
    console.log('✅ Prevented unauthorized edit as expected:', error.message);
  }

  // 9. Delete message (Alice deletes her own message)
  console.log('\n--- Step 8: Deleting message (Alice) ---');
  const deleteResult = await MessageService.deleteDirectMessage(msg.id, alice.id);
  console.log('✅ Message deleted successfully:', deleteResult);

  // 10. Verification - Fetch messages again and ensure it is empty or deleted
  console.log('\n--- Step 9: Post-Deletion Verification ---');
  const postDeleteMsgs = await MessageService.getDirectMessages(conv1.id, alice.id);
  const stillExists = postDeleteMsgs.messages.some(m => m.id === msg.id);
  if (stillExists) {
    console.error('❌ FAILURE: Message still exists in history after deletion!');
    return;
  }
  console.log('✅ Message is completely deleted from conversation logs!');

  console.log('\n🎉 ALL DIRECT MESSAGING TESTS PASSED SUCCESSFULLY! 🎉');
}

test()
  .catch(console.error)
  .finally(async () => {
    // Optionally clean up test conversations or messages created
    console.log('\n🧹 Cleaning up test data...');
    try {
      const alice = await prisma.user.findUnique({ where: { email: 'alice@test.com' } });
      const bob = await prisma.user.findUnique({ where: { email: 'bob@test.com' } });
      if (alice && bob) {
        const [u1, u2] = alice.id < bob.id ? [alice.id, bob.id] : [bob.id, alice.id];
        const conv = await prisma.directConversation.findUnique({
          where: { user1_id_user2_id: { user1_id: u1, user2_id: u2 } }
        });
        if (conv) {
          await prisma.directMessage.deleteMany({ where: { conversation_id: conv.id } });
          await prisma.directConversation.delete({ where: { id: conv.id } });
          console.log('✅ Cleaned up conversation and messages.');
        }
      }
    } catch (e: any) {
      console.warn('⚠️ Cleanup failed (non-critical):', e.message);
    }
    await prisma.$disconnect();
  });
