import { NextResponse } from 'next/server';
import supabase from '@/app/lib/supabase';
import { createEmbedding } from '@/app/lib/openai';
import { JournalEntry } from '@/app/types';

export async function GET() {
  try {
    // Fetch all entries without embeddings
    const { data: entries, error: fetchError } = await supabase
      .from('journal_entries')
      .select('*');
    
    if (fetchError) {
      console.error('Error fetching entries:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    
    if (!entries || entries.length === 0) {
      return NextResponse.json({ message: 'No entries found to process' }, { status: 200 });
    }
    
    console.log(`Found ${entries.length} entries to process`);
    
    // Process entries in batches to avoid rate limiting
    const batchSize = 5;
    const results = [];
    
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(async (entry: JournalEntry) => {
        try {
          // Create text to embed
          const textToEmbed = `${entry.mit} ${entry.content} ${entry.prompt || ''} ${entry.gratitude ? entry.gratitude.join(' ') : ''}`;
          
          // Generate embedding
          const embedding = await createEmbedding(textToEmbed);
          
          // Update entry with embedding
          const { data, error } = await supabase
            .from('journal_entries')
            .update({ embedding })
            .eq('id', entry.id)
            .select('id, date, mit');
          
          if (error) {
            console.error(`Error updating entry ${entry.id}:`, error);
            return { id: entry.id, success: false, error: error.message };
          }
          
          return { id: entry.id, success: true, date: entry.date, mit: entry.mit };
        } catch (err) {
          console.error(`Error processing entry ${entry.id}:`, err);
          return { id: entry.id, success: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
      }));
      
      results.push(...batchResults);
      
      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < entries.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    const successful = results.filter(r => r.success).length;
    
    return NextResponse.json({
      message: `Processed ${entries.length} entries. Successfully updated ${successful} embeddings.`,
      results
    }, { status: 200 });
  } catch (error) {
    console.error('Error regenerating embeddings:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate embeddings', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
