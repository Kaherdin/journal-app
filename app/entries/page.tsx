'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { JournalEntry } from '@/app/types';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Entries() {
  const router = useRouter();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuildingEmbeddings, setIsBuildingEmbeddings] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [embedMessage, setEmbedMessage] = useState('');
  const [deleteMessage, setDeleteMessage] = useState('');
  const [error, setError] = useState('');

  const fetchEntries = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/get-last-entries');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la récupération des entrées');
      }

      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const deleteEntry = async (id: string) => {
    try {
      setIsDeleting(true);
      setDeleteMessage('');
      
      const response = await fetch(`/api/delete-entry?id=${id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la suppression');
      }
      
      // Supprimer l'entrée du state local
      setEntries(entries.filter(entry => entry.id !== id));
      
      // Afficher un message de succès
      setDeleteMessage('Entrée supprimée avec succès');
      setTimeout(() => {
        setDeleteMessage('');
      }, 3000);
      
    } catch (err) {
      console.error('Erreur:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsDeleting(false);
    }
  };

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

  const regenerateEmbeddings = async () => {
    try {
      setIsBuildingEmbeddings(true);
      setEmbedMessage('Régénération des embeddings en cours...');
      
      const response = await fetch('/api/regenerate-embeddings', {
        method: 'GET'
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la régénération des embeddings');
      }
      
      const data = await response.json();
      setEmbedMessage(`Embeddings régénérés avec succès ! ${data.message}`);
    } catch (error) {
      setEmbedMessage(`Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsBuildingEmbeddings(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="max-w-4xl w-full">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Dernières Entrées</h1>
          <div className="space-x-2">
            <Button 
              onClick={regenerateEmbeddings} 
              disabled={isBuildingEmbeddings}
              variant="outline"
              size="sm"
            >
              {isBuildingEmbeddings ? 'Traitement...' : 'Régénérer Embeddings'}
            </Button>
            <Button variant="default" onClick={() => router.push('/add-entry')}>
              Nouvelle Entrée
            </Button>
          </div>
        </div>
        
        {embedMessage && (
          <div className={`p-4 mb-4 rounded ${embedMessage.includes('Erreur') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
            {embedMessage}
          </div>
        )}
        
        {deleteMessage && (
          <div className="bg-green-100 text-green-800 px-4 py-2 mb-4 rounded-md">
            {deleteMessage}
          </div>
        )}
        
        <Navigation />
        
        {isLoading && (
          <div className="flex justify-center p-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          </div>
        )}
        
        {error && (
          <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-md">
            <p>{error}</p>
          </div>
        )}
        
        {!isLoading && !error && entries.length === 0 && (
          <div className="text-center p-12">
            <p className="text-lg text-gray-600">Aucune entrée trouvée. Commencez par ajouter votre première entrée.</p>
          </div>
        )}
        
        <div className="space-y-6">
          {entries.map((entry, index) => (
            <Card key={entry.id || `entry-${index}`} className="overflow-hidden">
              <CardHeader className="bg-gray-50">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{new Date(entry.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">{entry.date}</span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 size={18} />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cette entrée ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action est irréversible. L&apos;entrée du {new Date(entry.date).toLocaleDateString('fr-FR')} sera définitivement supprimée.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction 
                            className="bg-red-500 hover:bg-red-600"
                            onClick={() => deleteEntry(entry.id || '')}
                            disabled={isDeleting || !entry.id}
                          >
                            {isDeleting ? 'Suppression...' : 'Supprimer'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
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
                          <li key={`${entry.id}-gratitude-${i}`} className="text-gray-800">{item}</li>
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
