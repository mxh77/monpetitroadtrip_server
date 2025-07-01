// Script de test pour débugger le problème de calcul de travelTimeNote
// Test case: Step précédent finit à 09:00, step suivant commence à 10:00, temps de trajet 1h11min

import { checkDateTimeConsistency, determineTravelTimeNote } from '../server/utils/dateUtils.js';

console.log('=== Test du problème travelTimeNote ===\n');

// Données de test basées sur votre problème
const departureDateTime = '2025-08-05T09:00:00.000Z'; // Step précédent finit à 09:00
const arrivalDateTime = '2025-08-05T10:00:00.000Z';   // Step suivant commence à 10:00
const travelTimeMinutes = 71; // 1h11min

console.log('Données de test:');
console.log('- Fin step précédent:', departureDateTime);
console.log('- Début step suivant:', arrivalDateTime);
console.log('- Temps de trajet calculé:', travelTimeMinutes, 'minutes (1h11min)');
console.log('- Écart disponible: 1 heure (60 minutes)');
console.log();

// Test direct de la fonction determineTravelTimeNote
console.log('=== Test direct de determineTravelTimeNote ===');
const timeDifference = 60; // 1 heure d'écart
const noteResult = determineTravelTimeNote(travelTimeMinutes, timeDifference);
console.log('Résultat attendu: ERROR (car 71 > 60)');
console.log('Résultat obtenu:', noteResult);
console.log();

// Test complet avec checkDateTimeConsistency
console.log('=== Test complet avec checkDateTimeConsistency ===');
const result = checkDateTimeConsistency(departureDateTime, arrivalDateTime, travelTimeMinutes);
console.log('Résultat complet:', result);
console.log();

// Test avec différents scénarios
console.log('=== Tests de validation ===');

// Scénario 1: Temps de trajet OK (30 min pour 60 min d'écart)
console.log('Scénario 1 - Temps OK (30min pour 60min):');
const test1 = determineTravelTimeNote(30, 60);
console.log('Résultat:', test1, '(attendu: OK)');

// Scénario 2: Temps de trajet WARNING (50 min pour 60 min d'écart)
console.log('Scénario 2 - Temps WARNING (50min pour 60min):');
const test2 = determineTravelTimeNote(50, 60);
console.log('Résultat:', test2, '(attendu: WARNING car 60-50=10 < 15)');

// Scénario 3: Temps de trajet ERROR (70 min pour 60 min d'écart)
console.log('Scénario 3 - Temps ERROR (70min pour 60min):');
const test3 = determineTravelTimeNote(70, 60);
console.log('Résultat:', test3, '(attendu: ERROR car 70 > 60)');

console.log('\n=== Test avec dates réelles ===');

// Test avec les vraies dates que vous avez mentionnées
const realDeparture = '2025-08-05T09:00:00.000Z';
const realArrival = '2025-08-05T10:00:00.000Z';
const realTravelTime = 71;

console.log('Test avec vos données réelles:');
console.log('- Départ:', realDeparture);
console.log('- Arrivée:', realArrival);
console.log('- Temps de trajet:', realTravelTime, 'minutes');

const realResult = checkDateTimeConsistency(realDeparture, realArrival, realTravelTime);
console.log('Résultat:', realResult);
console.log('Note obtenue:', realResult.note, '(attendu: ERROR)');
console.log('Consistance:', realResult.isConsistency, '(attendu: false)');

// Vérification manuelle
const dep = new Date(realDeparture);
const arr = new Date(realArrival);
const manualTimeDiff = (arr.getTime() - dep.getTime()) / (1000 * 60);
console.log('\nVérification manuelle:');
console.log('- Différence calculée manuellement:', manualTimeDiff, 'minutes');
console.log('- Temps de trajet:', realTravelTime, 'minutes');
console.log('- Le temps de trajet dépasse-t-il la différence?', realTravelTime > manualTimeDiff);
