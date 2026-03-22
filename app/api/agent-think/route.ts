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
      "content": "Detailed content — 2-3 paragraphs with actionable insights. Use **bold** for emphasis and newlines between paragraphs.",
      "type": "doc"
    },
    {
      "title": "Short title (2-4 words)",
      "summary": "One sentence summary of what this mini-site shows",
      "html": "<!DOCTYPE html><html>...</html>",
      "type": "mockup"
    }
  ]
}

Rules:
- thinkingSteps: exactly 3 short status messages (under 8 words each) showing your thought process
- deliverables: exactly 2 outputs — first a "doc", then a "mockup"
- doc: content should be 150-250 words with specific, actionable information about "${branchLabel}" for "${rootIdea}"
- mockup: a complete, self-contained HTML page. Rules for the HTML:
  * Must be valid, complete HTML (<!DOCTYPE html> through </html>)
  * All CSS must be inline in a <style> tag — no external stylesheets or CDNs
  * No external images or fonts — use system fonts and CSS shapes/gradients only
  * Can use vanilla JS for interactivity (charts, toggles, counters, etc.)
  * Should look polished and modern — clean typography, good use of color
  * Content must be specific to "${branchLabel}" within the context of "${rootIdea}"
  * Use a color palette that feels appropriate for the topic
  * Keep it under 3000 characters of HTML
  * Good examples: a checklist tracker, a data visualization, a timeline, a comparison table, a mini dashboard`;

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
