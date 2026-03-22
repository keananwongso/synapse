#!/usr/bin/env python3
"""
Synapse — Multi-Agent System (Fetch.ai uAgents)

Architecture:
  Frontend creates task in Supabase
      ↓
  Orchestrator agent polls Supabase, dispatches via ctx.send()
      ↓                    ↓                ↓
  Brainstorm Agent    Research Agent    Planner Agent  ...
      ↓                    ↓                ↓
  Sub-agents return results via ctx.send() back to orchestrator
      ↓
  Orchestrator writes results to Supabase agent_results
      ↓
  Frontend receives via Realtime subscription → renders nodes
"""

import os
import json
from dotenv import load_dotenv
from supabase import create_client, Client
import google.generativeai as genai
from uagents import Agent, Bureau, Context, Model
from uagents_core.identity import Identity

# ──────────────────────────────────────────────
# Config
# ──────────────────────────────────────────────
load_dotenv()

supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# ──────────────────────────────────────────────
# Message Models (shared between agents)
# ──────────────────────────────────────────────
class TaskMessage(Model):
    task_id: str
    task_type: str
    topic: str
    count: int = 3
    focus: str = ""

class ResultMessage(Model):
    task_id: str
    node_type: str
    results_json: str  # JSON-encoded list of results

# ──────────────────────────────────────────────
# Agent Seeds & Address Resolution
# ──────────────────────────────────────────────
ORCHESTRATOR_SEED = os.getenv("ORCHESTRATOR_SEED", "synapse_orchestrator_seed_001")
BRAINSTORM_SEED = os.getenv("BRAINSTORM_SEED", "synapse_brainstorm_seed_001")
RESEARCH_SEED = os.getenv("RESEARCH_SEED", "synapse_research_seed_001")
PLANNER_SEED = os.getenv("PLANNER_SEED", "synapse_planner_seed_001")
WRITER_SEED = os.getenv("WRITER_SEED", "synapse_writer_seed_001")
MOCKUP_SEED = os.getenv("MOCKUP_SEED", "synapse_mockup_seed_001")

# Derive addresses from seeds so orchestrator knows where to send
BRAINSTORM_ADDRESS = Identity.from_seed(BRAINSTORM_SEED, 0).address
RESEARCH_ADDRESS = Identity.from_seed(RESEARCH_SEED, 0).address
PLANNER_ADDRESS = Identity.from_seed(PLANNER_SEED, 0).address
WRITER_ADDRESS = Identity.from_seed(WRITER_SEED, 0).address
MOCKUP_ADDRESS = Identity.from_seed(MOCKUP_SEED, 0).address

# Map task types to agent addresses
AGENT_ROUTES = {
    "brainstorm": BRAINSTORM_ADDRESS,
    "research": RESEARCH_ADDRESS,
    "plan": PLANNER_ADDRESS,
    "write": WRITER_ADDRESS,
    "mockup": MOCKUP_ADDRESS,
}

# ──────────────────────────────────────────────
# Create Agents
# ──────────────────────────────────────────────
orchestrator = Agent(name="synapse_orchestrator", seed=ORCHESTRATOR_SEED, port=8000)
brainstorm_agent = Agent(name="synapse_brainstorm", seed=BRAINSTORM_SEED, port=8001)
research_agent = Agent(name="synapse_researcher", seed=RESEARCH_SEED, port=8002)
planner_agent = Agent(name="synapse_planner", seed=PLANNER_SEED, port=8003)
writer_agent = Agent(name="synapse_writer", seed=WRITER_SEED, port=8004)
mockup_agent = Agent(name="synapse_mockup", seed=MOCKUP_SEED, port=8005)

# ──────────────────────────────────────────────
# Gemini Helper
# ──────────────────────────────────────────────
def call_gemini(prompt: str, temperature: float = 0.7) -> dict:
    model = genai.GenerativeModel("gemini-3-flash-preview")
    response = model.generate_content(
        prompt,
        generation_config={"response_mime_type": "application/json", "temperature": temperature}
    )
    return json.loads(response.text)


