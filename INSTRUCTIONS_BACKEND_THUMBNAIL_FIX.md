# Instructions Backend - Fix Thumbnail Removal

## 🎯 Problème Identifié

Le backend ne traite pas le flag `removeThumbnail` envoyé par le mobile lors de la mise à jour des accommodations.

### Situation Actuelle
- **Mobile envoie** : `{"name": "Hôtel", "removeThumbnail": true}`
- **Backend reçoit** et ignore complètement `removeThumbnail`
- **Backend met à jour** seulement `name` et garde la thumbnail
- **Mobile pense** que la suppression a fonctionné (pas d'erreur côté API)
- **Résultat** : Thumbnail toujours présente en base

## 📍 Localisation du Code

**Fichier :** `server/controllers/accommodationController.js`
**Méthode :** `updateAccommodation`
**Ligne approximative :** 205-210 (après la mise à jour des champs obligatoires)

## 🔧 Solution à Implémenter

### Code à Ajouter

Après la ligne `accommodation.notes = data.notes || accommodation.notes;` (ligne ~205), ajouter :

```javascript
// Gérer la suppression de thumbnail si demandée
if (data.removeThumbnail === true) {
    console.log('Removing thumbnail as requested...');
    if (accommodation.thumbnail) {
        const oldThumbnail = await File.findById(accommodation.thumbnail);
        if (oldThumbnail) {
            await deleteFromGCS(oldThumbnail.url);
            await oldThumbnail.deleteOne();
        }
        accommodation.thumbnail = null;
    }
}
```

### Logique du Fix

1. **Vérification du flag** : `data.removeThumbnail === true`
2. **Si thumbnail existe** : Récupérer le fichier thumbnail
3. **Suppression GCS** : Supprimer le fichier du Google Cloud Storage
4. **Suppression DB** : Supprimer l'enregistrement File de la base
5. **Reset thumbnail** : Mettre `accommodation.thumbnail = null`

## 🔄 Workflow Complet

### Avant le Fix
```
Mobile → {"removeThumbnail": true} → Backend ignore → Thumbnail reste
```

### Après le Fix
```
Mobile → {"removeThumbnail": true} → Backend traite → Thumbnail supprimée
```

## ⚠️ Points d'Attention

1. **Ordre d'exécution** : Le fix doit être placé AVANT la gestion des nouveaux fichiers
2. **Gestion des erreurs** : Ajouter des try/catch si nécessaire
3. **Logs** : Conserver les console.log pour débuggage
4. **Test** : Vérifier que la suppression fonctionne sur mobile et web

## 🧪 Tests à Effectuer

1. **Test suppression** : Envoyer `removeThumbnail: true` depuis mobile
2. **Test conservation** : Envoyer mise à jour sans `removeThumbnail`
3. **Test remplacement** : Envoyer `removeThumbnail: true` + nouveau fichier thumbnail
4. **Vérification GCS** : S'assurer que les fichiers sont bien supprimés du cloud

## 📝 Impact

- **Priorité** : URGENT - Fonctionnalité cassée côté mobile
- **Complexité** : SIMPLE - 5 lignes de code
- **Risque** : FAIBLE - Code isolé et logique claire
- **Bénéfice** : ÉLEVÉ - Fix complet du problème
