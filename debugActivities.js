// Script pour diagnostiquer le problème de récupération des activités
// Usage: node debugActivities.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Activity from './server/models/Activity.js';
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

const debugActivities = async () => {
    const stepId = '67ac491396003c7411aea8ee';
    
    console.log(`🔍 DEBUG des activités pour step ${stepId}`);
    console.log('=====================================');
    
    // Récupérer le step
    const step = await Step.findById(stepId);
    if (!step) {
        console.log('❌ Step non trouvé');
        return;
    }
    
    console.log(`📍 Step trouvé: ${step.name}`);
    console.log(`   - activities dans le step: ${step.activities.length} IDs`);
    step.activities.forEach((activityId, index) => {
        console.log(`     ${index + 1}. ${activityId}`);
    });
    
    console.log('\n🔍 Test des différentes requêtes:');
    
    // Test 1: Requête actuelle
    console.log('\n1️⃣ Requête actuelle: Activity.find({ stepId, active: true })');
    const activities1 = await Activity.find({ stepId, active: true });
    console.log(`   Résultat: ${activities1.length} activités`);
    activities1.forEach((activity, index) => {
        console.log(`     ${index + 1}. ${activity.name} (active: ${activity.active})`);
    });
    
    // Test 2: Requête sans filter active
    console.log('\n2️⃣ Requête sans filter active: Activity.find({ stepId })');
    const activities2 = await Activity.find({ stepId });
    console.log(`   Résultat: ${activities2.length} activités`);
    activities2.forEach((activity, index) => {
        console.log(`     ${index + 1}. ${activity.name} (active: ${activity.active})`);
    });
    
    // Test 3: Requête par ID directs
    console.log('\n3️⃣ Requête par IDs directs: Activity.find({ _id: { $in: step.activities } })');
    const activities3 = await Activity.find({ _id: { $in: step.activities } });
    console.log(`   Résultat: ${activities3.length} activités`);
    activities3.forEach((activity, index) => {
        console.log(`     ${index + 1}. ${activity.name} (stepId: ${activity.stepId}, active: ${activity.active})`);
    });
    
    // Test 4: Requête par ID directs avec filter active
    console.log('\n4️⃣ Requête par IDs directs + active: Activity.find({ _id: { $in: step.activities }, active: true })');
    const activities4 = await Activity.find({ _id: { $in: step.activities }, active: true });
    console.log(`   Résultat: ${activities4.length} activités`);
    activities4.forEach((activity, index) => {
        console.log(`     ${index + 1}. ${activity.name} (stepId: ${activity.stepId}, active: ${activity.active})`);
    });
    
    // Test 5: Vérifier chaque activité individuellement
    console.log('\n5️⃣ Vérification individuelle de chaque activité:');
    for (let i = 0; i < step.activities.length; i++) {
        const activityId = step.activities[i];
        const activity = await Activity.findById(activityId);
        if (activity) {
            console.log(`     ${i + 1}. ID: ${activityId}`);
            console.log(`        - name: ${activity.name}`);
            console.log(`        - stepId: ${activity.stepId}`);
            console.log(`        - stepId matches: ${activity.stepId.toString() === stepId}`);
            console.log(`        - active: ${activity.active}`);
            console.log(`        - startDateTime: ${activity.startDateTime}`);
            console.log(`        - endDateTime: ${activity.endDateTime}`);
        } else {
            console.log(`     ${i + 1}. ID: ${activityId} - ❌ ACTIVITÉ NON TROUVÉE`);
        }
    }
};

const main = async () => {
    try {
        await connectDB();
        await debugActivities();
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Connexion fermée');
    }
};

main();
