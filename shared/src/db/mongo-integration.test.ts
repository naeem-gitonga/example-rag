/**
 * Integration test for MongoDB operations
 * Run with: MONGO_URI="mongodb://root:example@localhost:9002" npx tsx src/db/mongo-integration.test.ts
 */

import { getMongoDb, closeMongoConnection } from "./mongo-connection.js";
import {
  createSession,
  getSession,
  updateSessionTitle,
  listSessions,
  deleteSession,
  createMessage,
  getMessage,
  getSessionMessages,
  deleteMessage,
  getOrCreateSession,
} from "./mongo-operations.js";

async function runTests() {
  console.log("Starting MongoDB integration tests...\n");

  try {
    // Test 1: Connect to MongoDB
    console.log("1. Testing MongoDB connection...");
    const db = await getMongoDb();
    console.log("   ✓ Connected to MongoDB\n");

    // Test 2: Create a session
    console.log("2. Testing session creation...");
    const session = await createSession(db, {
      userId: "test-user",
      title: "Test Session",
    });
    console.log(`   ✓ Created session: ${session.session_id}`);
    console.log(`   - Title: ${session.title}`);
    console.log(`   - User ID: ${session.user_id}\n`);

    // Test 3: Get session
    console.log("3. Testing session retrieval...");
    const retrieved = await getSession(db, session.session_id);
    if (retrieved?.session_id === session.session_id) {
      console.log("   ✓ Retrieved session successfully\n");
    } else {
      throw new Error("Session retrieval failed");
    }

    // Test 4: Update session title
    console.log("4. Testing session title update...");
    await updateSessionTitle(db, session.session_id, "Updated Title");
    const updated = await getSession(db, session.session_id);
    if (updated?.title === "Updated Title") {
      console.log("   ✓ Session title updated\n");
    } else {
      throw new Error("Session title update failed");
    }

    // Test 5: Create messages
    console.log("5. Testing message creation...");
    const userMsg = await createMessage(db, {
      sessionId: session.session_id,
      role: "user",
      content: "Hello, how are you?",
    });
    console.log(`   ✓ Created user message: ${userMsg.message_id}`);

    const assistantMsg = await createMessage(db, {
      sessionId: session.session_id,
      role: "assistant",
      content: "I'm doing well, thank you!",
      ragContext: [
        { entry_id: "e1", entry_date: "2024-01-01", text_snippet: "Sample context", score: 0.95 },
      ],
    });
    console.log(`   ✓ Created assistant message: ${assistantMsg.message_id}\n`);

    // Test 6: Get session messages
    console.log("6. Testing message retrieval...");
    const messages = await getSessionMessages(db, session.session_id);
    if (messages.length === 2) {
      console.log(`   ✓ Retrieved ${messages.length} messages`);
      console.log(`   - Message 1: [${messages[0].role}] ${messages[0].content}`);
      console.log(`   - Message 2: [${messages[1].role}] ${messages[1].content}\n`);
    } else {
      throw new Error(`Expected 2 messages, got ${messages.length}`);
    }

    // Test 7: List sessions
    console.log("7. Testing session listing...");
    const sessions = await listSessions(db, "test-user");
    console.log(`   ✓ Found ${sessions.length} session(s) for test-user\n`);

    // Test 8: getOrCreateSession
    console.log("8. Testing getOrCreateSession...");
    const existing = await getOrCreateSession(db, session.session_id);
    if (existing.session_id === session.session_id) {
      console.log("   ✓ getOrCreateSession returned existing session");
    }
    const newSession = await getOrCreateSession(db, "brand-new-session-id");
    if (newSession.session_id === "brand-new-session-id") {
      console.log("   ✓ getOrCreateSession created new session\n");
    }

    // Cleanup: Delete test data
    console.log("9. Cleaning up test data...");
    await deleteSession(db, session.session_id);
    await deleteSession(db, "brand-new-session-id");
    const deleted = await getSession(db, session.session_id);
    if (deleted === null) {
      console.log("   ✓ Test sessions deleted\n");
    }

    console.log("========================================");
    console.log("All MongoDB integration tests passed! ✓");
    console.log("========================================");

  } catch (error) {
    console.error("\n✗ Test failed:", error);
    process.exit(1);
  } finally {
    await closeMongoConnection();
  }
}

runTests();
