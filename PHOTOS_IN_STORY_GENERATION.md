# 📸 Intégration des Photos dans la Génération de Récits

## Vue d'ensemble

Cette fonctionnalité permet d'enrichir automatiquement les récits de steps en analysant les photos associées aux hébergements et activités via **GPT-4 Vision**. L'IA peut maintenant "voir" vos photos et les décrire dans le récit pour une expérience plus immersive.

## Fonctionnement

### Détection automatique

L'endpoint principal `/api/steps/{idStep}/story` détecte automatiquement la présence de photos :

```javascript
// Si photos trouvées → GPT-4o Vision
// Si pas de photos → GPT-4o-mini (standard)
```

### Types de photos analysées

1. **Photos d'hébergements** (`accommodation`)
   - Photos uploadées dans les accommodations
   - Miniatures (thumbnails) des hébergements

2. **Photos d'activités** (`activity`)
   - Photos uploadées dans les activités
   - Miniatures (thumbnails) des activités

## Endpoints

### Génération standard (automatique)
```http
GET /api/steps/{idStep}/story
```
- Détecte automatiquement les photos
- Utilise GPT-4 Vision si photos disponibles
- Sinon utilise GPT-4o-mini

### Génération forcée avec photos
```http
GET /api/steps/{idStep}/story/with-photos
```
- Force l'utilisation de GPT-4 Vision
- Retourne une erreur si aucune photo n'est trouvée
- Recommandé pour tester l'analyse de photos

### Génération asynchrone
```http
POST /api/steps/{idStep}/story/async
```
- Supporte également l'analyse de photos
- Utile pour les steps avec beaucoup de photos

## Structure des réponses

### Avec photos
```json
{
  "stepId": "648a1b2c3d4e5f6789012345",
  "stepName": "Séjour à Paris",
  "story": "Votre aventure parisienne commence avec l'arrivée à l'Hôtel des Grands Boulevards, dont la façade haussmannienne aux balcons ornés de fer forgé...",
  "model": "gpt-4o",
  "photosAnalyzed": 8,
  "photosSources": [
    {"source": "Hébergement: Hôtel des Grands Boulevards", "type": "accommodation"},
    {"source": "Activité: Visite du Louvre", "type": "activity"},
    {"source": "Activité: Dîner Tour Eiffel (miniature)", "type": "activity_thumbnail"}
  ],
  "dataUsed": {
    "stepInfo": true,
    "accommodationsCount": 1,
    "activitiesCount": 3,
    "photosCount": 8
  },
  "forcePhotos": false
}
```

### Sans photos
```json
{
  "stepId": "648a1b2c3d4e5f6789012345",
  "story": "Votre séjour commence avec l'arrivée à Paris...",
  "model": "gpt-4o-mini",
  "photosAnalyzed": 0,
  "dataUsed": {
    "photosCount": 0
  }
}
```

## Avantages

### Récits enrichis
- **Descriptions visuelles authentiques** basées sur vos vraies photos
- **Détails atmosphériques** : couleurs, architecture, ambiance
- **Immersion accrue** dans les souvenirs de voyage

### Exemples de différences

**Standard (sans photos) :**
> "Vous arrivez à l'hôtel pour votre séjour de 2 nuits à Paris."

**Avec photos :**
> "Vous arrivez à l'Hôtel des Grands Boulevards, dont la façade Belle Époque aux tons crème contraste élégamment avec les volets verts. L'entrée ornée de colonnes doriques vous accueille dans un hall aux murs lambrisés d'acajou."

## Configuration technique

### Modèles utilisés
- **GPT-4o** : Pour l'analyse avec photos (Vision)
- **GPT-4o-mini** : Pour la génération standard (texte seul)

### Limites
- Maximum 10 photos par upload (limitation existante)
- Taille des images optimisée automatiquement
- Coût plus élevé avec GPT-4 Vision

### Formats supportés
- Tous les formats d'images supportés par l'upload existant
- Images stockées sur Google Cloud Storage
- URLs accessibles publiquement

## Gestion des erreurs

### Aucune photo trouvée (endpoint forcé)
```json
{
  "msg": "Aucune photo trouvée pour ce step",
  "error": "Ce step ne contient aucune photo d'hébergement ou d'activité à analyser"
}
```

### Service IA indisponible
```json
{
  "msg": "Service temporarily unavailable",
  "error": "Unable to generate story due to AI service error"
}
```

## Tests

### Script de test
Utilisez `testStepStoryWithPhotos.js` pour tester :
```bash
node testStepStoryWithPhotos.js
```

### Tests recommandés
1. **Step avec photos** : Vérifier l'analyse correcte
2. **Step sans photos** : Vérifier le fallback
3. **Comparaison** : Avec/sans photos pour le même step

## Bonnes pratiques

### Pour de meilleurs résultats
1. **Photos de qualité** : Images claires et bien cadrées
2. **Diversité** : Photos d'extérieur, intérieur, détails
3. **Pertinence** : Photos liées au lieu/activité

### Utilisation recommandée
- Activer pour les steps importants du voyage
- Tester d'abord avec l'endpoint dédié
- Comparer les résultats avec/sans photos

## Évolutions futures

### Fonctionnalités planifiées
- Analyse de photos des steps eux-mêmes
- Support des vidéos courtes
- Reconnaissance d'objets et lieux spécifiques
- Génération de légendes automatiques

### Optimisations
- Cache intelligent des analyses de photos
- Sélection automatique des meilleures photos
- Compression optimisée pour l'IA

## Support

Pour toute question sur cette fonctionnalité :
1. Consultez les logs du serveur pour les détails d'exécution
2. Vérifiez la présence des photos via les endpoints dédiés
3. Testez avec l'endpoint forcé pour diagnostiquer les problèmes

## Configuration

### Paramètres utilisateur

L'utilisation des photos dans la génération de récits est maintenant **paramétrable par utilisateur** via l'endpoint `/api/settings`.

#### Activation/Désactivation

```http
PUT /api/settings
Content-Type: application/json
Authorization: Bearer {token}

{
  "enablePhotosInStories": true  // true = activé, false = désactivé
}
```

#### Paramètre par défaut
- **Valeur par défaut** : `true` (activé)
- **Type** : `boolean`
- **Impact** : Contrôle l'utilisation de GPT-4 Vision vs GPT-4o-mini

### Récupération des paramètres

```http
GET /api/settings
Authorization: Bearer {token}
```

Réponse :
```json
{
  "userId": "...",
  "systemPrompt": "...",
  "algoliaSearchRadius": 50000,
  "dragSnapInterval": 15,
  "enablePhotosInStories": true
}
```
