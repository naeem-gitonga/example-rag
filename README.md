# Example RAG

A Retrieval-Augmented Generation (RAG) system for journal entries using LanceDB as the vector database. Designed to mirror AWS serverless architecture locally using Docker.

## Architecture
![architecture pic](./architecture.png)
```
┌─────────────────┐
│    Web App      │
│   (Next.js)     │
└────────┬────────┘
         │ WebSocket
         ▼
┌─────────────────┐         SSE (streaming)        ┌─────────────────┐
│    Gateway      │◄──────────────────────────────►│      LLM        │
│   (Node.js)     │                                │    (Python)     │
└────────┬────────┘                                └─────────────────┘
         │ AWS SDK (Lambda Invoke)
         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Ingestion     │     │     Query       │     │    Embedding    │
│   (Lambda)      │     │    (Lambda)     │     │    (Python)     │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       │
┌─────────────────────────────────────────┐              │
│              Shared Module              │◄─────────────┘
│  (connection, operations, embedding)    │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│            LanceDB (embedded)           │
│         stored in MinIO (S3)            │
└─────────────────────────────────────────┘
```

### Gateway

The gateway handles WebSocket connections from the web app and invokes Lambda functions using the AWS SDK. This mirrors AWS API Gateway WebSocket APIs:

- **Local**: Gateway uses AWS SDK pointing at Lambda RIE endpoints
- **Production**: Gateway uses AWS SDK pointing at real Lambda functions

The web app communicates entirely over WebSocket - no direct HTTP calls to Lambda services.

### Data Flow

**Ingestion (adding documents):**
```
Web App
    │
    │  WebSocket: { action: "ingest", text: "...", entry_date: "...", moods: [...] }
    │
    ▼
Gateway
    │
    │  AWS SDK Lambda Invoke
    │
    ▼
Ingestion Service (Lambda)
    │
    ├──► Embedding Service (get vector for text)
    │         │
    │         ▼
    │    Returns 384-dimensional vector
    │
    ▼
LanceDB ──► S3/MinIO (internal storage)
    │
    ▼
Gateway
    │
    │  WebSocket: { action: "ingest", statusCode: 200, data: { id, message } }
    │
    ▼
Web App
```

**Query (searching documents):**
```
Web App
    │
    │  WebSocket: { action: "query", query: "...", limit: 5 }
    │
    ▼
Gateway
    │
    │  AWS SDK Lambda Invoke
    │
    ▼
Query Service (Lambda)
    │
    ├──► Embedding Service (get vector for query)
    │         │
    │         ▼
    │    Returns 384-dimensional vector
    │
    ▼
LanceDB (vector similarity search)
    │
    ▼
Gateway
    │
    │  WebSocket: { action: "query", statusCode: 200, data: { results: [...] } }
    │
    ▼
Web App
```

LanceDB uses S3 (MinIO) as its storage backend internally - the services make one call to LanceDB, which handles S3 storage under the hood.

**Chat (streaming flow):**
```
Web App
    │
    │  WebSocket: { action: "chat", content: "...", stream: true }
    │
    ▼
Gateway
    │
    │  AWS SDK Lambda Invoke
    │
    ▼
Query Service (Lambda)
    │
    ├──► Embedding Service (get vector for user message)
    │         │
    │         ▼
    │    Returns 1024-dimensional vector
    │
    ├──► LanceDB (vector similarity search for RAG context)
    │
    ▼
Gateway (receives RAG context)
    │
    │  HTTP POST with stream=true
    │
    ▼
LLM Service
    │
    │  SSE: data: {"choices":[{"delta":{"content":"token"}}]}
    │  ... (tokens stream)
    │  SSE: data: [DONE]
    │
    ▼
Gateway (proxies SSE to WebSocket)
    │
    │  WebSocket: { action: "chat_stream_start", rag_context: [...] }
    │  WebSocket: { action: "chat_stream_token", token: "Hello" }
    │  WebSocket: { action: "chat_stream_token", token: " there" }
    │  ... (tokens stream)
    │  WebSocket: { action: "chat_stream_end", content: "Hello there...", role: "assistant" }
    │
    ▼
Web App (displays tokens as they arrive for "typing" effect)
```

**Detailed Chat Flow:**

```
1. Web App → Gateway: "what's the price of gold?"

2. Gateway → Query Service (action: "rag"):
   - Query Service internally:
     - Calls Embedding Service → gets vector [0.12, -0.45, ...]
     - Searches LanceDB with that vector → finds matching entries
     - Saves user message to MongoDB
   - Returns to Gateway:
     - system_prompt: "You are a journal assistant... Relevant entries: [2026-01-27] gold is $5,220..."
     - rag_context: [{entry_date, text_snippet, score}]

3. Gateway → LLM:
   - Sends: system_prompt + user message
   - Receives: streaming tokens

4. Gateway → Web App:
   - Forwards each token via WebSocket

5. Gateway → Query Service (action: "save_message"):
   - Saves assistant's complete response to MongoDB
```

**Key point:** The embedding vector stays inside the Query Service. The Gateway only receives:
- The **system prompt** (text with RAG context baked in)
- The **rag_context metadata** (for showing "Sources" in UI)

The Gateway never sees the actual vector—it just passes text to the LLM. The LLM has no knowledge of the Query Service, embeddings, or databases. It simply receives a system prompt (which happens to contain retrieved journal entries) and a user message, then generates a response.

### Services

| Service | Description |
|---------|-------------|
| **web** | Next.js frontend for chat and document upload |
| **gateway** | WebSocket server that invokes Lambda functions via AWS SDK |
| **ingestion** | TypeScript Lambda for adding journal entries to the database |
| **query** | TypeScript Lambda for semantic search over journal entries |
| **embedding** | Python service using sentence-transformers for vector generation |
| **llm** | Python service using Qwen2.5-3B-Instruct for chat completions (SSE streaming) |
| **minio** | S3-compatible object storage (mimics AWS S3 locally) |
| **minio-setup** | One-time container that creates the `lancedb` bucket |

### Shared Module

Common code lives in `/shared` and is imported via TypeScript path aliases (`@shared/*`). This avoids npm package dependencies while allowing code reuse.

**Contents:**
- `config.ts` - Environment configuration with defaults
- `types.ts` - TypeScript types for entries, events, and API bodies (includes `aws-lambda` dependency)
- `chat-types.ts` - Chat-related types (browser-safe, no Node.js dependencies)
- `db/connection.ts` - LanceDB connection management with caching
- `db/operations.ts` - LanceDB operations (addEntry, searchSimilar)
- `db/mongo-connection.ts` - MongoDB connection management
- `db/mongo-operations.ts` - MongoDB CRUD operations for chat sessions and messages
- `services/embedding.ts` - Embedding service client

### Web App Chat Feature

The chat page (`/chat`) provides a real-time chat interface that communicates with the gateway over WebSocket.

**Components** (`web/components/Chat/`):
- `Chat.tsx` - Main container with header, error banner, message list, and input
- `MessageList.tsx` - Displays messages with user/assistant styling, RAG context sources, typing indicator
- `MessageInput.tsx` - Text input with Enter-to-send support
- `ConnectionStatus.tsx` - Shows WebSocket connection state (connecting/connected/disconnected/error)

