#!/bin/bash

# Script de test pour vérifier l'organisation des routes stepRoutes.js

echo "🧪 Test de l'organisation des routes stepRoutes.js"
echo "==============================================="

cd "$(dirname "$0")"

# Vérifier la syntaxe
echo "📋 Test 1: Vérification de la syntaxe..."
node -c server/routes/stepRoutes.js
if [ $? -eq 0 ]; then
    echo "✅ Syntaxe correcte"
else
    echo "❌ Erreur de syntaxe"
    exit 1
fi

# Compter les routes dans le fichier épuré
echo "📋 Test 2: Vérification de la structure épurée..."
ROUTE_COUNT=$(grep -c "router\." server/routes/stepRoutes.js)
LINE_COUNT=$(wc -l < server/routes/stepRoutes.js)

echo "   - Routes définies: $ROUTE_COUNT"
echo "   - Lignes totales: $LINE_COUNT"

if [ "$ROUTE_COUNT" -gt 5 ] && [ "$LINE_COUNT" -lt 100 ]; then
    echo "✅ Structure épurée et organisée"
else
    echo "❌ Structure non optimale"
    exit 1
fi

echo ""
echo "🎉 Tests réussis !"
echo "📊 Résumé de l'organisation stepRoutes.js:"
echo "   - Routes définies: $ROUTE_COUNT"
echo "   - Lignes totales: $LINE_COUNT"
echo ""
echo "📖 Structure des routes par méthode:"
echo "   - POST: $(grep -c "router\.post" server/routes/stepRoutes.js)"
echo "   - PUT: $(grep -c "router\.put" server/routes/stepRoutes.js)"
echo "   - PATCH: $(grep -c "router\.patch" server/routes/stepRoutes.js)"
echo "   - GET: $(grep -c "router\.get" server/routes/stepRoutes.js)"
echo "   - DELETE: $(grep -c "router\.delete" server/routes/stepRoutes.js)"

echo ""
echo "🔍 Aperçu des fonctionnalités:"
echo "   - Gestion récits: $(grep -c "story" server/routes/stepRoutes.js) routes"
echo "   - Randonnées/Trails: $(grep -c "hike\|trail" server/routes/stepRoutes.js) routes"
echo "   - Upload fichiers: $(grep -c "upload" server/routes/stepRoutes.js) routes"
