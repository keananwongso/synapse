import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { messages, agentPersonality, nodeLabel, rootIdea } = await req.json();

    const systemPrompt = `${agentPersonality}

The user is brainstorming: "${rootIdea}". You are the "${nodeLabel}" expert. Help them explore this specific aspect. Be concise (2-3 sentences max), practical, and creative. Ask follow-up questions to deepen the conversation.`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
      },
    });

    // Build chat history for Gemini
    const history = messages.map((m: any) => ({
      role: m.role === 'ai' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));

    // Last message is the user's new message
    const lastMessage = history.pop();

    const chat = model.startChat({
      history,
      systemInstruction: systemPrompt,
    });

    const result = await chat.sendMessage(lastMessage.parts[0].text);
    const reply = result.response.text();

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate reply' },
      { status: 500 }
    );
  }
}
