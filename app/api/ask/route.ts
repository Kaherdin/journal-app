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
      return `
Date: ${entry.date}
MIT: ${entry.mit}
Content: ${entry.content}
Gratitude: ${entry.gratitude.join(', ')}
Notes: Productivité: ${entry.notes.productivite}, Sport: ${entry.notes.sport}, Énergie: ${entry.notes.energie}, Propreté: ${entry.notes.proprete}, Art: ${entry.notes.art}
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
