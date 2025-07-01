# API de Synchronisation Asynchrone des Steps

## Vue d'ensemble

Cette API permet de synchroniser automatiquement les heures d'arrivée et de départ des **steps** d'un roadtrip avec celles de leurs **accommodations** et **activités** associées. Cette synchronisation garantit la cohérence temporelle entre tous les éléments du voyage.

## Problème résolu

### Désynchronisation typique
- Un **step** a des heures d'arrivée/départ définies manuellement
- Ses **accommodations** et **activités** ont des heures spécifiques différentes
- Résultat : incohérence dans les calculs de temps de trajet

### Solution apportée
- Recalcul automatique des heures du step basé sur ses accommodations/activités
- Intégration transparente dans le calcul des temps de trajet
- Suivi asynchrone pour les roadtrips avec de nombreux steps

## Endpoints disponibles

### 1. Lancer une synchronisation asynchrone

```http
PATCH /api/roadtrips/{idRoadtrip}/sync-steps/async
Authorization: Bearer {token}
```

**Réponse (202 Accepted):**
```json
{
  "msg": "Job de synchronisation démarré avec succès",
  "jobId": "64a1b2c3d4e5f6789abcdef0",
  "status": "pending",
  "progress": {
    "total": 8,
    "completed": 0,
    "percentage": 0
  },
  "estimatedDuration": "Environ 24 secondes"
}
```

**Erreurs possibles:**
- `409 Conflict` - Une synchronisation est déjà en cours
- `404 Not Found` - Roadtrip non trouvé
- `401 Unauthorized` - Token invalide

### 2. Vérifier le statut d'un job

```http
GET /api/roadtrips/{idRoadtrip}/sync-jobs/{jobId}/status
Authorization: Bearer {token}
```

**Réponse (200 OK):**
```json
{
  "jobId": "64a1b2c3d4e5f6789abcdef0",
  "status": "completed",
  "progress": {
    "total": 8,
    "completed": 8,
    "percentage": 100
  },
  "createdAt": "2024-01-20T10:00:00.000Z",
  "startedAt": "2024-01-20T10:00:01.000Z",
  "completedAt": "2024-01-20T10:00:25.000Z",
  "results": {
    "summary": {
      "totalSteps": 8,
      "synchronizedSteps": 5,
      "unchangedSteps": 3,
      "details": [
        {
          "stepId": "64a1b2c3d4e5f6789abcdef1",
          "stepName": "Paris",
          "before": {
            "arrivalDateTime": "2024-06-01T08:00:00.000Z",
            "departureDateTime": "2024-06-02T18:00:00.000Z"
          },
          "after": {
            "arrivalDateTime": "2024-06-01T07:30:00.000Z",
            "departureDateTime": "2024-06-02T19:30:00.000Z"
          },
          "changed": true
        }
      ]
    }
  }
}
```

### 3. Lister l'historique des jobs

```http
GET /api/roadtrips/{idRoadtrip}/sync-jobs
Authorization: Bearer {token}
```

**Réponse (200 OK):**
```json
{
  "roadtripId": "64a1b2c3d4e5f6789abcdef9",
  "jobs": [
    {
      "jobId": "64a1b2c3d4e5f6789abcdef0",
      "status": "completed",
      "progress": {
        "total": 8,
        "completed": 8,
        "percentage": 100
      },
      "createdAt": "2024-01-20T10:00:00.000Z",
      "startedAt": "2024-01-20T10:00:01.000Z",
      "completedAt": "2024-01-20T10:00:25.000Z",
      "results": {
        "totalSteps": 8,
        "synchronizedSteps": 5,
        "unchangedSteps": 3
      }
    }
  ]
}
```

### 4. Synchroniser un step individuel (NOUVEAU)

```http
PATCH /api/roadtrips/{idRoadtrip}/steps/{idStep}/sync
Authorization: Bearer {token}
```

