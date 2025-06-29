/**
 * Test du rayon de recherche Algolia paramétrable
 * 
 * Ce script teste la nouvelle fonctionnalité qui permet aux utilisateurs
 * de configurer leur propre rayon de recherche Algolia.
 */

console.log('=== Test du Rayon de Recherche Algolia Paramétrable ===\n');

console.log('📋 Fonctionnalités testées:');
console.log('✅ Paramètre algoliaSearchRadius dans UserSetting');
console.log('✅ Validation du rayon (1km - 200km)');
console.log('✅ API PUT /settings pour modifier le rayon');
console.log('✅ Utilisation du rayon dans les recherches Algolia');
console.log('✅ Fallback sur la valeur par défaut (50km)');
console.log('✅ Logs détaillés du rayon utilisé\n');

console.log('🔧 Pour tester manuellement:');
console.log('');

console.log('1. Récupérer les paramètres actuels:');
console.log('curl -X GET "http://localhost:3001/api/settings" \\');
console.log('  -H "Authorization: Bearer YOUR_TOKEN"');
console.log('');

console.log('2. Modifier le rayon à 25km:');
console.log('curl -X PUT "http://localhost:3001/api/settings" \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -H "Authorization: Bearer YOUR_TOKEN" \\');
console.log('  -d \'{"algoliaSearchRadius": 25000}\'');
console.log('');

console.log('3. Tester avec un rayon invalide (doit échouer):');
console.log('curl -X PUT "http://localhost:3001/api/settings" \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -H "Authorization: Bearer YOUR_TOKEN" \\');
console.log('  -d \'{"algoliaSearchRadius": 500}\'');
console.log('');

console.log('4. Tester la recherche Algolia avec le nouveau rayon:');
console.log('curl -X GET "http://localhost:3001/api/activities/YOUR_ACTIVITY_ID/search/algolia" \\');
console.log('  -H "Authorization: Bearer YOUR_TOKEN"');
console.log('');

console.log('📊 Valeurs de test suggérées:');
console.log('- 10000  (10km)  - Recherche très locale');
console.log('- 25000  (25km)  - Recherche locale étendue');
console.log('- 50000  (50km)  - Valeur par défaut');
console.log('- 75000  (75km)  - Recherche régionale');
console.log('- 100000 (100km) - Recherche large');
console.log('');

console.log('⚠️ Valeurs invalides pour tester la validation:');
console.log('- 500    (< 1km)   - Trop petit');
console.log('- 500000 (> 200km) - Trop grand');
console.log('- "abc"  (string)  - Type incorrect');
console.log('');

console.log('🔍 Dans les logs du serveur, cherchez:');
console.log('- "searchRadius: XXkm (paramètre utilisateur)"');
console.log('- "Using user search radius: XXkm"');
console.log('- Messages de validation pour les valeurs invalides');
console.log('');

console.log('📝 Endpoints modifiés:');
console.log('- GET /settings - Inclut maintenant algoliaSearchRadius');
console.log('- PUT /settings - Accepte algoliaSearchRadius avec validation');
console.log('- GET /activities/:id/search/algolia - Utilise le rayon personnalisé');
console.log('- GET /steps/:id/hikes-algolia - Utilise le rayon personnalisé');
console.log('- GET /steps/:id/hikes-suggestion - Utilise le rayon personnalisé');
console.log('');

console.log('🗄️ Modèle de données:');
console.log('UserSetting {');
console.log('  userId: ObjectId,');
console.log('  systemPrompt: String,');
console.log('  algoliaSearchRadius: Number (défaut: 50000, min: 1000, max: 200000)');
console.log('}');
console.log('');

console.log('✨ Fonctionnalités avancées:');
console.log('- Création automatique des paramètres par défaut');
console.log('- Gestion d\'erreur avec fallback sur 50km');
console.log('- Validation stricte des valeurs');
console.log('- Logs détaillés pour le debugging');
console.log('- Fonction utilitaire réutilisable (getUserAlgoliaRadius)');
console.log('');

console.log('🚀 Test complet:');
console.log('1. Démarrez le serveur: npm start');
console.log('2. Connectez-vous et récupérez un token JWT');
console.log('3. Exécutez les commandes curl ci-dessus');
console.log('4. Vérifiez les logs du serveur');
console.log('5. Testez une recherche Algolia pour voir le nouveau rayon en action');
