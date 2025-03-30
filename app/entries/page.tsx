'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { JournalEntry } from '@/app/types';

export default function Entries() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const response = await fetch('/api/get-last-entries');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erreur lors de la récupération des entrées');
        }

        setEntries(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, []);

  // Format a note to show as a progress bar with label
  const formatNote = (value: number, label: string) => (
    <div className="space-y-1" key={label}>
      <div className="flex items-center justify-between text-xs">
        <span>{label}</span>
        <span>{value}/10</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-500 rounded-full" 
          style={{ width: `${value * 10}%` }}
        ></div>
      </div>
    </div>
  );

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="max-w-4xl w-full">
        <h1 className="text-4xl font-bold mb-8 text-center">Dernières entrées</h1>
        
        <Navigation />
        
        {loading && (
          <div className="flex justify-center p-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          </div>
        )}
        
        {error && (
          <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-md">
            <p>{error}</p>
          </div>
        )}
        
        {!loading && !error && entries.length === 0 && (
          <div className="text-center p-12">
            <p className="text-lg text-gray-600">Aucune entrée trouvée. Commencez par ajouter votre première entrée.</p>
          </div>
        )}
        
        <div className="space-y-6">
          {entries.map((entry, index) => (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="bg-gray-50">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{new Date(entry.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</CardTitle>
                  <span className="text-sm text-gray-500">{entry.date}</span>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-2">Most Important Task</h3>
                    <p className="text-gray-800">{entry.mit}</p>
                  </div>
                  
                  {entry.prompt && (
                    <div>
                      <h3 className="font-medium mb-2">Prompt</h3>
                      <p className="text-gray-600 italic">{entry.prompt}</p>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="font-medium mb-2">Contenu</h3>
                    <p className="text-gray-800 whitespace-pre-line">{entry.content}</p>
                  </div>
                  
                  {entry.gratitude && entry.gratitude.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-2">Gratitude</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {entry.gratitude.map((item, i) => (
                          <li key={i} className="text-gray-800">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {entry.notes && (
                    <div>
                      <h3 className="font-medium mb-3">Notes</h3>
                      <div className="space-y-3">
                        {entry.notes.productivite !== undefined && formatNote(entry.notes.productivite, 'Productivité')}
                        {entry.notes.sport !== undefined && formatNote(entry.notes.sport, 'Sport')}
                        {entry.notes.energie !== undefined && formatNote(entry.notes.energie, 'Énergie')}
                        {entry.notes.proprete !== undefined && formatNote(entry.notes.proprete, 'Propreté')}
                        {entry.notes.art !== undefined && formatNote(entry.notes.art, 'Art')}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
