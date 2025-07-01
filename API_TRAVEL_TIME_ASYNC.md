# API Asynchrone - Calcul des Temps de Trajet

Cette API permet de recalculer les distances et temps de trajet entre toutes les étapes d'un roadtrip de manière asynchrone, avec suivi du progrès en temps réel.

## 🎯 Fonctionnalités

- **Calcul asynchrone** : Traitement en arrière-plan sans bloquer l'interface
- **Suivi du progrès** : Pourcentage d'avancement en temps réel
- **Statistiques complètes** : Distance totale, temps total, incohérences détectées
- **Gestion d'erreurs** : Rapport détaillé des erreurs par étape
- **Historique des jobs** : Consultation des calculs précédents

## 🔄 Flux d'utilisation

### 1. Lancer le calcul asynchrone

```bash
PATCH /api/roadtrips/{idRoadtrip}/refresh-travel-times/async
```

**Réponse (202 Accepted):**
```json
{
  "msg": "Calcul des temps de trajet démarré",
  "jobId": "64f123abc456789012345678",
  "status": "pending",
  "progress": {
    "total": 5,
    "completed": 0,
    "percentage": 0
  },
  "estimatedDuration": "12 secondes"
}
```

### 2. Surveiller le progrès

```bash
GET /api/roadtrips/{idRoadtrip}/travel-time-jobs/{jobId}/status
```

**Réponse en cours:**
```json
{
  "jobId": "64f123abc456789012345678",
  "status": "running",
  "progress": {
    "total": 5,
    "completed": 3,
    "percentage": 60
  },
  "startedAt": "2025-07-01T10:30:00.000Z",
  "results": {
    "stepsProcessed": 3
  }
}
```

**Réponse terminée:**
```json
{
  "jobId": "64f123abc456789012345678",
  "status": "completed",
  "progress": {
    "total": 5,
    "completed": 5,
    "percentage": 100
  },
  "startedAt": "2025-07-01T10:30:00.000Z",
  "completedAt": "2025-07-01T10:30:45.000Z",
  "results": {
    "stepsProcessed": 5,
    "errors": [],
    "summary": {
      "totalDistance": 1234.56,
      "totalTravelTime": 890,
      "inconsistentSteps": 1
    }
  }
}
```

### 3. Consulter l'historique

```bash
GET /api/roadtrips/{idRoadtrip}/travel-time-jobs
```

## 📊 Statistiques fournies

- **Distance totale** : Somme des distances entre toutes les étapes (en km)
- **Temps de trajet total** : Somme des temps de trajet (en minutes)
- **Étapes incohérentes** : Nombre d'étapes avec des problèmes de timing
- **Erreurs par étape** : Détail des erreurs rencontrées

## ⚠️ Gestion des erreurs

### Erreurs possibles

- **409 Conflict** : Un calcul est déjà en cours
- **404 Not Found** : Roadtrip ou job non trouvé
- **401 Unauthorized** : Utilisateur non autorisé

### Erreurs par étape

Si certaines étapes échouent, le calcul continue et les erreurs sont reportées :

```json
{
  "results": {
    "errors": [
      {
        "stepId": "64f123abc456789012345679",
        "error": "Address not found for geocoding"
      }
    ]
  }
}
```

## 🔧 Utilisation côté client

### JavaScript/Fetch

```javascript
// 1. Lancer le calcul
const startResponse = await fetch(`/api/roadtrips/${roadtripId}/refresh-travel-times/async`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const { jobId } = await startResponse.json();

// 2. Surveiller le progrès
const pollStatus = async () => {
  const statusResponse = await fetch(`/api/roadtrips/${roadtripId}/travel-time-jobs/${jobId}/status`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const status = await statusResponse.json();
  
  // Mettre à jour l'UI avec status.progress.percentage
  updateProgressBar(status.progress.percentage);
  
  if (status.status === 'completed') {
    showResults(status.results.summary);
  } else if (status.status === 'running') {
    setTimeout(pollStatus, 2000); // Vérifier toutes les 2 secondes
  }
};

pollStatus();
```

### React Hook Example

```javascript
function useTravelTimeCalculation(roadtripId) {
  const [job, setJob] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const startCalculation = async () => {
    setIsLoading(true);
    const response = await fetch(`/api/roadtrips/${roadtripId}/refresh-travel-times/async`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const result = await response.json();
    setJob(result);
    pollProgress(result.jobId);
  };
  
  const pollProgress = async (jobId) => {
    const response = await fetch(`/api/roadtrips/${roadtripId}/travel-time-jobs/${jobId}/status`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const status = await response.json();
    setJob(status);
    
    if (status.status === 'running') {
      setTimeout(() => pollProgress(jobId), 2000);
    } else {
      setIsLoading(false);
    }
  };
  
  return { job, isLoading, startCalculation };
}
```

## 🚀 Avantages par rapport à l'API synchrone

1. **Non-bloquant** : L'utilisateur peut continuer à utiliser l'application
2. **Feedback visuel** : Barre de progression en temps réel
3. **Robustesse** : Gestion d'erreurs individuelle par étape
4. **Statistiques** : Données complètes sur le roadtrip
5. **Historique** : Suivi des calculs précédents

## 💡 Cas d'usage recommandés

- **Correction d'erreurs** : Recalculer après des modifications d'adresses
- **Optimisation** : Vérifier la cohérence temporelle du roadtrip
- **Maintenance** : Mise à jour périodique des données de trajet
- **Import/Migration** : Calcul initial pour des données importées

## 🔒 Sécurité

- Authentification JWT requise
- Vérification de propriété du roadtrip
- Limitation à un job concurrent par roadtrip
- Historique limité aux 7 derniers jours
