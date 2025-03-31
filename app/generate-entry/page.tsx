'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { JournalEntry } from '@/app/types';

export default function GenerateEntry() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [generatedEntry, setGeneratedEntry] = useState<JournalEntry | null>(null);
  const [editedEntry, setEditedEntry] = useState<JournalEntry | null>(null);
  
  // Référence pour le recorder
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  // État pour la prise en charge de l'enregistrement audio
  const [isAudioSupported, setIsAudioSupported] = useState(true);
  
  // Vérifier si l'enregistrement audio est supporté
  useEffect(() => {
    if (typeof navigator !== 'undefined' && !navigator.mediaDevices?.getUserMedia) {
      setIsAudioSupported(false);
    }
  }, []);
  
  // Fonction pour démarrer l'enregistrement
  const startRecording = async () => {
    try {
      chunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        processAudioToText(audioBlob);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Erreur lors du démarrage de l\'enregistrement:', err);
      setError('Impossible d\'accéder au microphone. Veuillez vérifier les permissions.');
      setIsAudioSupported(false);
    }
  };
  
  // Fonction pour arrêter l'enregistrement
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Arrêter tous les tracks pour libérer le microphone
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };
  
  // Fonction pour convertir l'audio en texte
  const processAudioToText = async (audioBlob: Blob) => {
    try {
      setIsTranscribing(true);
      setError('');
      
      // Créer un FormData avec le blob audio
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      // Envoyer à notre API de transcription
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Afficher le texte transcrit sans générer automatiquement
      setPrompt(data.text);
      setIsTranscribing(false);
    } catch (err) {
      console.error('Erreur lors de la transcription:', err);
      setError('Impossible de transcrire l\'audio. Veuillez saisir votre texte manuellement.');
      setIsTranscribing(false);
    }
  };
  
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
    
    setEditedEntry(prev => {
      if (!prev) return prev;
      
      if (field === 'mit' || field === 'content' || field === 'date') {
        return { ...prev, [field]: value };
      } else if (field.startsWith('notes.')) {
        const noteField = field.split('.')[1];
        return {
          ...prev,
          notes: {
            ...prev.notes,
            [noteField]: parseInt(value)
          }
        };
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
                  <Textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Aujourd'hui j'ai..."
                    rows={8}
                    className="resize-none"
                  />
                </div>
                
                <div className="flex flex-col md:flex-row gap-3">
                  {isAudioSupported && (
                    <Button
                      type="button"
                      variant={isRecording ? "destructive" : "secondary"}
                      className="flex-1"
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isTranscribing}
                    >
                      {isRecording ? 'Arrêter l\'enregistrement' : isTranscribing ? 'Transcription...' : 'Enregistrer votre voix'}
                    </Button>
                  )}
                  
                  <Button 
                    type="button" 
                    className="flex-1"
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
                    <Input
                      id="mit"
                      value={editedEntry?.mit || ''}
                      onChange={(e) => handleFieldChange('mit', e.target.value)}
                      placeholder="Tâche la plus importante"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="content" className="text-sm font-medium">
                    Contenu
                  </label>
                  <Textarea
                    id="content"
                    value={editedEntry?.content || ''}
                    onChange={(e) => handleFieldChange('content', e.target.value)}
                    rows={6}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Gratitude
                  </label>
                  <div className="space-y-2">
                    {editedEntry?.gratitude?.map((item, index) => (
                      <Input
                        key={index}
                        value={item}
                        onChange={(e) => handleFieldChange(`gratitude.${index}`, e.target.value)}
                        placeholder={`Gratitude ${index + 1}`}
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
