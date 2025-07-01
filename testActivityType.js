// Test simple pour vérifier l'attribut type des activités
const testActivityType = () => {
    console.log('Testing Activity type attribute...');
    
    // Test data pour chaque type d'activité
    const testCases = [
        { type: 'Randonnée', name: 'Randonnée en montagne' },
        { type: 'Courses', name: 'Courses au supermarché' },
        { type: 'Visite', name: 'Visite du musée' },
        { type: 'Transport', name: 'Trajet en train' },
        { type: 'Autre', name: 'Activité libre' }
    ];
    
    testCases.forEach(testCase => {
        console.log(`Testing type: ${testCase.type} - ${testCase.name}`);
        
        // Simulation d'une requête POST avec le nouveau type
        const mockRequestData = {
            type: testCase.type,
            name: testCase.name,
            address: '123 Test Street',
            startDateTime: new Date().toISOString(),
            endDateTime: new Date(Date.now() + 3600000).toISOString(), // +1 hour
            duration: 60,
            typeDuration: 'M',
            price: 25.50,
            currency: 'EUR',
            notes: 'Test activity'
        };
        
        console.log('Mock request data:', JSON.stringify(mockRequestData, null, 2));
    });
    
    console.log('Activity type test completed.');
};

// Exporter pour pouvoir l'utiliser dans d'autres tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testActivityType };
} else {
    // Exécuter le test si appelé directement
    testActivityType();
}
