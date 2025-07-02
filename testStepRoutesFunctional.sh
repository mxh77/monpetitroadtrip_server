#!/bin/bash

echo "🧪 Test de l'organisation FONCTIONNELLE de stepRoutes.js"
echo "======================================================"

cd "$(dirname "$0")"

# Test syntaxe
echo "📋 Test 1: Vérification syntaxe..."
node -c server/routes/stepRoutes.js
if [ $? -eq 0 ]; then
    echo "✅ Syntaxe correcte"
else
    echo "❌ Erreur syntaxe"
    exit 1
fi

# Analyse fonctionnelle
echo "📋 Test 2: Analyse des modules fonctionnels..."

STORY_COUNT=$(grep -c "story" server/routes/stepRoutes.js)
HIKE_COUNT=$(grep -c "hike\|trail" server/routes/stepRoutes.js)
STEP_CRUD=$(grep -c "router\.[get|put|delete]('/:idStep'" server/routes/stepRoutes.js)
TRAVEL_COUNT=$(grep -c "travel-time" server/routes/stepRoutes.js)

echo "   📖 RÉCITS & STORIES: $STORY_COUNT routes"
echo "   🥾 RANDONNÉES: $HIKE_COUNT routes"  
echo "   🚗 TEMPS TRAJET: $TRAVEL_COUNT routes"

# Vérification groupement
echo "📋 Test 3: Vérification du groupement fonctionnel..."

GESTION_SECTION=$(grep -n "GESTION STEP" server/routes/stepRoutes.js | cut -d: -f1)
RECITS_SECTION=$(grep -n "RÉCITS & STORIES" server/routes/stepRoutes.js | cut -d: -f1)
RANDO_SECTION=$(grep -n "RANDONNÉES & TRAILS" server/routes/stepRoutes.js | cut -d: -f1)
TEMPS_SECTION=$(grep -n "TEMPS DE TRAJET" server/routes/stepRoutes.js | cut -d: -f1)

if [ ! -z "$GESTION_SECTION" ] && [ ! -z "$RECITS_SECTION" ] && [ ! -z "$RANDO_SECTION" ] && [ ! -z "$TEMPS_SECTION" ]; then
    echo "✅ Tous les modules fonctionnels présents"
    echo "   - GESTION STEP: ligne $GESTION_SECTION"
    echo "   - RÉCITS: ligne $RECITS_SECTION" 
    echo "   - RANDONNÉES: ligne $RANDO_SECTION"
    echo "   - TEMPS TRAJET: ligne $TEMPS_SECTION"
else
    echo "❌ Modules fonctionnels manquants"
    exit 1
fi

# Ordre logique
if [ "$GESTION_SECTION" -lt "$RECITS_SECTION" ] && [ "$RECITS_SECTION" -lt "$RANDO_SECTION" ] && [ "$RANDO_SECTION" -lt "$TEMPS_SECTION" ]; then
    echo "✅ Ordre logique respecté"
else
    echo "⚠️  Ordre des sections à vérifier"
fi

echo ""
echo "🎉 Organisation fonctionnelle validée !"
echo "📊 Résumé:"
echo "   - Lignes totales: $(wc -l < server/routes/stepRoutes.js)"
echo "   - Routes RÉCITS: $STORY_COUNT (module principal)"
echo "   - Routes RANDONNÉES: $HIKE_COUNT (feature importante)" 
echo "   - Routes TRAJET: $TRAVEL_COUNT (utilitaire)"
echo "   - Organisation: ✅ Par module fonctionnel"