**Hooks** (`web/components/Chat/hooks/`):
- `useWebSocket.ts` - WebSocket connection management with auto-reconnect
- `useChat.ts` - Chat state management combining WebSocket with message handling

**Types:**
- Shared types imported from `@shared/chat-types` (ChatMessage, ChatSession, RagContext, WebSocketChatMessage)
- UI-specific types in `web/components/Chat/types.ts` (ConnectionStatus)

## Database Schema

### LanceDB (Vector Database)

Single table `journal_entries` with the following columns:

| Column | Type | Description |
|--------|------|-------------|
| `id` | string | Unique identifier (UUID) |
| `entry_id` | string \| null | Groups chunks from the same entry |
| `entry_date` | string | Date of the journal entry |
| `chunk_index` | number | Position when entry is split into chunks |
| `text` | string | The journal entry text |
| `vector` | number[] | 384-dimensional embedding vector |
| `moods` | string[] | Array of mood tags |
| `word_count` | number | Word count of the text |

### MongoDB (Chat History)

Two collections for storing chat sessions and messages.

#### `sessions` Collection

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | MongoDB auto-generated |
| `session_id` | string | UUID, unique index |
| `user_id` | string \| null | null for anonymous, user UUID when auth added |
| `title` | string \| null | Optional session title (auto-generated from first message) |
| `created_at` | Date | Session creation timestamp |
| `updated_at` | Date | Last message timestamp |
| `metadata` | object | Extensible metadata (e.g., client_info) |

**Indexes:** `session_id` (unique), `user_id` (sparse), `updated_at` (descending)

#### `messages` Collection

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | MongoDB auto-generated |
| `message_id` | string | UUID, unique index |
| `session_id` | string | Foreign key to sessions |
| `role` | "user" \| "assistant" | Message sender |
| `content` | string | Message text |
| `created_at` | Date | Message timestamp |
| `rag_context` | array \| null | Retrieved journal entries used for response (null for user messages) |

Each `rag_context` item contains: `entry_id`, `entry_date`, `text_snippet` (first 200 chars), `score` (similarity score)

**Indexes:** `message_id` (unique), `session_id` + `created_at` (compound)

## Design Decisions & Tradeoffs

### Naming Conventions (snake_case vs camelCase)
**Decision:** Different conventions for different layers.

| Layer | Convention | Example |
|-------|------------|---------|
| WebSocket messages (client ↔ gateway) | snake_case | `session_id` |
| Internal TypeScript / Lambda payloads | camelCase | `sessionId` |
| MongoDB documents | snake_case | `session_id` |

**Why:**
- Database fields use snake_case (MongoDB convention, matches JSON APIs)
- WebSocket messages use snake_case to align with database schema and external API conventions
- Internal TypeScript code uses camelCase (JavaScript/TypeScript convention)
- Gateway converts between conventions at the boundary

**Tradeoff:**
- Requires conversion at gateway layer
- Could have used camelCase everywhere, but snake_case for wire formats is a common REST/JSON API convention and matches MongoDB's typical style

### Single Table vs Multiple Tables
**Decision:** Single table with all entries.

**Why:**
- Simpler queries and maintenance
- Scales well as knowledge base grows
- No need for cross-table joins
- `entry_id` and `chunk_index` handle multi-chunk entries without separate tables

### LanceDB Embedded vs Server Mode
**Decision:** Embedded mode with S3 storage.

**Why:**
- LanceDB is designed like SQLite - embedded, not a server
- Multiple services connect directly to the same S3 bucket
- Mirrors AWS serverless pattern (Lambda + S3)
- No separate database server to manage
- LanceDB handles concurrency internally

### MinIO for Local Development
**Decision:** Use MinIO to simulate AWS S3 locally.

**Why:**
- Same S3 connection logic works in dev and production
- Just change the endpoint URL for AWS deployment
- Web console (port 9001) for debugging/browsing data

### TypeScript over Rust for Lambda Services
**Decision:** TypeScript with Node.js 24 Lambda runtime.

**Why:**
- Faster development iteration
- LanceDB has a mature TypeScript SDK
- Better alignment with team skills
- Rust would provide better performance but slower development

### Shared Module via Docker COPY (not npm)
**Decision:** Copy shared code in Docker build, use tsconfig paths.

**Why:**
- No npm link or package.json dependencies
- Works with multi-stage Docker builds
- TypeScript path aliases (`@shared/*`) provide clean imports
- Simpler than publishing to private npm registry

### No Barrel Files
**Decision:** Direct imports instead of `index.ts` re-exports.

**Why:**
- Follows project conventions (CLAUDE.md)
- Avoids circular dependency issues
- Clearer import paths show exact source

### Moods as Array
**Decision:** Store moods as `string[]` instead of single value.

**Why:**
- One journal entry can describe multiple events/feelings
- More flexible for filtering and analysis
- Supports "happy and anxious" type entries

### Connection Caching for Lambda
**Decision:** Module-level connection state with lazy initialization.

**Why:**
- Lambda cold starts are expensive
- Connection persists across invocations
- `initConnection()` on module load, awaited in handler
- `resetConnection()` for testing

### Separate Sessions and Messages Collections
**Decision:** Two MongoDB collections instead of embedding messages in sessions.

**Why:**
- Allows efficient session listing without loading all messages
- Messages can grow large; separate collection avoids document size limits
- Easier to query and paginate messages independently
- Better index performance for message retrieval

### UUID-Based IDs for Chat
**Decision:** Use `session_id` and `message_id` (UUIDs) alongside MongoDB's `_id`.

**Why:**
- Matches existing pattern in LanceDB entries
- Allows client-generated IDs for optimistic updates
- Portable identifiers that don't depend on MongoDB ObjectId format
- Easier to reference across services

### RAG Context on Messages
**Decision:** Store retrieved journal entries in `rag_context` field on assistant messages.

**Why:**
- Records which journal entries were used to generate each response
- Useful for debugging retrieval quality
- Enables "show sources" UI feature
- Stores snippet + score, not full text (keeps documents small)

### Separate Chat Types File (chat-types.ts)
**Decision:** Split chat-related types into a separate file from `types.ts`.

**Why:**
- `types.ts` imports `aws-lambda` types which aren't available in browser environments
- The web app needs to import chat types (ChatMessage, RagContext, etc.) without pulling in Node.js dependencies
- Backend services import from `@shared/types` (with aws-lambda) or `@shared/chat-types` as needed
- Web app imports only from `@shared/chat-types`

**Tradeoff:**
- Two type files instead of one
- Could have used conditional exports or a build step to tree-shake, but separate files are simpler and more explicit

### Direct Imports Over Re-exports
**Decision:** Services import directly from source files rather than through barrel files or re-export layers.

**Why:**
- Initially considered re-exporting chat types from `types.ts` for convenience
- Removed because it adds unnecessary indirection
- Direct imports (`@shared/chat-types`) are clearer about where types come from
- Follows project convention of no barrel files (no `index.ts` re-exports)

### UI-Specific Types Stay in Components
**Decision:** Keep `ConnectionStatus` type in `web/components/Chat/types.ts`, not in shared.

