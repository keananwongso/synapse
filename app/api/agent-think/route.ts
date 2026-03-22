import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { branchLabel, branchDescription, agentPersonality, rootIdea } = await req.json();

    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: {
        temperature: 0.8,
        responseMimeType: 'application/json',
      },
    });

    const prompt = `You are an AI agent working on the "${branchLabel}" aspect of "${rootIdea}".

Your personality: ${agentPersonality}
Branch description: ${branchDescription}

You are autonomously analyzing this topic. Return your work as JSON with this EXACT structure:

{
  "thinkingSteps": [
    "Analyzing the key aspects of ${branchLabel}...",
    "Researching best practices...",
    "Identifying key considerations..."
  ],
  "deliverables": [
    {
      "title": "Short title (2-4 words)",
      "summary": "One sentence summary of this deliverable",
      "content": "Detailed content — 2-3 paragraphs with actionable insights, specific recommendations, or structured information. Use markdown formatting.",
      "type": "doc"
    }
  ]
}

Rules:
- thinkingSteps: exactly 3 short status messages (under 8 words each) showing your thought process
- deliverables: 2-3 concrete outputs. Each should be genuinely useful, specific to "${rootIdea}", not generic
- type is always "doc" for now
- content should be detailed (150-300 words) with specific, actionable information
- Make deliverables distinct — don't repeat the same information`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const data = JSON.parse(text);

    if (!data.thinkingSteps || !data.deliverables) {
      throw new Error('Invalid response structure');
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Agent think error:', error);

    // Fallback response
    return NextResponse.json({
      thinkingSteps: [
        `Analyzing ${req.body ? 'topic' : 'request'}...`,
        'Gathering insights...',
        'Preparing findings...',
      ],
      deliverables: [
        {
          title: 'Initial Analysis',
          summary: 'A preliminary overview of key considerations.',
          content: 'Analysis is being prepared. Please check back shortly.',
          type: 'doc',
        },
      ],
    });
  }
}
