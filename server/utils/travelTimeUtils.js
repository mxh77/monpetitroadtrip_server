import mongoose from 'mongoose';
import Accommodation from '../models/Accommodation.js';
import Activity from '../models/Activity.js';
import Step from '../models/Step.js';
import { calculateTravelTime } from './googleMapsUtils.js';

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

export const getObjectFirstLast = async (stepId, typeObjet) => {
    const step = await Step.findById(stepId);

    if (!step) {
        throw new Error('Step not found');
    }

    let result = null;

    if (typeObjet === 'FIRST') {
        if (step.type === 'Stage') {
            const accommodation = await Accommodation.findOne({ stepId: step._id }).sort({ arrivalDateTime: 1 });
            const activity = await Activity.findOne({ stepId: step._id }).sort({ startDateTime: 1 });

            if (accommodation && activity) {
                // console.log("ACCOMMODATION / ACTIVITY : " + accommodation);
                result = accommodation.arrivalDateTime < activity.startDateTime ? accommodation : activity;
            } else if (accommodation) {
                // console.log("ACCOMMODATION : " + accommodation);
                result = accommodation;
            } else if (activity) {
                // console.log("ACTIVITY : " + activity);
                result = activity;
            } else {
                // console.log("STEP : " + step);
                result = step;
            }

        } else if (step.type === 'Stop') {
            result = step;
        }
    } else if (typeObjet === 'LAST') {
        if (step.type === 'Stage') {
            const accommodation = await Accommodation.findOne({ stepId: step._id }).sort({ departureDateTime: -1 });
            const activity = await Activity.findOne({ stepId: step._id }).sort({ endDateTime: -1 });

            if (accommodation && activity) {
                result = accommodation.departureDateTime > activity.endDateTime ? accommodation : activity;
            } else if (accommodation) {
                result = accommodation;
            } else if (activity) {
                result = activity;
            } else {
                result = step;
            }
        } else if (step.type === 'Stop') {
            result = step;
        }
    }

    if (result) {
        return {
            typeObjet: result instanceof Accommodation ? 'Accommodation' : result instanceof Activity ? 'Activity' : 'Step',
            id: result._id.toString(),
            address: result.address,
            startDateTime: result.arrivalDateTime || result.startDateTime || step.arrivalDateTime,
            endDateTime: result.departureDateTime || result.endDateTime || step.departureDateTime
        };
    }

    return null;
};



/**
 * Met à jour les dates d'arrivée et de départ d'un step en fonction des accommodations et activities associées.
 * @param {ObjectId} stepId - L'ID du step à mettre à jour.
 */
export const updateStepDates = async (stepId) => {
    const step = await Step.findById(stepId);

    if (!step) {
        throw new Error('Step not found');
    }

    const accommodations = await Accommodation.find({ stepId });
    const activities = await Activity.find({ stepId });

    let arrivalDateTime = null;
    let departureDateTime = null;

    accommodations.forEach(accommodation => {
        if (!arrivalDateTime || new Date(accommodation.arrivalDateTime) < new Date(arrivalDateTime)) {
            arrivalDateTime = accommodation.arrivalDateTime;
        }
        if (!departureDateTime || new Date(accommodation.departureDateTime) > new Date(departureDateTime)) {
            departureDateTime = accommodation.departureDateTime;
        }
    });

    activities.forEach(activity => {
        if (!arrivalDateTime || new Date(activity.startDateTime) < new Date(arrivalDateTime)) {
            arrivalDateTime = activity.startDateTime;
        }
        if (!departureDateTime || new Date(activity.endDateTime) > new Date(departureDateTime)) {
            departureDateTime = activity.endDateTime;
        }
    });

    step.arrivalDateTime = arrivalDateTime;
    step.departureDateTime = departureDateTime;
    console.log("Step : " + step);

    await step.save();
};

/**
 * Rafraîchit le temps de trajet pour une étape donnée.
 * @param {Object} step - L'étape à traiter.
 * @param {Object} previousStep - L'étape précédente.
 * @returns {Object} - L'étape mise à jour.
 */
