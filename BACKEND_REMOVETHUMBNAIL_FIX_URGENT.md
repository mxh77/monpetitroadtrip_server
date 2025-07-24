# 🚨 FIX URGENT - Remove Thumbnail Backend

## 🎯 Problème Critical
Le backend ignore complètement le flag `removeThumbnail` envoyé par le mobile !

## ⚡ Solution EXPRESS (5 lignes)

**Fichier :** `server/controllers/accommodationController.js`
**Méthode :** `updateAccommodation`
**Position :** Après ligne ~205 (`accommodation.notes = data.notes || accommodation.notes;`)

### Code à Ajouter IMMÉDIATEMENT

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

## 🔥 Urgence Justifiée

- ❌ **Mobile cassé** : Les utilisateurs ne peuvent plus supprimer les thumbnails
- ❌ **Données polluées** : Les thumbnails s'accumulent en base
- ❌ **UX dégradée** : L'app mobile semble buggée
- ✅ **Fix simple** : 1 seul endroit à modifier

## ⏱️ Temps Estimé
**2 minutes** pour implémenter + **3 minutes** pour tester = **5 minutes total**

## 🧪 Test Rapide
```bash
# Tester depuis mobile ou Postman
PUT /api/accommodations/{id}
Content-Type: application/json

{
    "name": "Test Hotel",
    "removeThumbnail": true
}
```

## ✅ Résultat Attendu
- Thumbnail supprimée de la base de données
- Fichier supprimé du Google Cloud Storage  
- `accommodation.thumbnail = null`
- Mobile fonctionne à nouveau

---
**🎯 PRIORITÉ MAXIMALE - À TRAITER IMMÉDIATEMENT**
