# Documentation technique – Intégration Algolia (Randonn## 8. Exemple d'appel (Node.js)

```js
// Recherche automatique de randonnées pour une activité
const res = await fetch(`/activities/${idActivity}/search/algolia?hitsPerPage=5`, {
  method: 'GET',
  headers: { Authorization: 'Bearer ...' }
});
const suggestions = await res.json();

// Association simplifiée avec un résultat Algolia
await fetch(`/activities/${idActivity}/link/algolia`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ...' },
  body: JSON.stringify({ 
    objectID: 'trail-10003291',
    name: 'Lundbreck Falls Trail',
    slug: 'canada/alberta/lundbreck-falls-trail',
    updateActivityName: true // optionnel: met à jour le nom de l'activité
  })
});

// Recherche manuelle de randonnées avec l'index correct
const res = await fetch('/activities/search/algolia', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ...' },
  body: JSON.stringify({ 
    query: 'Lundbreck Falls', 
    indexName: 'alltrails_primary_fr-FR',  // Index réel découvert
    hitsPerPage: 10 
  })
});
const hikes = await res.json();

// Associer une activité à une fiche Algolia (méthode classique)
await fetch(`/activities/${idActivity}/algolia`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ...' },
  body: JSON.stringify({ algoliaId: '123456789' })
});
```

## 9. Structure des données AllTrails/Algolia

**Champs disponibles dans les résultats de recherche :**
- `objectID` : identifiant unique (ex: 'trail-10003291')
- `name` : nom de la randonnée
- `avg_rating` : note moyenne (ex: 4.5)
- `num_reviews` : nombre d'avis (ex: 2832)
- `difficulty_rating` : difficulté (1-5)
- `length` : distance en mètres
- `elevation_gain` : dénivelé en mètres
- `_geoloc` : coordonnées GPS
- `slug` : URL slug de la randonnée
- `features` : tags (forest, waterfall, etc.)

**Accès aux avis détaillés :**
- ⚠️ Les avis complets ne sont pas directement dans l'index Algolia
- Nécessitent un scraping de la page web individuelle
- Protection anti-bot DataDome active
- Structure HTML : `div.feed-user-content.rounded` contient les avis

## 10. Bonnes pratiques Présentation
L’intégration Algolia permet :
- De rechercher des randonnées dans un index Algolia public (ex : Alltrails)
- D’associer une activité (type “Randonnée”) à une fiche Algolia (stockage de l’id)
- De récupérer les avis d’une randonnée via Algolia et d’en générer une synthèse IA

## 2. Variables d’environnement nécessaires

```
ALGOLIA_APP_ID=...        # ID de l’application Algolia (public)
ALGOLIA_API_KEY=...       # Search-only API key Algolia (publique)
```

## 3. Modèle Mongoose Activity

Ajout du champ optionnel :
```js
algoliaId: { type: String, default: '' } // Lien vers l’id Algolia de la randonnée
```

## 4. Fonctions utilitaires (server/utils/algoliaUtils.js)

### getAvisRandonnéeViaAlgolia(applicationId, apiKey, indexName, nomRandonnee, maxAvis)
- Recherche les avis d’une randonnée dans un index Algolia.
- Retourne un tableau d’avis (objets).

### genererSyntheseAvisRandonnéeAlgolia(applicationId, apiKey, indexName, nomRandonnee, maxAvis)
- Récupère les avis via Algolia puis génère une synthèse IA (utilise OpenAI).
- Retourne la synthèse (string).

## 5. Endpoints API backend

### Recherche de randonnées dans Algolia
- **POST** `/activities/search/algolia`
- Body : `{ query: string, indexName: string, hitsPerPage?: number }`
- Authentification requise
- Retourne : tableau de randonnées (résultats Algolia)

### Recherche automatique de randonnées pour une activité
- **GET** `/activities/:idActivity/search/algolia?hitsPerPage=10`
- Authentification requise
- **NOUVEAU** : Conversion automatique d'adresse en coordonnées
  - Si l'activité n'a pas de coordonnées mais a une adresse, conversion automatique via Google Maps
  - Sauvegarde des coordonnées dans l'activité pour éviter de refaire la conversion
  - Logs détaillés du processus de conversion
