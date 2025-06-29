# API Settings Utilisateur – Documentation Technique

Base URL : `/settings`

---

## Authentification
Toutes les routes nécessitent un JWT valide (header `Authorization: Bearer <token>`).

---

## GET /settings
Récupère les paramètres personnalisés de l'utilisateur connecté.

**Réponse 200**
```json
{
  "_id": "<settingId>",
  "userId": "<userId>",
  "systemPrompt": "...",
  "algoliaSearchRadius": 50000
}
```
- Si aucun paramètre n'existe, un document par défaut est créé et retourné.
- `algoliaSearchRadius` : Rayon de recherche Algolia en mètres (défaut: 50000m = 50km)

---

## PUT /settings
Met à jour les paramètres personnalisés de l'utilisateur connecté.

**Body JSON**
```json
{
  "systemPrompt": "Nouveau prompt personnalisé...",
  "algoliaSearchRadius": 30000
}
```
- Seuls les champs fournis sont mis à jour.
- `algoliaSearchRadius` : Rayon de recherche en mètres (minimum: 1000m, maximum: 200000m)

**Réponse 200**
```json
{
  "_id": "<settingId>",
  "userId": "<userId>",
  "systemPrompt": "...",
  "algoliaSearchRadius": 30000
}
```

**Réponse 400** (rayon invalide)
```json
{
  "msg": "Le rayon de recherche doit être entre 1000m (1km) et 200000m (200km)",
  "currentValue": 500000
}
```

---

## Exemple d'utilisation (fetch JS)
```js
// Récupérer les paramètres
fetch('/settings', { headers: { Authorization: 'Bearer <token>' } })
  .then(r => r.json())
  .then(console.log);

// Mettre à jour le prompt système
fetch('/settings', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer <token>' },
  body: JSON.stringify({ systemPrompt: 'Mon nouveau prompt...' })
})
  .then(r => r.json())
  .then(console.log);

// Mettre à jour le rayon de recherche Algolia (rayon de 25km)
fetch('/settings', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer <token>' },
  body: JSON.stringify({ algoliaSearchRadius: 25000 })
})
  .then(r => r.json())
  .then(console.log);

// Mettre à jour plusieurs paramètres en une fois
fetch('/settings', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer <token>' },
  body: JSON.stringify({ 
    systemPrompt: 'Nouveau prompt...',
    algoliaSearchRadius: 75000  // 75km
  })
})
  .then(r => r.json())
  .then(console.log);
```

---

## Champs disponibles
- `systemPrompt` (string) : prompt IA personnalisé pour l'utilisateur
- `algoliaSearchRadius` (number) : rayon de recherche Algolia en mètres (défaut: 50000m = 50km, min: 1km, max: 200km)
- (ajoute d'autres champs dans le schéma si besoin)

---

## Erreurs possibles
- 401 : Non authentifié ou token invalide
- 500 : Erreur serveur

---

## Bonnes pratiques
- Toujours récupérer le paramètre avant usage (création automatique si absent)
- Valider côté front la longueur/pertinence du prompt avant envoi
