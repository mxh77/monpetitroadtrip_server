#!/bin/bash

# Script de démonstration de la génération de récits avec photos
# Utilisation: ./demo_story_with_photos.sh

echo "🚀 Démonstration - Génération de récits avec photos"
echo "=================================================="

# Configuration (à adapter)
BASE_URL="http://localhost:3000"
STEP_ID="YOUR_STEP_ID_HERE"
AUTH_TOKEN="YOUR_JWT_TOKEN_HERE"

echo ""
echo "📝 1. Génération standard (détection automatique des photos)"
curl -s -X GET "${BASE_URL}/api/steps/${STEP_ID}/story" \
     -H "Authorization: Bearer ${AUTH_TOKEN}" \
     -H "Content-Type: application/json" | \
     jq -r '"Modèle: " + (.model // "gpt-4o-mini") + " | Photos: " + (.photosAnalyzed // 0 | tostring)'

echo ""
echo "📸 2. Génération forcée avec photos"
curl -s -X GET "${BASE_URL}/api/steps/${STEP_ID}/story/with-photos" \
     -H "Authorization: Bearer ${AUTH_TOKEN}" \
     -H "Content-Type: application/json" | \
     jq -r '"Modèle: " + .model + " | Photos analysées: " + (.photosAnalyzed | tostring) + " | Sources: " + ([.photosSources[]?.type] | join(", "))'

echo ""
echo "🔄 3. Génération asynchrone avec photos"
ASYNC_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/steps/${STEP_ID}/story/async" \
     -H "Authorization: Bearer ${AUTH_TOKEN}" \
     -H "Content-Type: application/json")

JOB_ID=$(echo $ASYNC_RESPONSE | jq -r '.jobId')
echo "Job lancé: $JOB_ID"

# Attendre et vérifier le statut
sleep 5
curl -s -X GET "${BASE_URL}/api/steps/${STEP_ID}/story/${JOB_ID}/status" \
     -H "Authorization: Bearer ${AUTH_TOKEN}" | \
     jq -r '"Statut: " + .status + " | Photos: " + (.result.photosAnalyzed // 0 | tostring)'

echo ""
echo "✅ Démonstration terminée"
echo ""
echo "💡 Pour utiliser ce script:"
echo "   1. Remplacez STEP_ID par un ID valide"
echo "   2. Remplacez AUTH_TOKEN par votre token JWT"
echo "   3. Assurez-vous que jq est installé pour le formatage JSON"
