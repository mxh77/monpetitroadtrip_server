#!/bin/bash

# Script pour démarrer le serveur et exécuter les tests du chatbot

echo "=== Démarrage des tests du chatbot MonPetitRoadtrip ==="
echo ""

# Fonction pour vérifier si le serveur est en cours d'exécution
check_server() {
    curl -s http://localhost:3000/health > /dev/null 2>&1
    return $?
}

# Fonction pour attendre que le serveur soit prêt
wait_for_server() {
    echo "⏳ Attente du démarrage du serveur..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if check_server; then
            echo "✅ Serveur prêt"
            return 0
        fi
        
        echo "   Tentative $attempt/$max_attempts..."
        sleep 2
        ((attempt++))
    done
    
    echo "❌ Timeout: le serveur n'a pas démarré dans les temps"
    return 1
}

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    exit 1
fi

# Vérifier si npm est installé
if ! command -v npm &> /dev/null; then
    echo "❌ npm n'est pas installé"
    exit 1
fi

# Installer les dépendances si nécessaire
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install
fi

# Vérifier si MongoDB est en cours d'exécution
if ! pgrep mongod > /dev/null; then
    echo "⚠️  MongoDB ne semble pas être en cours d'exécution"
    echo "   Assurez-vous que MongoDB est démarré avant de continuer"
    echo "   Voulez-vous continuer malgré tout? (y/n)"
    read -r response
    if [ "$response" != "y" ]; then
        echo "❌ Test annulé"
        exit 1
    fi
fi

# Démarrer le serveur en arrière-plan
echo "🚀 Démarrage du serveur..."
node server/app.js &
SERVER_PID=$!

# Attendre que le serveur soit prêt
if ! wait_for_server; then
    echo "❌ Impossible de démarrer le serveur"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

echo ""
echo "=== Tests du chatbot ==="
echo ""

# Test 1: Génération de token
echo "1. Test de génération de token..."
node testAuthToken.js
echo ""

# Test 2: Configuration des données de test (si MongoDB est disponible)
echo "2. Configuration des données de test..."
if node setupTestData.js; then
    echo "✅ Données de test configurées"
else
    echo "⚠️  Impossible de configurer les données de test (MongoDB requis)"
fi
echo ""

# Tests complets du chatbot
echo "3. Tests complets du chatbot..."
node testChatbotComplete.js
echo ""

# Afficher les informations pour les tests manuels
echo "=== Tests manuels ==="
echo "🌐 Interface de test: http://localhost:3000/test_chatbot.html"
echo ""
echo "⏸️  Le serveur reste en cours d'exécution pour les tests manuels"
echo "   Appuyez sur Ctrl+C pour arrêter le serveur"
echo ""

# Attendre l'interruption de l'utilisateur
trap 'echo ""; echo "🛑 Arrêt du serveur..."; kill $SERVER_PID 2>/dev/null; exit 0' INT

# Garder le script en cours d'exécution
while true; do
    if ! kill -0 $SERVER_PID 2>/dev/null; then
        echo "❌ Le serveur s'est arrêté de manière inattendue"
        exit 1
    fi
    sleep 5
done
