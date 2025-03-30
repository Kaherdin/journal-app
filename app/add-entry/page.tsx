'use client';

import { useState } from 'react';
import { Navigation } from '@/components/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';

export default function AddEntry() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    mit: '',
    content: '',
    prompt: '',
    gratitude: '',
    productivite: 5,
    sport: 5,
    energie: 5,
    proprete: 5,
    art: 5
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseInt(value) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess(false);

    try {
      // Format the data according to the API expectations
      const apiData = {
        date: formData.date,
        mit: formData.mit,
        content: formData.content,
        prompt: formData.prompt || undefined,
        gratitude: formData.gratitude ? formData.gratitude.split(',').map(item => item.trim()) : undefined,
        notes: {
          productivite: formData.productivite,
          sport: formData.sport,
          energie: formData.energie,
          proprete: formData.proprete,
          art: formData.art
        }
      };

      const response = await fetch('/api/add-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Une erreur est survenue');
      }

      setSuccess(true);
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        mit: '',
        content: '',
        prompt: '',
        gratitude: '',
        productivite: 5,
        sport: 5,
        energie: 5,
        proprete: 5,
        art: 5
      });
      
      // Redirect after successful submission
      setTimeout(() => {
        router.push('/entries');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="max-w-4xl w-full">
        <h1 className="text-4xl font-bold mb-8 text-center">Ajouter une entrée</h1>
        
        <Navigation />
        
        <Card>
          <CardHeader>
            <CardTitle>Nouvelle entrée de journal</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}
            
            {success && (
              <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-md">
                Entrée ajoutée avec succès! Redirection...
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="date" className="text-sm font-medium">
                    Date
                  </label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="mit" className="text-sm font-medium">
                    Tâche la plus importante (MIT)
                  </label>
                  <Input
                    id="mit"
                    name="mit"
                    value={formData.mit}
                    onChange={handleChange}
                    placeholder="Qu'est-ce qui est le plus important aujourd'hui?"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="prompt" className="text-sm font-medium">
                  Prompt (optionnel)
                </label>
                <Input
                  id="prompt"
                  name="prompt"
                  value={formData.prompt}
                  onChange={handleChange}
                  placeholder="Prompt utilisé pour générer cette entrée"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="content" className="text-sm font-medium">
                  Contenu
                </label>
                <Textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  placeholder="Écrivez vos pensées et réflexions ici..."
                  rows={8}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="gratitude" className="text-sm font-medium">
                  Gratitude (optionnel, séparées par des virgules)
                </label>
                <Input
                  id="gratitude"
                  name="gratitude"
                  value={formData.gratitude}
                  onChange={handleChange}
                  placeholder="le soleil, mon chat, le café"
                />
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Notes (1-10)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label htmlFor="productivite" className="text-sm">Productivité</label>
                      <span>{formData.productivite}/10</span>
                    </div>
                    <Input
                      id="productivite"
                      name="productivite"
                      type="range"
                      min="1"
                      max="10"
                      value={formData.productivite}
                      onChange={handleRangeChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label htmlFor="sport" className="text-sm">Sport</label>
                      <span>{formData.sport}/10</span>
                    </div>
                    <Input
                      id="sport"
                      name="sport"
                      type="range"
                      min="1"
                      max="10"
                      value={formData.sport}
                      onChange={handleRangeChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label htmlFor="energie" className="text-sm">Énergie</label>
                      <span>{formData.energie}/10</span>
                    </div>
                    <Input
                      id="energie"
                      name="energie"
                      type="range"
                      min="1"
                      max="10"
                      value={formData.energie}
                      onChange={handleRangeChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label htmlFor="proprete" className="text-sm">Propreté</label>
                      <span>{formData.proprete}/10</span>
                    </div>
                    <Input
                      id="proprete"
                      name="proprete"
                      type="range"
                      min="1"
                      max="10"
                      value={formData.proprete}
                      onChange={handleRangeChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label htmlFor="art" className="text-sm">Art</label>
                      <span>{formData.art}/10</span>
                    </div>
                    <Input
                      id="art"
                      name="art"
                      type="range"
                      min="1"
                      max="10"
                      value={formData.art}
                      onChange={handleRangeChange}
                    />
                  </div>
                </div>
              </div>
              
              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full"
              >
                {isSubmitting ? 'Enregistrement...' : 'Sauvegarder l\'entrée'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