**Réponse (200 OK) - Step modifié:**
```json
{
  "msg": "Step synchronisé avec succès",
  "stepId": "64a1b2c3d4e5f6789abcdef1",
  "stepName": "Paris",
  "changed": true,
  "before": {
    "arrivalDateTime": "2024-06-01T08:00:00.000Z",
    "departureDateTime": "2024-06-02T18:00:00.000Z"
  },
  "after": {
    "arrivalDateTime": "2024-06-01T07:30:00.000Z",
    "departureDateTime": "2024-06-02T19:30:00.000Z"
  },
  "changes": {
    "arrivalDateTime": {
      "changed": true,
      "before": "2024-06-01T08:00:00.000Z",
      "after": "2024-06-01T07:30:00.000Z"
    },
    "departureDateTime": {
      "changed": true,
      "before": "2024-06-02T18:00:00.000Z",
      "after": "2024-06-02T19:30:00.000Z"
    }
  }
}
```

**Réponse (200 OK) - Step déjà synchronisé:**
```json
{
  "msg": "Step déjà synchronisé",
  "stepId": "64a1b2c3d4e5f6789abcdef1",
  "stepName": "Paris",
  "changed": false,
  "before": {
    "arrivalDateTime": "2024-06-01T07:30:00.000Z",
    "departureDateTime": "2024-06-02T19:30:00.000Z"
  },
  "after": {
    "arrivalDateTime": "2024-06-01T07:30:00.000Z",
    "departureDateTime": "2024-06-02T19:30:00.000Z"
  }
}
```

**Erreurs possibles:**
- `400 Bad Request` - Step n'appartient pas au roadtrip
- `404 Not Found` - Roadtrip ou step non trouvé
- `401 Unauthorized` - Token invalide

**Avantages:**
- ⚡ **Synchrone et immédiat** - Pas besoin de polling
- 🎯 **Ciblé** - Synchronise uniquement le step spécifié
- 📊 **Détaillé** - Retourne exactement ce qui a changé
- 🚀 **Rapide** - Idéal pour des modifications ponctuelles

## Statuts des jobs

| Statut | Description |
|--------|-------------|
| `pending` | Job créé, en attente de traitement |
| `running` | Synchronisation en cours |
| `completed` | Synchronisation terminée avec succès |
| `failed` | Erreur lors du traitement |

## Logique de synchronisation

### Pour chaque step :

1. **Récupération des accommodations actives** (`active: true`)
   - Tri par `arrivalDateTime` croissant
   - Récupération de la date d'arrivée la plus précoce
   - Récupération de la date de départ la plus tardive

2. **Récupération des activités actives** (`active: true`)
   - Tri par `startDateTime` croissant
   - Récupération de la date de début la plus précoce
   - Récupération de la date de fin la plus tardive

3. **Calcul des nouvelles heures du step :**
   ```javascript
   step.arrivalDateTime = min(
     earliest_accommodation_arrival,
     earliest_activity_start
   )
   
   step.departureDateTime = max(
     latest_accommodation_departure,
     latest_activity_end
   )
   ```

4. **Sauvegarde uniquement si modification**

## Intégration avec le calcul des temps de trajet

La synchronisation est automatiquement intégrée dans l'API de calcul des temps de trajet :

### Endpoint de calcul avec synchronisation préalable

```http
PATCH /api/roadtrips/{idRoadtrip}/refresh-travel-times/async
```

**Processus en 2 étapes :**

1. **Étape 1 (0-50%)** : Synchronisation de tous les steps
2. **Étape 2 (50-100%)** : Calcul des temps de trajet

Cette approche garantit que les temps de trajet sont calculés sur des données cohérentes.

## Exemples de code

### JavaScript (Frontend)