**Why:**
- `ConnectionStatus` ('connecting' | 'connected' | 'disconnected' | 'error') is purely a UI concern
- Backend services don't need to know about WebSocket connection states
- Only types used across multiple services belong in shared
- Keeps shared module focused on domain types (messages, sessions, RAG context)

### Docker COPY for Shared Module in Web App
**Decision:** Copy shared module into Docker container at `/shared/`, use tsconfig paths for resolution.

**Why:**
- Web app's Dockerfile builds from project root context to access `../shared`
- `tsconfig.json` maps `@shared/*` to `../shared/src/*`
- Relative path `../shared` from `/app` resolves to `/shared` in container
- Volume mount `./shared:/shared` in docker-compose for dev hot-reload
- No webpack aliases needed - tsconfig paths handle both dev and build

**Tradeoff:**
- Initially tried webpack alias in `next.config.ts`, but unnecessary complexity
- Build context must be project root (`.`) not just `./web`

### Sparse Index for user_id
**Decision:** Use sparse index on `user_id` field (null for anonymous users).

**Why:**
- Efficient queries when user auth is added later
- Sparse index excludes null values, saving space
- Anonymous sessions still work without placeholder values
- Future-proofs schema for multi-user support

### MongoDB Schema Validation
**Decision:** Use JSON Schema validation on collections.

**Why:**
- Catches malformed documents at insert time
- Documents required fields and types
- Acts as lightweight contract between services
- Validation errors are explicit, not silent data corruption

### JavaScript Init Script over Shell
**Decision:** Use `init-mongo.js` instead of `init-mongo.sh` for MongoDB initialization.

**Why:**
- MongoDB Docker entrypoint runs `.js` files directly with mongosh
- No shell heredoc syntax or `$` escaping needed
- Cleaner, more readable initialization code
- Runs automatically on first startup when data directory is empty

### Dependency Injection for Testing
**Decision:** Functions accept optional dependency parameters.

**Why:**
- `initConnection(connectDep = connect)` allows mock injection
- `getTable(createIfMissing, connectDep)` for testability
- No need for complex mocking libraries

### WebSocket Gateway vs Direct Lambda Calls
**Decision:** Web app connects via WebSocket to a gateway, which invokes Lambda functions.

**Why:**
- Lambda functions cannot hold persistent WebSocket connections
- AWS API Gateway WebSocket APIs work by: (1) holding the WebSocket connection, (2) invoking Lambda per message via the internal Lambda Invoke API, (3) Lambda pushes responses via the API Gateway Management API
- Our gateway mirrors this pattern locally
- Client communicates entirely over WebSocket - cleaner than REST for a chat application

**Tradeoff:**
- Additional service to maintain (gateway)
- Could have used direct REST calls from web app to Lambda RIE, but that doesn't match production architecture

### AWS SDK for Lambda Invocation
**Decision:** Gateway uses `@aws-sdk/client-lambda` to invoke Lambda functions, not raw HTTP.

**Why:**
- In production AWS, API Gateway uses the Lambda Invoke API (internal AWS mechanism), not HTTP
- The Lambda RIE's HTTP endpoint (`/2015-03-31/functions/function/invocations`) is just an emulation for local testing
- Using AWS SDK keeps gateway code identical between local and production - only the endpoint URL changes
- Same code works locally (pointing at RIE) and in production (pointing at real Lambda)

**Local:**
```typescript
new LambdaClient({ endpoint: "http://ingestion:8080" })
```

**Production:**
```typescript
new LambdaClient({ region: "us-east-1" }) // Uses real Lambda
```

### LLM Service: SSE over HTTP (not WebSocket)
**Decision:** LLM service exposes HTTP/SSE endpoints, not WebSocket. Gateway proxies SSE to WebSocket.

**Architecture:**
```
┌──────────┐     WS      ┌─────────┐     SSE      ┌─────────────┐
│ Frontend │◄───────────►│ Gateway │◄────────────►│ LLM Service │
└──────────┘             └─────────┘              └─────────────┘
```

**Why not give LLM direct WebSocket access?**

1. **Separation of concerns** - The LLM service should be a pure inference engine: messages in, tokens out. It shouldn't know about connection management, WebSocket protocols, or client sessions.

2. **Testability** - HTTP/SSE is easy to test with curl, httpx, pytest. WebSocket testing requires more setup and stateful connections.

3. **Flexibility** - The LLM can be called from:
   - The gateway (for chat)
   - CLI tools for debugging
   - Batch jobs for bulk processing
   - Other backend services
   - HTTP-only clients

   If it were WebSocket-coupled, all those would become harder.

4. **GPU resources are precious** - The LLM service is GPU-bound. Don't burden it with connection management. Let it focus on inference.

5. **Proxy overhead is negligible** - For localhost, proxying SSE→WebSocket adds microseconds. LLM inference takes seconds. The overhead is unnoticeable.

**How SSE→WebSocket proxy works:**

1. Client sends `{ action: "chat", content: "...", stream: true }` over WebSocket
2. Gateway fetches RAG context from Query service
3. Gateway calls LLM service with `stream: true`, receives SSE response
4. Gateway consumes SSE events and forwards each token to WebSocket:
   ```
   LLM SSE:  data: {"choices":[{"delta":{"content":"Hello"}}]}
                                    ↓
   Gateway:  Parse JSON, extract token
                                    ↓
   WebSocket: { action: "chat_stream_token", token: "Hello" }
   ```
5. On stream end, Gateway sends `{ action: "chat_stream_end", content: "..." }`

**Stream events sent to client:**
- `chat_stream_start` - Stream beginning, includes RAG context
- `chat_stream_token` - Individual token
- `chat_stream_end` - Stream complete, includes full content
- `chat_stream_error` - Error occurred, includes partial content

**Tradeoff:**
- Extra hop adds complexity to gateway
- Could have simplified by giving LLM direct WebSocket access
- But the architectural benefits (testability, flexibility, separation of concerns) outweigh the complexity cost

### Lambda RIE vs Custom HTTP Wrapper
**Decision:** Use AWS Lambda base image with Runtime Interface Emulator (RIE), not custom HTTP wrappers.

**Why:**
- Initially considered creating `main.ts` files that wrap Lambda handlers in Express/HTTP servers for local development
- This approach diverges from production behavior and adds unnecessary code
- Lambda base images include RIE which provides the HTTP layer automatically
- Lambda services have a single handler function, no HTTP routes - the RIE handles HTTP-to-event translation
- Keeps Lambda code focused on business logic, not HTTP concerns

**Tradeoff:**
- No hot reloading for Lambda services (must rebuild container on code changes)
- Web app and gateway have hot reloading via volume mounts; Lambda services do not

### Action-Based Routing in Lambda
**Decision:** Single Lambda handler with `action` field for routing, not multiple HTTP endpoints.

**Why:**
- Lambda functions receive events, not HTTP requests
- In production, API Gateway maps routes to Lambda invocations with event payloads
- Single handler with switch statement on `action` field mirrors this pattern
- Keeps Lambda code portable - same handler works with API Gateway, direct invocation, or RIE