# ══════════════════════════════════════════════
# ORCHESTRATOR AGENT
# ══════════════════════════════════════════════
@orchestrator.on_event("startup")
async def orchestrator_startup(ctx: Context):
    ctx.logger.info("🎯 Orchestrator agent started")
    ctx.logger.info(f"   Address: {orchestrator.address}")
    ctx.logger.info(f"   Routes: {list(AGENT_ROUTES.keys())}")

@orchestrator.on_interval(period=2.0)
async def poll_tasks(ctx: Context):
    """Poll Supabase for pending tasks and dispatch to sub-agents via ctx.send()"""
    try:
        result = supabase.table("tasks") \
            .select("*") \
            .eq("status", "pending") \
            .order("created_at") \
            .limit(5) \
            .execute()

        for task in result.data:
            task_id = task["id"]
            task_type = task["type"]
            task_input = task["input"]

            agent_address = AGENT_ROUTES.get(task_type)
            if not agent_address:
                ctx.logger.warning(f"Unknown task type: {task_type}")
                supabase.table("tasks").update({"status": "error"}).eq("id", task_id).execute()
                continue

            # Mark as processing
            supabase.table("tasks").update({"status": "processing"}).eq("id", task_id).execute()

            # Dispatch to sub-agent via native Fetch.ai messaging
            msg = TaskMessage(
                task_id=task_id,
                task_type=task_type,
                topic=task_input.get("topic", ""),
                count=task_input.get("count", 3),
                focus=task_input.get("focus", ""),
            )
            await ctx.send(agent_address, msg)
            ctx.logger.info(f"📤 Dispatched {task_type} task {task_id[:8]}... → {task_type}_agent")

    except Exception as e:
        ctx.logger.error(f"Poll error: {e}")

@orchestrator.on_message(ResultMessage)
async def handle_result(ctx: Context, sender: str, msg: ResultMessage):
    """Receive results from sub-agents and write to Supabase for Realtime"""
    try:
        results = json.loads(msg.results_json)

        supabase.table("agent_results").insert({
            "task_id": msg.task_id,
            "node_type": msg.node_type,
            "results": results
        }).execute()

        supabase.table("tasks").update({"status": "complete"}).eq("id", msg.task_id).execute()

        ctx.logger.info(f"✅ Task {msg.task_id[:8]}... complete ({len(results)} results, type: {msg.node_type})")

    except Exception as e:
        ctx.logger.error(f"Result handling error: {e}")
        supabase.table("tasks").update({"status": "error"}).eq("id", msg.task_id).execute()


# ══════════════════════════════════════════════
# BRAINSTORM AGENT
# ══════════════════════════════════════════════
@brainstorm_agent.on_event("startup")
async def brainstorm_startup(ctx: Context):
    ctx.logger.info(f"🧠 Brainstorm agent started | {brainstorm_agent.address}")

@brainstorm_agent.on_message(TaskMessage)
async def handle_brainstorm(ctx: Context, sender: str, msg: TaskMessage):
    ctx.logger.info(f"🧠 Brainstorming: {msg.topic}")
    try:
        data = call_gemini(f"""You are a creative brainstorming partner.

Topic: "{msg.topic}"
{f'Focus on: {msg.focus}' if msg.focus else ''}

Generate {msg.count} creative, actionable ideas related to this topic.

Return ONLY valid JSON:
{{
  "ideas": [
    {{"text": "Your idea here (under 20 words)"}}
  ]
}}

Rules:
- Each idea MUST be under 20 words
- Be specific and actionable, not generic
- Ideas should be diverse and explore different angles
- Avoid obvious or cliché suggestions""", temperature=0.9)

        results = [{"text": idea["text"], "metadata": {"type": "ai_idea"}} for idea in data.get("ideas", [])]

        await ctx.send(sender, ResultMessage(
            task_id=msg.task_id,
            node_type="ai_idea",
            results_json=json.dumps(results)
        ))
    except Exception as e:
        ctx.logger.error(f"Brainstorm error: {e}")
        await ctx.send(sender, ResultMessage(
            task_id=msg.task_id, node_type="ai_idea",
            results_json=json.dumps([{"text": f"Error: {str(e)}", "metadata": {"type": "ai_idea"}}])
        ))