```javascript
class StepSynchronizer {
  constructor(baseURL, authToken) {
    this.baseURL = baseURL;
    this.authToken = authToken;
  }

  // Synchronisation d'un seul step (NOUVEAU)
  async syncSingleStep(roadtripId, stepId) {
    const response = await fetch(
      `${this.baseURL}/roadtrips/${roadtripId}/steps/${stepId}/sync`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }
    
    return await response.json();
  }

  // Synchronisation de tous les steps (asynchrone)
  async startSynchronization(roadtripId) {
    const response = await fetch(
      `${this.baseURL}/roadtrips/${roadtripId}/sync-steps/async`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }
    
    return await response.json();
  }

  async monitorProgress(roadtripId, jobId, onProgress) {
    const checkStatus = async () => {
      const response = await fetch(
        `${this.baseURL}/roadtrips/${roadtripId}/sync-jobs/${jobId}/status`,
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`
          }
        }
      );
      
      const status = await response.json();
      onProgress(status);
      
      if (status.status === 'running' || status.status === 'pending') {
        setTimeout(checkStatus, 2000); // Vérifier toutes les 2 secondes
      }
    };
    
    checkStatus();
  }
}

// Usage pour un step individuel
const synchronizer = new StepSynchronizer('http://localhost:3000/api', 'your-jwt-token');

async function syncSingleStep(roadtripId, stepId) {
  try {
    const result = await synchronizer.syncSingleStep(roadtripId, stepId);
    
    if (result.changed) {
      console.log(`✅ Step "${result.stepName}" synchronisé avec succès!`);
      console.log('Changements:');
      
      if (result.changes.arrivalDateTime.changed) {
        console.log(`  Arrivée: ${result.changes.arrivalDateTime.before} → ${result.changes.arrivalDateTime.after}`);
      }
      
      if (result.changes.departureDateTime.changed) {
        console.log(`  Départ: ${result.changes.departureDateTime.before} → ${result.changes.departureDateTime.after}`);
      }
    } else {
      console.log(`ℹ️  Step "${result.stepName}" était déjà synchronisé.`);
    }
  } catch (error) {
    console.error('Erreur de synchronisation:', error);
  }
}

// Usage pour tous les steps
async function syncAllSteps(roadtripId) {
  try {
    const job = await synchronizer.startSynchronization(roadtripId);
    console.log('Job démarré:', job.jobId);
    
    synchronizer.monitorProgress(roadtripId, job.jobId, (status) => {
      console.log(`Progression: ${status.progress.percentage}%`);
      
      if (status.status === 'completed') {
        console.log('Synchronisation terminée:', status.results.summary);
      } else if (status.status === 'failed') {
        console.error('Erreur:', status.errorMessage);
      }
    });
  } catch (error) {
    console.error('Erreur de synchronisation:', error);
  }
}
```

### cURL

```bash
# Synchroniser un step individuel (NOUVEAU)
curl -X PATCH "http://localhost:3000/api/roadtrips/{roadtripId}/steps/{stepId}/sync" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"

# Lancer la synchronisation de tous les steps
curl -X PATCH "http://localhost:3000/api/roadtrips/{roadtripId}/sync-steps/async" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"

# Vérifier le statut d'un job asynchrone
curl -X GET "http://localhost:3000/api/roadtrips/{roadtripId}/sync-jobs/{jobId}/status" \
  -H "Authorization: Bearer {token}"

# Lister l'historique des jobs
curl -X GET "http://localhost:3000/api/roadtrips/{roadtripId}/sync-jobs" \
  -H "Authorization: Bearer {token}"