**Example:**
```typescript
export const handler = async (event: IngestEvent) => {
  switch (event.action) {
    case "ingest": return await ingest(event.body);
    case "health": return { statusCode: 200, body: "ok" };
  }
};
```

### Hot Reloading Strategy
**Decision:** Different hot reloading approaches for different service types.

| Service | Hot Reload | Method |
|---------|------------|--------|
| Web (Next.js) | Yes | Volume mounts + `next dev` |
| Gateway (Node.js) | Yes | Volume mounts + `tsx watch` |
| Lambda services | No | Rebuild container on changes |

**Why:**
- Web and gateway are stateless Node.js servers - easy to reload
- Lambda services use AWS base images with RIE - designed for container-based deployment, not file watching
- Could add hot reloading to Lambda with custom setup, but diverges from production pattern
- For rapid Lambda iteration, run tests locally with `npm test` instead of full container rebuild

## Testing

Jest with ESM support. Run tests:

```bash
# Shared module
cd shared && npm test

# Ingestion service
cd ingestion && npm test

# Query service
cd query && npm test

# Gateway service
cd gateway && npm test

# Web app
cd web && npm test
```

**Test patterns used:**
- `jest.unstable_mockModule()` for ESM module mocking
- Import `jest` from `@jest/globals` (required for ESM)
- Dynamic imports after mocking: `const { fn } = await import("./module")`
- `jest.fn<any>()` for typed mocks
- Tests live in `tests/` subdirectories alongside source code

## Development

### Prerequisites
- Docker and Docker Compose
- Node.js 20+

### Setup

```bash
# Install dependencies
cd shared && npm install
cd ../ingestion && npm install
cd ../query && npm install

# Start services
docker-compose up
```

### Data Persistence

Data is persisted to local directories via Docker bind mounts:

| Directory | Contents |
|-----------|----------|
| `./minio-data/` | MinIO/S3 data (LanceDB vector database) |
| `./db/data/` | MongoDB data (chat history) |

These directories are created automatically and excluded from git. Data survives `docker compose down` and container rebuilds.

**MongoDB Initialization:** The `db/init-mongo.js` script runs automatically on first startup (when `./db/data/` is empty), creating the `sessions` and `messages` collections with schema validation and indexes.

To reset all data:
```bash
rm -rf minio-data/ db/data/
docker compose down -v
docker compose up -d
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LANCEDB_URI` | `s3://lancedb/journal` | LanceDB storage location |
| `S3_ENDPOINT` | `http://localhost:9000` | S3/MinIO endpoint |
| `AWS_ACCESS_KEY_ID` | `minioadmin` | S3 access key |
| `AWS_SECRET_ACCESS_KEY` | `minioadmin` | S3 secret key |
| `AWS_REGION` | `us-east-1` | AWS region |
| `EMBEDDING_SERVICE_URL` | `http://localhost:8001` | Embedding service URL |
| `MONGO_URI` | `mongodb://root:example@mongo:27017` | MongoDB connection string |
| `MONGO_DB_NAME` | `example_rag` | MongoDB database name |
| `INGESTION_FUNCTION_NAME` | `function` | Lambda function name for ingestion (use actual name in prod) |
| `QUERY_FUNCTION_NAME` | `function` | Lambda function name for query (use actual name in prod) |
| `INGESTION_LAMBDA_ENDPOINT` | `http://localhost:8002` | Ingestion Lambda endpoint (omit in prod for real AWS) |
| `QUERY_LAMBDA_ENDPOINT` | `http://localhost:8003` | Query Lambda endpoint (omit in prod for real AWS) |
| `LLM_SERVICE_URL` | `http://localhost:8004` | LLM service URL for chat completions |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:8080/ws` | WebSocket gateway URL (web app) |

## API

### Ingestion Service

**Ingest Entry:**
```json
{
  "action": "ingest",
  "entry_date": "2024-01-15",
  "text": "Today was a good day...",
  "moods": ["happy", "calm"],
  "entry_id": "optional-id",
  "chunk_index": 0
}
```

**Health Check:**
```json
{
  "action": "health"
}
```

### Query Service

**Search:**
```json
{
  "action": "query",
  "query": "How was my day?",
  "limit": 5
}
```

**Health Check:**
```json
{
  "action": "health"
}
```

## RAG Configuration

### How Vector Search Works

When you store text in a RAG system, you don't store the raw words. An **embedding model** (like sentence-transformers) converts text into a list of numbers called a **vector**.

```
"the price of gold is $5,220.50" → [0.12, -0.45, 0.78, ..., 0.33]  (384 numbers)
"what's going on with gold?"     → [0.15, -0.41, 0.72, ..., 0.29]  (384 numbers)
```

These numbers encode the **semantic meaning** of the text—not the exact words, but the concepts. Texts with similar meanings produce similar vectors.

### Cosine Distance

To find relevant results, we measure how "close" two vectors are. **Cosine similarity** measures the angle between two vectors:

```
similarity = 1.0  → identical meaning (vectors point same direction)
similarity = 0.0  → unrelated (vectors perpendicular)
similarity = -1.0 → opposite meaning
```

**Cosine distance** is `1 - similarity`:

```
distance = 0.0 → identical
distance = 1.0 → unrelated
distance = 2.0 → opposite
```

**Visual intuition** (imagine vectors as arrows in space):

```
                    "price of gold today"
                   ↗
                 /
               /  ← small angle = low distance = similar
             /
"gold market" →

                              "my breakfast" →  ← large angle = high distance = unrelated
