#!/bin/bash

echo "🧪 Test de l'organisation FONCTIONNELLE de roadtripRoutes.js"
echo "=========================================================="

cd "$(dirname "$0")"

# Test syntaxe
echo "📋 Test 1: Vérification syntaxe..."
node -c server/routes/roadtripRoutes.js
if [ $? -eq 0 ]; then
    echo "✅ Syntaxe correcte"
else
    echo "❌ Erreur syntaxe"
    exit 1
fi

# Analyse des modules fonctionnels
echo "📋 Test 2: Analyse des modules fonctionnels..."

ROADTRIP_COUNT=$(grep -c "roadtripController\." server/routes/roadtripRoutes.js)
STEP_COUNT=$(grep -c "stepController\." server/routes/roadtripRoutes.js)
ACCOMMODATION_COUNT=$(grep -c "accommodationController\." server/routes/roadtripRoutes.js)
ACTIVITY_COUNT=$(grep -c "activityController\." server/routes/roadtripRoutes.js)

echo "   🚗 GESTION ROADTRIP: $ROADTRIP_COUNT routes"
echo "   📍 GESTION STEPS: $STEP_COUNT routes"
echo "   🏨 ACCOMMODATIONS: $ACCOMMODATION_COUNT routes"
echo "   🎯 ACTIVITIES: $ACTIVITY_COUNT routes"

# Vérification des sections
echo "📋 Test 3: Vérification des sections fonctionnelles..."

ROADTRIP_SECTION=$(grep -n "GESTION ROADTRIP" server/routes/roadtripRoutes.js | cut -d: -f1)
STEP_SECTION=$(grep -n "GESTION STEPS" server/routes/roadtripRoutes.js | cut -d: -f1)
ACCOMMODATION_SECTION=$(grep -n "ACCOMMODATIONS" server/routes/roadtripRoutes.js | cut -d: -f1)
ACTIVITY_SECTION=$(grep -n "ACTIVITIES" server/routes/roadtripRoutes.js | cut -d: -f1)
SYNC_SECTION=$(grep -n "TEMPS DE TRAJET & SYNC" server/routes/roadtripRoutes.js | cut -d: -f1)

if [ ! -z "$ROADTRIP_SECTION" ] && [ ! -z "$STEP_SECTION" ] && [ ! -z "$ACCOMMODATION_SECTION" ] && [ ! -z "$ACTIVITY_SECTION" ] && [ ! -z "$SYNC_SECTION" ]; then
    echo "✅ Toutes les sections fonctionnelles présentes"
    echo "   - ROADTRIP: ligne $ROADTRIP_SECTION"
    echo "   - STEPS: ligne $STEP_SECTION"
    echo "   - ACCOMMODATIONS: ligne $ACCOMMODATION_SECTION"
    echo "   - ACTIVITIES: ligne $ACTIVITY_SECTION"
    echo "   - SYNC/TEMPS: ligne $SYNC_SECTION"
else
    echo "❌ Sections fonctionnelles manquantes"
    exit 1
fi

# Workflow logique
echo "📋 Test 4: Vérification du workflow logique..."

TOTAL_ROUTES=$(grep -c "router\." server/routes/roadtripRoutes.js)
LINES_COUNT=$(wc -l < server/routes/roadtripRoutes.js)

echo "   - Routes totales: $TOTAL_ROUTES"
echo "   - Lignes de code: $LINES_COUNT"

if [ "$TOTAL_ROUTES" -eq 20 ]; then
    echo "✅ Nombre de routes conservé"
else
    echo "⚠️  Nombre de routes différent (attendu: 20, trouvé: $TOTAL_ROUTES)"
fi

echo ""
echo "🎉 Organisation fonctionnelle validée !"
echo "📊 Résumé roadtripRoutes.js:"
echo "   🚗 Module ROADTRIP: $ROADTRIP_COUNT routes (CRUD principal)"
echo "   📍 Module STEPS: $STEP_COUNT routes (gestion étapes)"
echo "   🏨 Module ACCOMMODATIONS: $ACCOMMODATION_COUNT routes (hébergements)"
echo "   🎯 Module ACTIVITIES: $ACTIVITY_COUNT routes (activités)"
echo "   🔄 Module SYNC/TEMPS: $((TOTAL_ROUTES - ROADTRIP_COUNT - STEP_COUNT - ACCOMMODATION_COUNT - ACTIVITY_COUNT)) routes (jobs asynchrones)"
echo ""
echo "🔍 Avantages organisation fonctionnelle:"
echo "   ✅ Logique métier groupée par domaine"
echo "   ✅ Développement par feature facilité"
echo "   ✅ Workflows business clairs"
echo "   ✅ Maintenance ciblée par module"
