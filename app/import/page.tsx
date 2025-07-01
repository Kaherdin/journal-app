'use client';

import { useState } from 'react';
import { Navigation } from '@/components/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';

export default function Import() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Traiter les entrées existantes
  const processEntries = async () => {
    try {
      setIsProcessing(true);
      setError('');
      setSuccess('');
      setResults(['Démarrage du traitement des entrées...']);
      
      // Appeler l'API pour traiter les entrées
      const response = await fetch('/api/import-entries', {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors du traitement');
      }
      
      const data = await response.json();
      
      if (data.results && Array.isArray(data.results)) {
        setResults(prev => [...prev, ...data.results]);
      }
      
      setSuccess(`Traitement terminé avec succès: ${data.processed} entrées traitées`);
    } catch (err) {
      console.error('Erreur:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Générer des embeddings pour toutes les entrées
  const generateEmbeddings = async () => {
    try {
      setIsProcessing(true);
      setError('');
      setSuccess('');
      setResults(['Démarrage de la génération des embeddings...']);
      
      // Appeler l'API pour générer les embeddings
      const response = await fetch('/api/regenerate-embeddings', {
        method: 'GET'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la génération des embeddings');
      }
      
      const data = await response.json();
      
      setResults(prev => [...prev, `Génération terminée: ${data.message}`]);
      setSuccess('Embeddings générés avec succès');
    } catch (err) {
      console.error('Erreur:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="max-w-4xl w-full">
        <h1 className="text-4xl font-bold mb-8 text-center">Importation et Traitement</h1>
        
        <Navigation />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Importer depuis Notion</CardTitle>
              <CardDescription>
                Importe et traite les entrées depuis les fichiers Notion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Cette fonction traitera les entrées existantes dans votre dossier de données
                pour les rendre compatibles avec la recherche vectorielle.
              </p>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={processEntries}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? 'Traitement en cours...' : 'Importer les entrées'}
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Générer les Embeddings</CardTitle>
              <CardDescription>
                Génère des embeddings vectoriels pour la recherche
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Cette fonction créera des embeddings vectoriels pour toutes vos entrées,
                permettant ainsi la recherche sémantique et l&apos;analyse IA.
              </p>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={generateEmbeddings}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? 'Génération en cours...' : 'Générer les Embeddings'}
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-md">
            {success}
          </div>
        )}
        
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Résultats du traitement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 p-4 rounded-md max-h-80 overflow-y-auto">
                {results.map((result, index) => (
                  <div key={index} className="mb-1">
                    {result}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
