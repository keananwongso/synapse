import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { rootIdea, branches, deliverables } = await req.json();

    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    });

    const deliverablesContext = deliverables
      .map((d: any) => `[${d.branch}] ${d.title}: ${d.summary || d.content?.slice(0, 200)}`)
      .join('\n');

    const prompt = `You are synthesizing a comprehensive action plan from multiple AI agent outputs.

The user's goal: "${rootIdea}"

Branches and their deliverables:
${deliverablesContext}

Create a structured 4-week action plan that pulls the most important, concrete actions from ALL the agent outputs above. This should feel like the final "here's exactly what to do" output.

Return JSON with this EXACT structure:
{
  "title": "Short title for the plan (3-5 words)",
  "weeks": [
    {
      "week": "Week 1 — [theme]",
      "tasks": [
        "Specific actionable task with real details",
        "Another specific task"
      ]
    }
  ]
}

Rules:
- Exactly 4 weeks
- 2-4 tasks per week
- Tasks must be SPECIFIC — include real names, deadlines, numbers, platforms
- Pull directly from what the agents produced — don't invent new ideas
- Front-load the most impactful items to Week 1
- Each task should be completable in 1-2 hours
- Reference specific outputs from the agents where relevant (e.g. "Use the recruitment strategy from the Brand agent")`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const data = JSON.parse(text);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Synthesize error:', error);

    return NextResponse.json({
      title: 'Action Plan',
      weeks: [
        { week: 'Week 1 — Foundation', tasks: ['Set up core team', 'Define mission and goals'] },
        { week: 'Week 2 — Build', tasks: ['Launch social media presence', 'Begin outreach'] },
        { week: 'Week 3 — Grow', tasks: ['Host first event', 'Recruit members'] },
        { week: 'Week 4 — Sustain', tasks: ['Review progress', 'Plan next month'] },
      ],
    });
  }
}
