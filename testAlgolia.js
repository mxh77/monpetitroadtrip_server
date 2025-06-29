// Test simple pour vérifier l'import d'Algolia
import { algoliasearch } from 'algoliasearch';

console.log('Test import Algolia...');
console.log('algoliasearch:', typeof algoliasearch);

// Test de création d'un client (sans credentials réels)
try {
    const client = algoliasearch('9IOACG5NHE', '63a3cf94e0042b9c67abf0892fc1d223');
    console.log('Client créé avec succès:', typeof client);
    console.log('Méthodes de recherche disponibles:');
    console.log('- search:', typeof client.search);
    console.log('- searchSingleIndex:', typeof client.searchSingleIndex);
    
    // Test d'utilisation de la méthode search (va échouer mais on veut voir le type d'erreur)
    try {
        await client.search([{
            indexName: 'alltrails_primary_fr-FR',
            query: 'test_query',
            params: { hitsPerPage: 5 }
        }]);
    } catch (searchError) {
        console.log('Erreur de recherche (attendue):', searchError.message);
    }
    
} catch (error) {
    console.error('Erreur lors de la création du client:', error);
}
