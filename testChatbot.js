import ChatbotJob from './server/models/ChatbotJob.js';
import Notification from './server/models/Notification.js';
import ChatHistory from './server/models/ChatHistory.js';
import nlpService from './server/services/nlpService.js';
import intentClassifier from './server/services/intentClassifier.js';
import entityExtractor from './server/services/entityExtractor.js';
import actionExecutor from './server/services/actionExecutor.js';
import notificationService from './server/services/notificationService.js';
import { connectDB } from './server/config/db.js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

/**
 * Script de test pour le chatbot IA
 */
async function testChatbot() {
    console.log('🤖 Test du Chatbot IA MonPetitRoadtrip');
    console.log('=====================================');
    
    try {
        // Connexion à la base de données
        await connectDB();
        console.log('✅ Connexion à la base de données');
        
        // Données de test
        const testData = {
            userId: '507f1f77bcf86cd799439011', // ID utilisateur de test
            roadtripId: '507f1f77bcf86cd799439012', // ID roadtrip de test
            conversationId: 'test_conv_' + Date.now()
        };
        
        // Tests des services
        await testNLPService();
        await testIntentClassifier();
        await testEntityExtractor();
        await testNotificationService(testData);
        await testChatbotJobModel(testData);
        
        console.log('\n✅ Tous les tests sont passés avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur lors des tests:', error);
    }
    
    process.exit(0);
}

/**
 * Test du service NLP
 */
async function testNLPService() {
    console.log('\n📝 Test du service NLP');
    console.log('----------------------');
    
    const testQueries = [
        'Ajoute une étape à Paris du 15 au 17 juillet',
        'Supprime l\'étape de Lyon',
        'Ajoute un hébergement Hôtel de la Paix à Marseille',
        'Ajoute une activité visite du Louvre le 16 juillet à 14h',
        'Ajoute une tâche réserver les billets de train'
    ];
    
    for (const query of testQueries) {
        try {
            const analysis = await nlpService.analyzeQuery(query);
            console.log(`✅ "${query}" -> Intent: ${analysis.intent}, Entities: ${Object.keys(analysis.entities).length}`);
        } catch (error) {
            console.error(`❌ Erreur pour "${query}":`, error.message);
        }
    }
}

/**
 * Test du classificateur d'intentions
 */
async function testIntentClassifier() {
    console.log('\n🎯 Test du classificateur d\'intentions');
    console.log('--------------------------------------');
    
    const testCases = [
        { query: 'Ajoute une étape à Paris', expected: 'add_step' },
        { query: 'Supprime l\'étape de Lyon', expected: 'delete_step' },
        { query: 'Ajoute un hébergement à Nice', expected: 'add_accommodation' },
        { query: 'Ajoute une activité visite', expected: 'add_activity' },
        { query: 'Ajoute une tâche', expected: 'add_task' },
        { query: 'Aide', expected: 'help' },
        { query: 'Montre-moi les infos', expected: 'get_info' }
    ];
    
    for (const testCase of testCases) {
        const result = intentClassifier.classifyIntent(testCase.query);
        const success = result === testCase.expected;
        console.log(`${success ? '✅' : '❌'} "${testCase.query}" -> ${result} (attendu: ${testCase.expected})`);
    }
}

/**
 * Test de l'extracteur d'entités
 */
async function testEntityExtractor() {
    console.log('\n🔍 Test de l\'extracteur d\'entités');
    console.log('----------------------------------');
    
    const testCases = [
        'Ajoute une étape à Paris du 15 au 17 juillet',
        'Ajoute un hébergement Hôtel de la Paix à Marseille',
        'Ajoute une activité visite du Louvre le 16 juillet à 14h',
        'Supprime l\'étape de Lyon'
    ];
    
    for (const query of testCases) {
        try {
            const entities = await entityExtractor.extractEntities(query);
            console.log(`✅ "${query}"`);
            console.log(`   -> Entités: ${JSON.stringify(entities, null, 2)}`);
        } catch (error) {
            console.error(`❌ Erreur pour "${query}":`, error.message);
        }
    }
}

/**
 * Test du service de notifications
 */
async function testNotificationService(testData) {
    console.log('\n📧 Test du service de notifications');
    console.log('-----------------------------------');
    
    try {
        // Créer une notification de test
        const notification = await notificationService.createNotification({
            userId: testData.userId,
            roadtripId: testData.roadtripId,
            type: 'chatbot_success',
            title: 'Test notification',
            message: 'Ceci est un test de notification'
        });
        
        console.log('✅ Notification créée:', notification._id);
        
        // Récupérer les notifications
        const notifications = await notificationService.getUserNotifications(testData.userId);
        console.log(`✅ ${notifications.length} notification(s) récupérée(s)`);
        
        // Marquer comme lu
        await notificationService.markAsRead(notification._id, testData.userId);
        console.log('✅ Notification marquée comme lue');
        
        // Nettoyer
        await notificationService.deleteNotification(notification._id, testData.userId);
        console.log('✅ Notification supprimée');
        
    } catch (error) {
        console.error('❌ Erreur test notifications:', error.message);
    }
}

/**
 * Test du modèle ChatbotJob
 */
async function testChatbotJobModel(testData) {
    console.log('\n🎬 Test du modèle ChatbotJob');
    console.log('----------------------------');
    
    try {
        // Créer un job de test
        const job = await ChatbotJob.create({
            userId: testData.userId,
            roadtripId: testData.roadtripId,
            conversationId: testData.conversationId,
            userQuery: 'Ajoute une étape à Paris',
            intent: 'add_step',
            entities: { location: 'Paris' },
            status: 'pending'
        });
        
        console.log('✅ Job créé:', job._id);
        
        // Mettre à jour le statut
        job.status = 'completed';
        job.result = {
            success: true,
            message: 'Étape ajoutée avec succès'
        };
        await job.save();
        
        console.log('✅ Job mis à jour');
        
        // Récupérer le job
        const retrievedJob = await ChatbotJob.findById(job._id);
        console.log(`✅ Job récupéré: ${retrievedJob.status}`);
        
        // Nettoyer
        await ChatbotJob.findByIdAndDelete(job._id);
        console.log('✅ Job supprimé');
        
    } catch (error) {
        console.error('❌ Erreur test ChatbotJob:', error.message);
    }
}

// Lancer les tests
if (import.meta.url === `file://${process.argv[1]}`) {
    testChatbot();
}
