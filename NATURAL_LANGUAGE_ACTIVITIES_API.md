# 🎯 API de Création d'Activités via Langage Naturel

Cette nouvelle fonctionnalité permet de créer des activités de roadtrip en utilisant des descriptions en langage naturel, alimentée par l'intelligence artificielle OpenAI.

## 🚀 Fonctionnalité

L'API analyse automatiquement un prompt en français et extrait :
- **Nom de l'activité** : titre ou description principale
- **Adresse** : lieu, adresse ou point de repère (utilise l'adresse de l'étape par défaut)
- **Dates et heures** : début et fin (avec contexte temporel actuel)
- **Type d'activité** : "Randonnée", "Courses", "Visite", ou "Autre"
- **Durée** : durée de l'activité avec unité (M/H/J)
- **Prix et devise** : tarif en USD, CAD ou EUR
- **Notes** : informations complémentaires
- **Géolocalisation** : utilise l'adresse de l'utilisateur ou de l'étape si aucune adresse spécifique n'est mentionnée

## 📍 Endpoint

```
POST /roadtrips/{idRoadtrip}/steps/{idStep}/activities/natural-language
```

### Paramètres
- `idRoadtrip` : ID du roadtrip (dans l'URL)
- `idStep` : ID de l'étape (dans l'URL)
- `prompt` : Description en langage naturel (dans le body JSON)
- `userLatitude` : Latitude de l'utilisateur (optionnel, dans le body JSON)
- `userLongitude` : Longitude de l'utilisateur (optionnel, dans le body JSON)

### Headers requis
```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

### Exemple de requête avec géolocalisation
```json
{
  "prompt": "Course à pied dans le parc dans 1 heure pendant 45 minutes",
  "userLatitude": 48.8566,
  "userLongitude": 2.3522
}
```

### Exemple de réponse
```json
{
  "activity": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Course à pied dans le parc",
    "type": "Randonnée",
    "address": "Parc du Luxembourg, Paris, France",
    "startDateTime": "2025-07-01T14:00:00.000Z",
    "endDateTime": "2025-07-01T14:45:00.000Z",
    "duration": 45,
    "typeDuration": "M",
    "price": 0,
    "currency": "EUR",
    "latitude": 48.8466,
    "longitude": 2.3376,
    "notes": "Prévoir des chaussures de sport",
    "stepId": "507f1f77bcf86cd799439010",
    "userId": "507f1f77bcf86cd799439009"
  },
  "extractedData": {
    "name": "Course à pied dans le parc",
    "type": "Randonnée",
    "duration": 45,
    "typeDuration": "M",
    "useUserLocation": true,
    "useStepLocation": false
  }
}
```

## 💡 Exemples de prompts supportés

### Activités sportives
- "Course à pied dans le parc dans 1 heure pendant 45 minutes"
- "Randonnée en montagne samedi de 8h à 16h"
- "Vélo le long de la Seine dimanche matin"

### Visites touristiques
- "Visite guidée du Louvre demain de 10h à 12h avec réservation"
- "Tour de la Tour Eiffel ce soir à 19h"
- "Musée d'Orsay mercredi après-midi"

### Restaurants et repas
- "Déjeuner au restaurant Le Procope demain à 12h30"
- "Dîner gastronomique ce soir à 20h, budget 80€"
- "Petit-déjeuner au café de Flore à 9h"

### Shopping et courses
- "Shopping aux Champs-Élysées cet après-midi"
- "Marché de Provence dimanche matin"
- "Courses au supermarché avant 18h"

### Avec géolocalisation utilisateur
- "Spa et détente dans le coin en fin de journée"
- "Restaurant italien près d'ici ce soir"
- "Activité culture dans le quartier"

## 🤖 Intelligence Artificielle

L'API utilise GPT-4 pour :
1. **Analyser** le contexte et les intentions
2. **Extraire** les informations temporelles et géographiques
3. **Structurer** les données selon le modèle d'activité
4. **Géocoder** automatiquement les adresses
5. **Utiliser la géolocalisation** quand aucune adresse n'est spécifiée

### Gestion des dates
- **Contexte temporel** : Le prompt inclut la date et heure actuelles
- **Dates relatives** : "demain", "dans 2 heures", "vendredi prochain"
- **Heures par défaut** : Inférées selon le type d'activité
- **Format** : ISO 8601 (UTC)

### Gestion de la géolocalisation
- **Géocodage inverse** : Conversion coordonnées → adresse
- **Fallback intelligent** : Utilise l'adresse de l'étape si aucune adresse spécifique
- **Indicateurs** : `useUserLocation` et `useStepLocation` signalent l'origine de l'adresse

### Détection du type d'activité
- **Randonnée** : activités sportives, marche, course, vélo
- **Visite** : musées, monuments, visites guidées
- **Courses** : shopping, marchés, achats
- **Autre** : restaurants, spa, concerts, autres activités

### Validation des données
- **Types d'activités** : "Randonnée", "Courses", "Visite", "Autre"
- **Durée** : "M" (minutes), "H" (heures), "J" (jours)
- **Devises** : "USD", "CAD", "EUR"

## 🛠️ Test et développement

### Interface de test
Ouvrez `public/test-natural-language-activity.html` dans votre navigateur pour tester l'API avec une interface graphique.

### Script de test
```bash
node testNaturalLanguageActivity.js
```

### Configuration requise
1. Serveur démarré : `npm start`
2. Variable d'environnement : `OPENAI_API_KEY`
3. Token JWT valide
4. ID de roadtrip et étape existants

## 🔧 Configuration

### Variables d'environnement
```env
OPENAI_API_KEY=your_openai_api_key_here
```

### Modèle OpenAI
- Modèle utilisé : `gpt-4`
- Temperature : `0.3` (pour plus de précision)
- Timeout : configuré dans le client OpenAI

## 📋 Validation et erreurs

### Erreurs possibles
- `400` : Prompt manquant ou invalide, étape de type "Stop"
- `401` : Token JWT invalide ou utilisateur non autorisé
- `404` : Roadtrip ou étape non trouvé
- `500` : Erreur OpenAI ou serveur

### Validation automatique
- Nom d'activité obligatoire
- Vérification du propriétaire du roadtrip et de l'étape
- Vérification que l'étape n'est pas de type "Stop"
- Géocodage via Google Maps API
- Mise à jour automatique des dates de l'étape

## 🚦 Limitations

- **Langue** : Français principalement (GPT-4 comprend d'autres langues)
- **Types d'activités** : Limité aux 4 types du modèle
- **Devises** : Limitées à USD, CAD, EUR
- **Adresses** : Dépend de la précision du géocodage Google Maps
- **Coût** : Consommation de tokens OpenAI
- **Étapes Stop** : Ne peut pas contenir d'activités

## 🔄 Intégration

Cette API s'intègre naturellement avec :
- Interface utilisateur existante (choix lors de l'ajout d'activité)
- Système de roadtrips et étapes
- Géocodage Google Maps
- Calcul des temps de trajet
- Documentation Swagger

## 📝 Prochaines améliorations

- Support de plus de types d'activités
- Détection automatique des réservations
- Intégration avec des APIs tierces (restaurants, musées)
- Mode conversationnel pour affiner les détails
- Suggestions d'optimisation temporelle
