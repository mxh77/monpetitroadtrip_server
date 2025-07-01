// Script pour tester directement la fonction updateStepDates corrigée
// Usage: node testDirectStepSync.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { updateStepDates } from './server/utils/travelTimeUtils.js';

// Charger les variables d'environnement
dotenv.config();

// Connexion à MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/monpetitroadtrip');
        console.log('✅ Connexion MongoDB réussie');
    } catch (error) {
        console.error('❌ Erreur connexion MongoDB:', error);
        process.exit(1);
    }
};

const testStepSync = async () => {
    const stepId = '67ac491396003c7411aea8ee';
    
    console.log(`🔄 Test direct de updateStepDates pour step ${stepId}`);
    console.log('=========================================================');
    
    try {
        await updateStepDates(stepId);
        console.log('✅ Synchronisation terminée avec succès!');
    } catch (error) {
        console.error('❌ Erreur lors de la synchronisation:', error);
    }
};

const main = async () => {
    try {
        await connectDB();
        await testStepSync();
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Connexion fermée');
    }
};

main();
