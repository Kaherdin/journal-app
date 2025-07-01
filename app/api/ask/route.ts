import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/app/lib/supabase';
import { createEmbedding, generateCompletion } from '@/app/lib/openai';
import { AskQuestion, JournalEntry } from '@/app/types';

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
    
    // Étape 1: Détection d'année dans la question pour filtrage supplémentaire
    const yearMatch = question.match(/\b(20\d{2})\b/);
    const yearFilter = yearMatch ? yearMatch[1] : null;
    
    // Étape 2: Générer un embedding pour la question
    const embedding = await createEmbedding(question);
    
    // Étape 3: Recherche vectorielle pour trouver les entrées sémantiquement pertinentes
    const { data: vectorEntries, error: vectorError } = await supabase.rpc(
      'match_entries',
      {
        query_embedding: embedding,
        match_threshold: 0.3,
        match_count: 1000 // Augmenté pour avoir un échantillon complet de la base
      }
    );
    
    if (vectorError) {
      console.error('Erreur lors de la recherche vectorielle:', vectorError);
      
      // Fallback: récupérer les entrées en fonction du filtre d'année si présent
      let query = supabase
        .from('journal_entries')
        .select('*');
      
      // Appliquer le filtre d'année si présent
      if (yearFilter) {
        query = query
          .gte('date', `${yearFilter}-01-01`)
          .lte('date', `${yearFilter}-12-31`);
      }
      
      const { data: fallbackEntries, error: fallbackError } = await query
        .order('date', { ascending: false })
        .limit(500); // Augmenté à 500 pour avoir un échantillon bien plus large
      
      if (fallbackError) {
        return NextResponse.json({ 
          error: 'Erreur lors de la récupération des entrées', 
          details: fallbackError 
        }, { status: 500 });
      }
      
      console.log(`Utilisation du fallback: ${fallbackEntries?.length || 0} entrées récupérées${yearFilter ? ` pour ${yearFilter}` : ''}`);
      
      // Continuer avec ces entrées
      return await processEntriesAndGenerateResponse(question, fallbackEntries || [], yearFilter);
    }
    
    console.log(`Recherche vectorielle réussie: ${vectorEntries?.length || 0} entrées trouvées`);
    
    // Filtrer par année si mentionnée dans la question
    let relevantEntries = vectorEntries || [];
    if (yearFilter && relevantEntries.length > 0) {
      const yearStart = new Date(`${yearFilter}-01-01`).toISOString().split('T')[0];
      const yearEnd = new Date(`${yearFilter}-12-31`).toISOString().split('T')[0];
      relevantEntries = relevantEntries.filter(entry => 
        entry.date >= yearStart && entry.date <= yearEnd
      );
      console.log(`Après filtrage par année ${yearFilter}: ${relevantEntries.length} entrées`);
    }
    
    // Si aucune entrée pertinente n'est trouvée, récupérer toutes les entrées
    if (relevantEntries.length === 0) {
      let query = supabase
        .from('journal_entries')
        .select('*');
      
      // Appliquer le filtre d'année si présent
      if (yearFilter) {
        query = query
          .gte('date', `${yearFilter}-01-01`)
          .lte('date', `${yearFilter}-12-31`);
      }
      
      const { data: allEntries, error: allError } = await query
        .order('date', { ascending: false })
        .limit(100);
      
      if (allError) {
        return NextResponse.json({ 
          error: 'Erreur lors de la récupération des entrées', 
          details: allError 
        }, { status: 500 });
      }
      
      console.log(`Aucune entrée vectorielle pertinente, utilisation de ${allEntries?.length || 0} entrées générales${yearFilter ? ` pour ${yearFilter}` : ''}`);
      
      // Continuer avec toutes les entrées
      return await processEntriesAndGenerateResponse(question, allEntries || [], yearFilter);
    }
    
    // Continuer avec les entrées trouvées par la recherche vectorielle
    return await processEntriesAndGenerateResponse(question, relevantEntries, yearFilter);
    
  } catch (error) {
    console.error('Erreur:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue lors du traitement de votre question', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Fonction utilitaire pour traiter les entrées et générer une réponse
async function processEntriesAndGenerateResponse(question: string, entries: JournalEntry[], yearFilter: string | null) {
  try {
    // Compter les entrées par année pour le contexte
    const entriesByYear: Record<string, number> = {};
    entries.forEach(entry => {
      const year = new Date(entry.date).getFullYear().toString();
      entriesByYear[year] = (entriesByYear[year] || 0) + 1;
    });
    
    const yearStats = Object.entries(entriesByYear)
      .map(([year, count]) => `${year}: ${count} entrées`)
      .join(', ');
    
    // Limiter intelligemment le nombre d'entrées en fonction de leur taille
    // On estime approximativement qu'une entrée moyenne = ~500 tokens
    const MAX_TOKENS = 100000; // Légèrement en dessous de la limite de 128k pour garder une marge
    const ESTIMATED_TOKENS_PER_ENTRY = 500;
    const MAX_ENTRIES = Math.floor(MAX_TOKENS / ESTIMATED_TOKENS_PER_ENTRY);
    
    let entriesToUse = entries;
    
    // Si nous avons trop d'entrées, nous devons échantillonner
    if (entries.length > MAX_ENTRIES) {
      console.log(`Trop d'entrées (${entries.length}) pour le contexte, échantillonnage à ${MAX_ENTRIES}`);
      
      // Stratégie d'échantillonnage:
      // 1. Garder les entrées les plus pertinentes (avec la plus grande similitude si disponible)
      // 2. Assurer une bonne distribution sur les différentes périodes
      
      if (entries[0].similarity !== undefined) {
        // Si nous avons des scores de similarité, prioriser les entrées les plus pertinentes
        entriesToUse = [...entries].sort((a, b) => (b.similarity || 0) - (a.similarity || 0)).slice(0, MAX_ENTRIES);
      } else {
        // Sinon, échantillonner de manière uniforme
        const step = Math.ceil(entries.length / MAX_ENTRIES);
        entriesToUse = [];
        for (let i = 0; i < entries.length; i += step) {
          entriesToUse.push(entries[i]);
        }
        // Garantir que nous ne dépassons pas MAX_ENTRIES
        entriesToUse = entriesToUse.slice(0, MAX_ENTRIES);
      }
      
      console.log(`Échantillonnage terminé : ${entriesToUse.length} entrées sélectionnées`);
    }
    
    // Préparer le contexte pour OpenAI avec le sous-ensemble limité
    const contextEntries = entriesToUse.map((entry: JournalEntry) => {
      const formattedDate = new Date(entry.date).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Tronquer le contenu si nécessaire pour les entrées très longues
      const maxContentLength = 1000; // Environ 250 tokens
      let content = entry.content || '';
      if (content.length > maxContentLength) {
        content = content.substring(0, maxContentLength) + '... [contenu tronqué]';
      }
      
      // Traiter le champ gratitude qui peut désormais être en format jsonb
      let gratitudeText = '';
      if (entry.gratitude) {
        try {
          // Gérer les différents formats possibles de gratitude
          if (Array.isArray(entry.gratitude)) {
            // Format ancien (tableau de chaînes)
            gratitudeText = `Choses pour lesquelles je suis reconnaissant: ${entry.gratitude.join(', ')}`;
          } else if (typeof entry.gratitude === 'object') {
            // Format nouveau (jsonb)
            const gratitudeEntries = Object.entries(entry.gratitude);
            if (gratitudeEntries.length > 0) {
              gratitudeText = 'Choses pour lesquelles je suis reconnaissant: ';
              gratitudeText += gratitudeEntries
                .map(([key, value]) => {
                  // Si la clé est un nombre, c'est probablement un tableau JSON
                  if (!isNaN(Number(key))) {
                    return value;
                  } else {
                    return `${key}: ${value}`;
                  }
                })
                .join(', ');
            }
          } else if (typeof entry.gratitude === 'string') {
            // Cas où c'est une chaîne simple
            gratitudeText = `Choses pour lesquelles je suis reconnaissant: ${entry.gratitude}`;
          }
        } catch (e) {
          console.warn(`Erreur lors du traitement de gratitude pour l'entrée du ${entry.date}:`, e);
        }
      }
      
      let notesText = '';
      if (entry.notes) {
        try {
          const notesObj = typeof entry.notes === 'string' ? JSON.parse(entry.notes) : entry.notes;
          notesText = Object.entries(notesObj)
            .map(([key, value]) => `${key}: ${value}/10`)
            .join(', ');
        } catch (e) {
          console.warn(`Erreur lors du parsing des notes pour l'entrée du ${entry.date}:`, e);
        }
      }
      
      return `
DATE: ${formattedDate}
TÂCHE PRINCIPALE: ${entry.mit || 'Non spécifiée'}
CONTENU: ${content}
${gratitudeText ? `GRATITUDE: ${gratitudeText}` : ''}
${notesText ? `NOTES: ${notesText}` : ''}
${entry.similarity ? `PERTINENCE: ${(entry.similarity * 100).toFixed(2)}%` : ''}
---
      `.trim();
    }).join('\n\n');
    
    // Déterminer si nous avons une question spécifique à une année
    const yearContext = yearFilter 
      ? `Tu remarqueras que la question concerne spécifiquement l'année ${yearFilter}.` 
      : '';
    
    // Construire le prompt pour OpenAI
    const prompt = `
Tu es un assistant d'analyse de journal personnel. Tu analyses mes entrées de journal pour répondre à mes questions de manière précise.

Question: ${question}

Informations sur mon journal:
- Total des entrées dans ma base: ${entries.length}
- Entrées analysées pour cette question: ${entriesToUse.length}${entriesToUse.length < entries.length ? ` (échantillon des plus pertinentes)` : ''}
- Répartition par année: ${yearStats}
${yearContext}

Voici mes entrées de journal les plus pertinentes par rapport à ma question:

${contextEntries}

Instructions pour ta réponse:
1. Réponds uniquement en te basant sur les informations présentes dans ces entrées de journal.
2. Si les entrées ne contiennent pas suffisamment d'informations pour répondre à ma question, dis-le clairement.
3. Présente les informations de manière organisée et claire, avec des exemples spécifiques tirés des entrées.
4. Si ma question porte sur des statistiques ou tendances (comme "quel mois j'ai été le plus productif"), calcule et présente ces statistiques.
5. Cite les dates spécifiques des entrées pour appuyer tes observations.
    `.trim();
    
    // Générer la réponse avec OpenAI
    const response = await generateCompletion(prompt);
    
    // Retourner la réponse et les entrées utilisées
    return NextResponse.json({
      answer: response,
      entriesCount: entries.length,
      entriesAnalyzed: entriesToUse.length,
      yearStats: entriesByYear,
      entries: entriesToUse.slice(0, 10).map(entry => ({
        id: entry.id,
        date: entry.date,
        mit: entry.mit,
        similarity: entry.similarity || null
      }))
    });
  } catch (error) {
    console.error('Erreur lors du traitement des entrées:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de la génération de la réponse', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
