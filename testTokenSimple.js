// Test simple de génération de token JWT
import jwt from 'jsonwebtoken';

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

// Créer un utilisateur de test
const testUser = {
    id: 'test_user_123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user'
};

// Générer le token
const token = jwt.sign(testUser, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

console.log('=== Test Token JWT ===');
console.log('✅ Token généré avec succès');
console.log('🔑 Token:', token);
console.log('👤 Utilisateur:', testUser);
console.log('');

// Vérifier le token
try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ Token valide');
    console.log('📋 Payload décodé:', decoded);
} catch (error) {
    console.log('❌ Token invalide:', error.message);
}

console.log('');
console.log('=== Informations pour les tests ===');
console.log('🔑 Token JWT à copier:', token);
console.log('🗺️ ID de roadtrip de test: test_roadtrip_123');
console.log('🌐 Interface de test: http://localhost:3000/test_chatbot.html');
console.log('');
console.log('Instructions:');
console.log('1. Copiez le token ci-dessus');
console.log('2. Ouvrez l\'interface de test');
console.log('3. Collez le token dans le champ "Token JWT"');
console.log('4. Utilisez "test_roadtrip_123" comme ID de roadtrip');
console.log('5. Connectez-vous et testez les commandes');
