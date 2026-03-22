# Synapse — Multi-Agent Spatial Canvas

> A spatial canvas where each branch is powered by a dedicated Fetch.ai agent. Gemini orchestrates, agents execute in parallel, results appear as visual nodes.

**Hackathon**: produHacks 2025 | **Prize track**: Fetch.ai sponsor prize
**Stack**: Next.js 15 + Gemini AI + Fetch.ai uAgents + Supabase Realtime + Custom Physics

---

## Commands

```bash
# Frontend
npm run dev           # Start Next.js dev server (localhost:3000)
npm run build         # Production build
npm run lint          # ESLint check

# Python agents (separate terminal)
cd agent
source venv/bin/activate
python agent.py       # Start all Fetch.ai agents
```

---

## Architecture

### High-Level Flow
```
User types input
      ↓
/api/process  ←  Gemini routes intent, decides which agents to dispatch
      ↓
Creates task(s) in Supabase
      ↓
Orchestrator Agent (Fetch.ai) picks up task
      ↓  ctx.send()  (native Fetch.ai messaging)
      ↓         ↓         ↓         ↓         ↓
 Brainstorm  Research  Planner  Writer   Mockup
  Agent       Agent    Agent    Agent    Agent
      ↓         ↓         ↓         ↓         ↓
Orchestrator collects results → writes to Supabase agent_results
      ↓
Realtime subscription (useAgentResults hook)
      ↓
Canvas renders visual nodes by node_type
```

### Key Principle: Canvas = Agent Network
Each node on the canvas represents a real Fetch.ai agent output.
Each branch = one dispatched agent. Everything the user sees is live agent state.

---

## Fetch.ai Agent Architecture

### Why Fetch.ai (not just Gemini directly)
- Agents communicate natively via `ctx.send()` — not a database queue
- Agents are registered on Agentverse (judges can see them live)
- True multi-agent: orchestrator dispatches, sub-agents process in parallel
- Qualifies for Fetch.ai sponsor prize

### Agent Roster (`agent/agent.py`)

| Agent | Port | Triggered When | Output Type |
|-------|------|---------------|-------------|
| `orchestrator_agent` | 8000 | Every request | Routes to sub-agents |
| `brainstorm_agent` | 8001 | Explore ideas | `ai_idea` text nodes |
| `researcher_agent` | 8002 | Need facts/data | `chart` + `research` nodes |
| `planner_agent` | 8003 | Need timeline/tasks | `checklist` node |
| `writer_agent` | 8004 | Need drafts/docs | `document` node |
| `mockup_agent` | 8005 | Need UI/slides | `mockup` iframe node |

### Agent Communication Pattern (True Fetch.ai)
```python
# Orchestrator dispatches to sub-agent
await ctx.send(BRAINSTORM_AGENT_ADDRESS, TaskMessage(query="...", task_id="..."))

# Sub-agent processes and returns
@brainstorm_agent.on_message(TaskMessage)
async def handle(ctx: Context, sender: str, msg: TaskMessage):
    result = call_gemini(msg.query)
    await ctx.send(sender, ResultMessage(data=result, task_id=msg.task_id))

# Orchestrator writes to Supabase for Realtime → frontend
@orchestrator_agent.on_message(ResultMessage)
async def collect(ctx: Context, sender: str, msg: ResultMessage):
    supabase.table("agent_results").insert({...}).execute()
```

---

## Node Types (Visual Outputs)

Each agent produces a different visual node on the canvas:

```typescript
type NodeType =
  | 'thought'    // User-created text (gray)
  | 'ai_idea'    // Brainstorm agent output (purple) — text node
  | 'research'   // Researcher agent output (blue) — text node
  | 'chart'      // Researcher agent — Chart.js rendered inline
  | 'checklist'  // Planner agent — interactive task list
  | 'document'   // Writer agent — markdown preview
  | 'mockup'     // Mockup agent — HTML in sandboxed iframe
```

