import axios from 'axios';


export const fetchTrailsFromAlgolia = async (coordinates, radius = 5000) => {
    try {
        const { lat, lng } = coordinates;

        // Construire le payload pour la requête Algolia
        const payload = {
            facets: ["type", "difficulty_rating"],
            clickAnalytics: true,
            attributesToRetrieve: [
                "ID",
                "popularity",
                "length",
                "elevation_gain",
                "avg_rating",
                "duration_minutes",
                "name",
                "description",
                "_geoloc"
            ],
            hitsPerPage: 50,
            facetFilters: [
                ["type:trail"],
                ["type:-track", "type:-map"],
                ["type:-photospot", "subtype:-photospot"]
            ],
            aroundLatLng: `${lat}, ${lng}`,
            aroundRadius: radius,
            attributesToHighlight: ["name"],
            responseFields: ["hits", "hitsPerPage", "nbHits"]
        };

        // Effectuer la requête POST vers l'API Algolia
        const response = await axios.post(
            'https://9ioacg5nhe-3.algolianet.com/1/indexes/alltrails_primary_fr-FR/query',
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Algolia-API-Key': '63a3cf94e0042b9c67abf0892fc1d223', // Remplacez par votre clé API Algolia
                    'X-Algolia-Application-Id': '9IOACG5NHE' // Remplacez par votre ID d'application Algolia
                }
            }
        );

        // Extraire les résultats
        const trails = response.data.hits.map((trail) => ({
            id: trail.ID,
            popularity: trail.popularity,
            length: trail.length,
            elevationGain: trail.elevation_gain,
            avgRating: trail.avg_rating,
            durationMinutes: trail.duration_minutes,
            name: trail.name,
            description: trail.description,
            location: trail._geoloc // Ajouter les informations de localisation
        }));

        console.log('Trails fetched successfully:', trails);
        return trails;
    } catch (error) {
        console.error('Error fetching trails from Algolia:', error);
        return [];
    }
};

export const getHikeSuggestions = async (req, res) => {
    try {
        const { idStep } = req.params;

        // Récupérer le step par son ID
        const step = await Step.findById(idStep);

        if (!step) {
            return res.status(404).json({ msg: 'Step not found' });
        }

        if (!step.address) {
            return res.status(400).json({ msg: 'Step address is required to fetch hikes' });
        }

        // Obtenir les coordonnées de l'adresse
        const coordinatesString = await getCoordinates(step.address);

        if (!coordinatesString) {
            return res.status(400).json({ msg: 'Unable to fetch coordinates for the given address' });
        }

        // Convertir la chaîne de coordonnées en objet { lat, lng }
        const [lat, lng] = coordinatesString.split(' ').map(Number);
        const coordinates = { lat, lng };

        console.log('Parsed Coordinates:', coordinates);

        // Étape 1 : Appeler l'API Algolia pour récupérer les trails
        const algoliaPayload = {
            facets: ["type", "difficulty_rating"],
            clickAnalytics: true,
            attributesToRetrieve: [
                "ID",
                "popularity",
                "length",
                "elevation_gain",
                "avg_rating",
                "duration_minutes",
                "name",
                "description",
                "_geoloc"
            ],
            hitsPerPage: 10,
            facetFilters: [["type:trail"]],
            aroundLatLng: `${lat}, ${lng}`,
            aroundRadius: 5000,
            attributesToHighlight: ["name"],
            responseFields: ["hits", "hitsPerPage", "nbHits"]
        };

        const algoliaResponse = await axios.post(
            'https://9ioacg5nhe-3.algolianet.com/1/indexes/alltrails_primary_fr-FR/query',
            algoliaPayload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Algolia-API-Key': '63a3cf94e0042b9c67abf0892fc1d223',
                    'X-Algolia-Application-Id': '9IOACG5NHE'
                }
            }
        );

        const trails = algoliaResponse.data.hits;

        // Étape 2 : Récupérer les détails de chaque trail via l'API AllTrails
        const detailedTrails = await Promise.all(
            trails.map(async (trail) => {
                try {
                    const trailDetailsResponse = await axios.get(
                        `https://www.alltrails.com/api/alltrails/trails/${trail.ID}`
                    );

                    const reviewsResponse = await axios.post(
                        `https://www.alltrails.com/api/alltrails/v2/trails/${trail.ID}/reviews/search`,
                        { limit: 5 }, // Limiter à 5 avis
                        {
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        }
                    );

                    const reviewsSummary = reviewsResponse.data.reviews.map((review) => ({
                        user: review.user.name,
                        rating: review.rating,
                        comment: review.comment
                    }));

                    return {
                        id: trail.ID,
                        name: trail.name,
                        popularity: trail.popularity,
                        length: trail.length,
                        elevationGain: trail.elevation_gain,
                        avgRating: trail.avg_rating,
                        durationMinutes: trail.duration_minutes,
                        description: trail.description,
                        location: trail._geoloc,
                        reviews: reviewsSummary
                    };
                } catch (error) {
                    console.error(`Error fetching details for trail ID ${trail.ID}:`, error);
                    return null;
                }
            })
        );

        // Filtrer les trails valides
        const validTrails = detailedTrails.filter((trail) => trail !== null);

        res.json({
            step: {
                id: step._id,
                name: step.name,
                address: step.address,
                coordinates
            },
            hikes: validTrails
        });
    } catch (error) {
        console.error('Error fetching hike suggestions:', error);
        res.status(500).send('Server error');
    }
};