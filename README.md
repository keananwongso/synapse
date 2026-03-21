# Drift — Spatial Brainstorming Assistant

> Think, organize, act — on one living canvas.

Drift is a web app with an infinite spatial canvas where thoughts become floating nodes with soft physics. AI (Gemini) analyzes semantic relationships — related nodes drift toward each other and cluster. The AI also co-brainstorms, adding its own idea nodes.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy `.env.local.example` to `.env.local` and add your Gemini API key:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

Get your Gemini API key from: https://makersuite.google.com/app/apikey

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## ✨ Features

### Core Features (Implemented)

- ✅ **Spatial Canvas** — Infinite canvas with pan and zoom
- ✅ **Physics Engine** — Nodes drift toward related thoughts using spring/repulsion forces
- ✅ **AI Clustering** — Gemini analyzes semantic relationships and creates clusters
- ✅ **AI Co-Brainstorming** — Generate related ideas from any cluster
- ✅ **Beautiful UI** — Dark theme with Satoshi font, soft glows, smooth animations

### Coming Soon

- 🔜 **Research Agent** — Find facts and insights about a cluster
- 🔜 **Document Writer** — Draft structured documents from thoughts
- 🔜 **Mockup Generator** — Visualize ideas as UI designs
- 🔜 **Supabase Integration** — Persist canvases and enable agent communication
- 🔜 **Python Agents** — Fetch.ai uAgents for research/writing/mockups

## 🎮 How to Use

1. **Add Thoughts** — Type in the bottom input bar and press Enter
2. **Watch the Magic** — After 1 second, AI analyzes relationships and nodes drift together
3. **Explore Clusters** — Click cluster labels to open the action panel
4. **Brainstorm** — Click "Brainstorm More Ideas" to generate AI co-thoughts
5. **Drag & Organize** — Drag nodes to manually organize them
6. **Pan & Zoom** — Click-drag empty space to pan, scroll to zoom

## 🛠 Tech Stack

- **Frontend:** Next.js 15, React 18, TypeScript, Tailwind CSS v3.4
- **Rendering:** React divs with CSS transforms (NO Canvas API)
- **Physics:** Custom requestAnimationFrame loop with spring/repulsion forces
- **Gestures:** @use-gesture/react for drag, pan, pinch
- **AI:** Google Gemini 3.0 Flash (via @google/generative-ai)
- **Database:** Supabase (Postgres + Realtime) - coming soon
- **Agents:** Fetch.ai uAgents (Python) - coming soon

## 📁 Project Structure

```
drift/
├── app/
│   ├── page.tsx                    # Main canvas page
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # Global styles + Satoshi font
│   └── api/
│       ├── ai/analyze/route.ts     # Semantic clustering
│       └── ai/brainstorm/route.ts  # Co-brainstorming
├── components/
│   ├── Canvas.tsx                  # Main canvas (pan/zoom)
│   ├── Node.tsx                    # Floating thought node
│   ├── Connection.tsx              # SVG bezier curves
│   ├── ClusterLabel.tsx            # Cluster labels
│   ├── InputBar.tsx                # Bottom input (Spotlight-style)
│   └── ActionPanel.tsx             # Right sidebar
├── lib/
│   ├── physics.ts                  # Physics simulation
│   ├── types.ts                    # TypeScript types
│   ├── constants.ts                # Tuning constants
│   └── utils.ts                    # Utility functions
└── hooks/
    └── usePhysics.ts               # Physics animation loop
```

## ⚙️ Physics Tuning

The "drift" effect is controlled by constants in `lib/constants.ts`:

```typescript
SPRING_STRENGTH: 0.004,  // How strongly connected nodes attract
SPRING_LENGTH: 150,      // Target distance between connected nodes
REPULSION: 800,          // How strongly all nodes repel
DAMPING: 0.92,           // Velocity decay (higher = less friction)
```

Adjust these to change how nodes move and cluster.

## 🎨 Customization

### Change Node Styles

Edit `NODE_STYLES` in `lib/constants.ts` to customize colors for different node types.

### Change Background

Edit `.canvas-bg` in `app/globals.css` to customize the dot grid background.

### Change Font

Replace the Satoshi font import in `app/globals.css` with your preferred font.

## 🐛 Troubleshooting

### Nodes aren't moving

- Check browser console for physics errors
- Verify that connections are being created (check Network tab for `/api/ai/analyze`)
- Try adding more nodes (need at least 2 for clustering)

### AI analysis failing

- Verify your `GEMINI_API_KEY` is set in `.env.local`
- Check the API route logs in terminal
- The code tries multiple model names (`gemini-3.0-flash`, `gemini-2.0-flash-exp`, `gemini-1.5-flash`)

### Nodes disappearing off screen

- Pan to find them (click-drag empty space)
- Refresh the page to reset positions

## 📝 Development

### Build for Production

```bash
npm run build
npm run start
```

### Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Set environment variables in Vercel dashboard:
- `GEMINI_API_KEY`

## 🙏 Credits

- Built for produHacks 2025
- Powered by Google Gemini
- Inspired by spatial thinking tools like Muse, Kosmik, and Miro

## 📄 License

MIT
