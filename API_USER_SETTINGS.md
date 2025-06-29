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
  "systemPrompt": "..."
}
```
- Si aucun paramètre n'existe, un document par défaut est créé et retourné.

---

## PUT /settings
Met à jour les paramètres personnalisés de l'utilisateur connecté.

**Body JSON**
```json
{
  "systemPrompt": "Nouveau prompt personnalisé..."
}
```
- Seuls les champs fournis sont mis à jour.

**Réponse 200**
```json
{
  "_id": "<settingId>",
  "userId": "<userId>",
  "systemPrompt": "..."
}
```

---

## Exemple d'utilisation (fetch JS)
```js
// Récupérer les paramètres
fetch('/settings', { headers: { Authorization: 'Bearer <token>' } })
  .then(r => r.json())
  .then(console.log);

// Mettre à jour le prompt
fetch('/settings', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer <token>' },
  body: JSON.stringify({ systemPrompt: 'Mon nouveau prompt...' })
})
  .then(r => r.json())
  .then(console.log);
```

---

## Champs disponibles
- `systemPrompt` (string) : prompt IA personnalisé pour l'utilisateur
- (ajoute d'autres champs dans le schéma si besoin)

---

## Erreurs possibles
- 401 : Non authentifié ou token invalide
- 500 : Erreur serveur

---

## Bonnes pratiques
- Toujours récupérer le paramètre avant usage (création automatique si absent)
- Valider côté front la longueur/pertinence du prompt avant envoi