```

### Why Similar Phrases Can Have High Distance

Even when two texts are about the same topic, the embedding model encodes more than just keywords:

| Text | Concepts encoded |
|------|------------------|
| "what's going on with gold in the market?" | question, market trends, general inquiry |
| "the price of gold is $5,220.50 at 4:50pm" | statement, specific price, specific time |

The vectors are *related* but not *close*. Distance might be 0.9-1.0 even though both mention gold.

### Similarity Threshold

The RAG search uses a similarity score threshold to filter out irrelevant results. This prevents the system from returning unrelated journal entries when the user's query doesn't match any content.

**Configuration** (`shared/src/db/operations.ts`):
```typescript
searchSimilar(table, queryVector, limit, maxDistance = 1.2)
```

| Parameter | Default | Description |
|-----------|---------|-------------|
| `maxDistance` | 1.2 | Maximum cosine distance allowed (lower = more similar) |

**How it works:**
- LanceDB returns results with a `_distance` field (cosine distance)
- Distance ranges from 0 (identical) to 2 (opposite vectors)
- Results with distance > `maxDistance` are filtered out
- If no results pass the threshold, RAG context is empty

**Tuning guidance:**
| Threshold | Behavior |
|-----------|----------|
| 0.5 | Strict - only highly relevant results |
| 0.8 | Moderate - may miss semantically related but differently phrased content |
| 1.2 | Balanced (default) - catches related content with different phrasing |
| 1.5+ | Very permissive - rarely filters anything |

**Example:**
- User asks "hey" → no journal entries about greetings → high distance scores → filtered out
- User asks "how was my trip to Paris?" → journal entry about Paris trip → low distance → included

**Why this matters:**
Without a threshold, vector search always returns the top N results regardless of relevance. A query like "hey" would return whatever entries happen to be least dissimilar, even if they're completely unrelated (e.g., an entry about gold). The threshold ensures only genuinely relevant context is passed to the LLM.

### System Prompt

The **system prompt** is the instruction set that tells the LLM who it is, how to behave, and what context it has available. It's the primary mechanism for customizing LLM behavior without retraining the model.

**Location:** `query/src/services/chat.service.ts` → `buildSystemPrompt()`

**Structure:**

```typescript
function buildSystemPrompt(ragContext: RagContext[]): string {
  if (ragContext.length === 0) {
    return `You are a helpful assistant for a personal journal application.
The user is asking a question, but no relevant journal entries were found.
Respond helpfully and suggest they might want to add more journal entries or rephrase their question.`;
  }

  const contextEntries = ragContext
    .map((ctx) => `[${ctx.entry_date}] ${ctx.text_snippet}`)
    .join("\n\n");

  return `You are a helpful assistant for a personal journal application.
Use the following journal entries to answer the user's question.
Be conversational and reference specific details from the entries when relevant.
If the entries don't contain enough information to answer, say so honestly.

Relevant journal entries:
${contextEntries}`;
}
```

**How it works:**

The system prompt is sent to the LLM as the first message in the conversation, before the user's message:

```
Messages sent to LLM:
┌─────────────────────────────────────────────────────────────┐
│ role: "system"                                              │
│ content: "You are a helpful assistant for a personal        │
│          journal application. Use the following journal     │
│          entries to answer the user's question...           │
│                                                             │
│          Relevant journal entries:                          │
│          [2026-01-27] the price of gold is $5,220.50..."    │
├─────────────────────────────────────────────────────────────┤
│ role: "user"                                                │
│ content: "what's the current price of gold?"                │
└─────────────────────────────────────────────────────────────┘
```

**Why it matters:**

| Aspect | Effect |
|--------|--------|
| **Identity** | "You are a helpful assistant for a personal journal application" tells the LLM its role and domain |
| **Behavior** | "Be conversational and reference specific details" shapes response style |
| **Boundaries** | "If the entries don't contain enough information, say so honestly" prevents hallucination |
| **Context injection** | RAG results are embedded directly in the prompt, giving the LLM access to user's data |

**Without a system prompt**, the LLM would be a generic assistant with no knowledge of:
- Its purpose (journaling)
- The user's data (journal entries)
- How to respond (conversational, honest about limitations)

**Customization examples:**

| Use Case | System Prompt Modification |
|----------|---------------------------|
| More formal tone | "Respond in a professional, formal tone" |
| Therapy-style | "You are a supportive listener. Ask reflective questions about the user's feelings" |
| Data analysis | "Analyze patterns across journal entries. Look for trends in mood, topics, and frequency" |
| Strict factual | "Only answer questions that can be directly answered from the journal entries. Never speculate" |

**The RAG + System Prompt pattern:**

This is the core of how RAG applications work:

```
1. User asks a question
2. System searches vector database for relevant content
3. Relevant content is injected into the system prompt
4. LLM receives: system prompt (with context) + user message
5. LLM generates response grounded in the provided context
```

The LLM doesn't have direct database access—it only sees what's included in the prompt. This is both a limitation (context window size) and a feature (you control exactly what the LLM knows).

## Architectural Patterns

### CQRS: Command Query Responsibility Segregation

**Core idea:** Separate the code that **reads** data from the code that **writes** data.

**Traditional approach (current implementation):**

```
┌─────────────────────────────────────┐
│           Query Service             │
│                                     │
│  • searchSimilar() ← READ           │
│  • getHistory()    ← READ           │
│  • saveMessage()   ← WRITE          │
│  • createSession() ← WRITE          │
└─────────────────────────────────────┘
```

One service does everything. Simple, but responsibilities are mixed.

**CQRS approach:**

```
┌─────────────────────────────────────┐      ┌─────────────────────────────────┐
│           Query Service             │      │         Command Service         │
│           (READ side)               │      │          (WRITE side)           │
│                                     │      │                                 │
│  • searchSimilar()                  │      │  • saveMessage()                │
│  • getHistory()                     │      │  • createSession()              │
│  • getSession()                     │      │  • updateSession()              │
└─────────────────────────────────────┘      └─────────────────────────────────┘
```

**Terminology:**

| Term | Meaning | Example |
|------|---------|---------|
| **Query** | Request that returns data, doesn't change state | "Get chat history" |
| **Command** | Request that changes state, may not return data | "Save this message" |

**Why separate them?**

1. **Different optimization needs:**

| Reads (Queries) | Writes (Commands) |
|-----------------|-------------------|
| Need to be FAST | Need to be RELIABLE |
| Can use caching | Need validation |
| Can use read replicas | Need consistency |
| Can be eventually consistent | Often need transactions |

2. **Different scaling patterns:**

```
Typical app: 90% reads, 10% writes

Without CQRS:
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Service │ │ Service │ │ Service │   ← Scale everything together
└─────────┘ └─────────┘ └─────────┘

With CQRS:
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│ Query │ │ Query │ │ Query │ │ Query │ │ Query │   ← Scale reads heavily
└───────┘ └───────┘ └───────┘ └───────┘ └───────┘
              ┌─────────┐
              │ Command │   ← Fewer write instances needed
              └─────────┘
```

3. **Different data models:**

```
Write model (normalized):           Read model (denormalized):
┌──────────┐  ┌──────────┐         ┌─────────────────────────────┐
│ sessions │  │ messages │         │     chat_history_view       │
│──────────│  │──────────│         │─────────────────────────────│
│ id       │  │ id       │   →     │ session_id                  │
│ title    │  │ session_id│        │ session_title               │
│ created  │  │ content   │        │ messages[] (embedded)       │
└──────────┘  │ role      │        │ last_message_preview        │
              └──────────┘         └─────────────────────────────┘

Optimized for integrity           Optimized for fast reads
```

**Applied to this app:**

Current flow (mixed read/write):
```
Gateway → Query Service (rag)         ← READ (search)
                                      ← WRITE (save user message) ❌ mixed
