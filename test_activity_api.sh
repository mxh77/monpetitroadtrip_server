#!/bin/bash

echo "🧪 Test simple de l'API de création d'activité via langage naturel"
echo "================================================================"
echo ""

# Remplacez ces valeurs par vos vraies données
JWT_TOKEN="YOUR_JWT_TOKEN_HERE"
ROADTRIP_ID="YOUR_ROADTRIP_ID_HERE"
STEP_ID="YOUR_STEP_ID_HERE"

if [ "$JWT_TOKEN" = "YOUR_JWT_TOKEN_HERE" ]; then
    echo "⚠️  Configuration requise :"
    echo "1. Modifiez les variables JWT_TOKEN, ROADTRIP_ID et STEP_ID dans ce script"
    echo "2. Démarrez le serveur avec: npm start"
    echo "3. Relancez ce script"
    echo ""
    echo "Pour tester manuellement, utilisez :"
    echo "curl -X POST http://localhost:3000/api/roadtrips/ROADTRIP_ID/steps/STEP_ID/activities/natural-language \\"
    echo "  -H \"Content-Type: application/json\" \\"
    echo "  -H \"Authorization: Bearer YOUR_JWT_TOKEN\" \\"
    echo "  -d '{\"prompt\": \"Déjeuner au café de la paix demain à 12h30\"}'"
    exit 1
fi

echo "🚀 Test en cours..."

# Test simple
curl -X POST "http://localhost:3000/api/roadtrips/$ROADTRIP_ID/steps/$STEP_ID/activities/natural-language" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"prompt": "Déjeuner au café de la paix demain à 12h30"}' \
  | python -m json.tool

echo ""
echo "✅ Test terminé"
