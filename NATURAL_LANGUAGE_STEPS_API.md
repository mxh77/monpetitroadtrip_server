# API de Création d'Étapes via Langage Naturel

Cette nouvelle fonctionnalité permet de créer des étapes de roadtrip en utilisant des descriptions en langage naturel, alimentée par l'intelligence artificielle OpenAI.

## 🚀 Fonctionnalité

L'API analyse automatiquement un prompt en français et extrait :
- **Nom de l'étape** : titre ou description principale
- **Adresse** : lieu, adresse ou point de repère
- **Dates et heures** : arrivée et départ (avec contexte temporel actuel)
- **Type d'étape** : "Stage" (étape) ou "Stop" (arrêt)
- **Notes** : informations complémentaires
- **Géolocalisation** : utilise l'adresse de l'utilisateur si aucune adresse spécifique n'est mentionnée

## 📍 Endpoint

```
POST /api/roadtrips/{idRoadtrip}/steps/natural-language
```

### Paramètres
- `idRoadtrip` : ID du roadtrip (dans l'URL)
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
  "prompt": "Pause déjeuner dans le coin dans 1 heure",
  "userLatitude": 48.8566,
  "userLongitude": 2.3522
}
```

### Exemple de réponse
```json
{
  "step": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Visite du Louvre",
    "address": "Musée du Louvre, Paris, France",
    "type": "Stage",
    "arrivalDateTime": "2025-07-01T10:00:00.000Z",
    "departureDateTime": "2025-07-01T16:00:00.000Z",
    "latitude": 48.8606,
    "longitude": 2.3376,
    "notes": "Réserver les billets à l'avance",
    "roadtripId": "507f1f77bcf86cd799439010",
    "userId": "507f1f77bcf86cd799439009"
  },
  "extractedData": {
    "name": "Visite du Louvre",
    "address": "Musée du Louvre, Paris, France",
    "arrivalDateTime": "2025-07-01T10:00:00.000Z",
    "departureDateTime": "2025-07-01T16:00:00.000Z",
    "type": "Stage",
    "notes": "Réserver les billets à l'avance",
    "useUserLocation": false
  }
}
```

## 💡 Exemples de prompts supportés

### Visites touristiques
- "Visite du Louvre demain à 10h et repartir à 16h"
- "Tour Eiffel ce soir à 19h pour voir les illuminations"
- "Château de Versailles samedi de 9h à 17h avec guide"

### Avec géolocalisation utilisateur
- "Pause déjeuner dans le coin dans 1 heure"
- "Arrêt toilettes maintenant"
- "Parking gratuit près d'ici"
- "Station-service la plus proche"

### Hébergements
- "Nuit à l'hôtel Ritz, Paris, arrivée ce soir 19h"
- "Camping Les Pins, Arcachon, du 15 au 18 juillet"
- "Gîte en Dordogne, check-in vendredi 16h"

### Arrêts et pauses
- "Arrêt rapide station-service A6 dans 2 heures"
- "Pause déjeuner chez Paul rue de Rivoli à 12h30"
- "Escale à Lyon gare Part-Dieu pour changer de train"

### Activités
- "Randonnée au Mont-Blanc, départ 8h du refuge"
- "Plage de Biarritz après-midi pour surf"
- "Marché de Provence dimanche matin"

## 🤖 Intelligence Artificielle

L'API utilise GPT-4 pour :
1. **Analyser** le contexte et les intentions
2. **Extraire** les informations temporelles et géographiques
3. **Structurer** les données selon le modèle d'étape
4. **Géocoder** automatiquement les adresses
5. **Utiliser la géolocalisation** quand aucune adresse n'est spécifiée

### Gestion des dates
- **Contexte temporel** : Le prompt inclut la date et heure actuelles
- **Dates relatives** : "demain", "dans 3 jours", "vendredi prochain"
- **Heures par défaut** : 10h pour l'arrivée, 18h pour le départ
- **Format** : ISO 8601 (UTC)

### Gestion de la géolocalisation
- **Géocodage inverse** : Conversion coordonnées → adresse
- **Fallback intelligent** : Utilise la position utilisateur si l'adresse échoue
- **Indicateur** : `useUserLocation` signale l'utilisation de la géolocalisation

### Détection du type d'étape
- **Stage** : visites, hébergements, activités principales
- **Stop** : arrêts courts, pauses, escales

## 🛠️ Test et développement

### Interface de test
Ouvrez `public/test-natural-language.html` dans votre navigateur pour tester l'API avec une interface graphique.

### Script de test
```bash
node testNaturalLanguageStep.js
```

### Configuration requise
1. Serveur démarré : `npm start`
2. Variable d'environnement : `OPENAI_API_KEY`
3. Token JWT valide
4. ID de roadtrip existant

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
- `400` : Prompt manquant ou invalide
- `401` : Token JWT invalide ou manquant
- `404` : Roadtrip non trouvé
- `500` : Erreur OpenAI ou serveur

### Validation automatique
- Nom et adresse obligatoires
- Vérification du propriétaire du roadtrip
- Géocodage via Google Maps API
- Calcul automatique des temps de trajet

## 🚦 Limitations

- Langue : Français principalement (GPT-4 comprend d'autres langues)
- Dates : Relatives par rapport à la date actuelle
- Adresses : Dépend de la précision du géocodage Google Maps
- Coût : Consommation de tokens OpenAI

## 🔄 Intégration

Cette API s'intègre naturellement avec :
- Interface utilisateur existante
- Système de roadtrips
- Géocodage Google Maps
- Calcul des temps de trajet
- Documentation Swagger

## 📝 Prochaines améliorations

- Support multilingue
- Détection d'activités spécifiques
- Intégration calendrier personnel
- Suggestions d'optimisation
- Mode conversationnel
