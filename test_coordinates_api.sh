#!/bin/bash

# Script de test pour l'API de recalcul des coordonnées
# Usage: ./test_coordinates_api.sh [TOKEN]

# Configuration
API_BASE_URL="http://localhost:3000"
TOKEN=${1:-"YOUR_JWT_TOKEN_HERE"}

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Fonction pour faire une requête POST
make_request() {
    local endpoint=$1
    local description=$2
    
    log_info "Test: $description"
    log_info "Endpoint: POST $API_BASE_URL$endpoint"
    
    response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        "$API_BASE_URL$endpoint")
    
    # Séparer le code de statut du corps de la réponse
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    echo "Status Code: $http_code"
    
    if [ "$http_code" = "200" ]; then
        log_success "✅ Test réussi"
        echo "Response:"
        echo "$response_body" | jq '.' 2>/dev/null || echo "$response_body"
    else
        log_error "❌ Test échoué"
        echo "Response:"
        echo "$response_body" | jq '.' 2>/dev/null || echo "$response_body"
    fi
    
    echo "----------------------------------------"
    sleep 2
}

# Vérifier si jq est installé pour un meilleur affichage JSON
if ! command -v jq &> /dev/null; then
    log_warning "jq n'est pas installé. L'affichage JSON sera moins formaté."
fi

# Vérifier le token
if [ "$TOKEN" = "YOUR_JWT_TOKEN_HERE" ]; then
    log_error "Veuillez fournir un token JWT valide en paramètre"
    echo "Usage: $0 <YOUR_JWT_TOKEN>"
    exit 1
fi

echo "=========================================="
echo "🧪 Tests de l'API de recalcul des coordonnées"
echo "=========================================="

# Test 1: Recalcul de tous les éléments
make_request "/coordinates/recalculate/all" "Recalcul de tous les éléments"

# Test 2: Recalcul par type d'élément
make_request "/coordinates/recalculate/roadtrips" "Recalcul des roadtrips"
make_request "/coordinates/recalculate/steps" "Recalcul des steps"
make_request "/coordinates/recalculate/accommodations" "Recalcul des accommodations"
make_request "/coordinates/recalculate/activities" "Recalcul des activités"

# Test 3: Type d'élément invalide
log_info "Test: Type d'élément invalide"
response=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    "$API_BASE_URL/coordinates/recalculate/invalid_type")

http_code=$(echo "$response" | tail -n1)
response_body=$(echo "$response" | head -n -1)

if [ "$http_code" = "400" ]; then
    log_success "✅ Validation des types fonctionne correctement"
else
    log_error "❌ La validation des types ne fonctionne pas"
fi
echo "Status Code: $http_code"
echo "$response_body" | jq '.' 2>/dev/null || echo "$response_body"
echo "----------------------------------------"

# Test 4: Recalcul pour un roadtrip spécifique (nécessite un ID valide)
log_info "Test: Recalcul pour un roadtrip spécifique"
log_warning "Ce test nécessite un ID de roadtrip valide. Remplacez ROADTRIP_ID par un ID réel."

# Exemple commenté - décommentez et remplacez ROADTRIP_ID par un ID valide
# make_request "/coordinates/recalculate/roadtrip/ROADTRIP_ID" "Recalcul d'un roadtrip spécifique"

echo "=========================================="
log_success "🎉 Tests terminés"
echo "=========================================="
