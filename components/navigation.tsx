'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function Navigation() {
  const pathname = usePathname();
  
  const navItems = [
    { path: '/', label: 'Accueil' },
    { path: '/add-entry', label: 'Ajouter une entrée' },
    { path: '/generate-entry', label: 'Générer avec IA' },
    { path: '/entries', label: 'Dernières entrées' },
    { path: '/ask', label: 'Poser une question' },
  ];

  return (
    <Card className="p-4 mb-8">
      <nav className="flex flex-wrap gap-2">
        {navItems.map((item) => (
          <Button
            key={item.path}
            variant={pathname === item.path ? 'default' : 'outline'}
            asChild
          >
            <Link href={item.path}>{item.label}</Link>
          </Button>
        ))}
      </nav>
    </Card>
  );
}
