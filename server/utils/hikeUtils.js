import axios from 'axios';
import { getCachedDatadomeCookie } from './datadome.js';


// Fonction pour récupérer les trails depuis l'API Algolia
export const fetchTrailsFromAlgoliaAPI = async (coordinates, radius = 5000, limit = 20) => {
    const { lat, lng } = coordinates;

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
        hitsPerPage: limit,
        facetFilters: [["type:trail"]],
        aroundLatLng: `${lat}, ${lng}`,
        aroundRadius: radius,
        attributesToHighlight: ["name"],
        responseFields: ["hits", "hitsPerPage", "nbHits"]
    };

    const response = await axios.post(
        'https://9ioacg5nhe-3.algolianet.com/1/indexes/alltrails_primary_fr-FR/query',
        payload,
        {
            headers: {
                'Content-Type': 'application/json',
                'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY,
                'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID
            }
        }
    );

    return response.data.hits
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 10);
};

// Fonction pour récupérer les détails d'un trail via l'API AllTrails
export const fetchTrailDetails = async (trailId) => {
    const datadomeCookie = await getCachedDatadomeCookie();

    const response = await axios.get(
        `https://www.alltrails.com/api/alltrails/trails/${trailId}`,
        {
            headers: {
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Connection': 'keep-alive',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0',
                "Cookie": datadomeCookie,
                'X-AT-CALLER': 'Mugen',
                'X-AT-KEY': process.env.ALLTRAILS_API_KEY,
                'X-CSRF-TOKEN': 'undefined',
                'X-Language-Locale': 'fr-FR',
                'Origin': 'https://www.alltrails.com',
                'Host': 'www.alltrails.com',
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin",
                "TE": "trailers",
            }
        }
    );

    const trail = response.data.trails[0]; // Le trail concerné
    let photoUrl = null;

    if (trail.defaultPhoto.id) {
        try {
            const photoRes = await axios.get(
                `https://www.alltrails.com/photos/${trail.defaultPhoto.id}/credit-link?provide_set_as_default=true`,
                {
                    headers: {
                        'Accept': '*/*',
                        'Accept-Encoding': 'gzip, deflate, br, zstd',
                        'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache',
                        'Connection': 'keep-alive',
                        "Cookie": datadomeCookie,
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0',
                        'X-AT-CALLER': 'Mugen',
                        'X-AT-KEY': process.env.ALLTRAILS_API_KEY,
                        'X-CSRF-TOKEN': 'undefined',
                        'X-Language-Locale': 'fr-FR',
                        'Origin': 'https://www.alltrails.com',
                        'Host': 'www.alltrails.com'
                    }
                }
            );

            console.log('Photo URL:', photoRes);
            photoUrl = photoRes.data?.photo?.image?.url || null;
        } catch (error) {
            console.warn('Erreur lors de la récupération de la photo par défaut :', error.message);
        }
    }

    return {
        id: trail.id,
        name: trail.name,
        overview: trail.overview,
        routeType: trail.routeType?.name || 'Type de route inconnu',
        popularity: trail.popularity,
        location: trail.location,
        defaultPhotoUrl: photoUrl, // 🎉 Ajout ici
    };
};

// Fonction pour récupérer les avis d'un trail via l'API AllTrails
export const fetchTrailReviews = async (trailId, limit = 5) => {
    const datadomeCookie = await getCachedDatadomeCookie();

    const response = await axios.post(
        `https://www.alltrails.com/api/alltrails/v2/trails/${trailId}/reviews/search`,
        { limit },
        {
            headers: {
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Connection': 'keep-alive',
                "Cookie": datadomeCookie,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0',
                'X-AT-CALLER': 'Mugen',
                'X-AT-KEY': process.env.ALLTRAILS_API_KEY,
                'X-CSRF-TOKEN': 'undefined',
                'X-Language-Locale': 'fr-FR',
                'Origin': 'https://www.alltrails.com',
                'Host': 'www.alltrails.com'
            }
        }
    );

    const reviews = response.data.trail_reviews || [];
    return reviews
        .filter((review) => review.comment !== null)
        .map((review) => ({
            user: review.user?.name || 'Anonymous',
            rating: review.rating,
            comment: review.comment
        }));
};