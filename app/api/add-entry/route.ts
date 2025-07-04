import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/app/lib/supabase';
import { createEmbedding } from '@/app/lib/openai';
import { JournalEntry } from '@/app/types';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const entry: JournalEntry = await request.json();
    
    // Validate required fields
    if (!entry.date || !entry.mit || !entry.content) {
      return NextResponse.json(
        { error: 'Missing required fields: date, mit, or content' },
        { status: 400 }
      );
    }
    
    // Create embedding from the combined text
    let textToEmbed = `${entry.mit} ${entry.content} ${entry.prompt || ''}`;
    
    // Traiter le champ gratitude selon son format
    if (entry.gratitude) {
      if (Array.isArray(entry.gratitude)) {
        textToEmbed += ' ' + entry.gratitude.join(' ');
      } else if (typeof entry.gratitude === 'object') {
        try {
          const gratitudeValues = Object.values(entry.gratitude);
          textToEmbed += ' ' + gratitudeValues.join(' ');
        } catch (e) {
          console.warn(`Erreur lors du traitement de gratitude:`, e);
        }
      } else if (typeof entry.gratitude === 'string') {
        textToEmbed += ' ' + entry.gratitude;
      }
    }
    
    const embedding = await createEmbedding(textToEmbed);
    
    // Insert into Supabase
    const { data, error } = await supabase
      .from('journal_entries')
      .insert({
        date: entry.date,
        mit: entry.mit,
        content: entry.content,
        prompt: entry.prompt,
        gratitude: entry.gratitude,
        notes: entry.notes,
        embedding,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error inserting entry:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('Error adding journal entry:', error);
    return NextResponse.json(
      { error: 'Failed to add journal entry' },
      { status: 500 }
    );
  }
}
