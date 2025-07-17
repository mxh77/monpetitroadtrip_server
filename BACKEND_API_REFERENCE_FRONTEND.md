# Backend API Reference pour Repository Pattern + Queue locale + Synchronisation

Cette documentation répond aux questions de votre agent frontend pour implémenter un Repository Pattern avec queue locale et synchronisation en arrière-plan.

## 📊 Structure des Réponses API

### 1. Format des Timestamps

**Format utilisé :** ISO 8601 (UTC)
```javascript
// Exemples
"created_at": "2024-01-20T10:00:00.000Z"
"updated_at": "2024-01-20T10:00:25.000Z"
"startDateTime": "2024-08-05T10:00:00.000Z"
"arrivalDateTime": "2024-07-15T14:30:00.000Z"
```

**Champs timestamps standards :**
- `createdAt` et `updatedAt` (automatiques MongoDB)
- `startDateTime`, `endDateTime` (activités)
- `arrivalDateTime`, `departureDateTime` (hébergements, étapes)
- `startedAt`, `completedAt` (jobs asynchrones)

### 2. Structure des Entités Principales

#### Roadtrip
```javascript
{
  "_id": "64a1b2c3d4e5f6789abcdef0",
  "userId": "64a1b2c3d4e5f6789abcdef1", 
  "name": "Mon Roadtrip",
  "startLocation": "Paris, France",
  "startDateTime": "2024-08-01T09:00:00.000Z",
  "endLocation": "Nice, France", 
  "endDateTime": "2024-08-15T18:00:00.000Z",
  "currency": "EUR",
  "notes": "Vacances d'été",
  "photos": ["fileId1", "fileId2"],
  "documents": ["fileId3"],
  "thumbnail": "fileId4",
  "steps": ["stepId1", "stepId2"],
  "createdAt": "2024-01-20T10:00:00.000Z",
  "updatedAt": "2024-01-20T10:00:25.000Z",
  "__v": 0
}
```

#### Step (Étape)
```javascript
{
  "_id": "64a1b2c3d4e5f6789abcdef2",
  "userId": "64a1b2c3d4e5f6789abcdef1",
  "roadtripId": "64a1b2c3d4e5f6789abcdef0",
  "type": "Stage", // ou "Stop"
  "name": "Paris",
  "address": "Paris, France",
  "latitude": 48.8566,
  "longitude": 2.3522,
  "arrivalDateTime": "2024-08-01T09:00:00.000Z",
  "departureDateTime": "2024-08-03T11:00:00.000Z",
  "travelTimePreviousStep": 120, // minutes
  "distancePreviousStep": 350.5, // km
  "isArrivalTimeConsistent": true,
  "travelTimeNote": "OK", // "ERROR", "WARNING", "OK"
  "notes": "Visite de la capitale",
  "photos": ["fileId"],
  "documents": ["fileId"],
  "thumbnail": "fileId",
  "accommodations": ["accId1"],
  "activities": ["actId1", "actId2"],
  "story": "Récit généré par IA..."
}
```

#### Activity (Activité)
```javascript
{
  "_id": "64a1b2c3d4e5f6789abcdef3",
  "userId": "64a1b2c3d4e5f6789abcdef1",
  "stepId": "64a1b2c3d4e5f6789abcdef2",
  "active": true,
  "type": "Visite", // "Randonnée", "Courses", "Visite", "Transport", "Autre"
  "name": "Musée du Louvre",
  "address": "Rue de Rivoli, 75001 Paris",
  "latitude": 48.8606,
  "longitude": 2.3376,
  "website": "https://www.louvre.fr",
  "phone": "+33140205050",
  "email": "info@louvre.fr", 
  "startDateTime": "2024-08-01T14:00:00.000Z",
  "endDateTime": "2024-08-01T17:00:00.000Z",
  "duration": 180, // minutes
  "typeDuration": "Heures",
  "reservationNumber": "RES123456",
  "price": 17.0,
  "currency": "EUR",
  "notes": "Réserver en ligne",
  "photos": ["fileId"],
  "documents": ["fileId"],
  "thumbnail": "fileId",
  "algoliaId": "trail-123456789" // Référence Algolia optionnelle
}
```