Gateway → LLM (stream)
Gateway → Query Service (save_message) ← WRITE
```

CQRS flow (separated):
```
Gateway → Command Service (save user message)  ← WRITE
Gateway → Query Service (rag)                  ← READ only
Gateway → LLM (stream)
Gateway → Command Service (save assistant)     ← WRITE
```

**When CQRS is overkill:**
- Small apps with low traffic
- Simple CRUD with no complex queries
- Team is small and doesn't need separation
- Read/write patterns are similar

**When CQRS shines:**
- High-scale systems (millions of reads)
- Complex domains with different read/write needs
- Event-sourced systems
- Microservices where teams own different concerns

**Related patterns:**

| Pattern | Description |
|---------|-------------|
| **CQRS** | Separate read/write code paths |
| **Event Sourcing** | Store events, not state. Rebuild state from events. |
| **CQRS + Event Sourcing** | Commands emit events, queries read from projections |

**Current decision:** This app uses a mixed approach (Query Service handles both reads and writes) because the scale doesn't justify the added complexity. CQRS would be considered if scaling requirements change.

## Known Limitations

### File Upload Types

**Current Limitation:** Only `.txt` and `.md` files are supported for upload.

**Why:** File uploads are processed client-side in the browser using the JavaScript `File.text()` API, which only works with plain text files. The extracted text is then sent to the ingestion service as JSON. No files are stored separately—only the text content is embedded and stored in LanceDB.

**To add support for `.pdf` and `.docx` files:**

| Format | Client-side Option | Server-side Option |
|--------|-------------------|-------------------|
| `.pdf` | `pdfjs-dist` (Mozilla's PDF.js) | `pdf-parse` (Node.js), `PyMuPDF` (Python) |
| `.docx` | `mammoth.js` | `mammoth` (Node.js), `python-docx` (Python) |

**Implementation approaches:**

1. **Client-side parsing (current architecture):**
   - Add parsing libraries to the web app
   - Extract text in the browser before sending to ingestion
   - Pros: No changes to backend, files never leave the browser
   - Cons: Larger frontend bundle, limited by browser capabilities

2. **Server-side parsing:**
   - Send raw file bytes to ingestion service (would require multipart/form-data)
   - Parse files in the ingestion Lambda or a dedicated parsing service
   - Pros: More powerful parsing, can handle complex documents
   - Cons: Requires backend changes, files must be transmitted/stored temporarily

**Files to modify:**
- `web/components/DocumentUpload/DropZone.tsx` - Update `accept` attribute to include new file types
- `web/components/DocumentUpload/api.ts` - Add parsing logic in `submitFileContent()` or create new parsing functions
- If server-side: `ingestion/src/services/ingestion.service.ts` - Add file parsing before embedding

## Development Log

### Session: Chat Action Implementation (2026-01-27)

This session implemented the Gateway and Query service chat action, connecting the existing web app chat UI to the backend.

#### Changes Made

**1. Gateway Chat Action** (`gateway/src/handlers/messageHandler.ts`)
- Added `ChatMessage` interface with `content` and `session_id` fields
- Added `"chat"` case to the message handler switch statement
- Created `handleChat()` function that forwards messages to the query service

**2. Query Service Chat Handler** (`query/src/services/chat.service.ts`)
- New file implementing chat logic with RAG search
- Performs vector similarity search on user message
- Returns RAG context with placeholder response (LLM integration pending)
- Added `ChatBody` type to shared types

**3. Lambda Client Fix** (`gateway/src/services/lambdaClient.ts`)
- Changed `functionName` from service names (`"ingestion"`, `"query"`) to `"function"`
- **Problem**: AWS Lambda RIE expects `/2015-03-31/functions/function/invocations` path, but the SDK was generating `/2015-03-31/functions/query/invocations` based on the function name
- **Symptom**: 404 errors with "Unexpected non-whitespace character after JSON" (HTML error page being parsed as JSON)

**4. WebSocket URL Configuration** (`docker-compose.yml`, `web/.env.local`)
- Changed `NEXT_PUBLIC_WS_URL` from `ws://localhost:8080/ws` to `ws://192.168.2.17:8080/ws`
- **Problem**: When accessing the web app from a different machine, `localhost` resolves to the client machine, not the Docker host
- **Context**: Environment variables in Next.js are baked in at build time for client-side code (`NEXT_PUBLIC_*` prefix), so changes require container rebuild
- **Tradeoff**: Hardcoding IP works for local network access but isn't portable. Production would use a proper hostname.

**5. Field Name Alignment** (`gateway/src/handlers/messageHandler.ts`)
- Changed gateway's `ChatMessage` interface from `{ message, sessionId }` to `{ content, session_id }`
- **Problem**: Web client sends `content` and `session_id` (matching `@shared/chat-types`), but gateway expected different field names
- **Lesson**: When adding new message types, check existing type definitions in shared module first

**6. React Strict Mode WebSocket Fix** (`web/components/Chat/hooks/useWebSocket.ts`)
- Added `isDisconnectingRef` to track intentional disconnects
- Skip error/close handlers when disconnecting intentionally
- **Problem**: React Strict Mode in development mounts, unmounts, then remounts components. The first WebSocket connection would be closed during cleanup, triggering error state before the second connection established.
- **Symptom**: "WebSocket connection failed" error flash on page load, even though connection ultimately succeeds
- **Tradeoff**: Added complexity to the hook, but only ~5 lines. Alternative was disabling Strict Mode, which would hide other potential issues.

**7. Chat Input UX Improvements** (`web/components/Chat/Chat.tsx`, `web/components/Chat/MessageInput.tsx`)
- Removed `isLoading` from disabled condition - input stays enabled while waiting for response
- Added `inputRef` to maintain focus after sending message
- **Problem**: Input was disabled during loading, preventing users from typing their next message. Focus was lost after submit.
- **Tradeoff**: Users can now queue messages while waiting, which the backend doesn't currently handle (messages process sequentially). Acceptable for MVP.

#### Architecture Decisions

**Why route chat through Query service (not a new Chat service)?**
- Chat needs RAG search, which Query already has
- Keeps service count minimal for MVP
- Can extract to dedicated service later if complexity grows

**Why placeholder LLM response?**
- LLM service (in `llm/` directory) isn't implemented yet
- Chat flow works end-to-end with mock response
- Unblocks frontend development and integration testing

#### Files Modified
```
gateway/src/handlers/messageHandler.ts  # Chat action routing
gateway/src/services/lambdaClient.ts    # Lambda function name fix
query/src/handler.ts                    # Chat case in switch
query/src/services/chat.service.ts      # New file - chat logic
shared/src/types.ts                     # ChatBody type
docker-compose.yml                      # WebSocket URL
web/.env.local                          # WebSocket URL (local override)
web/components/Chat/hooks/useWebSocket.ts  # Strict Mode fix
web/components/Chat/Chat.tsx            # Input disabled state
web/components/Chat/MessageInput.tsx    # Focus retention
```

### Session: MongoDB Integration & Chat Persistence (2026-01-27)

This session implemented MongoDB integration for chat history persistence and fixed a WebSocket connection error on page load.

#### Changes Made

**1. MongoDB Connection Module** (`shared/src/db/mongo-connection.ts`)
- New file implementing MongoDB connection management
- Singleton pattern matching existing LanceDB connection approach
- Functions: `initMongoConnection()`, `getMongoDb()`, `closeMongoConnection()`, `resetMongoConnection()`
- Dependency injection support for testing

**2. MongoDB Operations Module** (`shared/src/db/mongo-operations.ts`)
- New file implementing session/message CRUD operations
- Session operations: `createSession()`, `getSession()`, `updateSessionTitle()`, `updateSessionTimestamp()`, `listSessions()`, `deleteSession()`, `getOrCreateSession()`
- Message operations: `createMessage()`, `getMessage()`, `getSessionMessages()`, `deleteMessage()`
- All operations take `Db` as first parameter for testability

**3. Config Updates** (`shared/src/config.ts`)
- Added `mongoUri` and `mongoDbName` to `AppConfig` interface
- Default values: `mongodb://root:example@mongo:27017` and `example_rag`
- Matches docker-compose MongoDB configuration

