# Filtrage des Trails Algolia

## Vue d'ensemble

Cette fonctionnalité garantit que seuls les véritables trails (sentiers de randonnée) sont retournés par les recherches Algolia, en filtrant sur les objectID qui commencent par "trail-".

## Problème résolu

L'index Algolia AllTrails peut contenir différents types de contenus :
- **Trails** (sentiers) : `objectID` commence par "trail-" (ex: "trail-10944582")
- **Autres contenus** : POI, photos, etc. avec des objectID différents

Sans filtrage, la recherche pourrait retourner des contenus non pertinents.

## Implémentation

### Filtrage dans les contrôleurs

**`activityController.js` - Fonction `searchAlgoliaHikesForActivity`**
```javascript
// Filtrage pour ne récupérer que les trails (objectID commence par "trail-")
const originalCountBeforeTrailFilter = hits.length;
hits = hits.filter(hit => hit.objectID && hit.objectID.startsWith('trail-'));

console.log(`🔍 Filtrage trails: ${originalCountBeforeTrailFilter} → ${hits.length} résultats (objectID commence par "trail-")`);
```

### Filtrage dans les utilitaires

**`server/utils/scrapingUtils.js`**
```javascript
const allHits = response.data.hits;
const trailsOnly = allHits.filter(hit => hit.objectID && hit.objectID.startsWith('trail-'));

console.log(`🔍 Filtrage trails dans scrapingUtils: ${allHits.length} → ${trailsOnly.length} résultats`);
```

**`server/utils/hikeUtils.js`**
```javascript
const allHits = response.data.hits;
const trailsOnly = allHits.filter(hit => hit.objectID && hit.objectID.startsWith('trail-'));

console.log(`🔍 Filtrage trails dans hikeUtils: ${allHits.length} → ${trailsOnly.length} résultats`);
```

## Ordre de filtrage

Pour une recherche optimale, les filtres sont appliqués dans cet ordre :

1. **Récupération Algolia** : Requête vers l'index avec le rayon configuré
2. **Filtrage trails** : Conservation des objectID commençant par "trail-"
3. **Filtrage géographique** : Application stricte du rayon utilisateur (si coordonnées disponibles)
4. **Limitation** : Réduction au nombre de résultats demandé

## Logs de debugging

Les logs incluent maintenant le filtrage des trails :

```
🔍 Filtrage trails: 45 → 32 résultats (objectID commence par "trail-")
📏 Filtrage géographique: 32 → 18 résultats (rayon 25km)
```

## Endpoints affectés

Tous les endpoints de recherche Algolia appliquent maintenant ce filtrage :

- `GET /activities/:id/search/algolia`
- `GET /steps/:id/hikes-algolia`
- `GET /steps/:id/hikes-suggestion`

## Validation

### Exemples d'objectID valides (conservés)
- `trail-10944582`
- `trail-123456`
- `trail-9876543`

### Exemples d'objectID invalides (filtrés)
- `poi-123456`
- `photo-789012`
- `map-345678`
- `user-111222`

## Impact sur les performances

- **Positif** : Réduction du nombre de résultats à traiter
- **Négligeable** : Le filtrage côté client est très rapide
- **Amélioration** : Résultats plus pertinents pour l'utilisateur

## Tests

Pour tester le filtrage des trails :

```bash
# Recherche normale - vérifiez les logs pour voir le filtrage
curl -X GET "http://localhost:3001/api/activities/YOUR_ACTIVITY_ID/search/algolia" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Dans les logs, vous devriez voir :
```
🔍 Filtrage trails: X → Y résultats (objectID commence par "trail-")
```

## Évolutions futures possibles

1. **Filtrage configurable** : Permettre à l'utilisateur de choisir les types de contenus
2. **Filtres multiples** : Ajouter d'autres critères de filtrage (difficulté, longueur, etc.)
3. **Cache des résultats** : Optimiser les performances pour les recherches répétées

## Compatibilité

- ✅ **Rétrocompatible** : Aucun impact sur l'API existante
- ✅ **Transparent** : Le filtrage est automatique et invisible pour le frontend
- ✅ **Logs détaillés** : Facilite le debugging et le monitoring
