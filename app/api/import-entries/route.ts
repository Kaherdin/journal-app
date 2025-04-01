import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createEmbedding } from '@/app/lib/openai';
import supabase from '@/app/lib/supabase';
import { JournalEntry } from '@/app/types';

// Fonction pour lire le contenu d'un fichier
function readFileContent(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

// Fonction pour extraire la date d'un nom de fichier
function extractDateFromFilename(filename: string): string | null {
  // Format attendu: entry_YYYY-MM-DD.md
  const match = filename.match(/entry_(\d{4}-\d{2}-\d{2})\.md/);
  return match ? match[1] : null;
}

// Fonction pour analyser le contenu et extraire les informations structurées
function parseEntry(content: string, date: string): JournalEntry {
  // Valeurs par défaut
  let mit = "Tâche non spécifiée";
  let gratitude: string[] = [];
  
  // Extraire MIT (première ligne non vide généralement)
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  if (lines.length > 0) {
    mit = lines[0];
  }
  
  // Rechercher des mentions de gratitude
  const gratitudeRegex = /reconnaissant|gratitude|merci|apprécier|heureux de|content de/i;
  const gratitudeLines = lines.filter(line => 
    gratitudeRegex.test(line) && 
    line.length < 100 && 
    !line.includes('MIT')
  );
  
  if (gratitudeLines.length > 0) {
    gratitude = gratitudeLines.map(line => line.replace(/^[^a-zA-Z0-9]+/, '').trim());
  }
  
  // Notes
  // Par défaut, on attribue des valeurs moyennes
  const notes = {
    productivite: 5,
    sport: 5,
    energie: 5,
    proprete: 5,
    art: 5
  };
  
  // Détection de mots-clés pour ajuster les notes
  if (content.match(/productif|efficace|accompli|réussi|avancé/i)) {
    notes.productivite = 8;
  }
  if (content.match(/fatigué|épuisé|sans énergie/i)) {
    notes.energie = 3;
  } else if (content.match(/énergique|dynamique|plein d'énergie/i)) {
    notes.energie = 8;
  }
  if (content.match(/sport|entraînement|exercice|courir|gym/i)) {
    notes.sport = 7;
  }
  if (content.match(/rangé|nettoyé|propre|organisé/i)) {
    notes.proprete = 8;
  }
  if (content.match(/art|créatif|dessin|musique|peint/i)) {
    notes.art = 7;
  }
  
  return {
    date,
    mit,
    content,
    gratitude,
    notes
  };
}

export async function POST() {
  try {
    // Chemin vers le dossier des entrées
    const entriesDir = path.join(process.cwd(), 'data_journal', 'entries');
    
    // Vérifier si le dossier existe
    if (!fs.existsSync(entriesDir)) {
      return NextResponse.json({ 
        error: `Le dossier ${entriesDir} n'existe pas` 
      }, { status: 404 });
    }
    
    // Lire tous les fichiers d'entrées
    const files = fs.readdirSync(entriesDir)
                    .filter(file => file.match(/^entry_.*\.md$/));
    
    const results: string[] = [];
    let processedCount = 0;
    
    for (const file of files) {
      try {
        const filePath = path.join(entriesDir, file);
        const content = readFileContent(filePath);
        
        // Extraire la date du nom de fichier
        const date = extractDateFromFilename(file);
        
        if (!date) {
          results.push(`Fichier ignoré (pas de date): ${file}`);
          continue;
        }
        
        // Analyser le contenu pour en extraire les informations structurées
        const journalEntry = parseEntry(content, date);
        
        // Vérifier si cette entrée existe déjà
        const { data: existingEntries, error: checkError } = await supabase
          .from('journal_entries')
          .select('id')
          .eq('date', date);
        
        if (checkError) {
          results.push(`Erreur lors de la vérification pour ${file}: ${checkError.message}`);
          continue;
        }
        
        // Si l'entrée existe déjà, la sauter
        if (existingEntries && existingEntries.length > 0) {
          results.push(`Entrée ignorée (déjà existante pour ${date}): ${file}`);
          continue;
        }
        
        // Créer l'embedding pour cette entrée
        const textToEmbed = `${journalEntry.mit} ${journalEntry.content} ${journalEntry.gratitude.join(' ')}`;
        const embedding = await createEmbedding(textToEmbed);
        
        // Insérer l'entrée dans Supabase
        const { error } = await supabase
          .from('journal_entries')
          .insert({
            ...journalEntry,
            embedding
          });
        
        if (error) {
          results.push(`Erreur lors de l'insertion pour ${file}: ${error.message}`);
        } else {
          results.push(`Entrée importée avec succès: ${file}`);
          processedCount++;
        }
      } catch (err) {
        results.push(`Erreur lors du traitement de ${file}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    
    return NextResponse.json({
      message: `Traitement terminé: ${processedCount} entrées importées sur ${files.length} fichiers traités`,
      processed: processedCount,
      total: files.length,
      results
    });
  } catch (error) {
    console.error('Erreur lors de l\'importation des entrées:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de l\'importation des entrées', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