**4. Chat Service MongoDB Integration** (`query/src/services/chat.service.ts`)
- Integrated MongoDB operations into chat handler
- User messages saved before RAG search
- Assistant messages saved after response generation (with RAG context)
- Session created automatically if not exists

**5. Connection Error Fix** (`web/components/Chat/hooks/useChat.ts`)
- Added `onOpen` handler that clears error state when WebSocket connects
- **Problem**: "Connection error" banner appeared briefly on page load due to transient WebSocket errors during initial connection or React Strict Mode's double-mount
- **Symptom**: Error message flashed then disappeared as connection established
- **Fix**: Clear any existing error when `onopen` fires

#### Trade-offs

**Singleton MongoDB Connection**
- *Decision*: Module-level connection state, same as LanceDB
- *Pro*: Simple, connection reused across Lambda invocations (warm starts)
- *Con*: Connection shared across all requests; no per-request isolation
- *Why acceptable*: Matches existing pattern, MongoDB driver handles connection pooling internally

**Synchronous Message Saving**
- *Decision*: Save messages inline during chat request (not async/fire-and-forget)
- *Pro*: Data consistency guaranteed, errors surface immediately
- *Con*: Adds latency to chat response (~5-10ms per insert)
- *Why acceptable*: Latency is negligible compared to embedding + RAG search + future LLM call

**Clear All Errors on Connect**
- *Decision*: `onOpen` clears any existing error, not just connection errors
- *Pro*: Simple, handles all transient error cases
- *Con*: Could hide a real error that occurred right before successful connection
- *Why acceptable*: If there's a persistent issue, error will resurface on next operation; better UX than showing scary errors on initial load

**UUIDs for Session/Message IDs**
- *Decision*: Use `crypto.randomUUID()` for IDs, not MongoDB ObjectId
- *Pro*: Client can generate IDs for optimistic updates, portable across databases
- *Con*: Slightly larger than ObjectId (36 chars vs 24)
- *Why acceptable*: Matches existing LanceDB ID pattern, enables future client-side ID generation

**User Message ID Not Returned**
- *Current*: Chat response only includes assistant message ID, not user message ID
- *Why*: User message is saved to MongoDB for history, but return value isn't used
- *Future option*: Could return `user_message_id` in response for:
  - Client confirmation that message was saved
  - Message linking (`in_reply_to` field)
  - Server timestamp sync
  - Request tracing/debugging
- *To implement*: Capture return value from `createMessage()` and add to response

#### Files Modified
```
shared/src/config.ts                    # Added MongoDB config
shared/src/db/mongo-connection.ts       # New - connection management
shared/src/db/mongo-operations.ts       # New - CRUD operations
shared/src/db/mongo-operations.test.ts  # New - unit tests
shared/package.json                     # Added mongodb dependency
query/src/services/chat.service.ts      # Integrated MongoDB saves
web/components/Chat/hooks/useChat.ts    # Fixed connection error
```

#### Testing

MongoDB operations verified with:
1. Unit tests (`npm test` in shared directory)
2. Integration test against live MongoDB container
3. End-to-end test via chat UI - messages now persist in `sessions` and `messages` collections

To verify data persistence:
```bash
docker exec example-rag-mongodb mongosh --quiet -u root -p example \
  --authenticationDatabase admin example_rag \
  --eval "db.sessions.find().toArray(); db.messages.find().toArray();"
```

### Session: Code Quality & Production Readiness (2026-01-27)

This session addressed production compatibility, code consistency, and test maintenance.

#### Changes Made

**1. Lambda Function Names Configurable** (`gateway/src/services/lambdaClient.ts`)
- Added `INGESTION_FUNCTION_NAME` and `QUERY_FUNCTION_NAME` environment variables
- Default to `"function"` for local Lambda RIE compatibility
- **Problem**: Hardcoded `"function"` name works with RIE but not production AWS Lambda
- **Fix**: Environment variables allow setting real function names in production

**2. Destructured CSS Module Styles** (all web components)
- Refactored from `styles.className` to destructured `const { className } = styles`
- Improves readability and reduces repetition
- Dynamic style access (e.g., `styles[status]`) still uses the `styles` object

**3. Updated Outdated Test** (`web/components/Chat/tests/Chat.test.tsx`)
- Test expected input to be disabled during loading (old behavior)
- Updated to expect input enabled during loading (current intentional behavior)
- **Context**: Previous session intentionally kept input enabled to allow message queuing

#### Files Modified
```
gateway/src/services/lambdaClient.ts           # Configurable function names
web/components/Chat/Chat.tsx                   # Destructured styles
web/components/Chat/MessageInput.tsx           # Destructured styles
web/components/Chat/MessageList.tsx            # Destructured styles
web/components/Chat/ConnectionStatus.tsx       # Destructured styles
web/app/chat/page.tsx                          # Destructured styles
web/components/DocumentUpload/DocumentUpload.tsx    # Destructured styles
web/components/DocumentUpload/FileUploadForm.tsx    # Destructured styles
web/components/DocumentUpload/TextEntryForm.tsx     # Destructured styles
web/components/DocumentUpload/DateInput.tsx         # Destructured styles
web/components/DocumentUpload/FileList.tsx          # Destructured styles
web/components/DocumentUpload/DropZone.tsx          # Destructured styles
web/components/DocumentUpload/StatusMessage.tsx     # Destructured styles
web/components/DocumentUpload/MoodSelector.tsx      # Destructured styles
web/components/Home/Home.tsx                        # Destructured styles
web/components/ThemeToggle/ThemeToggle.tsx          # Destructured styles
web/components/Chat/tests/Chat.test.tsx             # Fixed outdated test
```

### Session: LLM Streaming & Query Service Enhancement (2026-01-27)

This session implemented true token streaming from the LLM service to the web UI, restructured the chat flow for proper separation of concerns, and added RAG relevance filtering.

#### Architecture Decision: Why Gateway Calls LLM (Not Query Service)

**Problem:** The initial implementation had the Query service calling the LLM and returning the complete response. This meant no streaming—the entire response appeared at once in the UI.

**Why Query Service Can't Stream:**
- Query service runs as a Lambda function
- Lambda functions return a single response—they cannot stream data incrementally
- Even if the LLM streams tokens to the Query service, Lambda must buffer the entire response before returning

**Why Gateway Can Stream:**
- Gateway maintains persistent WebSocket connections with clients
- Gateway can consume SSE (Server-Sent Events) from the LLM service
- Gateway can forward each token to WebSocket clients as it arrives

**New Architecture:**
```
1. Client → Gateway: { action: "chat", content: "..." }
2. Gateway → Query (rag): Get RAG context + save user message
3. Gateway → LLM (SSE stream): Stream tokens
4. Gateway → Client: Forward each token via WebSocket
5. Gateway → Query (save_message): Save complete assistant message
```

**Trade-offs:**
- Gateway now has more responsibility (LLM orchestration)
- Query service is simpler (just RAG + MongoDB operations)
- Streaming works end-to-end
- Messages are saved to MongoDB after streaming completes (not during)

#### Changes Made

**1. Query Service Restructured** (`query/src/services/chat.service.ts`, `query/src/handler.ts`)
- Removed `chat` action (did everything including LLM call)
- Added `rag` action: RAG search + save user message, returns context + system prompt
- Added `save_message` action: Save assistant message after streaming completes
- Query service no longer imports or calls LLM

