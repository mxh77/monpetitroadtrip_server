@echo off
setlocal

echo === Demarrage des tests du chatbot MonPetitRoadtrip ===
echo.

REM Verifier si Node.js est installe
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo X Node.js n'est pas installe
    pause
    exit /b 1
)

REM Verifier si npm est installe
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo X npm n'est pas installe
    pause
    exit /b 1
)

REM Installer les dependances si necessaire
if not exist node_modules (
    echo Installation des dependances...
    npm install
)

REM Demarrer le serveur en arriere-plan
echo Demarrage du serveur...
start /b node server/app.js

REM Attendre que le serveur soit pret
echo Attente du demarrage du serveur...
timeout /t 5 /nobreak >nul

REM Verifier si le serveur est pret
curl -s http://localhost:3000/health >nul 2>&1
if %errorlevel% neq 0 (
    echo Attente supplementaire...
    timeout /t 10 /nobreak >nul
)

echo.
echo === Tests du chatbot ===
echo.

REM Test 1: Generation de token
echo 1. Test de generation de token...
node testAuthToken.js
echo.

REM Test 2: Configuration des donnees de test
echo 2. Configuration des donnees de test...
node setupTestData.js
echo.

REM Test 3: Tests complets du chatbot
echo 3. Tests complets du chatbot...
node testChatbotComplete.js
echo.

REM Test 4: Test WebSocket simple
echo 4. Test WebSocket simple...
node testWebSocket.js
echo.

REM Afficher les informations pour les tests manuels
echo === Tests manuels ===
echo Interface de test: http://localhost:3000/test_chatbot.html
echo Interface WebSocket: http://localhost:3000/test_websocket_simple.html
echo.
echo Le serveur reste en cours d'execution pour les tests manuels
echo Appuyez sur une touche pour arreter le serveur
echo.

REM Attendre l'interruption de l'utilisateur
pause

REM Arreter le serveur
echo Arret du serveur...
taskkill /f /im node.exe >nul 2>&1

echo Tests termines.
pause
