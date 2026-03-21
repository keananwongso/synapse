import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Support both old and new interfaces
    const topic = body.topic || body.clusterLabel;
    const count = body.count || 3;
    const focus = body.focus || '';
    const thoughts = body.thoughts || [];
    const nodeIds = body.nodeIds || [];

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      );
    }

    console.log('🧠 Brainstorming:', topic, '| Count:', count);

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.9, // Higher temperature for creativity
      },
    });

    // Build prompt based on whether we have existing thoughts or not
    let prompt;
    if (thoughts.length > 0) {
      // Old interface: brainstorm from existing cluster
      prompt = `You are a creative brainstorming partner.

Given this cluster of related thoughts about "${topic}":
${thoughts.map((t: string, i: number) => `${i}. "${t}"`).join('\n')}

Generate ${count} new ideas that:
- Build on these thoughts in unexpected ways
- Challenge assumptions or suggest new angles
- Propose concrete next steps or actions
- Are creative but grounded in the existing context

Return JSON with this structure:
{
  "ideas": [
    {
      "text": "Your idea here",
      "relatedToIndices": [0, 2]
    }
  ]
}

Rules:
- Each idea MUST be under 20 words
- Be specific and actionable, not generic
- relatedToIndices should reference which input thoughts (by index) this idea builds on
- Make connections that aren't obvious`;
    } else {
      // New interface: brainstorm from scratch
      prompt = `You are a creative brainstorming partner.

Topic: "${topic}"
${focus ? `Focus on: ${focus}` : ''}

Generate ${count} creative, actionable ideas related to this topic.

Return JSON with this EXACT structure:
{
  "ideas": [
    {
      "text": "Your idea here (under 20 words)"
    }
  ]
}

Rules:
- Each idea MUST be under 20 words
- Be specific and actionable, not generic
- Ideas should be diverse and explore different angles
- Avoid obvious or cliché suggestions`;
    }

    const result = await model.generateContent(prompt);
    const data = JSON.parse(result.response.text());

    // Map indices to actual node IDs if provided
    const ideas = data.ideas.map((idea: any) => ({
      text: idea.text,
      relatedNodeIds: idea.relatedToIndices
        ? idea.relatedToIndices.map((idx: number) => nodeIds[idx]).filter(Boolean)
        : [],
    }));

    console.log('✅ Generated', ideas.length, 'ideas');

    return NextResponse.json({ ideas });
  } catch (error: any) {
    console.error('Brainstorm error:', error);
    return NextResponse.json(
      { error: 'Failed to brainstorm', details: error.message },
      { status: 500 }
    );
  }
}