```

## Architecture technique

### Modèle de données (StepSyncJob)

```javascript
{
  userId: ObjectId,           // Propriétaire du roadtrip
  roadtripId: ObjectId,       // ID du roadtrip
  status: String,             // 'pending', 'running', 'completed', 'failed'
  progress: {
    total: Number,            // Nombre total de steps
    completed: Number,        // Steps traités
    percentage: Number        // Pourcentage de completion
  },
  startedAt: Date,           // Heure de début
  completedAt: Date,         // Heure de fin
  errorMessage: String,      // Message d'erreur éventuel
  results: {
    summary: {
      totalSteps: Number,
      synchronizedSteps: Number,
      unchangedSteps: Number,
      details: [{
        stepId: ObjectId,
        stepName: String,
        before: {
          arrivalDateTime: Date,
          departureDateTime: Date
        },
        after: {
          arrivalDateTime: Date,
          departureDateTime: Date
        },
        changed: Boolean
      }]
    }
  }
}
```

### Fonctions utilitaires principales

- `updateStepDates(stepId)` - Synchronise les heures d'un step
- `processStepSynchronization(jobId, steps)` - Traitement asynchrone complet
- `processTravelTimeCalculationWithSync(jobId, steps)` - Calcul avec sync préalable

## Conseils d'utilisation

### 1. Quand utiliser chaque API

**API de synchronisation individuelle (`/steps/{idStep}/sync`):**
- ✅ Après modification d'une accommodation ou activité spécifique
- ✅ Pour corriger un problème de synchronisation ponctuel
- ✅ En temps réel dans l'interface utilisateur
- ✅ Quand vous voulez un feedback immédiat

**API de synchronisation globale (`/sync-steps/async`):**
- ✅ Pour synchroniser tout un roadtrip
- ✅ Après import de données
- ✅ Maintenance périodique
- ✅ Avant calcul des temps de trajet

### 2. Fréquence de synchronisation
- Après ajout/modification d'accommodations ou d'activités
- Avant calcul des temps de trajet
- En cas d'incohérences détectées

### 3. Monitoring des performances
- Jobs stockés pendant 7 jours
- Limitation à 10 jobs dans l'historique
- Pause de 200ms entre chaque step pour éviter la surcharge

### 4. Gestion des erreurs
- Vérifier le statut `failed` et consulter `errorMessage`
- Les erreurs sur un step n'interrompent pas le traitement des autres
- Retry automatique non implémenté (à faire manuellement)

### 5. Cas particuliers
- Steps sans accommodations/activités : heures inchangées
- Accommodations/activités inactives : ignorées
- Dates nulles ou invalides : gérées gracieusement

## Tests et debugging

### Scripts de test disponibles

- `testStepSyncAsync.js` - Test complet de l'API asynchrone
- `quickStepSyncTest.js` - Test rapide avec interface utilisateur colorée
- `testSingleStepSync.js` - **NOUVEAU** - Test de synchronisation d'un step individuel
- `debugStepSync.js` - Diagnostic approfondi d'un step spécifique
- `testUpdateStepDates.js` - Test direct de la fonction de synchronisation
- `test_step_sync_complete.sh` - Script bash complet de test
- `testTravelTimeConsistency.js` - Test de cohérence temporelle

### Test de synchronisation d'un step individuel

Pour tester la nouvelle API de synchronisation d'un step spécifique :

```bash
node testSingleStepSync.js <roadtripId> <stepId> <jwtToken>
```

**Exemple d'utilisation :**
```bash
node testSingleStepSync.js 64a1b2c3d4e5f6789abcdef9 64a1b2c3d4e5f6789abcdef1 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Ce script affiche :**
- 📍 Détails du step avant synchronisation
- 🏨 Accommodations actives et leurs heures
- 🎯 Activités actives et leurs heures
- 🔄 Exécution de la synchronisation
- 📊 Résultats détaillés avec les changements effectués
- 📍 État final du step

### Debugging d'un problème de synchronisation

Si vous constatez une incohérence dans les heures d'un step après synchronisation, utilisez le script de diagnostic :

```bash
node debugStepSync.js <roadtripId> <stepId> <jwtToken>
```

