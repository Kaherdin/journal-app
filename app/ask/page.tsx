'use client';

import { useState } from 'react';
import { Navigation } from '@/components/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

export default function Ask() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim()) {
      setError('Veuillez saisir une question');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    setAnswer('');

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Une erreur est survenue');
      }

      setAnswer(data.answer);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="max-w-4xl w-full">
        <h1 className="text-4xl font-bold mb-8 text-center">Interroger mon journal</h1>
        
        <Navigation />
        
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Posez une question à votre journal</CardTitle>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="question" className="text-sm font-medium">
                    Votre question
                  </label>
                  <Textarea
                    id="question"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Par exemple : Quelles ont été mes périodes les plus productives cette année ?"
                    rows={3}
                    className="resize-none"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="w-full"
                >
                  {isSubmitting ? 'Analyse en cours...' : 'Obtenir une réponse'}
                </Button>
              </form>
            </CardContent>
          </Card>
          
          {answer && (
            <Card>
              <CardHeader>
                <CardTitle>Réponse basée sur votre journal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-line text-gray-800">
                  {answer}
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="text-sm text-gray-500 text-center">
            <p>Cette fonctionnalité utilise la recherche vectorielle pour trouver les entrées pertinentes et GPT pour les analyser</p>
          </div>
        </div>
      </div>
    </main>
  );
}
