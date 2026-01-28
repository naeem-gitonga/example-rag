# Plan of Action - Chat Flow Implementation

## Current State

| Component | Status | What Exists |
|-----------|--------|-------------|
| **LLM Service** | Empty | `llm/` dir with Qwen 2.5-3B model files, empty Dockerfile |
| **Query Service** | RAG only | Vector search works, returns raw results (no LLM call) |
| **Gateway** | Partial | WebSocket server with `ingest` and `query` actions |
| **Web App** | No chat | Document upload works, no chat UI or WebSocket client |
| **MongoDB** | Schema only | `init-mongo.js` creates collections, no application code |

## What's Missing for Complete Chat Flow

```
Web App ──WebSocket──► Gateway ──► Query Service ──► LLM Service
   │                     │              │                │
   ├─ Chat UI           ├─ "chat"      ├─ RAG search    ├─ Model hosting
   ├─ Message display      action      ├─ LLM call      └─ Chat completion API
   └─ WS client         └─ LLM route   └─ MongoDB save
```

### 1. LLM Service
- Python service to host Qwen 2.5-3B
- Chat completion API endpoint
- Docker container + compose entry

### 2. Query Service Enhancement
- Call LLM with RAG context after search
- Save messages to MongoDB
- Return generated response (not just search results)

### 3. Gateway
- Add `"chat"` action in messageHandler
- Route to query service (or new chat service)

### 4. Web App
- `/app/chat/page.tsx` - Chat page
- WebSocket client hook
- Chat UI components (message list, input)

### 5. MongoDB Integration
- `shared/src/db/mongo-connection.ts`
- `shared/src/db/mongo-operations.ts`
- Session/message CRUD operations

## Key File Paths

### Gateway
- `gateway/src/index.ts` - WebSocket server
- `gateway/src/handlers/messageHandler.ts` - Message routing
- `gateway/src/services/lambdaClient.ts` - Lambda invocation

### Query Service
- `query/src/handler.ts` - Lambda handler
- `query/src/services/query.service.ts` - Search logic

### Web App
- `web/app/page.tsx` - Home page
- `web/components/DocumentUpload/` - Upload UI (reference for patterns)

### Database
- `db/init-mongo.js` - MongoDB schema
- `shared/src/db/operations.ts` - LanceDB operations (reference for patterns)

### LLM
- `llm/` - Model files exist, no service code
