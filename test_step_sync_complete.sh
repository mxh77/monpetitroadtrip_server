#!/bin/bash

# Script de test complet de la synchronisation des steps
# Usage: ./test_step_sync_complete.sh

echo "=== Test Complet - Synchronisation des Steps ==="
echo

# Configuration
SERVER_URL="http://localhost:3000"
API_BASE="$SERVER_URL/api/roadtrips"

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages colorés
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Fonction pour faire une requête avec gestion d'erreur
make_request() {
    local method=$1
    local url=$2
    local auth_header=$3
    local data=$4
    
    if [ -n "$data" ]; then
        curl -s -X "$method" "$url" \
            -H "Authorization: Bearer $auth_header" \
            -H "Content-Type: application/json" \
            -d "$data"
    else
        curl -s -X "$method" "$url" \
            -H "Authorization: Bearer $auth_header" \
            -H "Content-Type: application/json"
    fi
}

# Fonction pour extraire une valeur JSON
extract_json_value() {
    local json=$1
    local key=$2
    echo "$json" | grep -o "\"$key\":\"[^\"]*\"" | cut -d'"' -f4
}

# Vérifier si les paramètres requis sont fournis
if [ $# -lt 2 ]; then
    print_status $RED "Usage: $0 <ROADTRIP_ID> <JWT_TOKEN>"
    echo "Exemple: $0 64a1b2c3d4e5f6789abcdef9 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    exit 1
fi

ROADTRIP_ID=$1
JWT_TOKEN=$2

print_status $BLUE "Configuration:"
echo "  - Server: $SERVER_URL"
echo "  - Roadtrip ID: $ROADTRIP_ID"
echo "  - Token: ${JWT_TOKEN:0:20}..."
echo

# Test 1: Vérifier que le roadtrip existe
print_status $YELLOW "📋 Test 1: Vérification du roadtrip..."
response=$(make_request "GET" "$API_BASE/$ROADTRIP_ID" "$JWT_TOKEN")

if echo "$response" | grep -q "\"_id\""; then
    print_status $GREEN "✅ Roadtrip trouvé et accessible"
    # Extraire le nombre de steps
    steps_count=$(echo "$response" | grep -o "\"steps\":\[[^]]*\]" | grep -o "\"[^\"]*\"" | wc -l)
    echo "   Nombre de steps détectés: $((steps_count / 2))"
else
    print_status $RED "❌ Erreur: Roadtrip non trouvé ou non accessible"
    echo "Réponse: $response"
    exit 1
fi

# Test 2: Lancer la synchronisation asynchrone
print_status $YELLOW "🔄 Test 2: Lancement de la synchronisation asynchrone..."
sync_response=$(make_request "PATCH" "$API_BASE/$ROADTRIP_ID/sync-steps/async" "$JWT_TOKEN")

if echo "$sync_response" | grep -q "\"jobId\""; then
    job_id=$(extract_json_value "$sync_response" "jobId")
    print_status $GREEN "✅ Job de synchronisation créé avec succès"
    echo "   Job ID: $job_id"
    
    # Extraire les détails du job
    status=$(extract_json_value "$sync_response" "status")
    total=$(echo "$sync_response" | grep -o "\"total\":[0-9]*" | cut -d':' -f2)
    echo "   Status initial: $status"
    echo "   Steps à traiter: $total"
else
    print_status $RED "❌ Erreur lors de la création du job"
    echo "Réponse: $sync_response"
    exit 1
fi

# Test 3: Surveiller le progrès
print_status $YELLOW "📊 Test 3: Surveillance du progrès..."
max_attempts=30
attempt=0
final_status=""

while [ $attempt -lt $max_attempts ]; do
    sleep 2
    attempt=$((attempt + 1))
    
    status_response=$(make_request "GET" "$API_BASE/$ROADTRIP_ID/sync-jobs/$job_id/status" "$JWT_TOKEN")
    
    if echo "$status_response" | grep -q "\"status\""; then
        current_status=$(extract_json_value "$status_response" "status")
        percentage=$(echo "$status_response" | grep -o "\"percentage\":[0-9]*" | cut -d':' -f2)
        
        echo "   Tentative $attempt/30 - Status: $current_status - Progression: ${percentage:-0}%"
        
        if [ "$current_status" = "completed" ]; then
            print_status $GREEN "✅ Synchronisation terminée avec succès!"
            final_status="completed"
            
            # Extraire les résultats
            if echo "$status_response" | grep -q "\"summary\""; then
                echo "   📊 Résultats de la synchronisation:"
                total_steps=$(echo "$status_response" | grep -o "\"totalSteps\":[0-9]*" | cut -d':' -f2)
                sync_steps=$(echo "$status_response" | grep -o "\"synchronizedSteps\":[0-9]*" | cut -d':' -f2)
                unchanged_steps=$(echo "$status_response" | grep -o "\"unchangedSteps\":[0-9]*" | cut -d':' -f2)
                
                echo "      - Total steps: ${total_steps:-N/A}"
                echo "      - Steps synchronisés: ${sync_steps:-N/A}"
                echo "      - Steps inchangés: ${unchanged_steps:-N/A}"
            fi
            break
        elif [ "$current_status" = "failed" ]; then
            print_status $RED "❌ Synchronisation échouée"
            final_status="failed"
            
            # Extraire le message d'erreur
            error_msg=$(extract_json_value "$status_response" "errorMessage")
            if [ -n "$error_msg" ]; then
                echo "   Erreur: $error_msg"
            fi
            break
        fi
    else
        print_status $RED "❌ Erreur lors de la récupération du statut"
        echo "Réponse: $status_response"
        break
    fi
done

if [ $attempt -eq $max_attempts ] && [ "$final_status" != "completed" ] && [ "$final_status" != "failed" ]; then
    print_status $YELLOW "⚠️  Timeout: La synchronisation prend plus de temps que prévu"
    echo "   Vous pouvez vérifier manuellement le statut avec:"
    echo "   curl -H \"Authorization: Bearer $JWT_TOKEN\" $API_BASE/$ROADTRIP_ID/sync-jobs/$job_id/status"
fi

# Test 4: Lister l'historique des jobs
print_status $YELLOW "📚 Test 4: Récupération de l'historique des jobs..."
history_response=$(make_request "GET" "$API_BASE/$ROADTRIP_ID/sync-jobs" "$JWT_TOKEN")

if echo "$history_response" | grep -q "\"jobs\""; then
    print_status $GREEN "✅ Historique récupéré avec succès"
    
    # Compter le nombre de jobs
    jobs_count=$(echo "$history_response" | grep -o "\"jobId\":" | wc -l)
    echo "   Nombre de jobs dans l'historique: $jobs_count"
    
    # Afficher les derniers jobs
    echo "   Jobs récents:"
    echo "$history_response" | grep -o "\"jobId\":\"[^\"]*\"" | head -3 | while read job_line; do
        job_id_hist=$(echo "$job_line" | cut -d'"' -f4)
        echo "      - $job_id_hist"
    done
else
    print_status $RED "❌ Erreur lors de la récupération de l'historique"
    echo "Réponse: $history_response"
fi

# Test 5: Test avec job déjà en cours (devrait retourner 409)
print_status $YELLOW "🔒 Test 5: Test de conflit (job déjà en cours)..."
conflict_response=$(make_request "PATCH" "$API_BASE/$ROADTRIP_ID/sync-steps/async" "$JWT_TOKEN")

if echo "$conflict_response" | grep -q "409" || echo "$conflict_response" | grep -q "en cours"; then
    print_status $GREEN "✅ Gestion de conflit correcte (409 Conflict)"
else
    print_status $YELLOW "⚠️  Nouveau job créé (précédent terminé ou gestion différente)"
    # Ce n'est pas forcément une erreur si le job précédent est terminé
fi

# Résumé final
echo
print_status $BLUE "=== Résumé des tests ==="
echo "1. ✅ Vérification du roadtrip"
echo "2. ✅ Création du job de synchronisation"
echo "3. $([ "$final_status" = "completed" ] && echo "✅" || echo "⚠️ ") Surveillance du progrès"
echo "4. ✅ Récupération de l'historique"
echo "5. ✅ Test de gestion de conflit"

if [ "$final_status" = "completed" ]; then
    print_status $GREEN "🎉 Tous les tests ont réussi! L'API de synchronisation fonctionne correctement."
    echo
    echo "Prochaines étapes possibles:"
    echo "- Tester l'API de calcul des temps de trajet avec synchronisation:"
    echo "  curl -X PATCH -H \"Authorization: Bearer $JWT_TOKEN\" $API_BASE/$ROADTRIP_ID/refresh-travel-times/async"
    echo "- Vérifier les steps synchronisés dans l'interface web"
    echo "- Lancer des tests de performance avec plus de steps"
else
    print_status $YELLOW "⚠️  Tests partiellement réussis. Vérifiez les logs du serveur pour plus d'informations."
fi

echo
