/**
 * Extraction d'entités à partir du texte
 * Utilise des regex et des règles pour identifier les éléments importants
 */

/**
 * Extrait toutes les entités d'une requête
 */
export const extractEntities = (query) => {
    const entities = {
        location: extractLocation(query),
        dates: extractDates(query),
        name: extractName(query),
        duration: extractDuration(query),
        price: extractPrice(query),
        people: extractPeopleCount(query),
        time: extractTime(query),
        notes: extractNotes(query)
    };
    
    // Nettoyer les entités vides
    Object.keys(entities).forEach(key => {
        if (entities[key] === null || entities[key] === undefined || 
            (typeof entities[key] === 'object' && Object.keys(entities[key]).length === 0)) {
            delete entities[key];
        }
    });
    
    return entities;
};

/**
 * Extraction de lieux/destinations
 */
export const extractLocation = (query) => {
    // Patterns pour les lieux
    const locationPatterns = [
        /(?:à|vers|dans|sur)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
        /(?:ville|destination|lieu)\s+(?:de\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*,?\s*France/gi,
        /étape\s+(?:à|vers|dans)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi
    ];
    
    for (const pattern of locationPatterns) {
        const matches = [...query.matchAll(pattern)];
        if (matches.length > 0) {
            return matches[0][1].trim();
        }
    }
    
    // Villes françaises courantes
    const commonCities = [
        'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg',
        'Montpellier', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Le Havre',
        'Saint-Étienne', 'Toulon', 'Grenoble', 'Dijon', 'Angers', 'Nîmes'
    ];
    
    for (const city of commonCities) {
        const regex = new RegExp(`\\b${city}\\b`, 'gi');
        if (regex.test(query)) {
            return city;
        }
    }
    
    return null;
};

/**
 * Extraction de dates
 */
export const extractDates = (query) => {
    const dates = {};
    
    // Patterns pour les dates
    const datePatterns = [
        // Format DD/MM/YYYY ou DD-MM-YYYY
        /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g,
        // Format "15 juillet" ou "15 juillet 2024"
        /(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)(?:\s+(\d{4}))?/gi,
        // Format "du 15 au 17 juillet"
        /du\s+(\d{1,2})\s+au\s+(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)(?:\s+(\d{4}))?/gi
    ];
    
    const monthNames = {
        'janvier': 1, 'février': 2, 'mars': 3, 'avril': 4, 'mai': 5, 'juin': 6,
        'juillet': 7, 'août': 8, 'septembre': 9, 'octobre': 10, 'novembre': 11, 'décembre': 12
    };
    
    // Chercher "du X au Y"
    const rangeMatch = query.match(/du\s+(\d{1,2})\s+au\s+(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)(?:\s+(\d{4}))?/gi);
    if (rangeMatch) {
        const match = rangeMatch[0].match(/du\s+(\d{1,2})\s+au\s+(\d{1,2})\s+(\w+)(?:\s+(\d{4}))?/i);
        if (match) {
            const startDay = parseInt(match[1]);
            const endDay = parseInt(match[2]);
            const month = monthNames[match[3].toLowerCase()];
            const year = match[4] ? parseInt(match[4]) : new Date().getFullYear();
            
            dates.arrival = new Date(year, month - 1, startDay).toISOString().split('T')[0];
            dates.departure = new Date(year, month - 1, endDay).toISOString().split('T')[0];
        }
    }
    
    // Chercher dates individuelles
    if (!dates.arrival) {
        const dateMatches = [...query.matchAll(/(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)(?:\s+(\d{4}))?/gi)];
        if (dateMatches.length > 0) {
            const match = dateMatches[0];
            const day = parseInt(match[1]);
            const month = monthNames[match[2].toLowerCase()];
            const year = match[3] ? parseInt(match[3]) : new Date().getFullYear();
            
            dates.arrival = new Date(year, month - 1, day).toISOString().split('T')[0];
        }
    }
    
    return Object.keys(dates).length > 0 ? dates : null;
};

/**
 * Extraction de noms (hôtels, activités, etc.)
 */
export const extractName = (query) => {
    // Patterns pour les noms d'hôtels
    const hotelPatterns = [
        /hôtel\s+([A-Z][a-zA-Z\s]+)/gi,
        /hotel\s+([A-Z][a-zA-Z\s]+)/gi,
        /(?:hébergement|logement)\s+([A-Z][a-zA-Z\s]+)/gi
    ];
    
    // Patterns pour les activités
    const activityPatterns = [
        /visite\s+(?:du|de\s+la|des?)\s+([A-Z][a-zA-Z\s]+)/gi,
        /activité\s+([A-Z][a-zA-Z\s]+)/gi,
        /aller\s+(?:au|à\s+la|aux?)\s+([A-Z][a-zA-Z\s]+)/gi
    ];
    
    // Patterns pour les tâches
    const taskPatterns = [
        /tâche\s+([a-zA-Z\s]+)/gi,
        /(?:réserver|acheter|préparer|faire)\s+([a-zA-Z\s]+)/gi
    ];
    
    const allPatterns = [...hotelPatterns, ...activityPatterns, ...taskPatterns];
    
    for (const pattern of allPatterns) {
        const matches = [...query.matchAll(pattern)];
        if (matches.length > 0) {
            return matches[0][1].trim();
        }
    }
    
    return null;
};

/**
 * Extraction de durée
 */
export const extractDuration = (query) => {
    const durationPatterns = [
        /(\d+)\s*(?:jour|jours|j)/gi,
        /(\d+)\s*(?:heure|heures|h)/gi,
        /(\d+)\s*(?:nuit|nuits)/gi,
        /pendant\s+(\d+)\s*(?:jour|jours|heure|heures)/gi
    ];
    
    for (const pattern of durationPatterns) {
        const matches = [...query.matchAll(pattern)];
        if (matches.length > 0) {
            return matches[0][0]; // Retourne la durée complète trouvée
        }
    }
    
    return null;
};

/**
 * Extraction de prix
 */
export const extractPrice = (query) => {
    const pricePatterns = [
        /(\d+)\s*(?:€|euros?)/gi,
        /(?:prix|coût|budget).*?(\d+)/gi,
        /(\d+)\s*(?:€|euros?)\s*(?:par|\/)\s*(?:personne|nuit|jour)/gi
    ];
    
    for (const pattern of pricePatterns) {
        const matches = [...query.matchAll(pattern)];
        if (matches.length > 0) {
            return parseInt(matches[0][1]);
        }
    }
    
    return null;
};

/**
 * Extraction du nombre de personnes
 */
export const extractPeopleCount = (query) => {
    const peoplePatterns = [
        /(\d+)\s*(?:personne|personnes|adulte|adultes)/gi,
        /pour\s+(\d+)/gi,
        /(\d+)\s*(?:voyageur|voyageurs)/gi
    ];
    
    for (const pattern of peoplePatterns) {
        const matches = [...query.matchAll(pattern)];
        if (matches.length > 0) {
            return parseInt(matches[0][1]);
        }
    }
    
    return null;
};

/**
 * Extraction d'heure
 */
export const extractTime = (query) => {
    const timePatterns = [
        /(\d{1,2})[h:](\d{2})/gi,
        /(\d{1,2})\s*(?:h|heure)/gi,
        /à\s+(\d{1,2}[h:]\d{2})/gi
    ];
    
    for (const pattern of timePatterns) {
        const matches = [...query.matchAll(pattern)];
        if (matches.length > 0) {
            return matches[0][1];
        }
    }
    
    return null;
};

/**
 * Extraction de notes/commentaires
 */
export const extractNotes = (query) => {
    const notePatterns = [
        /note[:\s]+(.+)/gi,
        /remarque[:\s]+(.+)/gi,
        /important[:\s]+(.+)/gi,
        /attention[:\s]+(.+)/gi
    ];
    
    for (const pattern of notePatterns) {
        const matches = [...query.matchAll(pattern)];
        if (matches.length > 0) {
            return matches[0][1].trim();
        }
    }
    
    return null;
};

/**
 * Validation des entités extraites
 */
export const validateEntities = (entities) => {
    const validation = {
        isValid: true,
        errors: [],
        warnings: []
    };
    
    // Validation des dates
    if (entities.dates) {
        if (entities.dates.arrival && entities.dates.departure) {
            const arrival = new Date(entities.dates.arrival);
            const departure = new Date(entities.dates.departure);
            
            if (departure <= arrival) {
                validation.errors.push('La date de départ doit être après la date d\'arrivée');
            }
            
            const today = new Date();
            if (arrival < today.setHours(0, 0, 0, 0)) {
                validation.warnings.push('La date d\'arrivée est dans le passé');
            }
        }
    }
    
    // Validation du prix
    if (entities.price && entities.price < 0) {
        validation.errors.push('Le prix ne peut pas être négatif');
    }
    
    // Validation du nombre de personnes
    if (entities.people && entities.people <= 0) {
        validation.errors.push('Le nombre de personnes doit être positif');
    }
    
    validation.isValid = validation.errors.length === 0;
    return validation;
};
