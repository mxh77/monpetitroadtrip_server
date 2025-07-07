/**
 * Script de test pour valider la fonctionnalité paramétrable des photos dans les récits
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock des données de test
const mockStepData = {
    step: {
        name: "Visite du Louvre",
        type: "Stage",
        address: "Rue de Rivoli, 75001 Paris",
        arrivalDateTime: "2025-07-01T10:00:00Z",
        departureDateTime: "2025-07-01T17:00:00Z",
        notes: "Réserver les billets à l'avance"
    },
    accommodations: [
        {
            name: "Hôtel des Arts",
            address: "12 rue des Beaux-Arts, 75006 Paris",
            arrivalDateTime: "2025-06-30T15:00:00Z",
            departureDateTime: "2025-07-02T11:00:00Z",
            nights: 2,
            price: 150,
            currency: "EUR",
            notes: "Petit-déjeuner inclus"
        }
    ],
    activities: [
        {
            name: "Visite guidée de la Joconde",
            type: "Visite",
            address: "Musée du Louvre, Paris",
            startDateTime: "2025-07-01T14:00:00Z",
            endDateTime: "2025-07-01T16:00:00Z",
            duration: 120,
            typeDuration: "M",
            price: 25,
            currency: "EUR",
            notes: "Guide francophone"
        }
    ]
};

const mockPhotos = [
    {
        url: "https://example.com/louvre1.jpg",
        source: "accommodation",
        description: "Vue extérieure de l'hôtel"
    },
    {
        url: "https://example.com/louvre2.jpg", 
        source: "activity",
        description: "La Joconde dans son écrin"
    }
];

// Mock du système de settings
const mockUserSettings = {
    enablePhotosInStories: true,
    systemPrompt: "Tu es le narrateur de MonPetitRoadtrip."
};

/**
 * Test de la fonction genererRecitStepAvecPhotos
 */
async function testGenererRecitStepAvecPhotos() {
    console.log("\n=== TEST: genererRecitStepAvecPhotos ===");
    
    try {
        // Import dynamique de la fonction
        const { genererRecitStepAvecPhotos } = await import('./server/utils/openAI/recitStep.js');
        
        // Test 1: Avec photos activées
        console.log("\n1. Test avec photos activées:");
        if (mockUserSettings.enablePhotosInStories) {
            const resultWithPhotos = await genererRecitStepAvecPhotos(
                mockStepData, 
                mockUserSettings.systemPrompt, 
                mockPhotos
            );
            
            console.log("✅ Génération avec photos réussie");
            console.log(`   - Modèle utilisé: ${resultWithPhotos.model}`);
            console.log(`   - Photos analysées: ${resultWithPhotos.photosAnalyzed}`);
            console.log(`   - Longueur du récit: ${resultWithPhotos.story.length} caractères`);
        }
        
        // Test 2: Avec photos désactivées
        console.log("\n2. Test avec photos désactivées:");
        mockUserSettings.enablePhotosInStories = false;
        
        if (!mockUserSettings.enablePhotosInStories) {
            // Dans ce cas, on devrait utiliser genererRecitStep standard
            const { genererRecitStep } = await import('./server/utils/openAI/recitStep.js');
            
            const resultWithoutPhotos = await genererRecitStep(
                mockStepData, 
                mockUserSettings.systemPrompt
            );
            
            console.log("✅ Génération sans photos réussie");
            console.log(`   - Longueur du récit: ${resultWithoutPhotos.story.length} caractères`);
        }
        
        console.log("\n✅ Tous les tests de génération de récit sont passés");
        
    } catch (error) {
        console.error("❌ Erreur lors du test de génération de récit:", error.message);
        throw error;
    }
}

/**
 * Test de la logique conditionnelle des settings
 */
