#!/bin/bash

# Script de test pour l'API Chatbot
# Ce script teste les endpoints principaux du chatbot

BASE_URL="http://localhost:3001"
ROADTRIP_ID="YOUR_ROADTRIP_ID_HERE"
TOKEN="YOUR_JWT_TOKEN_HERE"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🤖 Tests de l'API Chatbot IA${NC}"
echo -e "${BLUE}================================${NC}"

# Test 1: Envoyer une requête de base
echo -e "\n${YELLOW}Test 1: Ajouter une étape${NC}"
curl -s -X POST "${BASE_URL}/api/roadtrips/${ROADTRIP_ID}/chat/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "query": "Ajoute une étape à Paris du 15 au 17 juillet",
    "conversationId": "test_conv_' $(date +%s) '"
  }' | jq '.'

echo -e "\n${YELLOW}Test 2: Ajouter un hébergement${NC}"
curl -s -X POST "${BASE_URL}/api/roadtrips/${ROADTRIP_ID}/chat/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "query": "Ajoute un hébergement Hôtel de la Paix à Marseille",
    "conversationId": "test_conv_' $(date +%s) '"
  }' | jq '.'

echo -e "\n${YELLOW}Test 3: Ajouter une activité${NC}"
curl -s -X POST "${BASE_URL}/api/roadtrips/${ROADTRIP_ID}/chat/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "query": "Ajoute une activité visite du Louvre le 16 juillet à 14h",
    "conversationId": "test_conv_' $(date +%s) '"
  }' | jq '.'

echo -e "\n${YELLOW}Test 4: Ajouter une tâche${NC}"
curl -s -X POST "${BASE_URL}/api/roadtrips/${ROADTRIP_ID}/chat/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "query": "Ajoute une tâche réserver les billets de train",
    "conversationId": "test_conv_' $(date +%s) '"
  }' | jq '.'

echo -e "\n${YELLOW}Test 5: Demander de l'aide${NC}"
curl -s -X POST "${BASE_URL}/api/roadtrips/${ROADTRIP_ID}/chat/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "query": "aide",
    "conversationId": "test_conv_' $(date +%s) '"
  }' | jq '.'

echo -e "\n${YELLOW}Test 6: Récupérer les conversations${NC}"
curl -s -X GET "${BASE_URL}/api/roadtrips/${ROADTRIP_ID}/chat/conversations" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'

echo -e "\n${YELLOW}Test 7: Récupérer les notifications${NC}"
curl -s -X GET "${BASE_URL}/api/roadtrips/${ROADTRIP_ID}/notifications" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'

echo -e "\n${GREEN}✅ Tests terminés${NC}"
echo -e "${BLUE}Pour tester le WebSocket, utilisez un client WebSocket avec:${NC}"
echo -e "${BLUE}URL: ws://localhost:3001/websocket?token=${TOKEN}${NC}"

echo -e "\n${YELLOW}Exemple de message WebSocket:${NC}"
echo -e '{
  "type": "subscribe_roadtrip",
  "roadtripId": "' ${ROADTRIP_ID} '"
}'
