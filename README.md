This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Journal App - Application de journal personnel avec IA

Une application moderne de journal personnel qui utilise l'intelligence artificielle pour la génération d'entrées structurées, la recherche sémantique et l'analyse de texte.

## Objectif du projet

Cette application vise à simplifier la tenue d'un journal personnel en:

1. **Générant automatiquement des entrées structurées** à partir de descriptions simples ou d'enregistrements audio
2. **Permettant des recherches intelligentes** à travers toutes les entrées passées
3. **Offrant une analyse IA** basée sur l'historique complet de votre journal

## Architecture technique

### Stack technologique

- **Frontend**: Next.js 15+ (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: API Routes Next.js
- **Base de données**: PostgreSQL (avec vectorisation pour la recherche sémantique)
- **IA**: 
  - OpenAI: ChatGPT pour la génération d'entrées structurées
  - OpenAI: Whisper pour la transcription audio
  - OpenAI: Embeddings pour la recherche vectorielle

### Structure du projet

```
journal-app/
├── app/                    # App Router de Next.js
│   ├── api/                # Routes API
│   │   ├── add-entry/      # Ajouter une entrée
│   │   ├── generate-entry/ # Générer une entrée avec IA
│   │   ├── search/         # Recherche d'entrées
│   │   └── transcribe/     # Transcription audio
│   ├── generate-entry/     # Page de génération d'entrées
│   └── ...                 # Autres pages
├── components/             # Composants React réutilisables
│   ├── TextWithAudio.tsx   # Composant d'entrée texte avec enregistrement audio
│   └── ...                 # Autres composants
└── types/                  # Définitions TypeScript
```

### Modèle de données

```typescript
interface JournalEntry {
  id?: string;
  date: string;
  mit: string;         // Most Important Task
  content: string;     # Contenu principal de l'entrée
  gratitude?: any;     # Points de gratitude
  notes?: {            # Évaluations numériques
    productivite?: number;
    sport?: number;
    energie?: number;
    proprete?: number;
    art?: number;
  };
  embedding?: number[]; # Vecteur pour la recherche sémantique
}
```

## Fonctionnalités clés

### 1. Génération d'entrées assistée par IA

L'application convertit une description simple ou un enregistrement audio en une entrée de journal structurée, incluant:
- Tâche principale de la journée
- Contenu principal
- Points de gratitude
- Évaluations numériques (énergie, productivité, etc.)

### 2. Transcription audio

Utilise OpenAI Whisper pour transcrire les enregistrements audio en texte:
- Modèle actuel: `whisper-1`
- Détection automatique de la langue
- Intégration directe dans les champs de texte

### 3. Recherche sémantique

Permet de poser des questions en langage naturel et de retrouver les entrées pertinentes grâce aux embeddings vectoriels.

## Guide d'amélioration de la reconnaissance vocale

Pour obtenir une meilleure qualité de transcription:

1. **Utilisez un microphone de qualité** si possible
2. **Parlez clairement et à un rythme modéré**
3. **Évitez les environnements bruyants**
4. **Alternatives techniques possibles**:
   - Utiliser le modèle `whisper-large-v3` pour une meilleure précision (nécessite une modification de l'API)
   - Implémenter une solution locale comme Mozilla DeepSpeech pour plus de confidentialité
   - Utiliser un service spécialisé comme Google Speech-to-Text ou Azure Speech Services

## Démarrage

```bash
# Installation des dépendances
npm install

# Lancement du serveur de développement
npm run dev

# Construction pour production
npm run build

# Lancement en production
npm start
```

Vous devez également configurer un fichier `.env.local` avec:

```
OPENAI_API_KEY=votre_clé_api_openai
DATABASE_URL=votre_url_de_base_de_données
```

## Roadmap

- [ ] Amélioration de la qualité de transcription audio
- [ ] Exportation des entrées en différents formats
- [ ] Visualisations et analyses de tendances
- [ ] Application mobile
