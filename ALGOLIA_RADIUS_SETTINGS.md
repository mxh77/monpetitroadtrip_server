# Rayon de Recherche Algolia Paramétrable

Cette fonctionnalité permet aux utilisateurs de personnaliser le rayon de recherche utilisé pour les requêtes Algolia dans l'application.

## Vue d'ensemble

- **Paramètre** : `algoliaSearchRadius` dans les paramètres utilisateur
- **Type** : Number (entier)
- **Unité** : Mètres
- **Valeur par défaut** : 50000 (50km)
- **Minimum** : 1000 (1km)
- **Maximum** : 200000 (200km)

## Endpoints affectés

### Activités
- `GET /activities/:idActivity/search/algolia` - Recherche automatique de randonnées pour une activité
  - Utilise le rayon personnalisé de l'utilisateur
  - Log du rayon utilisé dans la console : `searchRadius: "XXkm (paramètre utilisateur)"`

### Steps
- `GET /steps/:idStep/hikes-algolia` - Recherche de randonnées pour un step
- `GET /steps/:idStep/hikes-suggestion` - Suggestions de randonnées pour un step
  - Les deux utilisent le rayon personnalisé de l'utilisateur
  - Log du rayon utilisé : `Using user search radius: XXkm`

## Configuration

### Récupérer le paramètre actuel
```js
const response = await fetch('/settings', {
  headers: { Authorization: 'Bearer <token>' }
});
const settings = await response.json();
console.log('Rayon actuel:', settings.algoliaSearchRadius, 'mètres');
```

### Modifier le rayon de recherche
```js
// Rayon de 25km (25000 mètres)
const response = await fetch('/settings', {
  method: 'PUT',
  headers: { 
    'Content-Type': 'application/json',
    Authorization: 'Bearer <token>' 
  },
  body: JSON.stringify({ algoliaSearchRadius: 25000 })
});
```

## Validation

Le système valide automatiquement la valeur :
- **Minimum** : 1000m (1km) - pour éviter des recherches trop restreintes
- **Maximum** : 200000m (200km) - pour éviter des recherches trop larges

En cas de valeur invalide :
```json
{
  "msg": "Le rayon de recherche doit être entre 1000m (1km) et 200000m (200km)",
  "currentValue": 500000
}
```

## Exemples de rayons suggérés

| Distance | Usage recommandé |
|----------|------------------|
| 10km     | Recherche très locale, zone urbaine dense |
| 25km     | Recherche locale étendue |
| 50km     | **Défaut** - Bon équilibre pour la plupart des cas |
| 75km     | Recherche régionale |
| 100km    | Recherche large, zones rurales |
| 150km+   | Recherche très large, destinations spécialisées |

## Impact sur les performances

- **Rayons courts** (< 25km) : Recherches plus rapides, moins de résultats
- **Rayons longs** (> 100km) : Plus de résultats à filtrer, traitement plus long

## Comportement technique

1. **Récupération automatique** : Le rayon est récupéré automatiquement depuis les paramètres utilisateur
2. **Création automatique** : Si l'utilisateur n'a pas de paramètres, ils sont créés avec la valeur par défaut
3. **Fallback** : En cas d'erreur, la valeur par défaut (50km) est utilisée
4. **Filtrage trails** : Seuls les résultats avec un objectID commençant par "trail-" sont conservés
5. **Filtrage côté serveur** : Le rayon est appliqué strictement côté serveur pour garantir la précision
6. **Logs détaillés** : Le rayon utilisé et le filtrage trails sont toujours affichés dans les logs

## Considérations de migration

Les utilisateurs existants sans paramètres configurés :
- Continueront à utiliser le rayon par défaut de 50km
- Peuvent modifier leur rayon à tout moment via l'API `/settings`
- Les paramètres sont créés automatiquement lors de la première recherche
