import axios from 'axios';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Fonction pour obtenir les coordonnées géographiques à partir de l'adresse
export const getCoordinates = async (address, format = 'object') => {
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
            address: address,
            key: GOOGLE_MAPS_API_KEY
        }
    });

    if (response.data.status === 'OK') {
        const location = response.data.results[0].geometry.location;
        
        // Retourner sous forme d'objet si demandé (nouveau format)
        if (format === 'object') {
            return {
                lat: location.lat,
                lng: location.lng
            };
        }
        
        // Retourner sous forme de chaîne si demandé (ancien format pour compatibilité)
        return `${location.lat} ${location.lng}`;
    } else {
        // En cas d'erreur, retourner un objet vide ou une chaîne vide selon le format demandé
        return format === 'object' ? { lat: 0, lng: 0 } : "0 0";
    }
};

// Fonction pour calculer le temps de trajet et la distance entre deux adresses
export const calculateTravelTime = async (origin, destination, departure_time = new Date()) => {
    if (!origin || !destination) {
        throw new Error('Origin and destination must be provided');
    }

    // Convertir la date de départ en timestamp
    let departureTimestamp = Math.floor(new Date(departure_time).getTime() / 1000);
    // Vérifier si la date de départ est inférieure à la date du jour
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (departureTimestamp < currentTimestamp) {
        departureTimestamp = currentTimestamp;
    }

    console.log("   departureTimestamp : " + departureTimestamp);
    // Obtenir les coordonnées géographiques pour l'origine et la destination
    const originCoordinates = await getCoordinates(origin, 'string');
    const destinationCoordinates = await getCoordinates(destination, 'string');
    const mode = 'driving'; // mode de déplacement
    const trafficModel = 'optimistic';

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(originCoordinates)}&destination=${encodeURIComponent(destinationCoordinates)}&mode=${mode}&departure_time=${departureTimestamp}&traffic_model=${trafficModel}&key=${GOOGLE_MAPS_API_KEY}`;
    console.log(url);

    const response = await axios.get(url);
    const data = response.data;

    if (data.routes.length > 0) {
        const durationInSeconds = data.routes[0].legs[0].duration.value;
        const durationInMinutes = Math.ceil(durationInSeconds / 60); // Convertir les secondes en minutes
        const distanceInMeters = data.routes[0].legs[0].distance.value;
        const distanceInKilometers = (distanceInMeters / 1000).toFixed(2); // Convertir les mètres en kilomètres
        return { travelTime: durationInMinutes, distance: distanceInKilometers };
    } else {
        return { travelTime: 0, distance: 0, error: 'No route found' };
    }
};

// Fonction pour obtenir l'adresse à partir des coordonnées (géocodage inverse)
export const getAddressFromCoordinates = async (latitude, longitude) => {
    try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
            params: {
                latlng: `${latitude},${longitude}`,
                key: GOOGLE_MAPS_API_KEY,
                language: 'fr'
            }
        });

        if (response.data.status === 'OK' && response.data.results.length > 0) {
            // Prendre la première adresse formatée
            return response.data.results[0].formatted_address;
        } else {
            throw new Error('No address found for coordinates');
        }
    } catch (error) {
        console.error('Error in reverse geocoding:', error);
        throw new Error('Failed to get address from coordinates');
    }
};