# ══════════════════════════════════════════════
# RESEARCH AGENT
# ══════════════════════════════════════════════
@research_agent.on_event("startup")
async def research_startup(ctx: Context):
    ctx.logger.info(f"🔍 Research agent started | {research_agent.address}")

@research_agent.on_message(TaskMessage)
async def handle_research(ctx: Context, sender: str, msg: TaskMessage):
    ctx.logger.info(f"🔍 Researching: {msg.topic}")
    try:
        data = call_gemini(f"""You are a research assistant providing factual insights.

Topic: "{msg.topic}"
{f'Focus on: {msg.focus}' if msg.focus else ''}

Generate {msg.count} research insights that:
- Provide relevant facts, statistics, or examples
- Are grounded in real information (not speculation)
- Are concise (under 25 words each)

Return ONLY valid JSON:
{{
  "findings": [
    {{
      "text": "Brief insight under 25 words",
      "detail": "1-2 sentences with more context"
    }}
  ]
}}""", temperature=0.7)

        results = [
            {"text": f["text"], "metadata": {"detail": f.get("detail", ""), "type": "research"}}
            for f in data.get("findings", [])
        ]

        await ctx.send(sender, ResultMessage(
            task_id=msg.task_id, node_type="research", results_json=json.dumps(results)
        ))
    except Exception as e:
        ctx.logger.error(f"Research error: {e}")
        await ctx.send(sender, ResultMessage(
            task_id=msg.task_id, node_type="research",
            results_json=json.dumps([{"text": f"Error: {str(e)}", "metadata": {"type": "research"}}])
        ))


# ══════════════════════════════════════════════
# PLANNER AGENT
# ══════════════════════════════════════════════
@planner_agent.on_event("startup")
async def planner_startup(ctx: Context):
    ctx.logger.info(f"📋 Planner agent started | {planner_agent.address}")

@planner_agent.on_message(TaskMessage)
async def handle_plan(ctx: Context, sender: str, msg: TaskMessage):
    ctx.logger.info(f"📋 Planning: {msg.topic}")
    try:
        data = call_gemini(f"""You are a project planner that creates actionable timelines and task lists.

Topic: "{msg.topic}"
{f'Focus on: {msg.focus}' if msg.focus else ''}

Create a structured plan with {msg.count} phases or milestones.

Return ONLY valid JSON:
{{
  "plan": {{
    "title": "Plan title",
    "items": [
      {{
        "text": "Task or milestone (under 15 words)",
        "due": "Timeframe (e.g. Week 1, Day 3, March 25)",
        "priority": "high | medium | low"
      }}
    ]
  }}
}}

Rules:
- Each item text MUST be under 15 words
- Include realistic timeframes
- Order by sequence/priority
- Be specific and actionable""", temperature=0.7)

        plan = data.get("plan", {})
        results = [{
            "text": plan.get("title", msg.topic),
            "metadata": {
                "type": "checklist",
                "items": plan.get("items", [])
            }
        }]

        await ctx.send(sender, ResultMessage(
            task_id=msg.task_id, node_type="checklist", results_json=json.dumps(results)
        ))
    except Exception as e:
        ctx.logger.error(f"Planner error: {e}")
        await ctx.send(sender, ResultMessage(
            task_id=msg.task_id, node_type="checklist",
            results_json=json.dumps([{"text": f"Error: {str(e)}", "metadata": {"type": "checklist"}}])
        ))


# ══════════════════════════════════════════════
# WRITER AGENT
# ══════════════════════════════════════════════
@writer_agent.on_event("startup")
async def writer_startup(ctx: Context):
    ctx.logger.info(f"✍️ Writer agent started | {writer_agent.address}")

