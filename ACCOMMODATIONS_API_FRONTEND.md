# API Accommodations - Guide Frontend

## Vue d'ensemble

Cette documentation décrit comment utiliser l'API des accommodations depuis le frontend. L'API permet de gérer les hébergements avec leurs thumbnails, photos et documents.

## Authentification

Toutes les routes nécessitent une authentification. Incluez le token d'authentification dans les headers :

```javascript
headers: {
    'Authorization': `Bearer ${authToken}`
}
```

## Base URL

```
/api/accommodations
```

---

## 📤 PUT - Mettre à jour un hébergement

### Endpoint
```
PUT /accommodations/:idAccommodation
```

### Description
Met à jour un hébergement existant. Permet de modifier le thumbnail, ajouter des photos et des documents en une seule requête.

### Paramètres de fichiers acceptés
- `thumbnail` : 1 fichier maximum (image de couverture)
- `photos` : 10 fichiers maximum
- `documents` : 10 fichiers maximum

### Exemple d'utilisation

#### JavaScript/Fetch
```javascript
const updateAccommodation = async (idAccommodation, files, authToken) => {
    const formData = new FormData();
    
    // Ajouter le thumbnail (optionnel)
    if (files.thumbnail) {
        formData.append('thumbnail', files.thumbnail);
    }
    
    // Ajouter des photos (optionnel)
    if (files.photos) {
        files.photos.forEach(photo => {
            formData.append('photos', photo);
        });
    }
    
    // Ajouter des documents (optionnel)
    if (files.documents) {
        files.documents.forEach(doc => {
            formData.append('documents', doc);
        });
    }
    
    try {
        const response = await fetch(`/api/accommodations/${idAccommodation}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                // ⚠️ NE PAS ajouter Content-Type pour FormData
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
        throw error;
    }
};
```

#### React Hook
```jsx
import { useState } from 'react';

