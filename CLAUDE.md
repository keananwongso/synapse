# Drift — Spatial Brainstorming Assistant

> AI-powered spatial canvas where thoughts become floating nodes that cluster semantically via physics simulation.

## Project: Drift
Built for produHacks 2025 hackathon. Next.js 15 + Gemini AI + Custom Physics Engine

## Commands
```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint check
```

## Architecture

### Frontend Flow
```
User Input (InputBar)
    ↓
/api/process (Gemini analyzes intent)
    ↓
Route to action (brainstorm | research | analyze | note)
    ↓
Execute action API (e.g., /api/ai/brainstorm)
    ↓
Spawn nodes from chatbox with physics
    ↓
Physics engine drifts nodes, creates clusters
```

### Physics System
- **Custom engine**: `lib/physics.ts` with spring/repulsion forces
- **requestAnimationFrame loop**: `hooks/usePhysics.ts` at 60fps
- **Auto-pause**: Physics stops when nodes settle (velocity < threshold)
- **Nodes use CSS transforms**: NOT Canvas API, just positioned divs

### AI Integration
- **Gemini 2.0 Flash Exp**: For all AI features
- **JSON mode**: All prompts use `responseMimeType: 'application/json'`
- **Intent routing**: `/api/process` determines what action to take
- **Brainstorming**: `/api/ai/brainstorm` generates ideas
- **Future**: Research, document writing, mockup generation

## File Structure

```
drift/
├── app/
│   ├── page.tsx                    # Main canvas orchestration
│   ├── globals.css                 # Animations, fonts, styling
│   └── api/
│       ├── process/route.ts        # Intent routing (Gemini)
│       └── ai/
│           ├── analyze/route.ts    # Semantic clustering (legacy)
│           └── brainstorm/route.ts # Idea generation
├── components/
│   ├── Canvas.tsx                  # Pan/zoom canvas wrapper
│   ├── Node.tsx                    # Draggable thought nodes
│   ├── Connection.tsx              # SVG bezier curves
│   ├── ClusterLabel.tsx            # Cluster name labels
│   ├── InputBar.tsx                # Chat input (bottom)
│   └── ActionPanel.tsx             # Right sidebar (legacy)
├── lib/
│   ├── types.ts                    # Node, Connection, Cluster types
│   ├── physics.ts                  # Physics simulation engine
│   ├── constants.ts                # Physics tuning + node styles
│   └── utils.ts                    # generateId, debounce, etc.
└── hooks/
    └── usePhysics.ts               # Physics animation loop
```

## Key Patterns

### Node Spawning
Nodes spawn from chatbox position (bottom-center) with outward velocity:
```typescript
const baseX = window.innerWidth / 2;
const baseY = window.innerHeight - 150;
const angle = (Math.PI * 2 * index) / nodeCount;
const vx = Math.cos(angle) * velocityStrength;
const vy = Math.sin(angle) * velocityStrength;
```

### Physics Constants
Tuned in `lib/constants.ts`:
```typescript
SPRING_STRENGTH: 0.004   // Connected nodes attract
SPRING_LENGTH: 150       // Target distance
REPULSION: 800           // All nodes repel
DAMPING: 0.92            // Velocity decay
MAX_VELOCITY: 10         // Speed limit
```

### Node Types
- `thought`: User-created notes (gray)
- `ai_idea`: Brainstormed ideas (purple)
- `research`: Research findings (blue) - TODO
- `document`: Generated docs (green) - TODO
- `mockup`: UI mockups (orange) - TODO

## Gotchas Claude Cannot Infer

### 1. Environment Variables
- **CRITICAL**: `GEMINI_API_KEY` must be in `.env.local`
- `.env.local` is gitignored (`.env*` pattern)
- Get key from: https://makersuite.google.com/app/apikey
- Model name: `gemini-2.0-flash-exp` (may need to update)

### 2. Physics Performance
- Nodes are React state, but physics uses **refs** for performance
- Only sync ref → state at 60fps to avoid re-renders
- Physics pauses when `hasSettled()` returns true
- Wake physics with `wake()` after user interactions

### 3. Coordinate Systems
- **Screen coords**: Fixed UI elements (InputBar, status)
- **World coords**: Node positions (affected by pan/zoom)
- Spawn position calculation currently ignores pan/zoom (TODO)

### 4. Gemini API
- Always validate JSON responses (can be malformed)
- Use try-catch with fallback behavior
- Temperature: 0.7 for routing, 0.9 for creativity
- Limit ideas to 20 words to fit in nodes

### 5. Animations
- `node-spawn` class triggers on mount (runs once)
- Use `cubic-bezier(0.34, 1.56, 0.64, 1)` for bounce effect
- Connections fade in via CSS transitions
- Processing indicators use `animate-pulse`

### 6. State Management
- NO Redux/Zustand - just React useState
- `isProcessing`: Locks input during AI calls
- `processingStatus`: Shows what AI is doing
- Nodes updated via `setNodes((prev) => [...])`

### 7. Unused Features (Safe to Remove)
- `ActionPanel`: Old cluster-based brainstorming (kept for compatibility)
- `/api/ai/analyze`: Auto-clustering (not used in new flow)
- `debounce` import in page.tsx (was for auto-analysis)

## Development Workflow

### Adding a New Action Type
1. Add action to `/api/process` prompt (e.g., "research")
2. Create API route: `/api/ai/research/route.ts`
3. Add handler in `page.tsx` → `handleChatSubmit`
4. Define node type in `lib/types.ts`
5. Add styling in `lib/constants.ts` → `NODE_STYLES`

### Testing Locally
1. Add `GEMINI_API_KEY` to `.env.local`
2. `npm run dev`
3. Open http://localhost:3000
4. Type: "Brainstorm ideas for [topic]"
5. Watch nodes spawn and drift

### Common Errors
- **"API key not valid"**: Missing or wrong `GEMINI_API_KEY`
- **"input is not defined"**: Fixed - was in error handler scope
- **Nodes not moving**: Check console for physics errors
- **Touch action warning**: Harmless dev warning from @use-gesture

## Future Features (TODO)

- [ ] Research agent (`/api/ai/research`)
- [ ] Document writer (`/api/ai/write`)
- [ ] Mockup generator (`/api/ai/mockup`)
- [ ] Auto-clustering with semantic analysis
- [ ] Supabase persistence + realtime
- [ ] Python agents with Fetch.ai uAgents
- [ ] Vertex AI migration for production
- [ ] Pan/zoom aware spawn positions
- [ ] Export canvas as JSON/image

## Team Split Recommendations

**Person 1 (Frontend/UX)**:
- Physics tuning (`lib/physics.ts`, `lib/constants.ts`)
- Visual polish (animations, node styles, connections)
- Canvas interactions (pan/zoom improvements)
- New node types styling

**Person 2 (Backend/AI)**:
- Research agent implementation
- Document writer implementation
- Vertex AI setup (if deploying)
- Error handling improvements
- Agent result rendering

## Testing Checklist

- [ ] Add API key to `.env.local`
- [ ] Dev server runs without errors
- [ ] Type "brainstorm coffee shop ideas"
- [ ] Nodes spawn from bottom-center
- [ ] Nodes drift outward with animation
- [ ] Processing indicator shows status
- [ ] Can continue typing while AI processes
- [ ] Physics settles after 2-3 seconds

---

**Built with**: Next.js 15, React 18, TypeScript, Tailwind v3.4, Gemini AI
**Hackathon**: produHacks 2025
**Status**: MVP complete, agents pending
