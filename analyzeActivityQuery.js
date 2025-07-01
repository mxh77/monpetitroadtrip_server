// Script pour analyser en détail le problème de requête avec les activités
// Usage: node analyzeActivityQuery.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Activity from './server/models/Activity.js';

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

const analyzeQuery = async () => {
    const stepId = '67ac491396003c7411aea8ee';
    
    console.log(`🔍 ANALYSE DÉTAILLÉE du problème avec la requête`);
    console.log('================================================');
    
    // Test 1: Conversion de stepId
    console.log(`\n1️⃣ Test des types de stepId:`);
    console.log(`   - stepId (string): "${stepId}"`);
    console.log(`   - typeof stepId: ${typeof stepId}`);
    
    const stepIdObj = new mongoose.Types.ObjectId(stepId);
    console.log(`   - stepIdObj (ObjectId): ${stepIdObj}`);
    console.log(`   - typeof stepIdObj: ${typeof stepIdObj}`);
    
    // Test 2: Requêtes avec différents types
    console.log(`\n2️⃣ Test avec stepId string:`);
    const query1 = { stepId: stepId, active: true };
    console.log(`   - Requête: ${JSON.stringify(query1)}`);
    const result1 = await Activity.find(query1);
    console.log(`   - Résultat: ${result1.length} activités`);
    
    console.log(`\n3️⃣ Test avec stepId ObjectId:`);
    const query2 = { stepId: stepIdObj, active: true };
    console.log(`   - Requête: ${JSON.stringify(query2)}`);
    const result2 = await Activity.find(query2);
    console.log(`   - Résultat: ${result2.length} activités`);
    
    // Test 3: Requêtes avec $and explicite
    console.log(`\n4️⃣ Test avec $and explicite (string):`);
    const query3 = { $and: [{ stepId: stepId }, { active: true }] };
    console.log(`   - Requête: ${JSON.stringify(query3)}`);
    const result3 = await Activity.find(query3);
    console.log(`   - Résultat: ${result3.length} activités`);
    
    console.log(`\n5️⃣ Test avec $and explicite (ObjectId):`);
    const query4 = { $and: [{ stepId: stepIdObj }, { active: true }] };
    console.log(`   - Requête: ${JSON.stringify(query4)}`);
    const result4 = await Activity.find(query4);
    console.log(`   - Résultat: ${result4.length} activités`);
    
    // Test 4: Requêtes séparées
    console.log(`\n6️⃣ Test séparé - seulement stepId (string):`);
    const result5 = await Activity.find({ stepId: stepId });
    console.log(`   - Résultat: ${result5.length} activités`);
    
    console.log(`\n7️⃣ Test séparé - seulement stepId (ObjectId):`);
    const result6 = await Activity.find({ stepId: stepIdObj });
    console.log(`   - Résultat: ${result6.length} activités`);
    
    console.log(`\n8️⃣ Test séparé - seulement active:`);
    const result7 = await Activity.find({ active: true });
    console.log(`   - Résultat: ${result7.length} activités au total`);
    
    // Test 5: Analyse des documents existants
    console.log(`\n9️⃣ Analyse des documents existants:`);
    const allActivities = await Activity.find({ stepId: stepId }).lean();
    allActivities.forEach((activity, index) => {
        console.log(`   Activité ${index + 1}:`);
        console.log(`     - _id: ${activity._id}`);
        console.log(`     - stepId: ${activity.stepId} (type: ${typeof activity.stepId})`);
        console.log(`     - active: ${activity.active} (type: ${typeof activity.active})`);
        console.log(`     - name: ${activity.name}`);
    });
    
    // Test 6: Test avec explain
    console.log(`\n🔟 Test avec explain() pour la requête problématique:`);
    try {
        const explainResult = await Activity.find({ stepId: stepId, active: true }).explain('executionStats');
        console.log(`   - Documents examinés: ${explainResult.executionStats.totalDocsExamined}`);
        console.log(`   - Documents retournés: ${explainResult.executionStats.totalDocsReturned}`);
        console.log(`   - Index utilisé: ${explainResult.executionStats.executionStages.indexName || 'Collection scan'}`);
    } catch (error) {
        console.log(`   - Erreur explain: ${error.message}`);
    }
};

const main = async () => {
    try {
        await connectDB();
        await analyzeQuery();
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Connexion fermée');
    }
};

main();
