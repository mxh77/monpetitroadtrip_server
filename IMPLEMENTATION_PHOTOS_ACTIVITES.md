# Implémentation Backend - Onglet Photos pour les Activités

## Vue d'ensemble
Cette implémentation ajoute la gestion complète des photos pour les activités, similaire à la gestion existante des documents.

## Fichiers modifiés

### 1. `/server/routes/activityRoutes.js`
**Routes ajoutées :**
- `GET /:idActivity/photos` - Récupère toutes les photos d'une activité
- `PATCH /:idActivity/photos` - Ajoute des photos à une activité (max 10 photos)
- `DELETE /:idActivity/photos/:idPhoto` - Supprime une photo spécifique

### 2. `/server/controllers/activityController.js`
**Méthodes ajoutées :**

#### `getPhotosFromActivity(req, res)`
- Récupère toutes les photos d'une activité
- Vérifie l'autorisation utilisateur
- Populle les données des fichiers photos

#### `addPhotosToActivity(req, res)`
- Ajoute des photos à une activité
- Upload vers Google Cloud Storage
- Crée des entrées File avec type 'photo'
- Limite de 10 photos par upload

#### `deletePhotoFromActivity(req, res)`
- Supprime une photo spécifique
- Supprime le fichier de Google Cloud Storage
- Met à jour la liste des photos de l'activité

## Structure des données

### Modèle Activity
Le champ `photos` existe déjà dans le modèle :
```javascript
photos: [{ type: Schema.Types.ObjectId, ref: 'File' }]
```

### Modèle File
Les photos utilisent le même modèle File que les documents avec `type: 'photo'`

## Configuration Multer
Utilise la même configuration que les documents :
- Stockage en mémoire (`multer.memoryStorage()`)
- Limite de 10 fichiers par upload
- Champ nommé 'photos'

## Sécurité
- Toutes les routes sont protégées par le middleware `auth`
- Vérification de propriété de l'activité avant toute opération
- Validation des paramètres d'entrée

## Tests
Un fichier de test `testActivityPhotos.js` a été créé pour valider :
- Récupération des photos
- Ajout de nouvelles photos
- Suppression de photos
- Intégrité des données

## Usage Frontend
Les routes sont maintenant disponibles pour votre frontend :

```javascript
// Récupérer les photos
GET /api/activities/:idActivity/photos

// Ajouter des photos
PATCH /api/activities/:idActivity/photos
Content-Type: multipart/form-data
Body: FormData avec champ 'photos'

// Supprimer une photo
DELETE /api/activities/:idActivity/photos/:idPhoto
```

## Points importants
1. Les photos sont stockées dans Google Cloud Storage (même système que les documents)
2. Chaque photo est référencée dans la base MongoDB via le modèle File
3. Les permissions sont vérifiées à chaque opération
4. La suppression nettoie à la fois GCS et MongoDB
5. Support de 10 photos maximum par upload (configurable)

## Prochaines étapes pour le Frontend
1. Créer un composant similaire à l'onglet Fichiers
2. Implémenter l'upload multiple d'images
3. Ajouter la prévisualisation des images
4. Gérer la suppression avec confirmation
5. Optionnel : ajouter la réorganisation par drag & drop

## Note de cohérence
Cette implémentation a également été appliquée aux **Accommodations** avec les mêmes patterns et structures. Voir `IMPLEMENTATION_PHOTOS_ACCOMMODATIONS.md` pour les détails spécifiques aux hébergements.
