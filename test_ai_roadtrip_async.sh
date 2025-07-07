#!/bin/bash

# Test script pour l'API de génération asynchrone de roadtrips
# Usage: ./test_ai_roadtrip_async.sh

# Charger les variables d'environnement (si .env existe)
if [ -f .env ]; then
  export $(cat .env | grep -v '#' | xargs)
fi

# URL de base de l'API
API_URL=${API_URL:-"http://localhost:3000/api"}

# Token d'authentification (à remplacer par un token valide)
AUTH_TOKEN=${JWT_TEST_TOKEN:-"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===== TEST DE L'API DE GÉNÉRATION ASYNCHRONE DE ROADTRIPS =====${NC}"
echo

# 1. Démarrer un job de génération de roadtrip
echo -e "${YELLOW}1. Démarrage d'un job de génération de roadtrip${NC}"
START_RESPONSE=$(curl -s -X POST "$API_URL/roadtrips/ai/async" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "startLocation": "Paris, France",
    "endLocation": "Nice, France",
    "dates": "15/07/2025 au 25/07/2025",
    "budget": "2000",
    "travelers": "2 adultes",
    "description": "Roadtrip le long de la côte méditerranéenne avec visites de vignobles et villes historiques",
    "preferences": {
      "accommodation": ["hotel", "guesthouse"],
      "interests": ["wine", "history", "beaches", "local cuisine"],
      "transport": "car"
    },
    "constraints": {
      "maxDailyDriving": 3,
      "petFriendly": false
    }
  }')

echo "Réponse: $START_RESPONSE"
JOB_ID=$(echo $START_RESPONSE | grep -o '"jobId":"[^"]*' | cut -d'"' -f4)

if [ -z "$JOB_ID" ]; then
  echo -e "${RED}Erreur: Impossible d'obtenir le jobId${NC}"
  exit 1
fi

echo -e "${GREEN}Job démarré avec l'ID: $JOB_ID${NC}"
echo

# 2. Vérifier le statut du job à intervalles réguliers
echo -e "${YELLOW}2. Vérification du statut du job${NC}"

MAX_CHECKS=10
DELAY_SECONDS=5
CHECK_COUNT=0
COMPLETED=false

while [ $CHECK_COUNT -lt $MAX_CHECKS ] && [ "$COMPLETED" = false ]; do
  CHECK_COUNT=$((CHECK_COUNT+1))
  
  echo -e "${BLUE}Vérification $CHECK_COUNT/$MAX_CHECKS...${NC}"
  
  STATUS_RESPONSE=$(curl -s -X GET "$API_URL/roadtrips/ai/jobs/$JOB_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN")
  
  echo "Statut: $STATUS_RESPONSE"
  
  JOB_STATUS=$(echo $STATUS_RESPONSE | grep -o '"status":"[^"]*' | cut -d'"' -f4)
  PROGRESS=$(echo $STATUS_RESPONSE | grep -o '"percentage":[^,}]*' | cut -d':' -f2)
  
  echo -e "${GREEN}État du job: $JOB_STATUS - Progression: $PROGRESS%${NC}"
  
  if [ "$JOB_STATUS" = "completed" ]; then
    COMPLETED=true
    ROADTRIP_ID=$(echo $STATUS_RESPONSE | grep -o '"roadtripId":"[^"]*' | cut -d'"' -f4)
    echo -e "${GREEN}Job terminé avec succès! Roadtrip ID: $ROADTRIP_ID${NC}"
  elif [ "$JOB_STATUS" = "failed" ]; then
    echo -e "${RED}Le job a échoué.${NC}"
    ERROR_MSG=$(echo $STATUS_RESPONSE | grep -o '"errorMessage":"[^"]*' | cut -d'"' -f4)
    echo -e "${RED}Erreur: $ERROR_MSG${NC}"
    exit 1
  fi
  
  if [ $CHECK_COUNT -lt $MAX_CHECKS ] && [ "$COMPLETED" = false ]; then
    echo -e "${YELLOW}Attente de $DELAY_SECONDS secondes...${NC}"
    sleep $DELAY_SECONDS
    # Augmenter progressivement le délai pour éviter trop de requêtes
    DELAY_SECONDS=$((DELAY_SECONDS+2))
  fi
done

if [ "$COMPLETED" = false ]; then
  echo -e "${YELLOW}Le job est toujours en cours après $MAX_CHECKS vérifications.${NC}"
  echo -e "${YELLOW}Vous pouvez continuer à vérifier manuellement avec l'ID: $JOB_ID${NC}"
  exit 0
fi

# 3. Si le job est terminé, récupérer le roadtrip
if [ "$COMPLETED" = true ] && [ ! -z "$ROADTRIP_ID" ]; then
  echo
  echo -e "${YELLOW}3. Récupération du roadtrip généré${NC}"
  
  ROADTRIP_RESPONSE=$(curl -s -X GET "$API_URL/roadtrips/$ROADTRIP_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN")
  
  ROADTRIP_NAME=$(echo $ROADTRIP_RESPONSE | grep -o '"name":"[^"]*' | head -1 | cut -d'"' -f4)
  STEPS_COUNT=$(echo $ROADTRIP_RESPONSE | grep -o '"steps":' | wc -l)
  
  echo -e "${GREEN}Roadtrip \"$ROADTRIP_NAME\" récupéré avec succès!${NC}"
  echo -e "${GREEN}Nombre d'étapes: $STEPS_COUNT${NC}"
  
  # Afficher un aperçu du roadtrip (limité pour éviter trop de sortie)
  echo
  echo -e "${BLUE}Aperçu du roadtrip:${NC}"
  echo "$ROADTRIP_RESPONSE" | grep -o '"name":"[^"]*' | head -5 | cut -d'"' -f4 | while read line; do
    echo "- $line"
  done
  
  echo
  echo -e "${GREEN}Test terminé avec succès!${NC}"
fi

echo
echo -e "${BLUE}===== FIN DU TEST =====${NC}"
