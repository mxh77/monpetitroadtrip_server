# Fonctionnalité Photos dans la Génération de Récits

## Vue d'ensemble

Cette fonctionnalité permet aux utilisateurs de contrôler si la génération de récits de steps doit inclure l'analyse des photos liées aux hébergements et activités. Elle est paramétrable via les UserSettings de chaque utilisateur.

## Configuration Utilisateur

### Paramètre UserSetting

**Champ:** `enablePhotosInStories`
- **Type:** Boolean
- **Valeur par défaut:** `true`
- **Description:** Active ou désactive l'analyse des photos dans la génération de récits

```javascript
// Modèle UserSetting
{
  enablePhotosInStories: { 
    type: Boolean, 
    default: true 
  }
}
```

### API de Configuration

**Endpoint:** `PUT /api/settings`

**Corps de requête:**
```json
{
  "enablePhotosInStories": false
}
```

**Réponse:**
```json
{
  "userId": "64a1b2c3d4e5f6789",
  "enablePhotosInStories": false,
  "systemPrompt": "...",
  "algoliaSearchRadius": 50000,
  "dragSnapInterval": 15
}
```

## Fonctionnement Technique

### Logique Conditionnelle

Dans les contrôleurs de génération de récit (`stepController.js`), la logique suit ce schéma :

```javascript
// Récupération des settings utilisateur
const userSettings = await UserSetting.findOne({ userId: req.user.id });
const enablePhotosInStories = userSettings?.enablePhotosInStories !== false; // Par défaut true

// Collecte des photos seulement si activé
let photos = [];
if (enablePhotosInStories) {
    photos = await collectPhotosFromAccommodationsAndActivities(stepData);
}

// Génération du récit selon la configuration
if (enablePhotosInStories && photos.length > 0) {
    // Utilisation de GPT-4 Vision avec photos
    result = await genererRecitStepAvecPhotos(stepData, systemPrompt, photos);
} else {
    // Utilisation du modèle texte standard
    result = await genererRecitStep(stepData, systemPrompt);
}
```

### Fonctions Impliquées

#### `genererRecitStepAvecPhotos(stepData, systemPrompt, photos)`

**Localisation:** `server/utils/openaiUtils.js`

**Comportement:**
- Si `photos.length > 0` : Utilise GPT-4o (Vision) pour analyser les images
- Si `photos.length === 0` : Utilise GPT-4o-mini (texte seul)

**Retour:**
```javascript
{
  story: "Récit généré...",
  prompt: "Prompt utilisé...",
  photosAnalyzed: 2,
  model: "gpt-4o-vision" // ou "gpt-4o-mini"
}
```

#### `genererRecitStep(stepData, systemPrompt)`

**Localisation:** `server/utils/openaiUtils.js`

**Comportement:**
- Génération de récit sans analyse d'images
- Utilise toujours GPT-4o-mini (plus économique)

## Contrôleurs Impactés

La fonctionnalité est intégrée dans tous les contrôleurs de génération de récit :

1. **`generateStepStory`** - Génération initiale de récit
2. **`regenerateStepStory`** - Régénération de récit existant  
3. **`generateStepStoryAsync`** - Génération asynchrone de récit

## Cas d'Usage

### Utilisateur avec Photos Activées (par défaut)

```javascript
// UserSetting
{ enablePhotosInStories: true }

// Comportement
- ✅ Collecte les photos des hébergements et activités
- ✅ Utilise GPT-4 Vision si des photos sont disponibles
- ✅ Récit enrichi avec détails visuels
- 💰 Coût plus élevé (GPT-4o)
```

### Utilisateur avec Photos Désactivées

```javascript
// UserSetting  
{ enablePhotosInStories: false }

// Comportement
- ❌ Ignore les photos même si elles existent
- ✅ Utilise toujours le modèle texte standard
- ✅ Récit basé uniquement sur les données textuelles
- 💰 Coût réduit (GPT-4o-mini)
```

## Avantages

### Pour l'Utilisateur
- **Contrôle des coûts** : Peut désactiver les fonctionnalités coûteuses
- **Préférences personnelles** : Certains préfèrent les récits purement textuels
- **Performance** : Génération plus rapide sans analyse d'images

### Pour l'Application
- **Flexibilité** : Adaptation aux besoins de chaque utilisateur
- **Optimisation des coûts** : Réduction des appels à GPT-4o Vision
- **Évolutivité** : Facilite l'ajout de nouvelles options

## Tests

Un script de test complet est disponible : `testPhotosInStories.js`

**Lancement des tests :**
```bash
node testPhotosInStories.js
```

**Tests inclus :**
- ✅ Logique conditionnelle des settings
- ✅ Validation du modèle UserSetting
- ✅ Simulation de l'API settings
- ✅ Tests avec/sans photos (si clé OpenAI disponible)

## Migration et Compatibilité

### Utilisateurs Existants
- La valeur par défaut `enablePhotosInStories: true` maintient le comportement actuel
- Aucune migration de données nécessaire
- Rétrocompatibilité totale

### Nouveaux Utilisateurs
- Création automatique des settings avec valeurs par défaut
- Fonctionnalité photos activée par défaut pour une expérience riche

## Monitoring et Debug

### Logs Disponibles

```javascript
// Génération avec photos
console.log(`\n===== GÉNÉRATION AVEC ${photos.length} PHOTOS =====`);

// Génération sans photos  
console.log("\n===== GÉNÉRATION SANS PHOTOS =====");

// Détail des photos analysées
photos.forEach((photo, index) => {
    console.log(`Photo ${index + 1}: ${photo.source} - ${photo.url}`);
});
```

### Métriques Suggérées

- Pourcentage d'utilisateurs avec photos activées/désactivées
- Coût moyen par récit selon la configuration
- Temps de génération avec/sans photos
- Satisfaction utilisateur selon le type de récit

## Évolutions Futures

### Fonctionnalités Potentielles
- **Limite de photos** : Paramètre pour contrôler le nombre max de photos analysées
- **Qualité d'analyse** : Choix entre 'low', 'high', 'auto' pour l'analyse des images
- **Types de photos** : Activer/désactiver spécifiquement photos d'hébergements vs activités
- **Modèle personnalisé** : Choix du modèle IA pour chaque utilisateur

### Optimisations Techniques
- **Cache des analyses** : Éviter de ré-analyser les mêmes photos
- **Compression d'images** : Réduire les coûts d'API
- **Analyse asynchrone** : Décorréler l'analyse des photos de la génération de récit
