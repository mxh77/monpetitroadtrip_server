#!/bin/bash

# Test complet du fix removeThumbnail - Accommodations et Activities
# Ce script teste la nouvelle fonctionnalité de suppression de thumbnail

echo "🧪 Test complet du fix removeThumbnail"
echo "====================================="

# Variables de configuration
BASE_URL="http://localhost:3000"
ACCOMMODATIONS_ENDPOINT="/api/accommodations"
ACTIVITIES_ENDPOINT="/api/activities"

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏨 TESTS ACCOMMODATIONS${NC}"
echo "========================"
echo ""

echo "1️⃣  Test suppression de thumbnail accommodation"
echo "   PUT $BASE_URL$ACCOMMODATIONS_ENDPOINT/{id}"
echo "   Body: {"
echo "     \"name\": \"Hotel Test\","
echo "     \"removeThumbnail\": true"
echo "   }"
echo ""

echo "2️⃣  Test conservation thumbnail accommodation"
echo "   PUT $BASE_URL$ACCOMMODATIONS_ENDPOINT/{id}"
echo "   Body: {"
echo "     \"name\": \"Hotel Test Updated\""
echo "   }"
echo ""

echo -e "${BLUE}🎯 TESTS ACTIVITIES${NC}"
echo "=================="
echo ""

echo "3️⃣  Test suppression de thumbnail activité"
echo "   PUT $BASE_URL$ACTIVITIES_ENDPOINT/{id}"
echo "   Body: {"
echo "     \"name\": \"Activité Test\","
echo "     \"removeThumbnail\": true"
echo "   }"
echo ""

echo "4️⃣  Test conservation thumbnail activité"
echo "   PUT $BASE_URL$ACTIVITIES_ENDPOINT/{id}"
echo "   Body: {"
echo "     \"name\": \"Activité Test Updated\""
echo "   }"
echo ""

echo -e "${BLUE}🔄 TESTS COMBINÉS${NC}"
echo "================"
echo ""

echo "5️⃣  Test suppression + ajout nouvelle thumbnail (Accommodation)"
echo "   PUT $BASE_URL$ACCOMMODATIONS_ENDPOINT/{id}"
echo "   Form-data: {"
echo "     \"data\": '{\"name\": \"Hotel Test\", \"removeThumbnail\": true}',"
echo "     \"thumbnail\": [nouveau_fichier.jpg]"
echo "   }"
echo ""

echo "6️⃣  Test suppression + ajout nouvelle thumbnail (Activity)"
echo "   PUT $BASE_URL$ACTIVITIES_ENDPOINT/{id}"
echo "   Form-data: {"
echo "     \"data\": '{\"name\": \"Activité Test\", \"removeThumbnail\": true}',"
echo "     \"thumbnail\": [nouveau_fichier.jpg]"
echo "   }"
echo ""

echo -e "${GREEN}✅ Résultats attendus :${NC}"
echo "• Tests 1,3 : thumbnails supprimées (thumbnail = null)"
echo "• Tests 2,4 : thumbnails conservées"
echo "• Tests 5,6 : anciennes supprimées, nouvelles ajoutées"
echo ""

echo -e "${YELLOW}🔍 Vérifications à effectuer :${NC}"
echo "• Logs backend : 'Removing thumbnail as requested...'"
echo "• Base de données : accommodation.thumbnail = null || activity.thumbnail = null"
echo "• Google Cloud Storage : fichiers supprimés"
echo "• Mobile : thumbnails disparaissent de l'interface"
echo ""

echo -e "${YELLOW}📋 Checklist Pre-Test :${NC}"
echo "□ Serveur démarré (npm start)"
echo "□ Token d'authentification valide"
echo "□ Accommodations avec thumbnails en base"
echo "□ Activities avec thumbnails en base"
echo "□ Accès aux logs backend"
echo ""

echo -e "${RED}⚠️  Points d'attention :${NC}"
echo "• Tester d'abord accommodations, puis activities"
echo "• Vérifier les logs après chaque test"
echo "• Contrôler l'état de la base entre les tests"
echo "• S'assurer que les fichiers GCS sont bien supprimés"
echo ""

echo -e "${GREEN}🚀 Pour démarrer les tests :${NC}"
echo "1. Démarrer le serveur : npm start"
echo "2. Ouvrir Postman ou l'app mobile"
echo "3. Tester séquentiellement chaque scénario"
echo "4. Vérifier les logs backend après chaque test"
echo ""

echo -e "${BLUE}📱 Test depuis mobile ou Postman recommandé${NC}"
echo ""
echo "🎯 Les deux entités (accommodations + activities) sont maintenant couvertes !"
