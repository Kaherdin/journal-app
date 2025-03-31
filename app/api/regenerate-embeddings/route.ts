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
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(entries.length/batchSize)}, entries ${i+1}-${Math.min(i+batchSize, entries.length)}`);
      
      const batchResults = await Promise.all(batch.map(async (entry: JournalEntry) => {
        try {
          // Create text to embed
          const textToEmbed = `${entry.mit || ''} ${entry.content || ''} ${entry.prompt || ''} ${entry.gratitude ? entry.gratitude.join(' ') : ''}`;
          
          if (!textToEmbed.trim()) {
            console.warn(`Entry ${entry.id} (${entry.date}) has no content to embed`);
            return { id: entry.id, success: false, error: 'No content to embed', date: entry.date };
          }
          
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
            errorCount++;
            return { id: entry.id, success: false, error: error.message, date: entry.date };
          }
          
          successCount++;
          return { id: entry.id, success: true, date: entry.date, mit: entry.mit };
        } catch (err) {
          console.error(`Error processing entry ${entry.id}:`, err);
          errorCount++;
          return { id: entry.id, success: false, error: err instanceof Error ? err.message : 'Unknown error', date: entry.date };
        }
      }));
      
      results.push(...batchResults);
      
      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < entries.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return NextResponse.json({
      message: `Processed ${entries.length} entries. Successfully updated ${successCount} embeddings. ${errorCount} errors.`,
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
