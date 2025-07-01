// Test direct de la fonction updateStepDates
// Usage: node testUpdateStepDates.js <stepId>

import { updateStepDates } from './server/utils/travelTimeUtils.js';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Charger la configuration
dotenv.config();

// Connecter à MongoDB
async function connectDB() {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`✅ MongoDB connecté: ${conn.connection.host}`);
    } catch (error) {
        console.error('❌ Erreur de connexion MongoDB:', error.message);
        process.exit(1);
    }
}

async function testUpdateStepDates(stepId) {
    console.log('🧪 TEST DIRECT DE updateStepDates');
    console.log('='.repeat(50));
    console.log(`Step ID: ${stepId}`);
    console.log();

    try {
        // Connexion à la base de données
        await connectDB();

        // Appeler la fonction directement
        console.log('🔄 Appel de updateStepDates...');
        await updateStepDates(stepId);
        console.log('✅ updateStepDates terminée avec succès!');

    } catch (error) {
        console.error('❌ Erreur lors du test:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        // Fermer la connexion
        await mongoose.connection.close();
        console.log('\n📝 Connexion MongoDB fermée');
    }
}

// Fonction principale
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        console.log('❌ Usage: node testUpdateStepDates.js <stepId>');
        console.log('\nExemple:');
        console.log('  node testUpdateStepDates.js 64a1b2c3d4e5f6789abcdef1');
        process.exit(1);
    }

    const stepId = args[0];
    
    // Vérifier que le stepId ressemble à un ObjectId MongoDB
    if (!/^[0-9a-fA-F]{24}$/.test(stepId)) {
        console.log('❌ Le stepId fourni ne ressemble pas à un ObjectId MongoDB valide');
        console.log('Format attendu: 24 caractères hexadécimaux (ex: 64a1b2c3d4e5f6789abcdef1)');
        process.exit(1);
    }

    await testUpdateStepDates(stepId);
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
    console.error(`❌ Erreur non gérée: ${reason}`);
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log('\n\n⚠️  Test interrompu par l\'utilisateur');
    mongoose.connection.close().then(() => {
        process.exit(0);
    });
});

main();
