/**
 * Script de test pour les fonctionnalités photos d'une activité
 * Ce script teste les nouvelles routes pour gérer les photos des activités
 */

import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

// Configuration
const BASE_URL = 'http://localhost:5000';
const TEST_ACTIVITY_ID = 'YOUR_ACTIVITY_ID_HERE'; // Remplacer par un ID d'activité valide
const AUTH_TOKEN = 'YOUR_AUTH_TOKEN_HERE'; // Remplacer par un token valide

/**
 * Test de récupération des photos d'une activité
 */
async function testGetPhotos() {
    console.log('\n=== Test GET Photos ===');
    try {
        const response = await fetch(`${BASE_URL}/api/activities/${TEST_ACTIVITY_ID}/photos`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Photos:', data);
        return data;
    } catch (error) {
        console.error('Erreur lors de la récupération des photos:', error);
    }
}

/**
 * Test d'ajout de photos à une activité
 */
async function testAddPhotos() {
    console.log('\n=== Test PATCH Add Photos ===');
    try {
        // Créer une image de test simple (pixel 1x1)
        const testImageBuffer = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
            0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
            0x0B, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
            0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
            0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ]);

        const formData = new FormData();
        formData.append('photos', testImageBuffer, {
            filename: 'test-photo.png',
            contentType: 'image/png'
        });

        const response = await fetch(`${BASE_URL}/api/activities/${TEST_ACTIVITY_ID}/photos`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`,
            },
            body: formData
        });

        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Added photos:', data);
        return data;
    } catch (error) {
        console.error('Erreur lors de l\'ajout de photos:', error);
    }
}

/**
 * Test de suppression d'une photo
 */
async function testDeletePhoto(photoId) {
    console.log('\n=== Test DELETE Photo ===');
    try {
        const response = await fetch(`${BASE_URL}/api/activities/${TEST_ACTIVITY_ID}/photos/${photoId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Activity after photo deletion:', data);
        return data;
    } catch (error) {
        console.error('Erreur lors de la suppression de la photo:', error);
    }
}

/**
 * Fonction principale de test
 */
async function runTests() {
    console.log('=== Tests des fonctionnalités Photos pour les Activités ===');
    
    if (TEST_ACTIVITY_ID === 'YOUR_ACTIVITY_ID_HERE' || AUTH_TOKEN === 'YOUR_AUTH_TOKEN_HERE') {
        console.error('Veuillez configurer TEST_ACTIVITY_ID et AUTH_TOKEN avant de lancer les tests');
        return;
    }

    // Test 1: Récupérer les photos existantes
    const initialPhotos = await testGetPhotos();

    // Test 2: Ajouter des photos
    const addedPhotos = await testAddPhotos();

    // Test 3: Récupérer les photos après ajout
    await testGetPhotos();

    // Test 4: Supprimer une photo (si des photos ont été ajoutées)
    if (addedPhotos && addedPhotos.length > 0) {
        await testDeletePhoto(addedPhotos[0]._id);
    }

    // Test 5: Vérification finale
    await testGetPhotos();

    console.log('\n=== Tests terminés ===');
}

// Lancer les tests si le script est exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().catch(console.error);
}

export { testGetPhotos, testAddPhotos, testDeletePhoto, runTests };
