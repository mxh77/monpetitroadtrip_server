import 'dotenv/config';
import { getCoordinates } from './server/utils/googleMapsUtils.js';

/**
 * Fonction spécifique pour convertir une adresse en coordonnées pour la recherche Algolia
 * Parse la string retournée par getCoordinates (format "lat lng") en objet {lat, lng}
 */
async function getCoordinatesForAlgolia(address) {
    if (!address) {
        return { lat: null, lng: null };
    }
    
    try {
        // getCoordinates retourne une string au format "lat lng"
        const coordinatesString = await getCoordinates(address);
        
        if (!coordinatesString || typeof coordinatesString !== 'string') {
            return { lat: null, lng: null };
        }
        
        // Parser la string avec regex pour gérer les espaces multiples
        const parts = coordinatesString.trim().split(/\s+/);
        if (parts.length !== 2) {
            return { lat: null, lng: null };
        }
        
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        
        if (isNaN(lat) || isNaN(lng)) {
            return { lat: null, lng: null };
        }
        
        return { lat, lng };
        
    } catch (error) {
        console.error('Erreur lors de la conversion d\'adresse pour Algolia:', error.message);
        return { lat: null, lng: null };
    }
}

async function testNewFunction() {
    console.log('=== Test de getCoordinatesForAlgolia ===\n');
    
    const addresses = [
        'Lundbreck Falls, Range Road 24B, Lundbreck, AB, Canada',
        'Paris, France',
        'Chamonix, France',
        '',
        null,
        'Invalid Address 123456'
    ];
    
    for (const address of addresses) {
        console.log(`Test: "${address}"`);
        const result = await getCoordinatesForAlgolia(address);
        console.log(`Résultat: lat=${result.lat}, lng=${result.lng}`);
        console.log('');
    }
}

testNewFunction().catch(console.error);
