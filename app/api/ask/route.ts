import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/app/lib/supabase';
import { generateCompletion } from '@/app/lib/openai';
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
    
    // Détecter s'il y a une année spécifique dans la question
    const yearMatch = question.match(/\b(20\d{2})\b/);
    let journalEntries;
    
    // Si une année spécifique est mentionnée, filtrer par cette année
    if (yearMatch) {
      const year = yearMatch[1];
      console.log(`Filtrage par année: ${year}`);
      
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .gte('date', `${year}-01-01`)
        .lte('date', `${year}-12-31`)
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Erreur lors de la récupération des entrées:', error);
        return NextResponse.json({ 
          error: 'Erreur lors de la récupération des entrées', 
          details: error 
        }, { status: 500 });
      }
      
      journalEntries = data || [];
      console.log(`Récupéré ${journalEntries.length} entrées pour l'année ${year}`);
    } 
    // Sinon, récupérer toutes les entrées
    else {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Erreur lors de la récupération des entrées:', error);
        return NextResponse.json({ 
          error: 'Erreur lors de la récupération des entrées', 
          details: error 
        }, { status: 500 });
      }
      
      journalEntries = data || [];
      console.log(`Récupéré ${journalEntries.length} entrées au total`);
    }
    
    // Si aucune entrée n'est trouvée
    if (!journalEntries || journalEntries.length === 0) {
      console.log('Aucune entrée trouvée');
      return NextResponse.json({ 
        answer: "Je ne trouve aucune entrée dans votre journal" + (yearMatch ? ` pour l'année ${yearMatch[1]}` : "") + ". Veuillez ajouter des entrées avant de poser des questions."
      }, { status: 200 });
    }
    
    // Préparer les entrées pour le modèle GPT
    // Nous devons limiter la taille du prompt, donc si trop d'entrées, 
    // prenons un échantillon représentatif
    const MAX_ENTRIES = 100; // Nombre maximum d'entrées à inclure
    const totalEntries = journalEntries.length;
    
    let entriesToInclude;
    let entrySummary;
    
    if (totalEntries <= MAX_ENTRIES) {
      // Si on a moins d'entrées que la limite, les inclure toutes
      entriesToInclude = journalEntries;
      entrySummary = `Toutes les ${totalEntries} entrées sont incluses ci-dessous.`;
    } else {
      // Stratégie d'échantillonnage: prendre des entrées réparties sur toute la période
      const samplingStep = Math.ceil(totalEntries / MAX_ENTRIES);
      entriesToInclude = [];
      
      for (let i = 0; i < totalEntries; i += samplingStep) {
        entriesToInclude.push(journalEntries[i]);
      }
      
      entrySummary = `${entriesToInclude.length} entrées sur un total de ${totalEntries} sont incluses ci-dessous (échantillon représentatif).`;
    }
    
    console.log(`Envoi de ${entriesToInclude.length} entrées à GPT`);
    
    // Formater les entrées pour le prompt
    const entriesText = entriesToInclude.map((entry: any) => {
      // Format gratitude with null/undefined check
      const gratitudeText = entry.gratitude && entry.gratitude.length > 0 
        ? `Gratitude: ${entry.gratitude.join(', ')}` 
        : 'Gratitude: Non spécifiée';
      
      // Format notes with null/undefined check
      let notesText = '';
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
MIT: ${entry.mit || 'Non spécifié'}
Content: ${entry.content || 'Non spécifié'}
${entry.prompt ? `Prompt: ${entry.prompt}` : ''}
${gratitudeText}
${notesText}
---
`;
    }).join('\n');
    
    // Construire le prompt pour GPT
    const prompt = `
Tu es un assistant d'analyse de journal personnel. Tu as accès aux entrées du journal personnel de l'utilisateur. Utilise ces entrées pour répondre à la question posée.

Contexte: L'utilisateur tient un journal personnel avec:
- Date: La date de l'entrée
- MIT: La tâche la plus importante de la journée (Most Important Task)
- Content: Le contenu principal de l'entrée
- Gratitude: Les choses dont il/elle est reconnaissant(e)
- Notes: Des évaluations numériques sur différents aspects (productivité, sport, énergie, etc.)

Base de données: ${totalEntries} entrées au total. ${entrySummary}

Entrées du journal:
${entriesText}

Question: ${question}

Instructions:
1. Analyse attentivement toutes les entrées fournies
2. Réponds à la question de manière précise et basée uniquement sur les données des entrées
3. Si l'information n'est pas disponible dans les entrées, dis-le clairement
4. Cite des entrées spécifiques si pertinent
5. Réponds en français et de manière claire

Ta réponse:
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
