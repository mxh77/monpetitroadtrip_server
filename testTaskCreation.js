const mongoose = require('mongoose');
const ActionExecutor = require('./server/services/actionExecutor');

async function testTaskCreation() {
    try {
        // Connexion à MongoDB
        await mongoose.connect('mongodb://localhost:27017/monpetitroadtrip', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('✅ Connexion MongoDB établie');
        
        const actionExecutor = new ActionExecutor();
        
        // Test 1: taskName est une string normale
        console.log('\n🧪 Test 1: taskName string normale');
        const entities1 = {
            name: 'Réserver un hôtel',
            notes: 'Test avec string normale'
        };
        const result1 = await actionExecutor.addTask('675b86c0e3c123456789abcd', entities1, '675b86c0e3c123456789abcd');
        console.log('✅ Test 1 réussi:', result1.message);
        
        // Test 2: taskName avec des espaces
        console.log('\n🧪 Test 2: taskName avec espaces');
        const entities2 = {
            name: '  Acheter des billets de train  ',
            notes: 'Test avec espaces'
        };
        const result2 = await actionExecutor.addTask('675b86c0e3c123456789abcd', entities2, '675b86c0e3c123456789abcd');
        console.log('✅ Test 2 réussi:', result2.message);
        
        // Test 3: taskName est null (doit échouer)
        console.log('\n🧪 Test 3: taskName null');
        try {
            const entities3 = {
                name: null,
                notes: 'Test avec null'
            };
            await actionExecutor.addTask('675b86c0e3c123456789abcd', entities3, '675b86c0e3c123456789abcd');
            console.log('❌ Test 3 ne devrait pas réussir');
        } catch (error) {
            console.log('✅ Test 3 réussi (erreur attendue):', error.message);
        }
        
        // Test 4: taskName est un nombre (doit être converti en string)
        console.log('\n🧪 Test 4: taskName number');
        const entities4 = {
            name: 12345,
            notes: 'Test avec number'
        };
        const result4 = await actionExecutor.addTask('675b86c0e3c123456789abcd', entities4, '675b86c0e3c123456789abcd');
        console.log('✅ Test 4 réussi:', result4.message);
        
        // Test 5: taskName est un objet (doit être converti en string)
        console.log('\n🧪 Test 5: taskName object');
        const entities5 = {
            name: { task: 'Préparer les documents' },
            notes: 'Test avec object'
        };
        const result5 = await actionExecutor.addTask('675b86c0e3c123456789abcd', entities5, '675b86c0e3c123456789abcd');
        console.log('✅ Test 5 réussi:', result5.message);
        
        // Test 6: taskName est undefined (doit échouer)
        console.log('\n🧪 Test 6: taskName undefined');
        try {
            const entities6 = {
                notes: 'Test avec undefined'
            };
            await actionExecutor.addTask('675b86c0e3c123456789abcd', entities6, '675b86c0e3c123456789abcd');
            console.log('❌ Test 6 ne devrait pas réussir');
        } catch (error) {
            console.log('✅ Test 6 réussi (erreur attendue):', error.message);
        }
        
        // Test 7: Vérifier la catégorisation automatique
        console.log('\n🧪 Test 7: Catégorisation automatique');
        const testCategories = [
            { name: 'Réserver un restaurant', expectedCategory: 'booking' },
            { name: 'Préparer passeport', expectedCategory: 'documents' },
            { name: 'Faire la valise', expectedCategory: 'packing' },
            { name: 'Prendre rendez-vous médecin', expectedCategory: 'health' },
            { name: 'Louer une voiture', expectedCategory: 'transport' },
            { name: 'Chercher un hébergement', expectedCategory: 'accommodation' },
            { name: 'Visiter un musée', expectedCategory: 'activities' },
            { name: 'Changer de l\'argent', expectedCategory: 'finances' },
            { name: 'Configurer téléphone', expectedCategory: 'communication' },
            { name: 'Planifier l\'itinéraire', expectedCategory: 'preparation' },
            { name: 'Autre chose', expectedCategory: 'other' }
        ];
        
        for (const test of testCategories) {
            const category = actionExecutor.determineTaskCategory(test.name);
            if (category === test.expectedCategory) {
                console.log(`✅ "${test.name}" → ${category}`);
            } else {
                console.log(`❌ "${test.name}" → ${category} (attendu: ${test.expectedCategory})`);
            }
        }
        
        console.log('\n✅ Tous les tests terminés avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur lors des tests:', error);
    } finally {
        await mongoose.disconnect();
        console.log('✅ Connexion MongoDB fermée');
    }
}

// Exécuter les tests
testTaskCreation();
