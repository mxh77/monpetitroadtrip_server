# 📖 API de Récit de Step - Documentation

## Vue d'ensemble

Cette fonctionnalité permet de générer automatiquement un récit chronologique et engageant d'un step de voyage en utilisant l'intelligence artificielle (OpenAI GPT-4). Le récit intègre tous les éléments du step : informations générales, hébergements, et activités.

## Endpoint

```
GET /api/steps/{idStep}/story
```

## Authentification

Cette API nécessite une authentification JWT. Incluez le token dans l'en-tête Authorization :

```
Authorization: Bearer {votre_jwt_token}
```

## Paramètres

| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| idStep | string | Oui | ID unique du step pour lequel générer le récit |

## Réponse

### Succès (200)

```json
{
  "stepId": "648a1b2c3d4e5f6789012345",
  "stepName": "Parc National de Banff",
  "story": "Votre voyage commence par l'arrivée à Banff le 15 juin 2025 à 14h30...",
  "prompt": "Tu es un narrateur de voyage expert. Raconte de manière engageante...",
  "generatedAt": "2025-06-28T10:30:00.000Z",
  "dataUsed": {
    "stepInfo": true,
    "accommodationsCount": 2,
    "activitiesCount": 3
  }
}
```

### Erreurs

| Code | Description | Réponse |
|------|-------------|---------|
| 401 | Non autorisé | `{"msg": "User not authorized"}` |
| 404 | Step non trouvé | `{"msg": "Step not found"}` |
| 503 | Service IA indisponible | `{"msg": "Service temporarily unavailable", "error": "..."}` |
| 500 | Erreur serveur | `{"msg": "Server error", "error": "..."}` |

## Données utilisées pour le récit

Le LLM utilise les informations suivantes pour générer le récit :

### Informations du Step
- Nom et type (Stage/Stop)
- Adresse
- Dates d'arrivée et de départ
- Distance et temps de trajet depuis l'étape précédente
- Notes personnelles

### Hébergements
- Nom et adresse
- Dates d'arrivée et de départ
- Nombre de nuits
- Prix et devise
- Numéro de réservation
- Notes

### Activités
- Nom et type (Randonnée, Visite, etc.)
- Adresse
- Dates et heures de début/fin
- Durée
- Prix et devise
- Informations spécifiques aux randonnées (distance, dénivelé)
- Numéro de réservation
- Notes

## Prompt retourné

L'API retourne également le prompt complet qui a été envoyé au LLM. Cette information est utile pour :

- **Debugging** : Comprendre pourquoi un récit particulier a été généré
- **Transparence** : Voir exactement quelles données ont été utilisées
- **Optimisation** : Analyser la qualité du prompt pour de futures améliorations
- **Audit** : Garder une trace des requêtes envoyées à l'IA

Le prompt inclut toutes les données formatées du step, des hébergements et des activités, ainsi que les instructions spécifiques pour le style de narration.

## Exemple d'utilisation

### JavaScript/Node.js

```javascript
const axios = require('axios');

async function getStepStory(stepId, authToken) {
    try {
        const response = await axios.get(`http://localhost:3000/api/steps/${stepId}/story`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Récit généré:', response.data.story);
        console.log('Prompt utilisé:', response.data.prompt);
        console.log('Données utilisées:', response.data.dataUsed);
        return response.data;
    } catch (error) {
        console.error('Erreur:', error.response?.data || error.message);
    }
}
```

### cURL

```bash
curl -X GET "http://localhost:3000/api/steps/648a1b2c3d4e5f6789012345/story" \
     -H "Authorization: Bearer your_jwt_token_here" \
     -H "Content-Type: application/json"
```

## Configuration requise

### Variables d'environnement

Assurez-vous que votre fichier `.env` contient :

```env
OPENAI_API_KEY=your_openai_api_key_here
```

### Dépendances

Cette fonctionnalité utilise les dépendances suivantes :
- `openai` : Client officiel OpenAI
- Modèles MongoDB : Step, Accommodation, Activity
- Middleware d'authentification

## Bonnes pratiques

1. **Gestion des erreurs** : Toujours vérifier le statut de la réponse et gérer les erreurs appropriées
2. **Authentification** : S'assurer que l'utilisateur est propriétaire du step
3. **Données riches** : Plus le step contient d'informations détaillées (notes, dates, prix), plus le récit sera riche
4. **Limite de taux** : Respecter les limites de l'API OpenAI
5. **Cache optionnel** : Considérer la mise en cache des récits générés pour éviter les appels répétés

## Exemple de récit généré

> "Votre aventure commence le 15 juin 2025 avec votre arrivée à Banff National Park à 14h30, après un trajet de 3 heures et 45 minutes depuis votre étape précédente. Vous vous installez au Fairmont Banff Springs pour 3 nuits (réservation #FB123456), un hébergement emblématique au cœur des Rocheuses canadiennes pour 450 CAD par nuit.
>
> Le lendemain matin, vous vous lancez dans une randonnée au Lake Louise, une activité de 4 heures qui vous mènera sur un sentier de 8 km avec 500m de dénivelé. Cette excursion, réservée sous le numéro #LL789, vous coûtera 75 CAD et vous offrira des vues spectaculaires sur le lac turquoise..."

## Test

Utilisez le script de test fourni (`testStepStory.js`) pour valider le fonctionnement de l'API :

```bash
node testStepStory.js
```

## Support

Pour toute question ou problème, consultez les logs du serveur ou contactez l'équipe de développement.
