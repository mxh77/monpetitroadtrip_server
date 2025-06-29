/**
 * Test de la conversion automatique d'adresse en coordonnées pour le filtrage Algolia
 */
import 'dotenv/config';

console.log('=== Test de la conversion d\'adresse pour le filtrage Algolia ===\n');

console.log('Scénarios de test:');
console.log('1. Activité SANS coordonnées mais AVEC adresse → Conversion automatique');
console.log('2. Activité AVEC coordonnées → Utilisation directe');
console.log('3. Activité SANS coordonnées et SANS adresse → Pas de filtrage géographique\n');

console.log('Pour tester:');
console.log('1. Créez une activité avec une adresse mais sans coordonnées');
console.log('2. Appelez GET /api/activities/{id}/search/algolia');
console.log('3. Vérifiez les logs du serveur\n');

console.log('Logs attendus:');
console.log('- 🗺️ Conversion de l\'adresse en coordonnées: [adresse]');
console.log('- ✅ Coordonnées obtenues: [lat], [lng]');
console.log('- 🔍 Recherche Algolia: { ..., geoFiltering: "Activé (50km)" }');
console.log('- 📏 Filtrage géographique: X → Y résultats (rayon 50km)\n');

console.log('Dans la réponse JSON:');
console.log('- search.radiusKm: 50');
console.log('- search.filteredResults: true');
console.log('- Chaque suggestion aura distance et distanceKm');

console.log('\nNote: Les coordonnées seront sauvegardées automatiquement dans l\'activité');
console.log('pour éviter de refaire la conversion à chaque recherche.');
