# API de Recalcul des Coordonnées

## Vue d'ensemble

Cette API permet de recalculer automatiquement les coordonnées géographiques (latitude/longitude) de tous les éléments du système (roadtrips, steps, accommodations, activities) qui ont une adresse définie.

## 🎯 Pourquoi utiliser cette API ?

- **Consistance des données** : Assure que tous les éléments avec une adresse ont des coordonnées valides
- **Correction d'erreurs** : Répare les coordonnées incorrectes ou manquantes
- **Mise à jour en masse** : Traite tous les éléments d'un utilisateur en une seule opération
- **Flexibilité** : Permet de cibler des types d'éléments spécifiques ou des roadtrips individuels

## 📋 Endpoints disponibles

### 1. Recalcul global

```http
POST /coordinates/recalculate/all
```

**Description** : Recalcule les coordonnées de tous les éléments de l'utilisateur authentifié.

**Headers requis** :
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Réponse exemple** :
```json
{
  "message": "Recalcul des coordonnées terminé",
  "results": {
    "roadtrips": [
      {
        "id": "507f1f77bcf86cd799439011",
        "type": "roadtrip",
        "success": true,
        "message": "Coordonnées mises à jour avec succès",
        "oldCoordinates": { "latitude": 0, "longitude": 0 },
        "newCoordinates": { "latitude": 48.8566, "longitude": 2.3522 }
      }
    ],
    "steps": [...],
    "accommodations": [...],
    "activities": [...],
    "summary": {
      "total": 45,
      "success": 32,
      "errors": 2,
      "skipped": 11
    }
  },
  "timestamp": "2025-07-19T10:30:00.000Z"
}
```

### 2. Recalcul par type d'élément

```http
POST /coordinates/recalculate/:elementType
```

**Paramètres** :
- `elementType` : `roadtrips` | `steps` | `accommodations` | `activities`

**Exemple** :
```http
POST /coordinates/recalculate/accommodations
```

### 3. Recalcul pour un roadtrip spécifique

```http
POST /coordinates/recalculate/roadtrip/:roadtripId
```

**Paramètres** :
- `roadtripId` : ID MongoDB du roadtrip

**Exemple** :
```http
POST /coordinates/recalculate/roadtrip/507f1f77bcf86cd799439011
```

## 🔧 Structure des données de réponse

### Objet résultat individuel

```typescript
{
  id: string;              // ID MongoDB de l'élément
  type: string;            // Type: 'roadtrip', 'step', 'accommodation', 'activity'
  success: boolean;        // Indique si le recalcul a réussi
  message: string;         // Message descriptif du résultat
  oldCoordinates: {        // Coordonnées avant recalcul
    latitude: number;
    longitude: number;
  } | null;
  newCoordinates: {        // Coordonnées après recalcul
    latitude: number;
    longitude: number;
  } | null;
}
```

### Résumé des opérations

```typescript
{
  total: number;     // Nombre total d'éléments traités
  success: number;   // Nombre d'éléments mis à jour avec succès
  errors: number;    // Nombre d'éléments en erreur
  skipped: number;   // Nombre d'éléments ignorés (pas d'adresse)
}
```

## 📊 Gestion des cas d'usage

### Cas de succès
- L'élément a une adresse valide
- L'API Google Maps peut géocoder l'adresse
- Les coordonnées sont mises à jour en base de données

### Cas d'erreur
- Adresse non géocodable par Google Maps
- Erreur de communication avec l'API Google Maps
- Erreur de sauvegarde en base de données

### Cas ignorés
- Élément sans adresse définie (`address` vide ou null)
- Ces éléments ne sont pas traités et comptent dans `skipped`

## 🚀 Exemples d'utilisation

### JavaScript/Frontend

```javascript
// Initialisation
const api = new CoordinatesAPI(jwtToken);

// Recalcul global
const result = await api.recalculateAllCoordinates();
console.log(`${result.results.summary.success} éléments mis à jour`);

// Recalcul par type
const accommodationsResult = await api.recalculateByType('accommodations');

// Recalcul d'un roadtrip
const roadtripResult = await api.recalculateRoadtrip('507f1f77bcf86cd799439011');
```

### cURL

```bash
# Recalcul global
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:3000/coordinates/recalculate/all

# Recalcul des activités seulement
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:3000/coordinates/recalculate/activities
```

## ⚠️ Considérations importantes

### Limites de l'API Google Maps
- **Quota quotidien** : Vérifiez vos limites de géocodage
- **Coût** : Chaque recalcul fait appel à l'API Google Maps (facturable)
- **Rate limiting** : L'API traite les éléments séquentiellement pour respecter les limites

### Performance
- **Traitement séquentiel** : Les éléments sont traités un par un pour éviter la surcharge
- **Timeout** : Prévoir un timeout approprié côté frontend pour les gros volumes
- **Logs détaillés** : Tous les traitements sont loggés côté serveur

### Sécurité
- **Authentification requise** : Seuls les éléments de l'utilisateur authentifié sont traités
- **Validation des paramètres** : Types d'éléments et IDs sont validés
- **Isolation des données** : Aucun risque de modification d'éléments d'autres utilisateurs

## 🐛 Gestion d'erreurs

### Codes de statut HTTP

- `200` : Succès (même si certains éléments individuels ont échoué)
- `400` : Paramètres invalides (type d'élément inexistant)
- `401` : Non authentifié
- `404` : Roadtrip non trouvé (pour l'endpoint spécifique)
- `500` : Erreur serveur

### Erreurs courantes

| Erreur | Cause | Solution |
|--------|--------|----------|
| `Type d'élément invalide` | Type non supporté | Utiliser : `roadtrips`, `steps`, `accommodations`, `activities` |
| `Roadtrip non trouvé` | ID inexistant ou pas d'accès | Vérifier l'ID et les permissions |
| `Impossible d'obtenir les coordonnées` | Adresse non géocodable | Vérifier la validité de l'adresse |
| `Erreur lors de la recalculation` | Problème technique | Consulter les logs serveur |

## 🔍 Monitoring et logs

### Logs serveur
```
🔄 Début du recalcul des coordonnées pour l'utilisateur 507f1f77bcf86cd799439011
📍 Traitement des roadtrips...
📍 Traitement des steps...
📍 Traitement des accommodations...
📍 Traitement des activities...
✅ Recalcul terminé: 32 succès, 2 erreurs, 11 ignorés sur 45 éléments
```

### Métriques recommandées
- Nombre de recalculs par utilisateur
- Taux de succès du géocodage
- Temps de traitement moyen
- Consommation de l'API Google Maps

## 🔄 Intégration recommandée

### Interface utilisateur
- Bouton "Recalculer les coordonnées" dans les paramètres
- Indicateur de progression pour les gros volumes
- Affichage des résultats avec détails des erreurs
- Option de recalcul ciblé par section

### Cas d'usage typiques
1. **Migration de données** : Après import de données externes
2. **Correction d'erreurs** : Quand des coordonnées semblent incorrectes
3. **Maintenance périodique** : Vérification mensuelle de la cohérence
4. **Après modifications d'adresses** : Recalcul automatique ou manuel

## 📈 Bonnes pratiques

1. **Informer l'utilisateur** : Expliquer que l'opération peut prendre du temps
2. **Gérer les quotas** : Limiter la fréquence des recalculs globaux
3. **Sauvegarder avant** : Optionnel, pour pouvoir revenir en arrière
4. **Traitement par lots** : Préférer les recalculs ciblés pour de gros volumes
5. **Monitoring** : Surveiller l'utilisation de l'API Google Maps
