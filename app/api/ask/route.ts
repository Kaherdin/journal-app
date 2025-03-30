import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/app/lib/supabase';
import { createEmbedding, generateCompletion } from '@/app/lib/openai';
import { AskQuestion } from '@/app/types';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const { question }: AskQuestion = await request.json();
    
    if (!question) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }
    
    // Generate embedding for the question
    const questionEmbedding = await createEmbedding(question);
    
    // Perform vector search in Supabase
    const { data: entries, error } = await supabase.rpc('match_journal_entries', {
      query_embedding: questionEmbedding,
      match_threshold: 0.5,
      match_count: 5
    });
    
    if (error) {
      console.error('Error performing vector search:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Format the entries for the prompt
    const entriesSummary = entries.map((entry: any) => {
      // Format gratitude with null/undefined check
      const gratitudeText = entry.gratitude && entry.gratitude.length > 0 
        ? `Gratitude: ${entry.gratitude.join(', ')}` 
        : 'Gratitude: aucune';
      
      // Format notes with null/undefined check
      let notesText = 'Notes: aucune';
      if (entry.notes) {
        const noteItems = [];
        if ('productivite' in entry.notes) noteItems.push(`Productivité: ${entry.notes.productivite}`);
        if ('sport' in entry.notes) noteItems.push(`Sport: ${entry.notes.sport}`);
        if ('energie' in entry.notes) noteItems.push(`Énergie: ${entry.notes.energie}`);
        if ('proprete' in entry.notes) noteItems.push(`Propreté: ${entry.notes.proprete}`);
        if ('art' in entry.notes) noteItems.push(`Art: ${entry.notes.art}`);
        
        if (noteItems.length > 0) {
          notesText = `Notes: ${noteItems.join(', ')}`;
        }
      }
      
      return `
Date: ${entry.date}
MIT: ${entry.mit}
Content: ${entry.content}
${entry.prompt ? `Prompt: ${entry.prompt}` : ''}
${gratitudeText}
${notesText}
---
`;
    }).join('\n');
    
    // Construct the prompt for GPT
    const prompt = `
En t'appuyant sur les entrées de mon journal, réponds à la question :

${entriesSummary}

Question : ${question}
`;
    
    // Generate the response using GPT
    const gptResponse = await generateCompletion(prompt);
    
    return NextResponse.json({ answer: gptResponse }, { status: 200 });
  } catch (error) {
    console.error('Error processing question:', error);
    return NextResponse.json(
      { error: 'Failed to process your question' },
      { status: 500 }
    );
  }
}
