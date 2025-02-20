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
 * Détermine la note en fonction du temps de trajet et de la différence de temps entre deux étapes.
 * @param {number} travelTime - Le temps de trajet en minutes.
 * @param {number} timeDifference - La différence de temps entre deux étapes en minutes.
 * @param {object} thresholds - Les seuils pour déterminer les notes.
 * @returns {string} - Retourne la note (ERROR, WARNING, OK).
 */
export const determineTravelTimeNote = (travelTime, timeDifference, thresholds = { error: 0, warning: 15 }) => {
    if (travelTime > timeDifference) {
        return 'ERROR';
    } else if (timeDifference - travelTime < thresholds.warning) {
        return 'WARNING';
    } else {
        return 'OK';
    }
};