**2. Gateway Streaming Implementation** (`gateway/src/handlers/messageHandler.ts`)
- `handleChat` now orchestrates the full flow:
  1. Calls Query service `rag` action
  2. Streams from LLM service using existing `llmClient.ts`
  3. Forwards tokens to WebSocket as `chat_stream_token` events
  4. Calls Query service `save_message` to persist
  5. Sends `chat_stream_end` with complete content

**3. WebSocket Stream Events**
| Event | Purpose |
|-------|---------|
| `chat_stream_start` | Stream beginning, includes RAG context |
| `chat_stream_token` | Individual token from LLM |
| `chat_stream_end` | Stream complete, includes full content |
| `chat_stream_error` | Error with partial content if any |

**4. React Streaming Smoothness** (`web/components/Chat/hooks/useChat.ts`)

**Problem:** Initial streaming implementation was "jumpy"—UI flickered with each token.

**Root causes:**
1. `flushSync` forced synchronous re-render for every token
2. Scroll-to-bottom triggered on every `streamingContent` change
3. React 18's automatic batching wasn't helping because `flushSync` bypassed it

**Solution: requestAnimationFrame batching**
```typescript
// Buffer tokens in a ref
streamingBufferRef.current += token

// Schedule single RAF update (coalesces rapid tokens)
if (rafIdRef.current === null) {
  rafIdRef.current = requestAnimationFrame(() => {
    setStreamingContent(streamingBufferRef.current)
    rafIdRef.current = null
  })
}
```

**Benefits:**
- Tokens batch naturally at 60fps
- No forced synchronous renders
- Smooth visual streaming effect

**5. Scroll Behavior Fix** (`web/components/Chat/MessageList.tsx`)
- Only auto-scroll when user is near bottom (within 100px)
- Don't scroll on every streaming token
- Scroll once when `isLoading` changes (stream starts)

**6. RAG Similarity Threshold** (`shared/src/db/operations.ts`)

**Problem:** User says "hey" → system returns journal entry about gold (irrelevant).

**Root cause:** Vector search always returns top N results, even if they're dissimilar.

**Solution:** Added `maxDistance` parameter (default 0.8) to filter results:
```typescript
.filter((result) => result.score <= maxDistance)
```

**How cosine distance works:**
- 0 = identical vectors
- 2 = opposite vectors
- 0.8 threshold filters out results that are only vaguely similar

**7. Logging Configuration** (`llm/src/server.py`)
- Added `logging.basicConfig()` to show model loading progress
- Logs: "Loading model...", "Model loaded and ready"

#### Files Modified
```
query/src/handler.ts                    # Added rag, save_message actions
query/src/services/chat.service.ts      # Split into rag() and saveMessage()
shared/src/types.ts                     # Added RagBody, SaveMessageBody types
shared/src/db/operations.ts             # Added maxDistance threshold
gateway/src/handlers/messageHandler.ts  # Full streaming orchestration
gateway/src/services/llmClient.ts       # Debug logging for streaming
web/components/Chat/hooks/useChat.ts    # RAF-based smooth streaming
web/components/Chat/MessageList.tsx     # Smarter scroll behavior
web/components/Chat/Chat.module.scss    # Blinking cursor for streaming
llm/src/server.py                       # Logging configuration
docker-compose.yml                      # Query service depends on llm, mongo
```

#### Debugging Notes

**Checking if tokens are streaming:**
```bash
docker compose logs -f gateway
# Look for: [LLM] Starting stream request...
#           [LLM] Stream done, total tokens: X
#           [chat] Streamed X tokens
```

**If streaming looks instant (no typing effect):**
- Tokens may arrive faster than 60fps updates
- This is actually working correctly—LLM is just fast
- The RAF batching ensures smooth rendering regardless of token speed

## Project Structure

```
example-rag/
├── docker-compose.yml
├── web/                      # Next.js frontend
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── chat/
│   │   │   └── page.tsx      # Chat interface
│   │   └── upload/
│   │       └── page.tsx
│   ├── components/
│   │   ├── Home/
│   │   ├── DocumentUpload/
│   │   ├── Chat/
│   │   │   ├── Chat.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   ├── ConnectionStatus.tsx
│   │   │   ├── Chat.module.scss
│   │   │   ├── types.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useWebSocket.ts
│   │   │   │   └── useChat.ts
│   │   │   └── tests/
│   │   │       ├── Chat.test.tsx
│   │   │       ├── MessageList.test.tsx
│   │   │       ├── MessageInput.test.tsx
│   │   │       ├── ConnectionStatus.test.tsx
│   │   │       ├── useWebSocket.test.ts
│   │   │       └── useChat.test.ts
│   │   └── ThemeToggle/
│   ├── contexts/
│   │   └── ThemeContext.tsx
│   ├── Dockerfile.dev
│   └── jest.config.js
├── gateway/                  # WebSocket gateway
│   ├── src/
│   │   ├── index.ts
│   │   ├── tests/
│   │   │   └── index.test.ts
│   │   ├── handlers/
│   │   │   ├── connectionHandler.ts
│   │   │   ├── messageHandler.ts
│   │   │   └── tests/
│   │   │       ├── connectionHandler.test.ts
│   │   │       └── messageHandler.test.ts
│   │   └── services/
│   │       ├── lambdaClient.ts
│   │       └── tests/
│   │           └── lambdaClient.test.ts
│   ├── Dockerfile.dev
│   ├── jest.config.js
│   └── tsconfig.json
├── shared/
│   ├── src/
│   │   ├── config.ts
│   │   ├── types.ts          # Backend types (aws-lambda dependency)
│   │   ├── chat-types.ts     # Chat types (browser-safe)
│   │   ├── db/
│   │   │   ├── connection.ts       # LanceDB connection
│   │   │   ├── operations.ts       # LanceDB operations
│   │   │   ├── mongo-connection.ts # MongoDB connection
│   │   │   └── mongo-operations.ts # MongoDB CRUD operations
│   │   └── services/
│   │       └── embedding.ts
│   └── jest.config.js
├── ingestion/
│   ├── src/
│   │   ├── handler.ts
│   │   └── services/
│   │       └── ingestion.service.ts
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   └── jest.config.js
├── query/
│   ├── src/
│   │   ├── handler.ts
│   │   └── services/
│   │       ├── query.service.ts
│   │       └── chat.service.ts
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   └── jest.config.js
├── embedding/
│   └── (Python sentence-transformers service)
└── llm/
    ├── src/
    │   ├── __init__.py
    │   ├── __main__.py         # Entry point with dev auto-restart
    │   ├── config.py           # Environment configuration
    │   ├── dependencies.py     # FastAPI dependency injection
    │   ├── model.py            # LLMService class with streaming
    │   └── server.py           # FastAPI server with SSE streaming
    ├── tests/
    │   ├── conftest.py         # MockLLMService for testing
    │   ├── test_model.py
    │   └── test_server.py
    ├── models/
    │   └── qwen2.5-3b-instruct/  # Model files
    ├── Dockerfile
    └── pyproject.toml
```
