#!/bin/bash

# Test du fix removeThumbnail - Accommodation Controller
# Ce script teste la nouvelle fonctionnalité de suppression de thumbnail

echo "🧪 Test du fix removeThumbnail pour les accommodations"
echo "=================================================="

# Variables de configuration
BASE_URL="http://localhost:3000"
API_ENDPOINT="/api/accommodations"

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 Tests à effectuer manuellement :${NC}"
echo ""

echo "1️⃣  Test suppression de thumbnail existante"
echo "   PUT $BASE_URL$API_ENDPOINT/{id}"
echo "   Body: {"
echo "     \"name\": \"Hotel Test\","
echo "     \"removeThumbnail\": true"
echo "   }"
echo ""

echo "2️⃣  Test sans flag removeThumbnail (doit conserver thumbnail)"
echo "   PUT $BASE_URL$API_ENDPOINT/{id}"
echo "   Body: {"
echo "     \"name\": \"Hotel Test Updated\""
echo "   }"
echo ""

echo "3️⃣  Test avec removeThumbnail false (doit conserver thumbnail)"
echo "   PUT $BASE_URL$API_ENDPOINT/{id}"
echo "   Body: {"
echo "     \"name\": \"Hotel Test\","
echo "     \"removeThumbnail\": false"
echo "   }"
echo ""

echo "4️⃣  Test suppression + ajout nouvelle thumbnail"
echo "   PUT $BASE_URL$API_ENDPOINT/{id}"
echo "   Form-data: {"
echo "     \"data\": '{\"name\": \"Hotel Test\", \"removeThumbnail\": true}',"
echo "     \"thumbnail\": [nouveau_fichier.jpg]"
echo "   }"
echo ""

echo -e "${GREEN}✅ Résultats attendus :${NC}"
echo "• Test 1 : thumbnail supprimée (accommodation.thumbnail = null)"
echo "• Test 2 : thumbnail conservée"
echo "• Test 3 : thumbnail conservée"  
echo "• Test 4 : ancienne supprimée, nouvelle ajoutée"
echo ""

echo -e "${YELLOW}🔍 Vérifications à effectuer :${NC}"
echo "• Logs backend : 'Removing thumbnail as requested...'"
echo "• Base de données : accommodation.thumbnail = null"
echo "• Google Cloud Storage : fichier supprimé"
echo "• Mobile : thumbnail disparaît de l'interface"
echo ""

echo -e "${RED}⚠️  Points d'attention :${NC}"
echo "• S'assurer que le serveur est démarré"
echo "• Utiliser un token d'authentification valide"
echo "• Vérifier que l'accommodation a bien une thumbnail avant test"
echo "• Contrôler les logs pour confirmer l'exécution"

echo ""
echo "🚀 Pour démarrer le serveur :"
echo "   npm start"
echo ""
echo "📱 Test depuis mobile ou Postman recommandé"
