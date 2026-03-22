import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Hardcoded branches for demo — "Start a student club at UBC"
const DEMO_BRANCHES = [
  {
    id: 'ams-requirements',
    label: 'AMS Requirements',
    description: 'Navigate the AMS club registration process, constitution requirements, and compliance steps at UBC.',
    agentPersonality: 'You are a meticulous administrator who knows UBC AMS policies inside and out. You think in checklists, deadlines, and compliance requirements. You reference specific AMS by-laws and processes.',
  },
  {
    id: 'campus-operations',
    label: 'Campus Operations',
    description: 'Plan room bookings, equipment, venue logistics, and day-to-day operational needs for running a club on campus.',
    agentPersonality: 'You are a pragmatic operations manager focused on logistics. You think about room bookings, AV equipment, catering, signage, and the practical realities of running events on UBC campus.',
  },
  {
    id: 'club-identity',
    label: 'Club Identity',
    description: 'Define the club brand, mission statement, visual identity, and social media presence that stands out on campus.',
    agentPersonality: 'You are a brand strategist who thinks about positioning, storytelling, and visual identity. You care about what makes this club feel different from the 400+ existing UBC clubs and how to build a recognizable presence.',
  },
  {
    id: 'financial-strategy',
    label: 'Financial Strategy',
    description: 'Build a sustainable funding model through AMS grants, sponsorships, membership dues, and budget management.',
    agentPersonality: 'You are a scrappy CFO who maximizes every dollar. You know about AMS club funding, local sponsorship opportunities, grant applications, and how to keep a student club financially sustainable with near-zero budget.',
  },
  {
    id: 'member-recruitment',
    label: 'Member Recruitment',
    description: 'Develop strategies to attract, convert, and retain members through campus events, social media, and word-of-mouth.',
    agentPersonality: 'You are a growth marketer obsessed with funnels and conversion. You think about Imagine Day booths, Instagram campaigns, referral programs, and how to turn curious students into committed members.',
  },
];

const DEMO_TRIGGER = 'start a student club';

export async function POST(req: NextRequest) {
  try {
    const { idea, parentLabel } = await req.json();

    // Check if this is the demo prompt
    if (!parentLabel && idea.toLowerCase().includes(DEMO_TRIGGER)) {
      return NextResponse.json({ branches: DEMO_BRANCHES });
    }

    // Otherwise, use Gemini as normal
    const context = parentLabel
      ? `The user is brainstorming about "${idea}". They want to branch deeper into "${parentLabel}". Generate sub-topics for "${parentLabel}" in the context of "${idea}".`
      : `The user wants to brainstorm about: "${idea}". Generate the main branches/aspects to explore.`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: {
        temperature: 0.9,
        responseMimeType: 'application/json',
      },
    });

    const prompt = `You are a brainstorming assistant. Given an idea, return ONLY a JSON array of 4-5 objects. Each object must have: { "id": "unique_string", "label": "1-2 words", "description": "one sentence description", "color": "soft pastel hex color like #d4edda or #cce5ff", "agentPersonality": "one sentence describing how this brainstorming agent should think and respond" }. The labels should be concise branch topics. Colors should be distinct soft pastels.

${context}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const branches = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ branches });
  } catch (error: any) {
    console.error('Branch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate branches' },
      { status: 500 }
    );
  }
}
