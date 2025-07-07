#!/bin/bash

# Script de test pour l'API de génération de roadtrip IA
echo "Test de l'API de génération de roadtrip IA"
echo "-----------------------------------------"

# URL de l'API
API_URL="http://localhost:3000/roadtrips/ai"

# Token d'authentification (à remplacer avec un token valide)
AUTH_TOKEN="votre_token_ici"

# Exemple de requête
echo "Envoi d'une requête de test..."
curl -X POST \
  "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "startLocation": "Paris",
    "destination": "Nice", 
    "dates": "15/07/2025 au 25/07/2025",
    "budget": "2000",
    "travelers": "2 adultes",
    "prompt": "Road trip dans le sud de la France, en passant par des vignobles et villages médiévaux."
  }' \
  -o response.json

echo "Réponse enregistrée dans response.json"

# Vérifier si la réponse contient une erreur
if grep -q "error" response.json; then
  echo "❌ Erreur détectée dans la réponse :"
  cat response.json
else
  echo "✅ Requête réussie"
  echo "Vérification de la structure du roadtrip..."
  # Vérifier si les structures essentielles sont présentes
  if grep -q "steps" response.json && grep -q "name" response.json; then
    echo "✅ Structure de base du roadtrip validée"
  else
    echo "❌ Structure de base du roadtrip incomplète"
  fi
fi
