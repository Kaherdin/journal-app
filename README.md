# Life OS

Life OS est une application Next.js destinée à centraliser son quotidien dans une interface unique. Le projet combine prise de notes, journal quotidien et automatisation de tâches grâce à des requêtes d'IA. Il permet également de synchroniser du contenu entre Notion et Airtable pour alimenter un tableau de bord personnel.

## Installation

1. Clonez ce dépôt et installez les dépendances :

```bash
npm install
```

2. Configurez la variable d'environnement `NOTION_KEY` dans un fichier `.env.local` ou dans votre système. Cette clé permet à l'API de communiquer avec Notion.

```
NOTION_KEY=your-notion-api-key
```

## Démarrage

Lancement en développement :

```bash
npm run dev
```

Pour générer la version de production :

```bash
npm run build
npm start
```

## Objectifs

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
3. **Attendez la fin du compte à rebours** avant de commencer à parler
4. **Évitez les environnements bruyants**
5. **Alternatives techniques possibles**:
   - Utiliser le modèle `gpt-4o-mini-transcribe` ou `gpt-4o-transcribe` pour une meilleure précision (nécessite une mise à jour de la clé API)
   - Implémenter une solution locale comme Mozilla DeepSpeech pour plus de confidentialité
   - Utiliser un service spécialisé comme Google Speech-to-Text ou Azure Speech Services

### Fonctionnalités de l'enregistrement audio

Le composant `TextWithAudio` inclut les fonctionnalités suivantes:

- **Compte à rebours** - Délai de 3 secondes avant le début de l'enregistrement
- **Visualisation du volume** - Indicateur visuel qui change selon le volume de votre voix
- **Compteur de temps** - Affiche la durée de l'enregistrement en secondes
- **Optimisations audio** - Suppression de bruit, annulation d'écho et contrôle automatique du gain
- **Indicateurs visuels** - Bordure colorée, icône animée et retour visuel durant l'enregistrement

## Configuration du développement

### ESLint

Le projet utilise ESLint pour le linting du code. Si vous rencontrez des erreurs de linting que vous souhaitez désactiver, vous pouvez les configurer dans le fichier `.eslintrc.json` à la racine du projet:

```json
{
  "extends": [
    "next/core-web-vitals"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "off"
    // Ajoutez ici d'autres règles à désactiver si nécessaire
  }
}
```

### TypeScript

Pour éviter les erreurs courantes de type comme les tableaux vides, assurez-vous de toujours typer explicitement vos variables, par exemple:

```typescript
// À éviter
const items = [];

// Préférer
const items: SomeType[] = [];
```

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