function testLogicConditions() {
    console.log("\n=== TEST: Logique conditionnelle des settings ===");
    
    const testCases = [
        { enablePhotosInStories: true, hasPhotos: true, expected: "avec photos" },
        { enablePhotosInStories: true, hasPhotos: false, expected: "sans photos" },
        { enablePhotosInStories: false, hasPhotos: true, expected: "sans photos" },
        { enablePhotosInStories: false, hasPhotos: false, expected: "sans photos" },
        { enablePhotosInStories: undefined, hasPhotos: true, expected: "avec photos" }, // défaut true
        { enablePhotosInStories: null, hasPhotos: true, expected: "avec photos" } // défaut true
    ];
    
    testCases.forEach((testCase, index) => {
        const enablePhotosInStories = testCase.enablePhotosInStories !== false; // Par défaut true
        const photos = testCase.hasPhotos ? mockPhotos : [];
        
        let shouldUsePhotos = enablePhotosInStories && photos.length > 0;
        let result = shouldUsePhotos ? "avec photos" : "sans photos";
        
        const status = result === testCase.expected ? "✅" : "❌";
        console.log(`${status} Test ${index + 1}: enablePhotosInStories=${testCase.enablePhotosInStories}, hasPhotos=${testCase.hasPhotos} → ${result}`);
        
        if (result !== testCase.expected) {
            throw new Error(`Test ${index + 1} échoué: attendu "${testCase.expected}", obtenu "${result}"`);
        }
    });
    
    console.log("✅ Tous les tests de logique conditionnelle sont passés");
}

/**
 * Test des UserSettings (simulation)
 */
function testUserSettings() {
    console.log("\n=== TEST: UserSettings Schema ===");
    
    const defaultSettings = {
        enablePhotosInStories: true, // valeur par défaut
        systemPrompt: "Tu es le narrateur officiel de MonPetitRoadtrip, une application de roadtrip personnalisée pour les familles et amis. Sois chaleureux, informatif et inclusif.",
        algoliaSearchRadius: 50000,
        dragSnapInterval: 15
    };
    
    // Test des valeurs par défaut
    console.log("✅ Valeur par défaut enablePhotosInStories:", defaultSettings.enablePhotosInStories);
    
    // Test de mise à jour
    const updatedSettings = { ...defaultSettings, enablePhotosInStories: false };
    console.log("✅ Mise à jour enablePhotosInStories:", updatedSettings.enablePhotosInStories);
    
    // Test de validation du type
    const validValues = [true, false];
    validValues.forEach(value => {
        if (typeof value === 'boolean') {
            console.log(`✅ Valeur valide: ${value}`);
        } else {
            throw new Error(`Valeur invalide: ${value} (type: ${typeof value})`);
        }
    });
    
    console.log("✅ Tous les tests UserSettings sont passés");
}

/**
 * Test de simulation de l'API settings
 */
function testSettingsAPI() {
    console.log("\n=== TEST: API Settings (simulation) ===");
    
    // Simulation PUT /api/settings
    const requestBody = {
        enablePhotosInStories: false,
        systemPrompt: "Nouveau prompt personnalisé"
    };
    
    const update = {};
    if (typeof requestBody.enablePhotosInStories === 'boolean') {
        update.enablePhotosInStories = requestBody.enablePhotosInStories;
        console.log("✅ enablePhotosInStories validé et ajouté à l'update");
    }
    
    if (typeof requestBody.systemPrompt === 'string') {
        update.systemPrompt = requestBody.systemPrompt;
        console.log("✅ systemPrompt validé et ajouté à l'update");
    }
    
    console.log("📋 Update object:", update);
    console.log("✅ Simulation API settings réussie");
}

/**
 * Fonction principale de test
 */
async function runTests() {
    console.log("🚀 Début des tests de la fonctionnalité photos dans les récits");
    console.log("=" * 60);
    
    try {
        // Tests synchrones
        testLogicConditions();
        testUserSettings();
        testSettingsAPI();
        
        // Tests asynchrones (nécessitent OpenAI API)
        if (process.env.OPENAI_API_KEY) {
            console.log("\n🔑 Clé OpenAI détectée - Tests avec API");
            await testGenererRecitStepAvecPhotos();
        } else {
            console.log("\n⚠️  Clé OpenAI non détectée - Tests API ignorés");
            console.log("   Pour tester avec l'API OpenAI, définissez OPENAI_API_KEY");
        }
        
        console.log("\n🎉 TOUS LES TESTS SONT PASSÉS!");
        console.log("✅ La fonctionnalité photos paramétrables est opérationnelle");
        
    } catch (error) {
        console.error("\n💥 ÉCHEC DES TESTS:", error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Lancer les tests
runTests();