const useAccommodationUpdate = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    const updateAccommodation = async (idAccommodation, files) => {
        setLoading(true);
        setError(null);
        
        try {
            const formData = new FormData();
            
            if (files.thumbnail) formData.append('thumbnail', files.thumbnail);
            if (files.photos) {
                files.photos.forEach(photo => formData.append('photos', photo));
            }
            if (files.documents) {
                files.documents.forEach(doc => formData.append('documents', doc));
            }
            
            const response = await fetch(`/api/accommodations/${idAccommodation}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                },
                body: formData
            });
            
            if (!response.ok) throw new Error('Erreur de mise à jour');
            
            const result = await response.json();
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };
    
    return { updateAccommodation, loading, error };
};
```

---

## 🔗 PATCH - Ajouter des documents

### Endpoint
```
PATCH /accommodations/:idAccommodation/documents
```

### Description
Ajoute des documents à un hébergement existant sans affecter les autres fichiers.

### Exemple
```javascript
const addDocuments = async (idAccommodation, documents, authToken) => {
    const formData = new FormData();
    
    documents.forEach(doc => {
        formData.append('documents', doc);
    });
    
    const response = await fetch(`/api/accommodations/${idAccommodation}/documents`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${authToken}`,
        },
        body: formData
    });
    
    return await response.json();
};
```

---

## 📸 PATCH - Ajouter des photos

### Endpoint
```
PATCH /accommodations/:idAccommodation/photos
```

### Description
Ajoute des photos à un hébergement existant sans affecter les autres fichiers.

### Exemple
```javascript
const addPhotos = async (idAccommodation, photos, authToken) => {
    const formData = new FormData();
    
    photos.forEach(photo => {
        formData.append('photos', photo);
    });
    
    const response = await fetch(`/api/accommodations/${idAccommodation}/photos`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${authToken}`,
        },
        body: formData
    });
    
    return await response.json();
};
```

---

## 📥 GET - Récupérer les données

### Obtenir un hébergement
```
GET /accommodations/:idAccommodation
```

### Obtenir les documents
```
GET /accommodations/:idAccommodation/documents
```

### Obtenir les photos
```
GET /accommodations/:idAccommodation/photos
```

### Exemples
```javascript
// Récupérer un hébergement
const getAccommodation = async (idAccommodation, authToken) => {
    const response = await fetch(`/api/accommodations/${idAccommodation}`, {
        headers: {
            'Authorization': `Bearer ${authToken}`,
        }
    });
    return await response.json();
};

// Récupérer les photos
const getPhotos = async (idAccommodation, authToken) => {
    const response = await fetch(`/api/accommodations/${idAccommodation}/photos`, {
        headers: {
            'Authorization': `Bearer ${authToken}`,
        }
    });
    return await response.json();
};
```

---

## 🗑️ DELETE - Supprimer

### Supprimer un hébergement
```
DELETE /accommodations/:idAccommodation
```

### Supprimer un document
```
DELETE /accommodations/:idAccommodation/documents/:idDocument
```

### Supprimer une photo
```
DELETE /accommodations/:idAccommodation/photos/:idPhoto
```

### Exemples
```javascript
// Supprimer un hébergement
const deleteAccommodation = async (idAccommodation, authToken) => {
    const response = await fetch(`/api/accommodations/${idAccommodation}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${authToken}`,
        }
    });
    return response.ok;
};

// Supprimer une photo
const deletePhoto = async (idAccommodation, idPhoto, authToken) => {
    const response = await fetch(`/api/accommodations/${idAccommodation}/photos/${idPhoto}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${authToken}`,
        }
    });
    return response.ok;
};
```

---

## 📋 Composant React complet

```jsx
import React, { useState } from 'react';

const AccommodationManager = ({ accommodationId }) => {
    const [files, setFiles] = useState({
        thumbnail: null,
        photos: [],
        documents: []
    });
    const [loading, setLoading] = useState(false);
    
    const handleFileChange = (type, event) => {
        const selectedFiles = Array.from(event.target.files);
        
        if (type === 'thumbnail') {
            setFiles(prev => ({ ...prev, thumbnail: selectedFiles[0] }));
        } else {
            setFiles(prev => ({ ...prev, [type]: selectedFiles }));
        }
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const formData = new FormData();
            
            if (files.thumbnail) {
                formData.append('thumbnail', files.thumbnail);
            }
            
            files.photos.forEach(photo => {
                formData.append('photos', photo);
            });
            
            files.documents.forEach(doc => {
                formData.append('documents', doc);
            });
            
            const response = await fetch(`/api/accommodations/${accommodationId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                },
                body: formData
            });
            
            if (response.ok) {
                alert('Hébergement mis à jour avec succès !');
                setFiles({ thumbnail: null, photos: [], documents: [] });
            }
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors de la mise à jour');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit}>
            <div>
                <label>Thumbnail (1 fichier max):</label>
                <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange('thumbnail', e)}
                />
            </div>
            
            <div>
                <label>Photos (10 fichiers max):</label>
                <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFileChange('photos', e)}
                />
            </div>
            
            <div>
                <label>Documents (10 fichiers max):</label>
                <input
                    type="file"
                    multiple
                    onChange={(e) => handleFileChange('documents', e)}
                />
            </div>
            
            <button type="submit" disabled={loading}>
                {loading ? 'Mise à jour...' : 'Mettre à jour l\'hébergement'}
            </button>
        </form>
    );
};

export default AccommodationManager;
```

---

## ⚠️ Points importants

1. **Content-Type** : Ne jamais définir `Content-Type` manuellement avec FormData - le navigateur le fait automatiquement
2. **Authentification** : Toutes les routes nécessitent un token d'authentification
3. **Limites de fichiers** :
   - Thumbnail : 1 fichier maximum
   - Photos : 10 fichiers maximum
   - Documents : 10 fichiers maximum
4. **Noms des champs** : Respecter exactement les noms `thumbnail`, `photos`, `documents`
5. **Stockage** : Les fichiers sont stockés en mémoire (multer.memoryStorage())

---

## 🐛 Gestion d'erreurs

```javascript
const handleApiError = (error, response) => {
    if (response?.status === 401) {
        // Token expiré ou invalide
        localStorage.removeItem('authToken');
        window.location.href = '/login';
    } else if (response?.status === 413) {
        // Fichier trop volumineux
        alert('Fichier trop volumineux');
    } else if (response?.status === 400) {
        // Données invalides
        alert('Données invalides');
    } else {
        // Erreur générique
        console.error('Erreur API:', error);
        alert('Une erreur est survenue');
    }
};
```

---

## 📞 Support

Pour toute question concernant cette API, contactez l'équipe backend ou consultez les logs serveur en cas d'erreur.