- **NOUVEAU** : Filtrage géographique côté serveur
  - Demande plus de résultats à Algolia (`hitsPerPage * 2`)
  - Filtre strictement les résultats au rayon de 50km
  - Utilise la distance Algolia ou calcule avec la formule de Haversine
  - Logs détaillés du processus de filtrage
  - Fallback sur recherche textuelle si pas de coordonnées
- Retourne : 
  ```json
  {
    "activity": { "id": "...", "name": "...", "address": "...", "currentAlgoliaId": "..." },
    "search": { 
      "query": "...", 
      "indexName": "...", 
      "hitsPerPage": 10, 
      "nbHits": 42,
      "radiusKm": 50,
      "filteredResults": true
    },
    "suggestions": [{
      "objectID": "...",
      "name": "...",
      "slug": "...",
      "rating": 4.2,
      "numReviews": 156,
      "difficulty": "Modéré",
      "length": 8.5,
      "elevationGain": 450,
      "location": { "lat": 45.123, "lng": 6.456 },
      "distance": 25400,      // Distance en mètres
      "distanceKm": 25.4,     // Distance en kilomètres  
      "features": [...],
      "url": "https://www.alltrails.com/..."
    }]
  }
  ```

### Associer un algoliaId à une activité
- **PATCH** `/activities/:idActivity/algolia`
- Body : `{ algoliaId: string }`
- Authentification requise
- Met à jour le champ `algoliaId` de l'activité

### Association simplifiée avec un résultat Algolia
- **POST** `/activities/:idActivity/link/algolia`
- Body : `{ objectID: string, name?: string, slug?: string, updateActivityName?: boolean }`
- Authentification requise
- Associe directement l'activité à un résultat de recherche Algolia

## 6. Utilisation côté backend

**Workflow recommandé :**
1. **Recherche automatique** : GET `/activities/:idActivity/search/algolia` pour obtenir des suggestions
2. **Association** : POST `/activities/:idActivity/link/algolia` pour lier l'activité à une randonnée
3. **Génération de synthèse** : utiliser les fonctions utilitaires avec l'algoliaId stocké

- Pour rechercher une randonnée : POST `/activities/search/algolia` avec le nom de l'activité.
- Pour associer une activité à une fiche Algolia : PATCH `/activities/:idActivity/algolia`.
- Pour générer une synthèse d'avis : utiliser la fonction utilitaire `genererSyntheseAvisRandonnée` (voir openaiUtils.js), en passant le nom ou l'id Algolia.

## 7. Sécurité
- Les credentials Algolia utilisés sont publics (search-only), mais il est recommandé de passer par le backend pour éviter l’extraction massive côté client.
- Les endpoints sont protégés par authentification.

## 8. Exemple d’appel (Node.js)

```js
// Recherche automatique de randonnées pour une activité
const res = await fetch(`/activities/${idActivity}/search/algolia?hitsPerPage=5`, {
  method: 'GET',
  headers: { Authorization: 'Bearer ...' }
});
const suggestions = await res.json();

// Association simplifiée avec un résultat Algolia
await fetch(`/activities/${idActivity}/link/algolia`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ...' },
  body: JSON.stringify({ 
    objectID: 'trail-10003291',
    name: 'Lundbreck Falls Trail',
    slug: 'canada/alberta/lundbreck-falls-trail',
    updateActivityName: true // optionnel: met à jour le nom de l'activité
  })
});

// Recherche manuelle de randonnées avec l'index correct
const res = await fetch('/activities/search/algolia', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ...' },
  body: JSON.stringify({ 
    query: 'Lundbreck Falls', 
    indexName: 'alltrails_primary_fr-FR',  // Index réel découvert
    hitsPerPage: 10 
  })
});
const hikes = await res.json();

// Associer une activité à une fiche Algolia (méthode classique)
await fetch(`/activities/${idActivity}/algolia`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ...' },
  body: JSON.stringify({ algoliaId: '123456789' })
});
```

