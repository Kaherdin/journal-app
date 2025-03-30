import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="max-w-4xl w-full">
        <h1 className="text-4xl font-bold mb-8 text-center">Journal Personnel</h1>
        
        <Navigation />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Ajouter une entrée</CardTitle>
              <CardDescription>Créez une nouvelle entrée de journal</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm">Enregistrez vos pensées, objectifs et réflexions du jour.</p>
              <Button asChild className="w-full">
                <Link href="/add-entry">Commencer</Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Dernières entrées</CardTitle>
              <CardDescription>Consultez vos entrées récentes</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm">Affichez les 10 dernières entrées de votre journal personnel.</p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/entries">Consulter</Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Poser une question</CardTitle>
              <CardDescription>Interrogez votre journal</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm">Utilisez l'IA pour analyser vos entrées et obtenir des insights.</p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/ask">Demander</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
