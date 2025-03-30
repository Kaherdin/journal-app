import { NextResponse } from 'next/server';
import supabase from '@/app/lib/supabase';

export async function GET() {
  try {
    // Query Supabase for the 10 most recent entries
    const { data, error } = await supabase
      .from('journal_entries')
      .select('date, mit, content, prompt, gratitude, notes')
      .order('date', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('Error fetching recent entries:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error fetching recent entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent journal entries' },
      { status: 500 }
    );
  }
}