export const refreshTravelTimeForStep = async (step) => {
    console.log("Fonction refreshTravelTimeForStep");
    //récupérer l'étape précédente
    const previousStep = await Step.findOne
        ({ roadtripId: step.roadtripId, departureDateTime: { $lt: step.departureDateTime } })
        .sort({ departureDateTime: -1 });

    if (previousStep) {

        console.log("PREVIOUS STEP : " + previousStep);

        // Récupérer le LAST objet du step précédent
        let lastObjet = await getObjectFirstLast(previousStep._id, 'LAST');
        if (!lastObjet) {
            console.warn(`No LAST object found for step ${previousStep._id}`);
            return step;
        }
        console.log("LAST OBJET : " + lastObjet.address, lastObjet.endDateTime);

        // Récupérer le FIRST objet du step actuel
        let firstObjet = await getObjectFirstLast(step._id, 'FIRST');
        if (!firstObjet) {
            console.warn(`No FIRST object found for step ${step._id}`);
            return step;
        }
        console.log("FIRST OBJET : " + firstObjet.address, firstObjet.startDateTime);

        const travelData = await calculateTravelTime(lastObjet.address, firstObjet.address, lastObjet.endDateTime);
        const travelTime = travelData.travelTime;
        const distance = travelData.distance;
        console.log("Travel time:", travelTime);

        // Vérifier la cohérence des dates/heures et obtenir la note
        const { isConsistency, note } = checkDateTimeConsistency(lastObjet.endDateTime, firstObjet.startDateTime, travelTime);
        const isArrivalTimeConsistent = isConsistency;
        const travelTimeNote = note;

        // Mettre à jour le temps de trajet et le champ isArrivalTimeConsistent pour l'étape
        step.travelTimePreviousStep = travelTime;
        step.distancePreviousStep = distance;
        step.isArrivalTimeConsistent = isArrivalTimeConsistent;
        step.travelTimeNote = travelTimeNote;
        console.log("Travel time note:", travelTimeNote);
        await step.save();
        console.log("Step updated", step);
    }
    
    // Récupérer l'étape suivante
    const nextStep = await Step.findOne({ roadtripId: step.roadtripId, arrivalDateTime: { $gt: step.arrivalDateTime } }).sort({ arrivalDateTime: 1 });
    console.log("NEXT STEP : " + nextStep);

    if (nextStep) {
        // Récupérer le LAST objet de l'étape actuelle
        let lastObjet = await getObjectFirstLast(step._id, 'LAST');
        if (!lastObjet) {
            console.warn(`No LAST object found for step ${step._id}`);
            return step;
        }
        console.log("LAST OBJET : " + lastObjet.address, lastObjet.endDateTime);

        // Récupérer le FIRST objet de l'étape suivante
        let firstObjet = await getObjectFirstLast(nextStep._id, 'FIRST');
        if (!firstObjet) {
            console.warn(`No FIRST object found for step ${nextStep._id}`);
            return step;
        }
        console.log("FIRST OBJET : " + firstObjet.address, firstObjet.startDateTime);

        const travelData = await calculateTravelTime(lastObjet.address, firstObjet.address, lastObjet.endDateTime);
        const travelTime = travelData.travelTime;
        const distance = travelData.distance;
        console.log("Travel time:", travelTime);

        // Vérifier la cohérence des dates/heures et obtenir la note
        const { isConsistency, note } = checkDateTimeConsistency(lastObjet.endDateTime, firstObjet.startDateTime, travelTime);
        const isArrivalTimeConsistent = isConsistency;
        const travelTimeNote = note;

        // Mettre à jour le temps de trajet et le champ isArrivalTimeConsistent pour l'étape suivante
        nextStep.travelTimePreviousStep = travelTime;
        nextStep.distancePreviousStep = distance;
        nextStep.isArrivalTimeConsistent = isArrivalTimeConsistent;
        nextStep.travelTimeNote = travelTimeNote;
        console.log("Travel time note:", travelTimeNote);
        await nextStep.save();
        console.log("Next step updated", nextStep);
    }

    return step;
};

/**
 * Met à jour les dates et les temps de trajet d'un step.
 * @param {ObjectId} stepId - L'ID du step à mettre à jour.
 */
export const updateStepDatesAndTravelTime = async (stepId) => {
    await updateStepDates(stepId);

    const step = await Step.findById(stepId);
    await refreshTravelTimeForStep(step);
};
