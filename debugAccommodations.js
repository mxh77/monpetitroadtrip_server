// Script pour tester la même chose avec les accommodations
// Usage: node debugAccommodations.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Accommodation from './server/models/Accommodation.js';
import Step from './server/models/Step.js';

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

const debugAccommodations = async () => {
    const stepId = '67ac491396003c7411aea8ee';
    
    console.log(`🔍 DEBUG des accommodations pour step ${stepId}`);
    console.log('===========================================');
    
    // Récupérer le step
    const step = await Step.findById(stepId);
    if (!step) {
        console.log('❌ Step non trouvé');
        return;
    }
    
    console.log(`📍 Step trouvé: ${step.name}`);
    console.log(`   - accommodations dans le step: ${step.accommodations.length} IDs`);
    step.accommodations.forEach((accommodationId, index) => {
        console.log(`     ${index + 1}. ${accommodationId}`);
    });
    
    console.log('\n🔍 Test des requêtes accommodations:');
    
    // Test 1: Requête actuelle
    console.log('\n1️⃣ Requête actuelle: Accommodation.find({ stepId, active: true })');
    const accommodations1 = await Accommodation.find({ stepId, active: true });
    console.log(`   Résultat: ${accommodations1.length} accommodations`);
    accommodations1.forEach((accommodation, index) => {
        console.log(`     ${index + 1}. ${accommodation.name} (active: ${accommodation.active})`);
    });
    
    // Test 2: Requête sans filter active
    console.log('\n2️⃣ Requête sans filter active: Accommodation.find({ stepId })');
    const accommodations2 = await Accommodation.find({ stepId });
    console.log(`   Résultat: ${accommodations2.length} accommodations`);
    accommodations2.forEach((accommodation, index) => {
        console.log(`     ${index + 1}. ${accommodation.name} (active: ${accommodation.active})`);
    });
    
    // Test 3: Vérifier chaque accommodation individuellement
    console.log('\n3️⃣ Vérification individuelle de chaque accommodation:');
    for (let i = 0; i < step.accommodations.length; i++) {
        const accommodationId = step.accommodations[i];
        const accommodation = await Accommodation.findById(accommodationId);
        if (accommodation) {
            console.log(`     ${i + 1}. ID: ${accommodationId}`);
            console.log(`        - name: ${accommodation.name}`);
            console.log(`        - stepId: ${accommodation.stepId}`);
            console.log(`        - stepId matches: ${accommodation.stepId.toString() === stepId}`);
            console.log(`        - active: ${accommodation.active}`);
            console.log(`        - arrivalDateTime: ${accommodation.arrivalDateTime}`);
            console.log(`        - departureDateTime: ${accommodation.departureDateTime}`);
        } else {
            console.log(`     ${i + 1}. ID: ${accommodationId} - ❌ ACCOMMODATION NON TROUVÉE`);
        }
    }
};

const main = async () => {
    try {
        await connectDB();
        await debugAccommodations();
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Connexion fermée');
    }
};

main();