@writer_agent.on_message(TaskMessage)
async def handle_write(ctx: Context, sender: str, msg: TaskMessage):
    ctx.logger.info(f"✍️ Writing: {msg.topic}")
    try:
        data = call_gemini(f"""You are a professional writer and content creator.

Topic: "{msg.topic}"
{f'Focus on: {msg.focus}' if msg.focus else ''}

Write a polished document, draft, or message about this topic.

Return ONLY valid JSON:
{{
  "document": {{
    "title": "Document title",
    "markdown": "Full document content in markdown format. Use headers, bullets, bold. Keep under 300 words."
  }}
}}

Rules:
- Write in a clear, professional tone
- Use markdown formatting (headers, bullets, bold)
- Keep the total document under 300 words
- If it sounds like an outreach email, write it as an email with subject, greeting, body, sign-off""", temperature=0.7)

        doc = data.get("document", {})
        results = [{
            "text": doc.get("title", msg.topic),
            "metadata": {
                "type": "document",
                "markdown": doc.get("markdown", ""),
            }
        }]

        await ctx.send(sender, ResultMessage(
            task_id=msg.task_id, node_type="document", results_json=json.dumps(results)
        ))
    except Exception as e:
        ctx.logger.error(f"Writer error: {e}")
        await ctx.send(sender, ResultMessage(
            task_id=msg.task_id, node_type="document",
            results_json=json.dumps([{"text": f"Error: {str(e)}", "metadata": {"type": "document"}}])
        ))


# ══════════════════════════════════════════════
# MOCKUP AGENT
# ══════════════════════════════════════════════
@mockup_agent.on_event("startup")
async def mockup_startup(ctx: Context):
    ctx.logger.info(f"🎨 Mockup agent started | {mockup_agent.address}")

@mockup_agent.on_message(TaskMessage)
async def handle_mockup(ctx: Context, sender: str, msg: TaskMessage):
    ctx.logger.info(f"🎨 Creating mockup: {msg.topic}")
    try:
        data = call_gemini(f"""You are a UI/UX designer that creates website mockups and presentation slides.

Topic: "{msg.topic}"
{f'Focus on: {msg.focus}' if msg.focus else ''}

Create a visual mockup as self-contained HTML with inline CSS.

Return ONLY valid JSON:
{{
  "mockup": {{
    "title": "Mockup title",
    "html": "<div style='font-family: system-ui, sans-serif; padding: 24px; max-width: 400px; background: white;'>Your complete HTML mockup here with inline styles. Use modern design principles: clean typography, proper spacing, subtle colors, rounded corners.</div>"
  }}
}}

Rules:
- ALL CSS must be inline styles (no <style> tags or external stylesheets)
- Use system-ui font family
- Design should be clean, modern, and visually appealing
- Include realistic placeholder content
- Max width 400px, reasonable height
- Use subtle shadows, rounded corners, proper spacing
- If the topic mentions slides/presentation, create a single slide layout
- If the topic mentions a website, create a landing page section""", temperature=0.8)

        mockup = data.get("mockup", {})
        results = [{
            "text": mockup.get("title", msg.topic),
            "metadata": {
                "type": "mockup",
                "html": mockup.get("html", "<div>Mockup generation failed</div>"),
            }
        }]

        await ctx.send(sender, ResultMessage(
            task_id=msg.task_id, node_type="mockup", results_json=json.dumps(results)
        ))
    except Exception as e:
        ctx.logger.error(f"Mockup error: {e}")
        await ctx.send(sender, ResultMessage(
            task_id=msg.task_id, node_type="mockup",
            results_json=json.dumps([{"text": f"Error: {str(e)}", "metadata": {"type": "mockup"}}])
        ))


# ══════════════════════════════════════════════
# RUN ALL AGENTS VIA BUREAU
# ══════════════════════════════════════════════
if __name__ == "__main__":
    print("🚀 Synapse Multi-Agent System")
    print(f"   Orchestrator : {orchestrator.address}")
    print(f"   Brainstorm   : {brainstorm_agent.address}")
    print(f"   Research     : {research_agent.address}")
    print(f"   Planner      : {planner_agent.address}")
    print(f"   Writer       : {writer_agent.address}")
    print(f"   Mockup       : {mockup_agent.address}")
    print()

    bureau = Bureau(port=8000)
    bureau.add(orchestrator)
    bureau.add(brainstorm_agent)
    bureau.add(research_agent)
    bureau.add(planner_agent)
    bureau.add(writer_agent)
    bureau.add(mockup_agent)
    bureau.run()