**Exemple d'utilisation :**
```bash
node debugStepSync.js 64a1b2c3d4e5f6789abcdef9 64a1b2c3d4e5f6789abcdef1 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Ce script affiche :**
- 📍 Détails du step (dates actuelles)
- 🏨 Liste des accommodations avec leurs heures
- 🎯 Liste des activités avec leurs heures  
- 🧮 Calcul attendu des nouvelles heures
- ⚖️ Comparaison entre les heures actuelles et attendues
- 🔄 Option pour tester la synchronisation en live

### Test direct de la fonction updateStepDates

Pour tester la logique de synchronisation directement sur un step :

```bash
node testUpdateStepDates.js <stepId>
```

**Ce script :**
- Se connecte directement à MongoDB
- Appelle `updateStepDates()` avec logs détaillés
- Affiche tous les calculs intermédiaires
- Permet de voir exactement où le problème se situe

### Exemple de sortie de debug

```
🔍 DEBUG updateStepDates pour step 64a1b2c3d4e5f6789abcdef1:
   - 1 accommodations trouvées
   - 1 activités trouvées

   🎯 Activity 1: Visite du Louvre
      - startDateTime: 2024-08-05T10:00:00.000Z → Mon Aug 05 2024 10:00:00 GMT+0000 (UTC)
      - endDateTime: 2024-08-05T16:00:00.000Z → Mon Aug 05 2024 16:00:00 GMT+0000 (UTC)
      - Valid start: true, Valid end: true
      - After update: arrivalDateTime=Mon Aug 05 2024 10:00:00 GMT+0000 (UTC), departureDateTime=Mon Aug 05 2024 16:00:00 GMT+0000 (UTC)

🎯 RÉSULTAT FINAL pour step 64a1b2c3d4e5f6789abcdef1:
   - arrivalDateTime calculée: Mon Aug 05 2024 10:00:00 GMT+0000 (UTC)
   - departureDateTime calculée: Mon Aug 05 2024 16:00:00 GMT+0000 (UTC)
   - step.arrivalDateTime avant: 2024-08-05T17:00:00.000Z
   - step.departureDateTime avant: 2024-08-05T18:00:00.000Z
   ✅ step.arrivalDateTime mise à jour: 2024-08-05T10:00:00.000Z
   ✅ step.departureDateTime mise à jour: 2024-08-05T16:00:00.000Z
```

## Problèmes courants et solutions

### 1. Heure de step incorrecte malgré la synchronisation

**Symptômes :** Le step a une heure différente de celle de ses activités/accommodations.

**Diagnostic :**
```bash
node debugStepSync.js <roadtripId> <stepId> <token>
```

**Causes possibles :**
- 🕐 **Fuseau horaire :** Les dates sont converties en UTC
- ❌ **Activité inactive :** Seules les activités avec `active: true` sont prises en compte
- 📅 **Date invalide :** Format de date incorrect (`Invalid Date`)
- 🔄 **Cache :** Ancien état en cache, relancer la synchronisation

### 2. Synchronisation qui ne change rien

**Causes possibles :**
- Aucune accommodation/activité active dans le step
- Les heures du step sont déjà correctes
- Dates nulles ou invalides dans les accommodations/activités

### 3. Erreur "Job déjà en cours"

**Solution :**
```bash
# Vérifier les jobs en cours
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/roadtrips/<roadtripId>/sync-jobs

# Attendre que le job se termine ou relancer après quelques minutes
```

## Logs et debugging

Le système génère des logs détaillés en mode debug. Les logs incluent maintenant :

```
🚀 Démarrage de la synchronisation des steps pour le roadtrip 64a1b2c3d4e5f6789abcdef9
📍 Synchronisation de l'étape 1/8: Paris
🔍 DEBUG updateStepDates pour step 64a1b2c3d4e5f6789abcdef1:
   - 1 accommodations trouvées
   - 2 activités trouvées
   🎯 Activity 1: Visite du Louvre
      - startDateTime: 2024-08-05T10:00:00.000Z → Mon Aug 05 2024 10:00:00 GMT+0000 (UTC)
      - endDateTime: 2024-08-05T16:00:00.000Z → Mon Aug 05 2024 16:00:00 GMT+0000 (UTC)
      - Valid start: true, Valid end: true
      - After update: arrivalDateTime=Mon Aug 05 2024 10:00:00 GMT+0000 (UTC)
✅ Synchronisation terminée pour le roadtrip 64a1b2c3d4e5f6789abcdef9
📊 Résumé: 5 steps synchronisés, 3 inchangés
```

Ces logs permettent de suivre le processus en temps réel et de diagnostiquer les problèmes éventuels.
