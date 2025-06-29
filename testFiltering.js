/**
 * Test rapide du filtrage géographique dans l'API Activity
 */
import 'dotenv/config';

async function testGeographicFiltering() {
    console.log('=== Test du filtrage géographique côté serveur ===\n');
    
    // Simulation d'une requête vers l'endpoint
    const testUrl = 'http://localhost:3001/api/activities/TEST_ID/search/algolia';
    
    console.log('Pour tester le filtrage géographique:');
    console.log('1. Démarrez le serveur avec "npm start"');
    console.log('2. Créez une activité avec des coordonnées');
    console.log('3. Appelez GET /api/activities/{id}/search/algolia');
    console.log('4. Vérifiez les logs du serveur pour voir le filtrage en action\n');
    
    console.log('Exemple de test avec curl:');
    console.log(`curl -X GET "${testUrl}?hitsPerPage=10" \\`);
    console.log('  -H "Authorization: Bearer YOUR_TOKEN" \\');
    console.log('  -H "Content-Type: application/json"\n');
    
    console.log('Attendu dans les logs:');
    console.log('- 📏 Filtrage géographique: X → Y résultats (rayon 50km)');
    console.log('- Distances des résultats filtrés avec indication de la source');
    console.log('- Toutes les distances ≤ 50km\n');
    
    console.log('Dans la réponse JSON:');
    console.log('- Champ "search.radiusKm": 50');
    console.log('- Champ "search.filteredResults": true');
    console.log('- Champs "distance" et "distanceKm" dans chaque suggestion');
}

testGeographicFiltering();
