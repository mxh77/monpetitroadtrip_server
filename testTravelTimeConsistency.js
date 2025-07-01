// Script de test pour débugger le problème de calcul de travelTimeNote
// Usage: node testTravelTimeConsistency.js

import { checkDateTimeConsistency } from './server/utils/dateUtils.js';

console.log('=== Test de cohérence des temps de trajet ===\n');

// Reproduire le cas problématique
const testCases = [
    {
        name: "Cas problématique - 1h11 de trajet pour 1h d'écart",
        lastStepEnd: new Date('2024-08-05T09:00:00.000Z'),
        nextStepStart: new Date('2024-08-05T10:00:00.000Z'),
        travelTimeMinutes: 71, // 1h11
        expectedNote: 'ERROR'
    },
    {
        name: "Cas OK - 30min de trajet pour 1h d'écart",
        lastStepEnd: new Date('2024-08-05T09:00:00.000Z'),
        nextStepStart: new Date('2024-08-05T10:00:00.000Z'),
        travelTimeMinutes: 30,
        expectedNote: 'OK'
    },
    {
        name: "Cas WARNING - 50min de trajet pour 1h d'écart",
        lastStepEnd: new Date('2024-08-05T09:00:00.000Z'),
        nextStepStart: new Date('2024-08-05T10:00:00.000Z'),
        travelTimeMinutes: 50, // 10min de marge < 15min de seuil WARNING
        expectedNote: 'WARNING'
    },
    {
        name: "Cas ERROR exact - 60min de trajet pour 60min d'écart",
        lastStepEnd: new Date('2024-08-05T09:00:00.000Z'),
        nextStepStart: new Date('2024-08-05T10:00:00.000Z'),
        travelTimeMinutes: 60,
        expectedNote: 'ERROR' // Techniquement égal, mais pas de marge
    }
];

function testTravelTimeConsistency() {
    console.log('Tests de cohérence des temps de trajet:\n');

    testCases.forEach((testCase, index) => {
        console.log(`Test ${index + 1}: ${testCase.name}`);
        console.log(`  Fin étape précédente: ${testCase.lastStepEnd.toISOString()}`);
        console.log(`  Début étape suivante: ${testCase.nextStepStart.toISOString()}`);
        console.log(`  Temps de trajet: ${testCase.travelTimeMinutes} minutes`);
        
        // Calculer l'écart réel entre les étapes
        const timeDifferenceMs = testCase.nextStepStart.getTime() - testCase.lastStepEnd.getTime();
        const timeDifferenceMinutes = timeDifferenceMs / (1000 * 60);
        console.log(`  Écart réel entre étapes: ${timeDifferenceMinutes} minutes`);

        try {
            const result = checkDateTimeConsistency(
                testCase.lastStepEnd,
                testCase.nextStepStart,
                testCase.travelTimeMinutes
            );

            console.log(`  Résultat: isConsistency=${result.isConsistency}, note=${result.note}`);
            console.log(`  Attendu: note=${testCase.expectedNote}`);

            const success = result.note === testCase.expectedNote;
            console.log(`  ${success ? '✅ SUCCÈS' : '❌ ÉCHEC'}`);

            if (!success) {
                console.log(`  ⚠️  Résultat inattendu: obtenu "${result.note}", attendu "${testCase.expectedNote}"`);
            }

        } catch (error) {
            console.log(`  ❌ ERREUR: ${error.message}`);
        }

        console.log('');
    });
}

// Tests de la fonction determineTravelTimeNote directement
function testDetermineTravelTimeNote() {
    console.log('\nTests directs de determineTravelTimeNote:\n');

    const directTests = [
        { travelTime: 71, timeDifference: 60, expected: 'ERROR' },
        { travelTime: 30, timeDifference: 60, expected: 'OK' },
        { travelTime: 50, timeDifference: 60, expected: 'WARNING' },
        { travelTime: 60, timeDifference: 60, expected: 'ERROR' },
        { travelTime: 45, timeDifference: 60, expected: 'OK' }, // 15min de marge exactement
    ];

    // Import direct de la fonction pour test
    const determineTravelTimeNote = (travelTime, timeDifference, thresholds = { error: 0, warning: 15 }) => {
        if (travelTime > timeDifference) {
            return 'ERROR';
        } else if (timeDifference - travelTime < thresholds.warning) {
            return 'WARNING';
        } else {
            return 'OK';
        }
    };

    directTests.forEach((test, index) => {
        const result = determineTravelTimeNote(test.travelTime, test.timeDifference);
        const success = result === test.expected;
        
        console.log(`Test direct ${index + 1}:`);
        console.log(`  Temps trajet: ${test.travelTime}min, Écart: ${test.timeDifference}min`);
        console.log(`  Marge: ${test.timeDifference - test.travelTime}min`);
        console.log(`  Résultat: ${result}, Attendu: ${test.expected}`);
        console.log(`  ${success ? '✅ SUCCÈS' : '❌ ÉCHEC'}\n`);
    });
}

// Exécuter les tests
if (typeof window === 'undefined') {
    testTravelTimeConsistency();
    testDetermineTravelTimeNote();
    
    console.log('\n=== Diagnostic ===');
    console.log('Si les tests échouent, vérifiez:');
    console.log('1. La fonction checkDateTimeConsistency dans dateUtils.js');
    console.log('2. La fonction determineTravelTimeNote utilisée');
    console.log('3. Les imports dans travelTimeUtils.js');
    console.log('4. Les seuils de warning (par défaut 15 minutes)');
}

export { testTravelTimeConsistency, testDetermineTravelTimeNote };
