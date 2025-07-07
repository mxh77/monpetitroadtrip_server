# API de Génération Asynchrone de Roadtrips avec Multi-Agents IA

## Vue d'ensemble

Cette API permet de générer des roadtrips personnalisés de manière asynchrone en utilisant un système multi-agents. Le processus est divisé en plusieurs étapes distinctes, chacune gérée par un agent IA spécialisé, permettant de traiter des roadtrips complexes sans les limitations de tokens des modèles d'IA.

## Avantages de l'Architecture Asynchrone

1. **Robustesse** : Le traitement asynchrone évite les timeouts côté client pour les roadtrips complexes
2. **Modularité** : Chaque agent IA est spécialisé dans une tâche spécifique (planification, détails)
3. **Scalabilité** : Possibilité de traiter des roadtrips de taille illimitée grâce au découpage
4. **Tolérance aux pannes** : Les erreurs sur une étape n'affectent pas l'ensemble du processus
5. **Traçabilité** : Suivi détaillé de chaque étape du processus de génération

## Architecture Multi-Agents

### 1. Agent Planificateur (Planner)
- Reçoit les paramètres globaux du roadtrip
- Génère la structure générale : étapes, dates, lieux
- Ne produit pas de détails sur les hébergements ou activités
- Utilise GPT-4o-mini pour une génération rapide

### 2. Agent Détailleur (Detailer)
- Traite chaque étape individuellement
- Enrichit avec des hébergements et activités adaptés
- Assure la cohérence des horaires et dates
- Utilise GPT-4o pour une précision maximale sur les détails

### 3. Agent Créateur (Creator)
- Convertit les données générées en entités MongoDB
- Crée le roadtrip, les étapes, les hébergements et les activités
- Gère les relations entre les entités
- Calcule les temps de trajet et met à jour les dates

## Flux de Travail

1. L'utilisateur soumet une demande de génération de roadtrip
2. Un job asynchrone est créé et l'ID du job est retourné immédiatement
3. Le processus continue en arrière-plan :
   - L'agent planificateur génère le plan général
   - L'agent détailleur traite chaque étape séquentiellement
   - L'agent créateur persiste les données en base
4. L'utilisateur peut vérifier le statut du job à tout moment
5. Une notification est envoyée à l'utilisateur lorsque le roadtrip est prêt

## Endpoints API

### Démarrer un Job de Génération
```
POST /api/roadtrips/ai/async
```

**Requête** : Identique à l'API synchrone existante

**Réponse** :
```json
{
  "jobId": "60f8a1c3b9e2c72a4c8f1234",
  "message": "Génération de roadtrip lancée avec succès",
  "status": "pending",
  "estimatedTime": "5-10 minutes"
}
```

### Vérifier le Statut d'un Job
```
GET /api/roadtrips/ai/jobs/:jobId
```

**Réponse** :
```json
{
  "job": {
    "_id": "60f8a1c3b9e2c72a4c8f1234",
    "status": "detailing",
    "progress": {
      "total": 5,
      "completed": 2,
      "percentage": 40
    },
    "currentStep": 3,
    "totalSteps": 5,
    "startedAt": "2025-07-03T10:15:30Z",
    "results": {
      "roadtripId": "60f8a1c3b9e2c72a4c8f5678",
      "stepsCreated": 2,
      "accommodationsCreated": 2,
      "activitiesCreated": 4
    }
  }
}
```

### Récupérer l'Historique des Jobs
```
GET /api/roadtrips/ai/jobs
```

**Réponse** :
```json
{
  "jobs": [
    {
      "_id": "60f8a1c3b9e2c72a4c8f1234",
      "status": "completed",
      "progress": {
        "percentage": 100
      },
      "startedAt": "2025-07-03T10:15:30Z",
      "completedAt": "2025-07-03T10:22:45Z",
      "results": {
        "roadtripId": "60f8a1c3b9e2c72a4c8f5678"
      }
    },
    // ...
  ]
}
```

## Modèle de Données

Le système utilise le modèle `AIRoadtripJob` pour suivre l'état et la progression du processus de génération :

```javascript
{
  userId: ObjectId,
  status: enum('pending', 'planning', 'detailing', 'creating', 'completed', 'failed'),
  currentStep: Number,
  totalSteps: Number,
  progress: {
    total: Number,
    completed: Number,
    percentage: Number
  },
  parameters: { /* paramètres du roadtrip */ },
  startedAt: Date,
  completedAt: Date,
  errorMessage: String,
  planData: { /* plan généré par l'agent planificateur */ },
  results: {
    roadtripId: ObjectId,
    stepsCreated: Number,
    accommodationsCreated: Number,
    activitiesCreated: Number,
    errors: [{ step: String, error: String }]
  },
  aiApiCalls: [{ /* historique des appels aux modèles IA */ }],
  notifications: {
    emailSent: Boolean,
    emailSentAt: Date,
    pushSent: Boolean,
    pushSentAt: Date
  }
}
```

## Gestion des Erreurs

- Les erreurs dans la phase de planification arrêtent l'ensemble du processus
- Les erreurs dans la génération de détails pour une étape spécifique sont enregistrées, mais le processus continue avec les étapes suivantes
- Toutes les erreurs sont documentées dans le job pour permettre le diagnostic

## Optimisations Futures

1. **Parallélisation** : Traiter plusieurs étapes simultanément pour accélérer la génération
2. **Streaming** : Permettre à l'interface utilisateur de recevoir des mises à jour en temps réel
3. **Reprise sur erreur** : Permettre de reprendre un job échoué à partir du point d'échec
4. **Prévisualisation** : Générer une version simplifiée du roadtrip pour prévisualisation rapide
5. **Agents spécialisés** : Ajouter des agents pour les recommandations culinaires, culturelles, etc.
