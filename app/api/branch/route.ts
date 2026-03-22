import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { idea, parentLabel } = await req.json();

    const context = parentLabel
      ? `The user is brainstorming about "${idea}". They want to branch deeper into "${parentLabel}". Generate sub-topics for "${parentLabel}" in the context of "${idea}".`
      : `The user wants to brainstorm about: "${idea}". Generate the main branches/aspects to explore.`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.9,
        responseMimeType: 'application/json',
      },
    });

    const prompt = `You are a brainstorming assistant. Given an idea, return ONLY a JSON array of 4-5 objects. Each object must have: { "id": "unique_string", "label": "1-2 words", "description": "one sentence description", "color": "soft pastel hex color like #d4edda or #cce5ff", "agentPersonality": "one sentence describing how this brainstorming agent should think and respond" }. The labels should be concise branch topics. Colors should be distinct soft pastels.

${context}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Parse the JSON array
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
