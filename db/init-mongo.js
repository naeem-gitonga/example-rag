// MongoDB initialization script for chat history collections
// Runs automatically on first container startup via /docker-entrypoint-initdb.d/

// Create sessions collection with validation
db.createCollection("sessions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["session_id", "created_at", "updated_at"],
      properties: {
        session_id: { bsonType: "string", description: "Unique session identifier" },
        user_id: { bsonType: ["string", "null"], description: "User ID (null for anonymous)" },
        title: { bsonType: ["string", "null"], description: "Session title" },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" },
        metadata: { bsonType: "object" }
      }
    }
  }
});

// Create messages collection with validation
db.createCollection("messages", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["message_id", "session_id", "role", "content", "created_at"],
      properties: {
        message_id: { bsonType: "string" },
        session_id: { bsonType: "string" },
        role: { enum: ["user", "assistant"] },
        content: { bsonType: "string" },
        created_at: { bsonType: "date" },
        rag_context: {
          bsonType: ["array", "null"],
          items: {
            bsonType: "object",
            properties: {
              entry_id: { bsonType: "string" },
              entry_date: { bsonType: "string" },
              text_snippet: { bsonType: "string" },
              score: { bsonType: "number" }
            }
          }
        }
      }
    }
  }
});

// Create indexes for sessions
db.sessions.createIndex({ "session_id": 1 }, { unique: true });
db.sessions.createIndex({ "user_id": 1 }, { sparse: true });
db.sessions.createIndex({ "updated_at": -1 });

// Create indexes for messages
db.messages.createIndex({ "message_id": 1 }, { unique: true });
db.messages.createIndex({ "session_id": 1, "created_at": 1 });

print("MongoDB initialization complete!");
print("Collections created: sessions, messages");
print("Indexes created successfully");
