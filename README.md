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

- Éditer un journal et stocker les notes quotidiennes
- Envoyer des requêtes d'IA pour enrichir les écrits
- Synchroniser et convertir des pages entre Notion et Airtable
