// Script pour créer un utilisateur et un roadtrip de test dans la base de données
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// Configuration de la base de données
const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/monpetitroadtrip';

// Schémas simplifiés pour les tests
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const RoadtripSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startDate: Date,
    endDate: Date,
    status: { type: String, enum: ['draft', 'active', 'completed'], default: 'active' },
    steps: [{
        title: String,
        description: String,
        location: String,
        startDate: Date,
        endDate: Date,
        coordinates: {
            lat: Number,
            lng: Number
        },
        accommodations: [{
            name: String,
            type: String,
            address: String,
            checkIn: Date,
            checkOut: Date
        }],
        activities: [{
            name: String,
            type: String,
            description: String,
            duration: Number,
            scheduledTime: Date
        }],
        tasks: [{
            title: String,
            description: String,
            completed: { type: Boolean, default: false },
            dueDate: Date
        }]
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Roadtrip = mongoose.model('Roadtrip', RoadtripSchema);

// Fonction pour créer un utilisateur de test
async function createTestUser() {
    try {
        // Vérifier si l'utilisateur existe déjà
        const existingUser = await User.findOne({ email: 'test@example.com' });
        if (existingUser) {
            console.log('✅ Utilisateur de test existe déjà:', existingUser._id);
            return existingUser;
        }
        
        // Créer un nouvel utilisateur
        const testUser = new User({
            email: 'test@example.com',
            name: 'Test User',
            password: 'test123', // En réalité, ceci devrait être hashé
            role: 'user'
        });
        
        await testUser.save();
        console.log('✅ Utilisateur de test créé:', testUser._id);
        return testUser;
    } catch (error) {
        console.error('❌ Erreur lors de la création de l\'utilisateur:', error);
        throw error;
    }
}

// Fonction pour créer un roadtrip de test
async function createTestRoadtrip(userId) {
    try {
        // Vérifier si le roadtrip existe déjà
        const existingRoadtrip = await Roadtrip.findOne({ 
            userId: userId,
            title: 'Roadtrip Test Chatbot'
        });
        
        if (existingRoadtrip) {
            console.log('✅ Roadtrip de test existe déjà:', existingRoadtrip._id);
            return existingRoadtrip;
        }
        
        // Créer un nouveau roadtrip
        const testRoadtrip = new Roadtrip({
            title: 'Roadtrip Test Chatbot',
            description: 'Un roadtrip de test pour valider le chatbot IA',
            userId: userId,
            startDate: new Date('2024-07-15'),
            endDate: new Date('2024-07-25'),
            status: 'active',
            steps: [
                {
                    title: 'Paris',
                    description: 'Visite de la capitale française',
                    location: 'Paris, France',
                    startDate: new Date('2024-07-15'),
                    endDate: new Date('2024-07-17'),
                    coordinates: { lat: 48.8566, lng: 2.3522 },
                    accommodations: [
                        {
                            name: 'Hôtel du Louvre',
                            type: 'hotel',
                            address: 'Place André Malraux, 75001 Paris',
                            checkIn: new Date('2024-07-15T15:00:00'),
                            checkOut: new Date('2024-07-17T11:00:00')
                        }
                    ],
                    activities: [
                        {
                            name: 'Visite du Louvre',
                            type: 'museum',
                            description: 'Visite du musée du Louvre',
                            duration: 180,
                            scheduledTime: new Date('2024-07-16T10:00:00')
                        },
                        {
                            name: 'Tour Eiffel',
                            type: 'monument',
                            description: 'Montée à la Tour Eiffel',
                            duration: 120,
                            scheduledTime: new Date('2024-07-16T15:00:00')
                        }
                    ],
                    tasks: [
                        {
                            title: 'Réserver les billets du Louvre',
                            description: 'Réservation en ligne des billets',
                            completed: false,
                            dueDate: new Date('2024-07-14')
                        }
                    ]
                },
                {
                    title: 'Lyon',
                    description: 'Découverte de la gastronomie lyonnaise',
                    location: 'Lyon, France',
                    startDate: new Date('2024-07-17'),
                    endDate: new Date('2024-07-19'),
                    coordinates: { lat: 45.7640, lng: 4.8357 },
                    accommodations: [
                        {
                            name: 'Hôtel de la Paix',
                            type: 'hotel',
                            address: 'Place Bellecour, 69002 Lyon',
                            checkIn: new Date('2024-07-17T15:00:00'),
                            checkOut: new Date('2024-07-19T11:00:00')
                        }
                    ],
                    activities: [
                        {
                            name: 'Visite du Vieux Lyon',
                            type: 'walking',
                            description: 'Promenade dans le quartier historique',
                            duration: 120,
                            scheduledTime: new Date('2024-07-18T10:00:00')
                        }
                    ],
                    tasks: [
                        {
                            title: 'Réserver un restaurant',
                            description: 'Réservation dans un bouchon lyonnais',
                            completed: false,
                            dueDate: new Date('2024-07-16')
                        }
                    ]
                }
            ]
        });
        
        await testRoadtrip.save();
        console.log('✅ Roadtrip de test créé:', testRoadtrip._id);
        return testRoadtrip;
    } catch (error) {
        console.error('❌ Erreur lors de la création du roadtrip:', error);
        throw error;
    }
}

// Fonction pour générer un token JWT pour l'utilisateur
function generateTokenForUser(user) {
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';
    const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';
    
    const payload = {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role
    };
    
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Fonction principale
async function setupTestData() {
    try {
        console.log('=== Configuration des données de test ===\n');
        
        // Se connecter à la base de données
        console.log('1. Connexion à la base de données...');
        await mongoose.connect(DB_URI);
        console.log('✅ Connecté à MongoDB');
        console.log('');
        
        // Créer un utilisateur de test
        console.log('2. Création de l\'utilisateur de test...');
        const testUser = await createTestUser();
        console.log('');
        
        // Créer un roadtrip de test
        console.log('3. Création du roadtrip de test...');
        const testRoadtrip = await createTestRoadtrip(testUser._id);
        console.log('');
        
        // Générer un token JWT
        console.log('4. Génération du token JWT...');
        const token = generateTokenForUser(testUser);
        console.log('✅ Token généré');
        console.log('');
        
        // Afficher les informations de test
        console.log('=== Informations pour les tests ===');
        console.log('👤 User ID:', testUser._id.toString());
        console.log('👤 Email:', testUser.email);
        console.log('🗺️ Roadtrip ID:', testRoadtrip._id.toString());
        console.log('🗺️ Titre:', testRoadtrip.title);
        console.log('📍 Étapes:', testRoadtrip.steps.length);
        console.log('🔑 Token JWT:', token);
        console.log('');
        
        // Instructions pour les tests
        console.log('=== Instructions pour les tests ===');
        console.log('1. Copiez le token JWT ci-dessus');
        console.log('2. Copiez le Roadtrip ID ci-dessus');
        console.log('3. Ouvrez http://localhost:3000/test_chatbot.html');
        console.log('4. Collez le token dans le champ "Token JWT"');
        console.log('5. Collez le Roadtrip ID dans le champ "ID du roadtrip"');
        console.log('6. Connectez-vous et testez les commandes');
        console.log('');
        
        console.log('=== Commandes de test suggérées ===');
        console.log('• "Ajoute une étape à Marseille du 20 au 22 juillet"');
        console.log('• "Ajoute un hébergement Hôtel Ibis à Paris"');
        console.log('• "Ajoute une activité visite du Sacré-Cœur à Paris"');
        console.log('• "Ajoute une tâche réserver les billets de train"');
        console.log('• "Supprime l\'étape de Lyon"');
        console.log('• "Modifie l\'étape de Paris pour finir le 18 juillet"');
        console.log('• "Aide"');
        console.log('');
        
        return {
            user: testUser,
            roadtrip: testRoadtrip,
            token: token
        };
        
    } catch (error) {
        console.error('❌ Erreur lors de la configuration:', error);
        throw error;
    } finally {
        // Fermer la connexion à la base de données
        await mongoose.disconnect();
        console.log('✅ Déconnecté de MongoDB');
    }
}

// Exporter les fonctions
export {
    createTestUser,
    createTestRoadtrip,
    generateTokenForUser,
    setupTestData
};

// Exécuter le script si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
    setupTestData().catch(console.error);
}