#### RoadtripTask (Tâche)
```javascript
{
  "_id": "64a1b2c3d4e5f6789abcdef4",
  "userId": "64a1b2c3d4e5f6789abcdef1",
  "roadtripId": "64a1b2c3d4e5f6789abcdef0",
  "title": "Réserver billets de train",
  "description": "Réserver les billets Paris-Nice",
  "category": "transport", // voir enum complet ci-dessous
  "priority": "high", // "low", "medium", "high", "urgent"
  "status": "pending", // "pending", "in_progress", "completed", "cancelled"
  "dueDate": "2024-07-25T23:59:59.000Z",
  "completedAt": null,
  "assignedTo": "Jean Dupont",
  "estimatedDuration": 30, // minutes
  "order": 1,
  "notes": "Site SNCF Connect",
  "attachments": ["fileId"],
  "createdAt": "2024-01-20T10:00:00.000Z",
  "updatedAt": "2024-01-20T10:00:25.000Z"
}
```

### 3. Pagination

**Format standard :**
```javascript
// Exemple pour les conversations chatbot
{
  "success": true,
  "conversations": [...],
  "pagination": {
    "page": 1,
    "limit": 50, 
    "total": 156,
    "pages": 4
  }
}
```

**Paramètres de requête :**
- `page` (défaut: 1)
- `limit` (défaut: varie selon l'endpoint)
- Pas de `offset`, utilisation de `page`

### 4. Gestion des Erreurs

#### Erreurs de Validation (400)
```javascript
{
  "msg": "Invalid JSON in data field"
  // ou
  "msg": "The given data was invalid.",
  "errors": {
    "title": ["The title field is required."],
    "dueDate": ["Invalid date format."]
  }
}
```

#### Erreurs d'Authentification (401)
```javascript
{
  "msg": "User not authorized"
  // ou
  "msg": "No token, authorization denied"
}
```

#### Erreurs de Ressource (404)
```javascript
{
  "msg": "Roadtrip not found"
  // ou 
  "msg": "Step not found"
}
```

#### Erreurs de Conflit (409)
```javascript
{
  "msg": "Un calcul est déjà en cours"
  // ou
  "msg": "Une synchronisation est déjà en cours"
}
```

#### Erreurs Serveur (500)
```javascript
{
  "msg": "Server error"
  // Généralement accompagné d'un log côté serveur
}
```

## 🔐 Authentification

### Format JWT
- **Type :** Bearer Token
- **Header :** `Authorization: Bearer <JWT_TOKEN>`
- **Expiration :** 1 heure (3600s) pour login, 30 jours pour register
- **Payload standard :**
```javascript
{
  "user": {
    "id": "64a1b2c3d4e5f6789abcdef1"
  },
  "iat": 1642684800,
  "exp": 1642688400
}
```

### Gestion de l'Expiration
- Le backend retourne `401` si le token est expiré
- Redirection automatique vers `/auth/login` en mode web
- En mode API, intercepter la `401` pour rafraîchir le token

## 📋 Champs Obligatoires vs Optionnels

### Roadtrip
- **Obligatoires :** `name`, `userId`
- **Optionnels :** `startLocation`, `endLocation`, dates, `currency`, `notes`

### Step
- **Obligatoires :** `userId`, `roadtripId`
- **Optionnels :** `name`, `address`, `type`, dates, coordonnées

### Activity
- **Obligatoires :** `name`, `userId`, `stepId`
- **Optionnels :** tous les autres (dates, prix, réservation, etc.)

### RoadtripTask
- **Obligatoires :** `title`, `userId`, `roadtripId`
- **Optionnels :** `description`, `category`, `priority`, `dueDate`, etc.

## 🔗 Relations et Population

### Champs de Relations
- Tous les IDs se terminent par `Id` : `userId`, `roadtripId`, `stepId`
- Relations array : `steps[]`, `accommodations[]`, `activities[]`, `photos[]`

### Population Automatique
La plupart des endpoints populatent automatiquement les relations :

```javascript
// Exemple : GET /roadtrips/:id retourne
{
  "_id": "...",
  "name": "Mon Roadtrip",
  "steps": [
    {
      "_id": "stepId1",
      "name": "Paris",
      "accommodations": [
        { "_id": "accId1", "name": "Hôtel..." }
      ],
      "activities": [
        { "_id": "actId1", "name": "Louvre..." }
      ]
    }
  ]
}
```

### Include/Expand
**Le backend n'utilise PAS de système `?include=` ou `?expand=`**
- Les relations importantes sont populatées par défaut
- Pour des données minimales, utiliser les endpoints de liste
- Pour des détails complets, utiliser les endpoints individuels

## ⚡ Jobs Asynchrones & Queue

### Structure des Jobs
```javascript
// TravelTimeJob, StepSyncJob, AIRoadtripJob, etc.
{
  "jobId": "64f123abc456789012345678",
  "status": "pending", // "pending", "running", "completed", "failed"
  "progress": {
    "total": 5,
    "completed": 3, 
    "percentage": 60
  },
  "startedAt": "2024-07-01T10:30:00.000Z",
  "completedAt": "2024-07-01T10:30:45.000Z",
  "errorMessage": null,
  "results": {
    // Varie selon le type de job
  }
}
```

### Statuts des Jobs
- `pending` : En attente de traitement
- `running` : En cours d'exécution
- `completed` : Terminé avec succès
- `failed` : Échec avec erreur

### Endpoints de Monitoring
```javascript
// Pattern général :
// POST /endpoint → Lance le job, retourne jobId
// GET /endpoint/jobs/:jobId/status → Statut du job
// GET /endpoint/jobs → Historique des jobs

// Exemples :
"PATCH /roadtrips/:id/travel-time/refresh/async"
"GET /roadtrips/:id/travel-time/jobs/:jobId/status"
"GET /roadtrips/:id/travel-time/jobs"
```

## 🏷️ Enums et Constantes

### Task Categories
```javascript
[
  'preparation', 'booking', 'packing', 'documents', 
  'transport', 'accommodation', 'activities', 'health',
  'finances', 'communication', 'other'
]
```

### Task Priorities  
```javascript
['low', 'medium', 'high', 'urgent']
```

### Task Status
```javascript
['pending', 'in_progress', 'completed', 'cancelled']
```

### Step Types
```javascript
['Stage', 'Stop']
```

### Activity Types
```javascript
['Randonnée', 'Courses', 'Visite', 'Transport', 'Autre']
```

### Travel Time Notes
```javascript
['ERROR', 'WARNING', 'OK']
```

## 🎯 Recommandations pour Repository Pattern

### 1. Entités à Synchroniser
**Priorité Haute :**
- Roadtrips (structure principale)
- Steps (étapes du voyage)
- Activities (activités par étape)
- RoadtripTasks (tâches à faire)

**Priorité Moyenne :**
- Accommodations (hébergements)
- Files (photos/documents)

### 2. Stratégie de Synchronisation

#### Synchronisation Immédiate
- Création/modification de roadtrip
- Ajout/suppression d'étapes
- Changement de statut de tâches

#### Synchronisation Différée
- Upload de fichiers
- Calculs de temps de trajet
- Génération de contenu IA

#### Queue Locale Recommandée
```javascript
// Structure suggérée
{
  id: "local_uuid",
  entityType: "roadtrip|step|activity|task",
  entityId: "server_id_or_null", 
  action: "create|update|delete",
  data: { /* payload */ },
  status: "pending|syncing|synced|error",
  attempts: 0,
  lastAttempt: "timestamp",
  createdAt: "timestamp"
}
```

### 3. Gestion des Conflits
- Le backend utilise `updatedAt` pour la détection de conflits
- Stratégie recommandée : "serveur gagne" avec notification utilisateur
- Sauvegarder les modifications locales avant sync pour merge manuel

### 4. Offline-First
- Stocker le JWT en local (localStorage/secure storage)
- Implémenter une vérification périodique de validité
- Queue les actions en mode offline
- Sync automatique au retour de connexion

## 🔄 Exemples de Flux de Synchronisation

### Création d'une Tâche
```javascript
// 1. Créer en local immédiatement
const localTask = {
  id: generateUUID(),
  title: "Nouvelle tâche",
  status: "pending",
  // ... autres champs
  _isLocal: true,
  _syncStatus: "pending"
};

// 2. Ajouter à la queue
queue.add({
  entityType: "task",
  action: "create", 
  data: localTask
});

// 3. Sync asynchrone
try {
  const response = await api.post('/roadtrips/:id/tasks', localTask);
  localTask._id = response.data._id;
  localTask._isLocal = false;
  localTask._syncStatus = "synced";
} catch (error) {
  localTask._syncStatus = "error";
  // Retry logic
}
```

### Synchronisation des Jobs Asynchrones
```javascript
// 1. Lancer le job
const jobResponse = await api.patch('/roadtrips/:id/travel-time/refresh/async');
const jobId = jobResponse.data.jobId;

// 2. Polling du statut
const pollJob = async () => {
  const status = await api.get(`/roadtrips/:id/travel-time/jobs/${jobId}/status`);
  
  if (status.data.status === 'completed') {
    // Sync les entités mises à jour
    await syncRoadtripSteps();
  } else if (status.data.status === 'running') {
    // Continuer le polling
    setTimeout(pollJob, 2000);
  }
};
```

Cette structure vous donne tous les éléments nécessaires pour implémenter un Repository Pattern robuste avec queue locale et synchronisation en arrière-plan optimisée pour votre backend Mon Petit Roadtrip.
