// Test d'authentification et génération de token JWT pour les tests
import jwt from 'jsonwebtoken';
import axios from 'axios';

// Configuration similaire à celle du serveur
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

// Fonction pour créer un token test
function generateTestToken() {
    const testUser = {
        id: 'test_user_123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user'
    };
    
    const token = jwt.sign(testUser, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return token;
}

// Fonction pour vérifier un token
function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return { valid: true, user: decoded };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

// Fonction pour créer un roadtrip de test
function createTestRoadtrip() {
    return {
        id: 'roadtrip_test_123',
        title: 'Roadtrip Test',
        description: 'Un roadtrip de test pour valider le chatbot',
        userId: 'test_user_123',
        startDate: new Date('2024-07-15'),
        endDate: new Date('2024-07-25'),
        status: 'active',
        steps: [
            {
                id: 'step_1',
                title: 'Paris',
                description: 'Visite de Paris',
                location: 'Paris, France',
                startDate: new Date('2024-07-15'),
                endDate: new Date('2024-07-17'),
                coordinates: { lat: 48.8566, lng: 2.3522 }
            },
            {
                id: 'step_2',
                title: 'Lyon',
                description: 'Visite de Lyon',
                location: 'Lyon, France',
                startDate: new Date('2024-07-17'),
                endDate: new Date('2024-07-19'),
                coordinates: { lat: 45.7640, lng: 4.8357 }
            }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
    };
}

// Test principal
async function runTests() {
    console.log('=== Test d\'authentification et génération de token ===\n');
    
    // Générer un token de test
    console.log('1. Génération d\'un token de test...');
    const testToken = generateTestToken();
    console.log('✅ Token généré:', testToken);
    console.log('');
    
    // Vérifier le token
    console.log('2. Vérification du token...');
    const verification = verifyToken(testToken);
    if (verification.valid) {
        console.log('✅ Token valide');
        console.log('📋 Utilisateur:', verification.user);
    } else {
        console.log('❌ Token invalide:', verification.error);
    }
    console.log('');
    
    // Créer un roadtrip de test
    console.log('3. Création d\'un roadtrip de test...');
    const testRoadtrip = createTestRoadtrip();
    console.log('✅ Roadtrip créé:', {
        id: testRoadtrip.id,
        title: testRoadtrip.title,
        userId: testRoadtrip.userId,
        stepsCount: testRoadtrip.steps.length
    });
    console.log('');
    
    // Afficher les informations pour les tests
    console.log('=== Informations pour les tests ===');
    console.log('🔑 Token JWT:', testToken);
    console.log('🗺️ Roadtrip ID:', testRoadtrip.id);
    console.log('👤 User ID:', testRoadtrip.userId);
    console.log('');
    
    // Tester avec une requête HTTP
    console.log('4. Test de requête HTTP avec token...');
    
    try {
        const response = await axios.get('http://localhost:3000/api/roadtrips', {
            headers: {
                'Authorization': `Bearer ${testToken}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('✅ Requête réussie:', response.status);
        console.log('📋 Données:', response.data);
    } catch (error) {
        if (error.response) {
            console.log('❌ Erreur HTTP:', error.response.status, error.response.data);
        } else {
            console.log('❌ Erreur réseau:', error.message);
        }
    }
    console.log('');
    
    // Instructions pour les tests
    console.log('=== Instructions pour les tests ===');
    console.log('1. Copiez le token JWT ci-dessus');
    console.log('2. Ouvrez http://localhost:3000/test_chatbot.html');
    console.log('3. Collez le token dans le champ "Token JWT"');
    console.log('4. Utilisez "roadtrip_test_123" comme ID de roadtrip');
    console.log('5. Connectez-vous et testez les commandes');
    console.log('');
    
    console.log('=== Commandes de test suggérées ===');
    console.log('• "Ajoute une étape à Marseille du 20 au 22 juillet"');
    console.log('• "Ajoute un hébergement Hôtel Ibis à Paris"');
    console.log('• "Ajoute une activité visite du Louvre à Paris"');
    console.log('• "Supprime l\'étape de Lyon"');
    console.log('• "Aide"');
}

// Exporter les fonctions pour réutilisation
export {
    generateTestToken,
    verifyToken,
    createTestRoadtrip,
    runTests
};

// Exécuter les tests si le script est appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().catch(console.error);
}
