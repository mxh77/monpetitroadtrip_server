#!/bin/bash

# Script de test pour la correction des dates des steps
# Usage: ./testStepDatesFix.sh <roadtrip_id> <step_id> <token>

ROADTRIP_ID=${1:-"67ac491096003c7411aea863"}
STEP_ID=${2:-"67ac491396003c7411aea90f"}
TOKEN=${3:-""}

API_BASE="http://localhost:5000/api/roadtrips"

if [ -z "$TOKEN" ]; then
    echo "❌ Token requis"
    echo "Usage: $0 <roadtrip_id> <step_id> <token>"
    exit 1
fi

echo "🧪 Test de correction des dates du step"
echo "Roadtrip ID: $ROADTRIP_ID"
echo "Step ID: $STEP_ID"
echo ""

# 1. Récupérer l'état actuel du step
echo "📋 État actuel du step:"
curl -s -H "Authorization: Bearer $TOKEN" \
    "$API_BASE/$ROADTRIP_ID/steps" | \
    jq --arg stepId "$STEP_ID" '.find(.id == $stepId) | {
        name: .name,
        arrivalDateTime: .arrivalDateTime,
        departureDateTime: .departureDateTime,
        accommodations: [.accommodations[]? | {
            name: .name,
            arrivalDateTime: .arrivalDateTime,
            departureDateTime: .departureDateTime,
            nights: .nights
        }],
        activities: [.activities[]? | {
            name: .name,
            startDateTime: .startDateTime,
            endDateTime: .endDateTime
        }]
    }'

echo ""
echo "🔧 Correction des dates du step..."

# 2. Déclencher la correction
RESPONSE=$(curl -s -X PATCH \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    "$API_BASE/$ROADTRIP_ID/steps/$STEP_ID/fix-dates")

echo "Réponse de la correction:"
echo "$RESPONSE" | jq '.'

echo ""
echo "📋 État après correction:"

# 3. Récupérer l'état après correction
curl -s -H "Authorization: Bearer $TOKEN" \
    "$API_BASE/$ROADTRIP_ID/steps" | \
    jq --arg stepId "$STEP_ID" '.find(.id == $stepId) | {
        name: .name,
        arrivalDateTime: .arrivalDateTime,
        departureDateTime: .departureDateTime,
        accommodations: [.accommodations[]? | {
            name: .name,
            arrivalDateTime: .arrivalDateTime,
            departureDateTime: .departureDateTime,
            nights: .nights
        }],
        activities: [.activities[]? | {
            name: .name,
            startDateTime: .startDateTime,
            endDateTime: .endDateTime
        }]
    }'

echo ""
echo "✅ Test terminé"
