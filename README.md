# Synapse — Multi-Agent Spatial Brainstorming

> Your thoughts, beautifully untangled.

Synapse is a spatial canvas where AI agents autonomously break down your ideas into branches, research topics, create plans, draft documents, and generate live mini-websites — all appearing as interactive nodes on an infinite canvas.

Built for **produHacks 2025** | **Fetch.ai sponsor prize track**

## 🤖 Live Fetch.ai Agents on Agentverse

Both agents are deployed and running on [Agentverse](https://agentverse.ai):

| Agent | Address | Role |
|-------|---------|------|
| `synapse_orchestrator` | `agent1qv55mm4shmv82rqumtqp662cvxyv77x3mtvpghm76flrddkx3q0y607a50e` | Polls task queue, dispatches to sub-agents via `ctx.send()` |
| `synapse_brainstorm` | `agent1qtmr943ldkccux79nvyjt4wk7zlzh2tkpv2heqe6tv5xvmkp5hz8ur83lte` | Receives tasks, calls Gemini, returns ideas to orchestrator |

These agents communicate using **native Fetch.ai agent-to-agent messaging** (`ctx.send()`), not HTTP calls. The orchestrator dispatches tasks to sub-agents in parallel and collects results — a true multi-agent pipeline.

### Agent Communication Flow

```
Frontend → Supabase task queue
      ↓
Synapse Orchestrator (Agentverse) polls every 2s
      ↓  ctx.send()  ←— native Fetch.ai messaging
Synapse Brainstorm Agent
      ↓  ctx.send() back to orchestrator
Orchestrator writes results → Supabase agent_results
      ↓  Realtime subscription
Canvas renders new nodes
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your keys:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Run Python Agents (local, optional)

The full multi-agent pipeline can also be run locally:

```bash
cd agent
source venv/bin/activate
python agent.py
```

Requires Python 3.12 and the env vars in `agent/.env`.

## ✨ Features

- **Spatial Canvas** — Infinite pan/zoom canvas powered by React Flow
- **Multi-Agent Branching** — AI breaks your idea into parallel branches, each handled by a dedicated Fetch.ai agent
- **Live Deliverables** — Agents produce doc nodes and live HTML mini-site previews, rendered directly on the canvas
- **Orchestrator Chat** — Talk to the central orchestrator to ask questions across all branches
- **Agent Deep-Dive** — Click any branch to open a side panel showing agent thinking and outputs
- **Note Nodes** — Add manual notes connected to any node
- **Smooth Transitions** — Homepage input morphs into the canvas center capsule

## 🏗 Architecture

```
User types idea
      ↓
/api/branch  →  Gemini generates 4-6 branch topics
      ↓
Canvas spawns branch nodes
      ↓
/api/agent-think  →  Each agent (Gemini) produces thinking steps + deliverables
      ↓
Deliverable nodes appear: Doc cards + live HTML Site previews
```

**Fetch.ai Agent Pipeline:**
```
Frontend → Supabase task queue
      ↓
Synapse Orchestrator (Fetch.ai Agentverse) polls tasks
      ↓  ctx.send()  (native Fetch.ai agent-to-agent messaging)
Brainstorm / Research / Planner / Writer / Mockup agents
      ↓
Results → Supabase agent_results → Realtime → Canvas
```

## 🛠 Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS v4
- **Canvas:** React Flow with custom node types
- **AI:** Google Gemini (`gemini-2.0-flash`)
- **Agents:** Fetch.ai uAgents (Python 3.12) — hosted on Agentverse
- **Database:** Supabase (Postgres + Realtime)
- **Deployment:** Vercel (frontend) + Agentverse (agents)

## 📁 Project Structure

```
synapse/
├── app/
│   ├── page.tsx                    # Homepage + transition logic
│   ├── globals.css                 # Animations and styles
│   └── api/
│       ├── branch/route.ts         # Generate branches from idea
│       ├── agent-think/route.ts    # Agent thinking + deliverables
│       ├── chat/route.ts           # Orchestrator chat
│       └── process/route.ts        # Intent routing
├── components/
│   ├── SynapseCanvas.tsx           # Main canvas orchestrator
│   └── nodes/
│       ├── CenterNode.tsx          # Central idea capsule
│       ├── BranchNode.tsx          # Agent branch nodes
│       ├── DeliverableNode.tsx     # Doc + Site deliverable nodes
│       └── NoteNode.tsx            # User note nodes
├── lib/
│   ├── types.ts                    # TypeScript types
│   ├── constants.ts                # Physics + style constants
│   ├── supabase.ts                 # Supabase client
│   └── utils.ts                    # Utilities
└── agent/
    ├── agent.py                    # All Fetch.ai agents (local bureau)
    ├── requirements.txt            # Python dependencies
    └── .env                        # Agent environment variables
```

## 🔑 Environment Variables

### `.env.local` (Next.js)
```
GEMINI_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### `agent/.env` (Python agents — local only)
```
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
GEMINI_API_KEY=...
```

### Agentverse Agent Secrets
The hosted agents on Agentverse use Agent Secrets (injected as environment variables):
```
GEMINI_API_KEY=...        # Both agents
SUPABASE_URL=...          # Orchestrator only
SUPABASE_SERVICE_KEY=...  # Orchestrator only
```

## 🤖 Fetch.ai Agent Roster

| Agent | Port (local) | Triggered When | Output Type |
|-------|-------------|----------------|-------------|
| `synapse_orchestrator` | 8000 | Every request | Routes to sub-agents |
| `synapse_brainstorm` | 8001 | Explore ideas | `ai_idea` text nodes |
| `synapse_researcher` | 8002 | Need facts/data | `research` nodes |
| `synapse_planner` | 8003 | Need timeline/tasks | `checklist` node |
| `synapse_writer` | 8004 | Need drafts/docs | `document` node |
| `synapse_mockup` | 8005 | Need UI/slides | `mockup` iframe node |

### Why Fetch.ai (not just API calls)

- Agents communicate via `ctx.send()` — native Fetch.ai agent messaging protocol
- Agents are registered on Agentverse and visible to anyone with the address
- True multi-agent: orchestrator dispatches, sub-agents process in parallel, results flow back
- Agents run independently — the orchestrator doesn't know *how* sub-agents work, only their address

## 🙏 Credits

- Built for produHacks 2025
- Powered by Google Gemini + Fetch.ai uAgents
- Canvas built with React Flow
