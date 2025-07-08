import axios from 'axios';

// Configuration
const API_URL = 'http://localhost:3000';
const JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Remplacez par un token valide
const ROADTRIP_ID = 'YOUR_ROADTRIP_ID_HERE'; // Remplacez par un ID de roadtrip valide

const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${JWT_TOKEN}`
};

async function testRoadtripTasksAPI() {
    console.log('🧪 Test de l\'API de gestion des tâches de roadtrip\n');

    try {
        // Test 1: Créer des tâches par défaut
        console.log('1️⃣ Génération des tâches par défaut...');
        const defaultTasksResponse = await axios.post(
            `${API_URL}/roadtrips/${ROADTRIP_ID}/tasks/generate-defaults`,
            {},
            { headers }
        );
        console.log('✅ Tâches par défaut créées:', defaultTasksResponse.data.count);

        // Test 2: Récupérer toutes les tâches
        console.log('\n2️⃣ Récupération de toutes les tâches...');
        const allTasksResponse = await axios.get(
            `${API_URL}/roadtrips/${ROADTRIP_ID}/tasks`,
            { headers }
        );
        console.log('✅ Tâches récupérées:', allTasksResponse.data.tasks.length);
        console.log('📊 Statistiques:', allTasksResponse.data.stats);

        // Test 3: Créer une nouvelle tâche
        console.log('\n3️⃣ Création d\'une nouvelle tâche...');
        const newTaskData = {
            title: 'Acheter les billets d\'avion',
            description: 'Réserver les vols aller-retour pour toute la famille',
            category: 'booking',
            priority: 'high',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Dans 7 jours
            assignedTo: 'Papa',
            estimatedDuration: 60 // 60 minutes
        };

        const createTaskResponse = await axios.post(
            `${API_URL}/roadtrips/${ROADTRIP_ID}/tasks`,
            newTaskData,
            { headers }
        );
        console.log('✅ Nouvelle tâche créée:', createTaskResponse.data.title);
        const newTaskId = createTaskResponse.data._id;

        // Test 4: Récupérer une tâche spécifique
        console.log('\n4️⃣ Récupération d\'une tâche spécifique...');
        const singleTaskResponse = await axios.get(
            `${API_URL}/roadtrips/${ROADTRIP_ID}/tasks/${newTaskId}`,
            { headers }
        );
        console.log('✅ Tâche récupérée:', singleTaskResponse.data.title);

        // Test 5: Mettre à jour la tâche
        console.log('\n5️⃣ Mise à jour de la tâche...');
        const updateData = {
            status: 'in_progress',
            notes: 'Recherche des meilleurs prix en cours'
        };

        const updateTaskResponse = await axios.put(
            `${API_URL}/roadtrips/${ROADTRIP_ID}/tasks/${newTaskId}`,
            updateData,
            { headers }
        );
        console.log('✅ Tâche mise à jour:', updateTaskResponse.data.status);

        // Test 6: Basculer le statut de completion
        console.log('\n6️⃣ Basculer le statut de completion...');
        const toggleResponse = await axios.patch(
            `${API_URL}/roadtrips/${ROADTRIP_ID}/tasks/${newTaskId}/toggle-completion`,
            {},
            { headers }
        );
        console.log('✅ Statut basculé vers:', toggleResponse.data.status);

        // Test 7: Filtrer les tâches par catégorie
        console.log('\n7️⃣ Filtrage des tâches par catégorie "booking"...');
        const filteredTasksResponse = await axios.get(
            `${API_URL}/roadtrips/${ROADTRIP_ID}/tasks?category=booking`,
            { headers }
        );
        console.log('✅ Tâches de type "booking" trouvées:', filteredTasksResponse.data.tasks.length);

        // Test 8: Réorganiser les tâches
        console.log('\n8️⃣ Réorganisation des tâches...');
        const reorderData = {
            taskOrders: [
                { taskId: newTaskId, order: 1 },
                // Ajoutez d'autres tâches si nécessaire
            ]
        };

        const reorderResponse = await axios.patch(
            `${API_URL}/roadtrips/${ROADTRIP_ID}/tasks/reorder`,
            reorderData,
            { headers }
        );
        console.log('✅ Tâches réorganisées avec succès');

        // Test 9: Supprimer la tâche de test
        console.log('\n9️⃣ Suppression de la tâche de test...');
        const deleteResponse = await axios.delete(
            `${API_URL}/roadtrips/${ROADTRIP_ID}/tasks/${newTaskId}`,
            { headers }
        );
        console.log('✅ Tâche supprimée:', deleteResponse.data.msg);

        console.log('\n🎉 Tous les tests ont réussi !');

    } catch (error) {
        console.error('❌ Erreur lors du test:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            console.log('\n💡 Conseil: Vérifiez que votre JWT_TOKEN est valide');
        }
        
        if (error.response?.status === 404) {
            console.log('\n💡 Conseil: Vérifiez que le ROADTRIP_ID existe et vous appartient');
        }
    }
}

// Instructions d'utilisation
console.log(`
⚠️  INSTRUCTIONS AVANT DE LANCER LE TEST:

1. Démarrez le serveur: npm start
2. Connectez-vous et récupérez un token JWT valide
3. Créez un roadtrip et récupérez son ID
4. Modifiez les constantes JWT_TOKEN et ROADTRIP_ID dans ce fichier
5. Relancez ce test avec: node testRoadtripTasks.js

Endpoints testés:
- POST /roadtrips/:roadtripId/tasks/generate-defaults
- GET /roadtrips/:roadtripId/tasks
- POST /roadtrips/:roadtripId/tasks
- GET /roadtrips/:roadtripId/tasks/:taskId
- PUT /roadtrips/:roadtripId/tasks/:taskId
- PATCH /roadtrips/:roadtripId/tasks/:taskId/toggle-completion
- PATCH /roadtrips/:roadtripId/tasks/reorder
- DELETE /roadtrips/:roadtripId/tasks/:taskId
`);

// Lancer le test seulement si les tokens sont configurés
if (JWT_TOKEN !== 'YOUR_JWT_TOKEN_HERE' && ROADTRIP_ID !== 'YOUR_ROADTRIP_ID_HERE') {
    testRoadtripTasksAPI();
} else {
    console.log('👆 Veuillez configurer JWT_TOKEN et ROADTRIP_ID avant de lancer le test');
}
