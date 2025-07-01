// Script de test pour vérifier la mise à jour de l'algoliaId
// Utilisation : node testUpdateActivity.js

console.log('=== Test de mise à jour algoliaId ===');

// Simulation du payload qui devrait être envoyé
const testPayload = {
    name: "Test Activity",
    type: "Randonnée", 
    address: "123 Test Street",
    algoliaId: "trail-12345", // Ceci doit être sauvegardé
    price: 25.50,
    currency: "EUR"
};

console.log('Payload de test:', JSON.stringify(testPayload, null, 2));

// Instructions pour tester manuellement
console.log('\n=== Instructions de test manuel ===');
console.log('1. Démarrer le serveur backend');
console.log('2. Utiliser Postman ou curl pour tester la route PUT');
console.log('3. URL: PUT http://localhost:3000/api/roadtrips/{idRoadtrip}/activities/{idActivity}');
console.log('4. Headers: Authorization: Bearer {token}');
console.log('5. Body: form-data avec champ "data" contenant le JSON ci-dessus');
console.log('6. Vérifier dans les logs backend si algoliaId est reçu et sauvegardé');

// Exemple de commande curl
const curlExample = `
curl -X PUT "http://localhost:3000/api/roadtrips/{idRoadtrip}/activities/{idActivity}" \\
  -H "Authorization: Bearer {YOUR_TOKEN}" \\
  -H "Content-Type: multipart/form-data" \\
  -F "data=${JSON.stringify(testPayload)}"
`;

console.log('\n=== Exemple de commande curl ===');
console.log(curlExample);

console.log('\n=== Points à vérifier ===');
console.log('- Le backend reçoit-il algoliaId dans les logs ?');
console.log('- algoliaId est-il présent dans la réponse JSON ?');
console.log('- algoliaId est-il persisté en base de données ?');
console.log('- La méthode updateActivity traite-t-elle bien ce champ ?');
