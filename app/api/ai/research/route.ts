import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { topic, count = 3, focus } = await req.json();

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Creating research task:', topic, '| Count:', count);

    // Create task in Supabase (Fetch.ai agent will pick it up)
    const { data: task, error } = await supabase
      .table('tasks')
      .insert({
        type: 'research',
        input: { topic, count, focus }
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to create task:', error);
      return NextResponse.json(
        { error: 'Failed to create research task', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Task created:', task.id);

    // Return task ID so frontend can track it
    return NextResponse.json({ taskId: task.id });

  } catch (error: any) {
    console.error('Research error:', error);
    return NextResponse.json(
      { error: 'Failed to research', details: error.message },
      { status: 500 }
    );
  }
}
