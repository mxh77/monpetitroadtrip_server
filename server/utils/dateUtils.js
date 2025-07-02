/**
 * Vérifie la cohérence des dates/heures de départ et d'arrivée par rapport au temps de trajet.
 * @param {Date} departureDateTime - La date/heure de départ.
 * @param {Date} arrivalDateTime - La date/heure d'arrivée.
 * @param {number} travelTime - Le temps de trajet en minutes.
 * @param {object} thresholds - Les seuils pour déterminer les notes.
 * @returns {object} - Retourne un objet contenant isConsistency et note.
 */
export const checkDateTimeConsistency = (departureDateTime, arrivalDateTime, travelTime, thresholds = { error: 0, warning: 15 }) => {
    const departure = new Date(departureDateTime);
    const arrival = new Date(arrivalDateTime);
    const travelTimeInMilliseconds = travelTime * 60 * 1000;
    console.log('departure', departure);
    console.log('arrival', arrival);
    console.log('travelTimeInMilliseconds', travelTimeInMilliseconds);
    
    // Calculer la date/heure d'arrivée estimée en ajoutant le temps de trajet à la date/heure de départ
    const estimatedArrival = new Date(departure.getTime() + travelTimeInMilliseconds);

    // Vérifier si la date/heure d'arrivée réelle est cohérente avec la date/heure d'arrivée estimée
    const isConsistency = arrival.getTime() >= estimatedArrival.getTime();

    // Calculer la différence de temps entre les deux étapes
    const timeDifference = (arrival.getTime() - departure.getTime()) / (1000 * 60); // en minutes

    // Déterminer la note en fonction du temps de trajet et de la différence de temps
    const note = determineTravelTimeNote(travelTime, timeDifference, thresholds);

    return { isConsistency, note };
};

/**
 * Calcule automatiquement le nombre de nuits entre deux dates.
 * @param {Date|string} arrivalDateTime - La date/heure d'arrivée.
 * @param {Date|string} departureDateTime - La date/heure de départ.
 * @returns {number} - Le nombre de nuits calculé.
 */
export const calculateNights = (arrivalDateTime, departureDateTime) => {
    if (!arrivalDateTime || !departureDateTime) return 0;
    
    const arrival = new Date(arrivalDateTime);
    const departure = new Date(departureDateTime);
    
    // Vérifier que les dates sont valides
    if (isNaN(arrival.getTime()) || isNaN(departure.getTime())) {
        console.warn('calculateNights: Dates invalides', { arrivalDateTime, departureDateTime });
        return 0;
    }
    
    // Si la date de départ est avant l'arrivée, retourner 0
    if (departure <= arrival) {
        console.warn('calculateNights: Date de départ antérieure ou égale à l\'arrivée', { arrivalDateTime, departureDateTime });
        return 0;
    }
    
    // Calculer la différence en jours (arrondi vers le haut pour les nuits partielles)
    const diffTime = departure.getTime() - arrival.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
};

/**
 * Détermine la note en fonction du temps de trajet et de la différence de temps entre deux étapes.
 * @param {number} travelTime - Le temps de trajet en minutes.
 * @param {number} timeDifference - La différence de temps entre deux étapes en minutes.
 * @param {object} thresholds - Les seuils pour déterminer les notes.
 * @returns {string} - Retourne la note (ERROR, WARNING, OK).
 */
export const determineTravelTimeNote = (travelTime, timeDifference, thresholds = { error: 0, warning: 15 }) => {
    console.log('travelTime', travelTime);
    console.log('timeDifference', timeDifference);
    if (travelTime > timeDifference) {
        return 'ERROR';
    } else if (timeDifference - travelTime < thresholds.warning) {
        return 'WARNING';
    } else {
        return 'OK';
    }
};