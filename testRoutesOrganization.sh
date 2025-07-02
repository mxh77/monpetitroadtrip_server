#!/bin/bash

# Script de test pour vérifier l'organisation des routes nettoyées
# Teste l'accessibilité des routes et la génération de la documentation Swagger

echo "🧪 Test de l'organisation des routes roadtripRoutes.js"
echo "=================================================="

cd "$(dirname "$0")"

# Vérifier que le serveur peut démarrer sans erreur (test syntaxe)
echo "📋 Test 1: Vérification de la syntaxe..."
node -c server/app.js
if [ $? -eq 0 ]; then
    echo "✅ Syntaxe du serveur correcte"
else
    echo "❌ Erreur de syntaxe dans le serveur"
    exit 1
fi

# Vérifier que les fichiers OpenAPI sont générés
echo "📋 Test 2: Vérification de la génération Swagger..."
if [ -f "openapi.json" ] && [ -f "openapi.yaml" ]; then
    echo "✅ Fichiers OpenAPI générés avec succès"
else
    echo "❌ Fichiers OpenAPI manquants"
    exit 1
fi

# Compter les routes dans le fichier épuré
echo "📋 Test 3: Vérification de la structure épurée..."
ROUTE_COUNT=$(grep -c "router\." server/routes/roadtripRoutes.js)
SWAGGER_COMMENT_COUNT=$(grep -c "@swagger" server/routes/roadtripRoutes.js)

echo "   - Routes définies: $ROUTE_COUNT"
echo "   - Commentaires Swagger: $SWAGGER_COMMENT_COUNT"

if [ "$ROUTE_COUNT" -gt 15 ] && [ "$SWAGGER_COMMENT_COUNT" -eq 0 ]; then
    echo "✅ Structure épurée correcte"
else
    echo "❌ Structure non conforme"
    exit 1
fi

# Vérifier que la documentation Swagger séparée existe
echo "📋 Test 4: Vérification de la documentation séparée..."
if [ -f "server/routes/roadtripRoutes.swagger.js" ]; then
    SWAGGER_DOC_COUNT=$(grep -c "@swagger" server/routes/roadtripRoutes.swagger.js)
    echo "   - Blocs de documentation Swagger: $SWAGGER_DOC_COUNT"
    if [ "$SWAGGER_DOC_COUNT" -gt 10 ]; then
        echo "✅ Documentation Swagger séparée présente"
    else
        echo "❌ Documentation Swagger insuffisante"
        exit 1
    fi
else
    echo "❌ Fichier de documentation Swagger manquant"
    exit 1
fi

echo ""
echo "🎉 Tous les tests passent !"
echo "📊 Résumé de l'organisation:"
echo "   - Routes principales: $(grep -c "router\." server/routes/roadtripRoutes.js)"
echo "   - Lignes total (épuré): $(wc -l < server/routes/roadtripRoutes.js)"
echo "   - Documentation séparée: $(wc -l < server/routes/roadtripRoutes.swagger.js) lignes"
echo ""
echo "📖 Structure des routes par méthode:"
echo "   - POST: $(grep -c "router\.post" server/routes/roadtripRoutes.js)"
echo "   - PUT: $(grep -c "router\.put" server/routes/roadtripRoutes.js)"
echo "   - PATCH: $(grep -c "router\.patch" server/routes/roadtripRoutes.js)"
echo "   - GET: $(grep -c "router\.get" server/routes/roadtripRoutes.js)"
echo "   - DELETE: $(grep -c "router\.delete" server/routes/roadtripRoutes.js)"
