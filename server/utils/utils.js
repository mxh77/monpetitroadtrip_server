import mongoose from 'mongoose';
import Accommodation from '../models/Accommodation.js';
import Activity from '../models/Activity.js';
import Step from '../models/Step.js';

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
                result = accommodation.arrivalDateTime < activity.startDateTime ? accommodation : activity;
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