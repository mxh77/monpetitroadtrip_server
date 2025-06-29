# Implémentation Backend - Onglet Photos pour les Accommodations

## Vue d'ensemble
Cette implémentation ajoute la gestion complète des photos pour les accommodations (hébergements), suivant le même pattern que pour les activités et documents.

## Fichiers modifiés

### 1. `/server/routes/accommodationRoutes.js`
**Routes ajoutées :**
- `GET /:idAccommodation/photos` - Récupère toutes les photos d'un hébergement
- `PATCH /:idAccommodation/photos` - Ajoute des photos à un hébergement (max 10 photos)
- `DELETE /:idAccommodation/photos/:idPhoto` - Supprime une photo spécifique

### 2. `/server/controllers/accommodationController.js`
**Méthodes ajoutées :**

#### `getPhotosFromAccommodation(req, res)`
- Récupère toutes les photos d'un hébergement
- Vérifie l'autorisation utilisateur
- Populle les données des fichiers photos

#### `addPhotosToAccommodation(req, res)`
- Ajoute des photos à un hébergement
- Upload vers Google Cloud Storage
- Crée des entrées File avec type 'photo'
- Limite de 10 photos par upload

#### `deletePhotoFromAccommodation(req, res)`
- Supprime une photo spécifique
- Supprime le fichier de Google Cloud Storage
- Met à jour la liste des photos de l'hébergement

## Structure des données

### Modèle Accommodation
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
- Vérification de propriété de l'hébergement avant toute opération
- Validation des paramètres d'entrée

## Tests
Un fichier de test `testAccommodationPhotos.js` a été créé pour valider :
- Récupération des photos
- Ajout de nouvelles photos
- Suppression de photos
- Intégrité des données

## Usage Frontend
Les routes sont maintenant disponibles pour votre frontend :

```javascript
// Récupérer les photos
GET /api/accommodations/:idAccommodation/photos

// Ajouter des photos
PATCH /api/accommodations/:idAccommodation/photos
Content-Type: multipart/form-data
Body: FormData avec champ 'photos'

// Supprimer une photo
DELETE /api/accommodations/:idAccommodation/photos/:idPhoto
```

## Points importants
1. Les photos sont stockées dans Google Cloud Storage (même système que les documents)
2. Chaque photo est référencée dans la base MongoDB via le modèle File
3. Les permissions sont vérifiées à chaque opération
4. La suppression nettoie à la fois GCS et MongoDB
5. Support de 10 photos maximum par upload (configurable)

## Cohérence avec les Activités
Cette implémentation suit exactement le même pattern que les activités :
- Mêmes noms de méthodes (en remplaçant Activity par Accommodation)
- Même structure de routes
- Même gestion des erreurs et permissions
- Même logique de stockage et suppression

## Prochaines étapes pour le Frontend
1. Créer un composant Photos similaire à celui des activités
2. Réutiliser la logique d'upload multiple d'images
3. Ajouter la prévisualisation des images d'hébergement
4. Gérer la suppression avec confirmation
5. Optionnel : permettre la définition d'une photo principale

## Exemple d'utilisation Frontend (React/JS)
```javascript
// Service pour les photos d'accommodations
class AccommodationPhotoService {
    static async getPhotos(accommodationId) {
        const response = await fetch(`/api/accommodations/${accommodationId}/photos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.json();
    }

    static async addPhotos(accommodationId, formData) {
        const response = await fetch(`/api/accommodations/${accommodationId}/photos`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        return response.json();
    }

    static async deletePhoto(accommodationId, photoId) {
        const response = await fetch(`/api/accommodations/${accommodationId}/photos/${photoId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.json();
    }
}
```
