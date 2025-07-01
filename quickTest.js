// Test rapide de la fonction checkDateTimeConsistency
import { checkDateTimeConsistency } from './server/utils/dateUtils.js';

console.log('=== Test checkDateTimeConsistency ===\n');

// Test avec le cas problématique
const departure = '2025-08-05T09:00:00.000Z';
const arrival = '2025-08-05T10:00:00.000Z';
const travelTime = 71;

console.log('Test du cas problématique:');
console.log('Départ:', departure);
console.log('Arrivée:', arrival);
console.log('Temps de trajet:', travelTime, 'minutes');

const result = checkDateTimeConsistency(departure, arrival, travelTime);

console.log('\nRésultat:');
console.log('isConsistency:', result.isConsistency);
console.log('note:', result.note);
console.log('Attendu: note = ERROR');

// Calcul manuel pour vérification
const dep = new Date(departure);
const arr = new Date(arrival);
const diffMs = arr.getTime() - dep.getTime();
const diffMin = diffMs / (1000 * 60);

console.log('\nVérification manuelle:');
console.log('Différence en minutes:', diffMin);
console.log('71 > 60 ?', 71 > 60);
console.log('Donc note devrait être ERROR:', 71 > diffMin ? 'OUI' : 'NON');