### Node Data Schemas

**chart:**
```json
{
  "node_type": "chart",
  "data": { "chartType": "bar", "title": "...", "labels": [], "values": [] }
}
```

**checklist:**
```json
{
  "node_type": "checklist",
  "data": { "title": "...", "items": [{ "text": "...", "due": "..." }] }
}
```

**document:**
```json
{
  "node_type": "document",
  "data": { "title": "...", "markdown": "..." }
}
```

**mockup:**
```json
{
  "node_type": "mockup",
  "data": { "html": "<div>...</div>" }
}
```

---

## File Structure

```
drift/
├── app/
│   ├── page.tsx                    # Main canvas — hook order matters
│   ├── globals.css                 # Animations, fonts, styling
│   └── api/
│       ├── process/route.ts        # Gemini intent router → creates Supabase task
│       └── ai/
│           ├── brainstorm/route.ts # Creates brainstorm task in Supabase
│           └── research/route.ts   # Creates research task in Supabase
├── components/
│   ├── Canvas.tsx                  # Pan/zoom canvas wrapper
│   ├── Node.tsx                    # Base draggable node
│   ├── Connection.tsx              # SVG bezier curves
│   ├── ClusterLabel.tsx            # Cluster name labels
│   └── InputBar.tsx                # Chat input (bottom)
├── lib/
│   ├── types.ts                    # Node, Connection, Cluster types
│   ├── physics.ts                  # Physics simulation engine
│   ├── constants.ts                # Physics tuning + node styles
│   ├── supabase.ts                 # Supabase client (anon key)
│   └── utils.ts                    # generateId, debounce, etc.
├── hooks/
│   ├── usePhysics.ts               # Physics animation loop (60fps)
│   └── useAgentResults.ts          # Supabase Realtime subscription
└── agent/
    ├── agent.py                    # All Fetch.ai agents
    ├── requirements.txt            # Python dependencies
    ├── .env                        # SUPABASE_URL, SUPABASE_SERVICE_KEY, GEMINI_API_KEY
    └── venv/                       # Python 3.12 virtual environment (gitignored)
```

---

## Environment Variables

### `.env.local` (Next.js — gitignored)
```
GEMINI_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=https://xgrsudycqgzdrxynlhfu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### `agent/.env` (Python — gitignored)
```
SUPABASE_URL=https://xgrsudycqgzdrxynlhfu.supabase.co
SUPABASE_SERVICE_KEY=...       # Service role key (not anon)
GEMINI_API_KEY=...
```

---

## Supabase Schema

```sql
-- Task queue (frontend → agents)
create table tasks (
  id uuid primary key default gen_random_uuid(),
  type text not null,           -- 'brainstorm' | 'research' | 'plan' | 'write' | 'mockup'
  input jsonb not null,         -- { topic, count, focus, branch_id }
  status text default 'pending',-- 'pending' | 'processing' | 'complete' | 'error'
  created_at timestamptz default now()
);

-- Agent results (agents → frontend via Realtime)
create table agent_results (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  node_type text not null,      -- 'ai_idea' | 'research' | 'chart' | 'checklist' | 'document' | 'mockup'
  results jsonb not null,       -- array of { text, data, metadata }
  created_at timestamptz default now()
);

