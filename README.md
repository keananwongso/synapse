# Synapse — Multi-Agent Spatial Brainstorming

> Reimagine thinking.

Synapse is a spatial canvas where AI agents autonomously break down your ideas into branches, research topics, create plans, draft documents, and generate live mini-websites — all appearing as interactive nodes on an infinite canvas.

Built for **produHacks 2025** | **Fetch.ai sponsor prize track**

## Live Fetch.ai Agents on Agentverse

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

## Quick Start

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

## Features

- **Spatial Canvas** — Infinite pan/zoom canvas powered by React Flow
- **Multi-Agent Branching** — AI breaks your idea into 4-5 parallel branches, each handled by a dedicated Fetch.ai agent with its own persona and expertise
- **Live Deliverables** — Each agent produces a written doc and an interactive HTML mini-site preview, generated in parallel and rendered as draggable, resizable canvas nodes
- **Inline Agent Chat** — Click any branch node to expand an inline chat interface and ask follow-up questions to that agent in character
- **Orchestrator Chat** — Talk to the central node to ask questions across all branches or trigger synthesis
- **Master Plan Synthesis** — Ask the orchestrator to synthesize all agent outputs into a structured 4-week action plan, rendered as a capstone node on the canvas
- **Smooth Morph Transition** — Homepage input pill animates and morphs directly into the canvas center capsule — no page reload
- **Demo Mode** — Typing "Start a student club at UBC" instantly loads 5 hardcoded UBC-specific branches (AMS Requirements, Campus Operations, Club Identity, Financial Strategy, Member Recruitment) for a deterministic demo experience

## Architecture

```
User types idea on homepage
      ↓
Input pill morphs → canvas center node
      ↓
/api/branch  →  Gemini generates 4-5 branch topics (or hardcoded demo set)
      ↓
Canvas spawns branch nodes with staggered animation
      ↓
/api/agent-think  →  Each agent runs in parallel:
    - Doc generation (Gemini)  ←── Promise.all
    - Mockup generation (Gemini) ←─┘
      ↓
Deliverable chip nodes appear, click to open resizable panel nodes
      ↓
/api/synthesize  →  All deliverables → Gemini → 4-week Master Plan node
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

## Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS v4
- **Canvas:** React Flow with custom node types
- **AI:** Google Gemini (`gemini-3-flash-preview`)
- **Agents:** Fetch.ai uAgents (Python 3.12) — hosted on Agentverse
- **Database:** Supabase (Postgres + Realtime)
- **Deployment:** Vercel (frontend) + Agentverse (agents)

## Project Structure

```
drift/
├── app/
│   ├── page.tsx                    # Homepage + morph transition logic
│   ├── globals.css                 # Animations and styles
│   └── api/
│       ├── branch/route.ts         # Generate branches (+ hardcoded demo set)
│       ├── agent-think/route.ts    # Parallel doc + mockup generation
│       ├── synthesize/route.ts     # Master plan synthesis from all deliverables
│       └── chat/route.ts           # Orchestrator + agent chat
├── components/
│   ├── SynapseCanvas.tsx           # Main canvas orchestrator
│   └── nodes/
│       ├── CenterNode.tsx          # Central idea capsule with chat
│       ├── BranchNode.tsx          # Agent branch nodes with inline chat
│       ├── DeliverableNode.tsx     # Doc + mockup chip nodes
│       ├── MasterPlanNode.tsx      # 4-week action plan capstone node
│       └── NoteNode.tsx            # User note nodes
└── agent/
    ├── agent.py                    # All Fetch.ai agents (local bureau)
    ├── requirements.txt            # Python dependencies
    └── .env                        # Agent environment variables
```

## Environment Variables

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

## Fetch.ai Agent Roster

| Agent | Port (local) | Triggered When | Output Type |
|-------|-------------|----------------|-------------|
| `synapse_orchestrator` | 8000 | Every request | Routes to sub-agents |
| `synapse_brainstorm` | 8001 | Explore ideas | `ai_idea` text nodes |
| `synapse_researcher` | 8002 | Need facts/data | `research` nodes |
| `synapse_planner` | 8003 | Need timeline/tasks | `checklist` node |
| `synapse_writer` | 8004 | Need drafts/docs | `document` node |
| `synapse_mockup` | 8005 | Need UI/slides | `mockup` iframe node |

