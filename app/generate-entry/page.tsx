'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { JournalEntry } from '@/app/types';
import { TextWithAudio } from '@/components/TextWithAudio';

export default function GenerateEntry() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [generatedEntry, setGeneratedEntry] = useState<JournalEntry | null>(null);
  const [editedEntry, setEditedEntry] = useState<JournalEntry | null>(null);
  
  // Fonction pour générer l'entrée de journal
  const generateEntry = async (promptText: string) => {
    try {
      setIsGenerating(true);
      setError('');
      
      const response = await fetch('/api/generate-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: promptText }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la génération de l\'entrée');
      }
      
      setGeneratedEntry(data);
      setEditedEntry(data);
    } catch (err) {
      console.error('Erreur lors de la génération:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Gérer les modifications des champs
  const handleFieldChange = (field: string, value: any) => {
    if (!editedEntry) return;
    
    setEditedEntry((prev: JournalEntry | null) => {
      if (!prev) return prev;
      
      if (field === 'mit' || field === 'content' || field === 'date') {
        return { ...prev, [field]: value } as JournalEntry;
      } else if (field.startsWith('notes.')) {
        const noteField = field.split('.')[1];
        return {
          ...prev,
          notes: {
            ...(prev.notes || {}),
            [noteField]: parseInt(value)
          }
        } as JournalEntry;
      } else if (field.startsWith('gratitude.')) {
        const index = parseInt(field.split('.')[1]);
        const newGratitude = [...prev.gratitude];
        newGratitude[index] = value;
        return { ...prev, gratitude: newGratitude };
      }
      
      return prev;
    });
  };
  
  // Soumettre l'entrée finale
  const submitEntry = async () => {
    if (!editedEntry) return;
    
    try {
      setIsSubmitting(true);
      setError('');
      
      const response = await fetch('/api/add-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedEntry),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'enregistrement de l\'entrée');
      }
      
      // Afficher un message de succès mais ne pas rediriger automatiquement
      setError('');
      alert('Entrée sauvegardée avec succès!');
      
      // Réinitialiser le formulaire
      setPrompt('');
      setGeneratedEntry(null);
      setEditedEntry(null);
    } catch (err) {
      console.error('Erreur lors de l\'enregistrement:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="max-w-4xl w-full">
        <h1 className="text-4xl font-bold mb-8 text-center">Générer une entrée</h1>
        
        <Navigation />
        
        {!generatedEntry ? (
          <Card>
            <CardHeader>
              <CardTitle>Racontez votre journée</CardTitle>
              <CardDescription>
                Parlez de votre journée et nous générerons une entrée de journal structurée
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
                  {error}
                </div>
              )}
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="prompt" className="text-sm font-medium">
                    Décrivez votre journée ou répondez à ces questions:
                  </label>
                  <div className="text-sm text-gray-500 mb-2">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Qu'avez-vous accompli aujourd'hui?</li>
                      <li>Pour quoi êtes-vous reconnaissant(e)?</li>
                      <li>Comment évalueriez-vous votre énergie et productivité?</li>
                      <li>Avez-vous fait du sport ou pratiqué un art?</li>
                    </ul>
                  </div>
                  <TextWithAudio
                    id="prompt"
                    value={prompt}
                    onChange={setPrompt}
                    placeholder="Aujourd'hui j'ai..."
                    rows={8}
                    isTextarea={true}
                  />
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    type="button" 
                    className="w-full md:w-auto"
                    disabled={!prompt || isGenerating}
                    onClick={() => generateEntry(prompt)}
                  >
                    {isGenerating ? 'Génération en cours...' : 'Générer l\'entrée'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Entrée générée</CardTitle>
              <CardDescription>
                Vérifiez et modifiez l'entrée avant de la sauvegarder
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
                  {error}
                </div>
              )}
              
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="date" className="text-sm font-medium">
                      Date
                    </label>
                    <Input
                      id="date"
                      type="date"
                      value={editedEntry?.date || ''}
                      onChange={(e) => handleFieldChange('date', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="mit" className="text-sm font-medium">
                      Tâche la plus importante (MIT)
                    </label>
                    <TextWithAudio
                      id="mit"
                      value={editedEntry?.mit || ''}
                      onChange={(value) => handleFieldChange('mit', value)}
                      placeholder="Tâche la plus importante"
                      isTextarea={false}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="content" className="text-sm font-medium">
                    Contenu
                  </label>
                  <TextWithAudio
                    id="content"
                    value={editedEntry?.content || ''}
                    onChange={(value) => handleFieldChange('content', value)}
                    rows={6}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Gratitude
                  </label>
                  <div className="space-y-2">
                    {editedEntry?.gratitude?.map((item, index) => (
                      <TextWithAudio
                        key={index}
                        value={item}
                        onChange={(value) => handleFieldChange(`gratitude.${index}`, value)}
                        placeholder={`Gratitude ${index + 1}`}
                        isTextarea={false}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Notes (1-10)</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {editedEntry?.notes && Object.entries(editedEntry.notes).map(([key, value]) => (
                      <div className="space-y-2" key={key}>
                        <div className="flex justify-between">
                          <label htmlFor={key} className="text-sm capitalize">
                            {key}
                          </label>
                          <span>{value}/10</span>
                        </div>
                        <Input
                          id={key}
                          type="range"
                          min="1"
                          max="10"
                          value={value}
                          onChange={(e) => handleFieldChange(`notes.${key}`, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      setGeneratedEntry(null);
                      setEditedEntry(null);
                    }}
                  >
                    Annuler
                  </Button>
                  
                  <Button 
                    type="button" 
                    className="flex-1"
                    disabled={isSubmitting}
                    onClick={submitEntry}
                  >
                    {isSubmitting ? 'Enregistrement...' : 'Sauvegarder l\'entrée'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