-- Realtime enabled on agent_results
-- RLS disabled on both tables (demo)
```

---

## Gemini Integration

- **Model**: `gemini-3-flash-preview` (Google AI Studio API)
- **Intent routing**: `/api/process` — Gemini reads user input, returns `{ action, topic, response }`
- **Agent AI**: Each Python agent calls Gemini with a specialized prompt
- **JSON mode**: `response_mime_type: "application/json"` enforced everywhere
- **Temperature**: 0.7 for routing, 0.9 for brainstorm, 0.7 for research/planning

---

## Physics System

- **Engine**: `lib/physics.ts` — spring attraction + repulsion forces
- **Loop**: `hooks/usePhysics.ts` at 60fps via requestAnimationFrame
- **Auto-pause**: stops when all node velocities < threshold
- **Wake**: call `wake()` after spawning new nodes
- **Nodes**: positioned divs with CSS transforms (NOT canvas API)

### Physics Constants (`lib/constants.ts`)
```typescript
SPRING_STRENGTH: 0.004   // Connected nodes attract
SPRING_LENGTH: 150       // Target distance between connected nodes
REPULSION: 800           // All nodes repel each other
DAMPING: 0.92            // Velocity decay per frame
MAX_VELOCITY: 10         // Speed cap
```

### Coordinate Systems
- **Screen coords**: Fixed UI (InputBar, status bar)
- **World coords**: Node positions (affected by pan/zoom)
- Spawn position ignores pan/zoom currently (known TODO)

---

## Key Gotchas

### React Hook Order (CRITICAL)
`spawnNodesFromChatbox` must be defined BEFORE `handleAgentResults` in page.tsx.
Both must be wrapped in `useCallback` — otherwise Realtime subscription cycles.

### Supabase Client
- Frontend uses **anon key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- Python agent uses **service role key** (`SUPABASE_SERVICE_KEY`)
- Use `.from('table')` NOT `.table('table')` — `.table()` does not exist

### Python Environment
- Requires **Python 3.12** — uAgents incompatible with Python 3.13+
- Always activate venv: `source agent/venv/bin/activate`
- venv created with: `/opt/homebrew/bin/python3.12 -m venv venv`

### Gemini Model Name
- Use `gemini-3-flash-preview` (Google AI Studio)
- Other model names (gemini-2.0-flash-exp, gemini-1.5-flash, gemini-pro) return 404

### Supabase RLS
- Both `tasks` and `agent_results` tables have RLS **disabled** for demo
- Without this, anon key cannot insert tasks → 500 error

---

## Adding a New Agent

1. Add agent object in `agent/agent.py` with a new port
2. Add message handler with specialized Gemini prompt
3. Add output schema to this doc + `lib/types.ts`
4. Add node rendering in `components/Node.tsx` or new component
5. Add agent type to `/api/process` intent routing prompt
6. Add new API route if needed (`/api/ai/[type]/route.ts`)

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `supabase.table is not a function` | Wrong Supabase method | Use `.from()` not `.table()` |
| `row-level security policy` 500 | RLS enabled | Disable RLS on tasks + agent_results |
| `models/gemini-X not found` 404 | Wrong model name | Use `gemini-3-flash-preview` |
| Realtime cycling (constant subscribe/unsubscribe) | `useCallback` missing | Wrap `handleAgentResults` in `useCallback` |
| `Cannot access before initialization` | Hook order wrong | Define `spawnNodesFromChatbox` before `handleAgentResults` |
| `externally-managed-environment` pip error | No venv | `python3.12 -m venv venv && source venv/bin/activate` |

---

## Status

### Done ✅
- Physics engine + node spawning
- Gemini intent routing (`/api/process`)
- Supabase task queue + Realtime subscription
- Brainstorm + Research agents (basic, polling-based)
- End-to-end flow: input → agent → Realtime → nodes

### TODO 🔨
- Refactor agents to use native Fetch.ai `ctx.send()` messaging (not Supabase polling)
- Add Orchestrator agent that dispatches to sub-agents
- Add Planner agent → checklist node
- Add Writer agent → document node
- Add Mockup agent → HTML iframe node
- Add Chart node component (Chart.js)
- Add visual node components (ChecklistNode, DocumentNode, MockupNode)
- Register agents on Agentverse
- Branch concept on canvas (nodes grouped by branch)

---

**Built with**: Next.js 15, React 18, TypeScript, Tailwind v3.4, Gemini AI, Fetch.ai uAgents, Supabase
**Hackathon**: produHacks 2025
**Fetch.ai prize**: Multi-agent architecture with native agent-to-agent messaging
