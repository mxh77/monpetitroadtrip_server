# API de Génération de Roadtrip par IA

Cette nouvelle fonctionnalité permet de créer des roadtrips complets en utilisant l'intelligence artificielle, en fonction des préférences et contraintes de l'utilisateur.

## Endpoint

```
POST /roadtrips/ai
```

## Authentification

Requiert un JWT valide dans l'en-tête `Authorization` :

```
Authorization: Bearer <token>
```

## Paramètres de la requête

Le corps de la requête doit être au format JSON avec les propriétés suivantes :

| Paramètre | Type | Description | Obligatoire |
|-----------|------|-------------|-------------|
| `startLocation` | String | Point de départ du roadtrip | Oui |
| `endLocation` ou `destination` | String | Destination finale (si différente du point de départ) | Non |
| `startDate` | String | Date de début (format ISO ou DD/MM/YYYY) | Oui* |
| `endDate` | String | Date de fin (format ISO ou DD/MM/YYYY) | Non |
| `dates` | String | Format alternatif pour les dates (ex: "01/08/2025 au 23/08/2025") | Non |
| `duration` | Number | Durée en jours | Oui* |
| `budget` | String/Number | Budget global du voyage | Non |
| `travelers` | String | Nombre et profil des voyageurs (ex: "2 adultes, 2 enfants") | Non |
| `prompt` ou `description` | String | Description détaillée des attentes en langage naturel | Non |
| `preferences` | Object | Préférences de voyage (types d'expériences, rythme, hébergements, etc.) | Non |
| `constraints` | Object | Contraintes (distance max par jour, éléments à éviter, etc.) | Non |

\* Au moins l'un des deux est obligatoire (startDate ou duration)

### Exemple de requête complète

```json
{
  "startLocation": "Paris",
  "endLocation": "Nice",
  "startDate": "2025-07-15",
  "endDate": "2025-07-25",
  "budget": "1500",
  "travelers": "2 adultes",
  "prompt": "Roadtrip dans le sud de la France avec visites de vignobles et villages médiévaux",
  "preferences": {
    "experiences": ["Culture", "Gastronomie", "Nature"],
    "pace": "Modéré",
    "accommodationTypes": ["Hôtel", "Chambre d'hôtes"],
    "transportationMode": "Voiture"
  },
  "constraints": {
    "maxDailyDistance": 200,
    "avoid": ["Grandes villes", "Autoroutes"],
    "accessibility": "Standard"
  }
}
```

### Exemple de requête pour l'Ouest américain

```json
{
  "startLocation": "San Francisco",
  "startDate": "2025-08-01",
  "endDate": "2025-08-23",
  "budget": "3000",
  "travelers": "2 adultes, 2 enfants (13, 18)",
  "prompt": "Découverte de l'Ouest américain avec visite des parcs nationaux: Grand Canyon, Monument Valley, Arches, Bryce Canyon, Zion et Yosemite"
}
```

### Exemple de requête alternative (avec format de date simplifié)

```json
{
  "startLocation": "San Francisco",
  "destination": "San Francisco", 
  "dates": "01/08/2025 au 23/08/2025",
  "budget": "3000",
  "travelers": "2 adultes, 2 enfants (13, 18)",
  "prompt": "Découverte de l'Ouest américain avec visite des parcs nationaux: Grand Canyon, Monument Valley, Arches, Bryce Canyon, Zion et Yosemite"
}
```

## Réponse

En cas de succès (201 Created):

```json
{
  "roadtrip": {
    "_id": "64a9b2f35c4b3a5e982d1a3d",
    "userId": "64a1c5e4c82a4a6789f1e8c7",
    "name": "Découverte des Parcs Nationaux de l'Ouest Américain",
    "startLocation": "San Francisco",
    "startDateTime": "2025-08-01T00:00:00.000Z",
    "endLocation": "San Francisco",
    "endDateTime": "2025-08-23T00:00:00.000Z",
    "currency": "USD",
    "notes": "Un voyage exceptionnel à travers les plus beaux parcs nationaux de l'Ouest américain...",
    "steps": ["64a9b2f45c4b3a5e982d1a42", "64a9b2f45c4b3a5e982d1a47", "..."],
    "__v": 0
  },
  "message": "Roadtrip généré avec succès"
}
```

## Codes d'erreur

- `400 Bad Request` : Paramètres manquants ou invalides
- `401 Unauthorized` : Authentification requise
- `500 Internal Server Error` : Erreur serveur lors de la génération

## Remarques

- L'IA prend en compte le prompt en priorité pour comprendre les attentes spécifiques.
- Le roadtrip généré inclut des étapes (steps), des hébergements et des activités recommandées.
- La génération d'un roadtrip complet peut prendre quelques secondes à cause du traitement IA.
- Les temps de trajet entre les étapes sont automatiquement calculés.

## Variables d'environnement requises

- `OPENAI_API_KEY` : Clé API OpenAI valide
- `GOOGLE_MAPS_API_KEY` : Clé API Google Maps pour le géocodage et calculs d'itinéraires
