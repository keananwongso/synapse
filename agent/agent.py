#!/usr/bin/env python3
"""
Drift - Fetch.ai Agent System
Polls Supabase for tasks and uses Gemini to generate content
"""

import os
import json
import time
from dotenv import load_dotenv
from supabase import create_client, Client
import google.generativeai as genai
from uagents import Agent, Context

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)

# Initialize Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Create Fetch.ai agents
research_agent = Agent(
    name="drift_researcher",
    seed=os.getenv("RESEARCH_AGENT_SEED", "drift_research_seed_001"),
    port=8001
)

brainstorm_agent = Agent(
    name="drift_brainstorm",
    seed=os.getenv("BRAINSTORM_AGENT_SEED", "drift_brainstorm_seed_001"),
    port=8002
)

# Agent startup events
@research_agent.on_event("startup")
async def research_startup(ctx: Context):
    ctx.logger.info(f"🔍 Research agent started")
    ctx.logger.info(f"   Address: {research_agent.address}")

@brainstorm_agent.on_event("startup")
async def brainstorm_startup(ctx: Context):
    ctx.logger.info(f"🧠 Brainstorm agent started")
    ctx.logger.info(f"   Address: {brainstorm_agent.address}")


def handle_research(task: dict) -> list:
    """
    Research agent handler - generates research insights using Gemini
    """
    task_input = task["input"]
    topic = task_input.get("topic", "")
    count = task_input.get("count", 3)
    focus = task_input.get("focus", "")

    print(f"🔍 Researching: {topic}")

    model = genai.GenerativeModel("gemini-2.0-flash-exp")

    prompt = f"""You are a research assistant providing factual insights.

Topic: "{topic}"
{f'Focus on: {focus}' if focus else ''}

Generate {count} research insights that:
- Provide relevant facts, statistics, or examples
- Are grounded in real information (not speculation)
- Add depth and context to the topic
- Are concise (under 25 words each)

Return ONLY valid JSON with this EXACT structure:
{{
  "findings": [
    {{
      "text": "Brief insight under 25 words",
      "detail": "1-2 sentences with more context (optional)"
    }}
  ]
}}

Rules:
- Each finding text MUST be under 25 words
- Be specific and informative, not vague
- Focus on facts, data, or concrete examples"""

    try:
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json", "temperature": 0.7}
        )
        data = json.loads(response.text)
        findings = data.get("findings", [])

        # Format results for Supabase
        results = []
        for finding in findings:
            results.append({
                "text": finding["text"],
                "metadata": {
                    "detail": finding.get("detail", ""),
                    "type": "research"
                }
            })

        print(f"✅ Generated {len(results)} research findings")
        return results

    except Exception as e:
        print(f"❌ Research error: {e}")
        raise


def handle_brainstorm(task: dict) -> list:
    """
    Brainstorm agent handler - generates creative ideas using Gemini
    """
    task_input = task["input"]
    topic = task_input.get("topic", "")
    count = task_input.get("count", 3)
    focus = task_input.get("focus", "")

    print(f"🧠 Brainstorming: {topic}")

    model = genai.GenerativeModel("gemini-2.0-flash-exp")

    prompt = f"""You are a creative brainstorming partner.

Topic: "{topic}"
{f'Focus on: {focus}' if focus else ''}

Generate {count} creative, actionable ideas related to this topic.

Return ONLY valid JSON with this EXACT structure:
{{
  "ideas": [
    {{
      "text": "Your idea here (under 20 words)"
    }}
  ]
}}

Rules:
- Each idea MUST be under 20 words
- Be specific and actionable, not generic
- Ideas should be diverse and explore different angles
- Avoid obvious or cliché suggestions"""

    try:
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json", "temperature": 0.9}
        )
        data = json.loads(response.text)
        ideas = data.get("ideas", [])

        # Format results for Supabase
        results = []
        for idea in ideas:
            results.append({
                "text": idea["text"],
                "metadata": {
                    "type": "ai_idea"
                }
            })

        print(f"✅ Generated {len(results)} ideas")
        return results

    except Exception as e:
        print(f"❌ Brainstorm error: {e}")
        raise


# Handler mapping
HANDLERS = {
    "research": handle_research,
    "brainstorm": handle_brainstorm
}


def poll_and_process():
    """
    Main polling loop - checks Supabase for pending tasks
    """
    print("🚀 Drift Agent System started")
    print(f"   Research agent: {research_agent.address}")
    print(f"   Brainstorm agent: {brainstorm_agent.address}")
    print("\n📡 Polling for tasks...\n")

    while True:
        try:
            # Fetch pending tasks
            result = supabase.table("tasks") \
                .select("*") \
                .eq("status", "pending") \
                .order("created_at") \
                .limit(5) \
                .execute()

            for task in result.data:
                task_id = task["id"]
                task_type = task["type"]

                print(f"\n📝 Processing task {task_id[:8]}... (type: {task_type})")

                # Update status to processing
                supabase.table("tasks") \
                    .update({"status": "processing"}) \
                    .eq("id", task_id) \
                    .execute()

                # Get handler
                handler = HANDLERS.get(task_type)
                if not handler:
                    print(f"❌ Unknown task type: {task_type}")
                    supabase.table("tasks") \
                        .update({"status": "error"}) \
                        .eq("id", task_id) \
                        .execute()
                    continue

                try:
                    # Execute handler
                    results = handler(task)

                    # Write results to database (triggers Realtime update to frontend)
                    supabase.table("agentx_results").insert({
                        "task_id": task_id,
                        "node_type": task_type,
                        "results": results
                    }).execute()

                    # Mark task complete
                    supabase.table("tasks") \
                        .update({"status": "complete"}) \
                        .eq("id", task_id) \
                        .execute()

                    print(f"✅ Task {task_id[:8]}... completed ({len(results)} results)")

                except Exception as e:
                    print(f"❌ Task {task_id[:8]}... failed: {e}")
                    supabase.table("tasks") \
                        .update({"status": "error"}) \
                        .eq("id", task_id) \
                        .execute()

        except Exception as e:
            print(f"⚠️  Poll error: {e}")

        # Wait before next poll
        time.sleep(2)


if __name__ == "__main__":
    try:
        poll_and_process()
    except KeyboardInterrupt:
        print("\n\n👋 Agent system stopped")