## 9. Bonnes pratiques
- Stocker l’id Algolia dès que possible pour éviter les ambiguïtés lors de la récupération d’avis.
- Adapter le champ `filters` dans la recherche Algolia selon la structure de l’index utilisé.
- Limiter le nombre de résultats retournés pour éviter les abus.

## 10. Limites
- L’accès aux avis dépend de la structure et des droits de l’index Algolia cible.
- Les credentials “search-only” ne permettent pas de modifier les données Algolia.

## 6. Améliorations techniques

### Filtrage géographique côté serveur
- **Problème identifié** : Le paramètre `aroundRadius` d'Algolia peut parfois retourner des résultats au-delà du rayon spécifié
- **Solution implémentée** : 
  - Filtrage côté serveur pour garantir le respect strict du rayon de 50km
  - Utilisation de `getRankingInfo: true` pour récupérer les distances Algolia
  - Fonction de fallback avec la formule de Haversine si la distance Algolia n'est pas disponible
  - Logs détaillés pour le suivi et debug

### Calcul de distance de fallback
```javascript
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Rayon de la Terre en mètres
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance en mètres
}
```

### Optimisations
- Demande de `hitsPerPage * 2` résultats à Algolia pour compenser le filtrage
- Limitation finale au nombre demandé après filtrage géographique
- Inclusion des distances calculées dans la réponse JSON pour le frontend

## 15. Corrections techniques apportées

### Gestion des coordonnées pour la recherche Algolia

**Problème identifié :** La fonction `getCoordinates` de GoogleMapsUtils retourne les coordonnées sous forme de string (format "lat lng"), mais Algolia nécessite des coordonnées sous forme d'objet `{lat, lng}`.

**Solution implémentée :** Création d'une fonction dédiée `getCoordinatesForAlgolia` dans le contrôleur d'activité qui :

1. **Appelle `getCoordinates`** pour obtenir la string de coordonnées
2. **Parse la string** en utilisant `split(/\s+/)` pour gérer les espaces multiples 
3. **Valide et convertit** les valeurs en nombres
4. **Retourne un objet** `{lat: number, lng: number}` utilisable par Algolia
5. **Gère les erreurs** en retournant `{lat: null, lng: null}`

```javascript
async function getCoordinatesForAlgolia(address) {
    if (!address) {
        return { lat: null, lng: null };
    }
    
    try {
        // getCoordinates retourne une string au format "lat lng"
        const coordinatesString = await getCoordinates(address);
        
        if (!coordinatesString || typeof coordinatesString !== 'string') {
            return { lat: null, lng: null };
        }
        
        // Parser la string avec regex pour gérer les espaces multiples
        const parts = coordinatesString.trim().split(/\s+/);
        if (parts.length !== 2) {
            return { lat: null, lng: null };
        }
        
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        
        if (isNaN(lat) || isNaN(lng)) {
            return { lat: null, lng: null };
        }
        
        return { lat, lng };
        
    } catch (error) {
        console.error('Erreur lors de la conversion d\'adresse pour Algolia:', error.message);
        return { lat: null, lng: null };
    }
}
```

**Avantages de cette approche :**
- ✅ Aucune modification de la logique existante de `getCoordinates`
- ✅ Pas d'impact sur les autres parties du projet (création d'activités, stages, etc.)
- ✅ Fonction spécifique et testable pour la recherche Algolia
- ✅ Gestion robuste des erreurs et formats inattendus
- ✅ Compatibilité maintenue avec le reste du codebase

**Tests effectués :**
- Adresses valides (Lundbreck Falls, Paris, Chamonix) ✅
- Adresses vides ou nulles ✅  
- Adresses invalides ✅
- Gestion des espaces multiples dans la string retournée ✅

---
Pour toute évolution, adapter les fonctions utilitaires et les routes selon la structure réelle de l’index Algolia utilisé.
