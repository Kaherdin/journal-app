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
    
    console.log('Question reçue:', question);
    
    // Récupérer toutes les entrées (alternative à la recherche vectorielle)
    const { data: entries, error } = await supabase
      .from('journal_entries')
      .select('*')
      .order('date', { ascending: false })
      .limit(5);
    
    console.log('Entrées récupérées:', entries?.length);
    console.log('Erreur éventuelle:', error);
    
    if (error) {
      console.error('Erreur lors de la récupération des entrées:', error);
      return NextResponse.json({ 
        error: 'Erreur lors de la récupération des entrées: ' + error.message,
        details: error
      }, { status: 500 });
    }
    
    // Si aucune entrée n'est trouvée
    if (!entries || entries.length === 0) {
      return NextResponse.json({ 
        answer: "Je ne trouve aucune entrée dans votre journal. Veuillez ajouter quelques entrées avant de poser des questions." 
      }, { status: 200 });
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
En t'appuyant sur les entrées de mon journal, réponds à la question de manière précise et informative. 
Voici mes dernières entrées de journal pour référence:

${entriesSummary}

Question : ${question}
`;
    
    console.log('Envoi du prompt à GPT');
    
    // Generate the response using GPT
    const gptResponse = await generateCompletion(prompt);
    
    return NextResponse.json({ answer: gptResponse }, { status: 200 });
  } catch (error) {
    console.error('Error processing question:', error);
    return NextResponse.json(
      { error: 'Failed to process your question', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
