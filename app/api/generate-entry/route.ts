import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { JournalEntry } from '@/app/types';
import supabase from '@/app/lib/supabase';

// Initialiser OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Récupérer le prompt vocal transcrit
    const { prompt } = await request.json();
    
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Un prompt est requis' },
        { status: 400 }
      );
    }

    // Récupérer les 3 à 5 dernières entrées pour fournir du contexte
    const { data: recentEntries } = await supabase
      .from('journal_entries')
      .select('date, mit')
      .order('date', { ascending: false })
      .limit(5);

    let historySummary = '';
    if (recentEntries && recentEntries.length > 0) {
      historySummary = recentEntries
        .map((e) => `${e.date}: ${e.mit}`)
        .join('\n');
    }
    
    // Construire le prompt système avec l'historique récent s'il existe
    let systemPrompt = `Tu es un assistant qui aide à structurer des entrées de journal.
          L'utilisateur te donne un prompt vocal décrivant sa journée, ses pensées, ou répondant à certaines questions.
          Ta tâche est de générer une entrée de journal structurée avec les champs suivants:
          1. MIT (Most Important Task): la tâche la plus importante du jour, en une phrase concise
          2. Content: le contenu principal de l'entrée, développé sur plusieurs phrases
          3. Gratitude: liste de 1 à 3 éléments dont l'utilisateur semble reconnaissant
          4. Notes: évaluation de 1 à 10 pour: productivite, sport, energie, proprete, art

          IMPORTANT: Pour les notes, essaie d'inférer des valeurs pertinentes basées sur le prompt.
          Si une valeur n'est pas mentionnée, utilise 5 comme valeur par défaut.

          RÉPONDS UNIQUEMENT AU FORMAT JSON suivant:
          {
            "mit": "string",
            "content": "string",
            "gratitude": ["string", "string", "string"],
            "notes": {
              "productivite": number,
              "sport": number,
              "energie": number,
              "proprete": number,
              "art": number
            }
          }`;

    if (historySummary) {
      systemPrompt += `\n\nHistorique récent:\n${historySummary}`;
    }

    // Générer l'entrée structurée avec GPT-4
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });
    
    // Récupérer et parser la réponse
    const responseContent = completion.choices[0].message.content;
    
    if (!responseContent) {
      throw new Error('Réponse vide de GPT');
    }
    
    const parsedResponse = JSON.parse(responseContent);
    
    // Ajouter la date du jour
    const today = new Date().toISOString().split('T')[0];
    
    // Construire l'entrée de journal
    const journalEntry: JournalEntry = {
      date: today,
      mit: parsedResponse.mit,
      content: parsedResponse.content,
      prompt: prompt,
      gratitude: parsedResponse.gratitude,
      notes: parsedResponse.notes
    };
    
    return NextResponse.json(journalEntry, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la génération de l\'entrée:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de la génération de l\'entrée', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
