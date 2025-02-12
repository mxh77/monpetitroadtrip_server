import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtenir le répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger le fichier .env depuis la racine du projet
const result = dotenv.config({ path: path.resolve(__dirname, '../../.env') });

if (result.error) {
    console.error('❌ Erreur lors du chargement du fichier .env:', result.error);
    process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;
console.log('MONGODB_URI:', MONGODB_URI);

if (!MONGODB_URI) {
    console.error('❌ Erreur : La variable MONGODB_URI n\'est pas définie dans le fichier .env');
    process.exit(1);
}

mongoose.connect(MONGODB_URI);
import RoadtripModel from '../models/Roadtrip.js';
import StageModel from '../models/Stage.js';
import StopModel from '../models/Stop.js';
import StepModel from '../models/Step.js';
import FileModel from '../models/File.js';
import AccommodationModel from '../models/Accommodation.js';
import ActivityModel from '../models/Activity.js';

async function migrateRoadtrips() {
    console.log('🔄 Début de la migration des roadtrips...');
    const roadtrips = await RoadtripModel.find();
    console.log(`🔍 ${roadtrips.length} roadtrips trouvés.`);

    for (const oldRoadtrip of roadtrips) {
        console.log(`🚀 Migration du roadtrip: ${oldRoadtrip.name}`);

        // 🎯 1️⃣ Générer un nouvel ID pour le roadtrip
        const newRoadtripId = new mongoose.Types.ObjectId();

        // 🎯 2️⃣ Récupérer les stages et stops liés à ce roadtrip
        const stages = await StageModel.find({ roadtripId: oldRoadtrip._id });
        const stops = await StopModel.find({ roadtripId: oldRoadtrip._id });
        console.log(`🔍 ${stages.length} stages et ${stops.length} stops trouvés pour le roadtrip: ${oldRoadtrip.name}`);

        let newSteps = [];

        // 🎯 3️⃣ Fusionner stages et stops dans steps
        for (const stage of stages) {
            console.log(`🔄 Migration du stage: ${stage.name}`);
            const newStepId = new mongoose.Types.ObjectId();
            const newStep = {
                _id: newStepId,
                userId: stage.userId,
                roadtripId: newRoadtripId,
                type: 'Stage',
                name: stage.name,
                address: stage.address,
                latitude: stage.latitude,
                longitude: stage.longitude,
                arrivalDateTime: stage.arrivalDateTime,
                departureDateTime: stage.departureDateTime,
                travelTime: stage.travelTime,
                isArrivalTimeConsistent: stage.isArrivalTimeConsistent,
                notes: stage.notes,
                photos: await duplicateFiles(stage.photos),
                documents: await duplicateFiles(stage.documents),
                thumbnail: await duplicateFile(stage.thumbnail),
                accommodations: await duplicateAccommodations(stage.accommodations, newStepId),
                activities: await duplicateActivities(stage.activities, newStepId),
            };
            newSteps.push(newStep);
        }

        for (const stop of stops) {
            console.log(`🔄 Migration du stop: ${stop.name}`);
            const newStepId = new mongoose.Types.ObjectId();
            const newStep = {
                _id: newStepId,
                userId: stop.userId,
                roadtripId: newRoadtripId,
                type: 'Stop',
                name: stop.name,
                address: stop.address,
                latitude: stop.latitude,
                longitude: stop.longitude,
                arrivalDateTime: stop.arrivalDateTime,
                departureDateTime: stop.departureDateTime,
                travelTime: stop.travelTime,
                isArrivalTimeConsistent: stop.isArrivalTimeConsistent,
                duration: stop.duration,
                typeDuration: stop.typeDuration,
                reservationNumber: stop.reservationNumber,
                price: stop.price,
                notes: stop.notes,
                photos: await duplicateFiles(stop.photos),
                documents: await duplicateFiles(stop.documents),
                thumbnail: await duplicateFile(stop.thumbnail),
                accommodations: [], // Un stop ne doit pas avoir d'accommodations
                activities: [] // Un stop ne doit pas avoir d'activités
            };
            newSteps.push(newStep);
        }

        // 🎯 4️⃣ Créer le nouveau roadtrip avec les steps
        const newRoadtrip = new RoadtripModel({
            _id: newRoadtripId,
            userId: oldRoadtrip.userId,
            name: oldRoadtrip.name,
            startLocation: oldRoadtrip.startLocation,
            startDateTime: oldRoadtrip.startDateTime,
            endLocation: oldRoadtrip.endLocation,
            endDateTime: oldRoadtrip.endDateTime,
            currency: oldRoadtrip.currency,
            notes: oldRoadtrip.notes,
            photos: await duplicateFiles(oldRoadtrip.photos),
            documents: await duplicateFiles(oldRoadtrip.documents),
            thumbnail: await duplicateFile(oldRoadtrip.thumbnail),
            steps: newSteps.map(s => s._id),
        });

        // 🎯 5️⃣ Sauvegarde dans la base
        await StepModel.insertMany(newSteps);
        await newRoadtrip.save();

        console.log(`✅ Roadtrip ${oldRoadtrip.name} migré avec succès !`);
    }

    console.log('🚀 Migration terminée !');
    mongoose.disconnect();
}

// 📌 Fonction pour dupliquer une liste de fichiers
async function duplicateFiles(fileIds) {
    if (!fileIds || fileIds.length === 0) return [];
    let newFiles = [];
    for (const fileId of fileIds) {
        const file = await FileModel.findById(fileId);
        if (file) {
            try {
                const newFile = new FileModel({ ...file.toObject(), _id: new mongoose.Types.ObjectId() });
                await newFile.save();
                newFiles.push(newFile._id);
            } catch (error) {
                if (error.code === 11000) {
                    console.warn(`⚠️ Duplication ignorée pour le fichier avec fileId: ${file.fileId}`);
                } else {
                    throw error;
                }
            }
        }
    }
    return newFiles;
}

// 📌 Fonction pour dupliquer un fichier unique
async function duplicateFile(fileId) {
    if (!fileId) return null;
    const file = await FileModel.findById(fileId);
    if (!file) return null;
    try {
        const newFile = new FileModel({ ...file.toObject(), _id: new mongoose.Types.ObjectId() });
        await newFile.save();
        return newFile._id;
    } catch (error) {
        if (error.code === 11000) {
            console.warn(`⚠️ Duplication ignorée pour le fichier avec fileId: ${file.fileId}`);
            return file._id;
        } else {
            throw error;
        }
    }
}

// 📌 Fonction pour dupliquer accommodations
async function duplicateAccommodations(accommodationIds, stepId) {
    if (!accommodationIds || accommodationIds.length === 0) return [];
    let newAccommodations = [];
    for (const accId of accommodationIds) {
        const acc = await AccommodationModel.findById(accId);
        if (acc) {
            console.log(`🔄 Duplication de l'accommodation: ${acc.name}`);
            const newAcc = new AccommodationModel({ 
                ...acc.toObject(), 
                _id: new mongoose.Types.ObjectId(), 
                stepId,
                photos: await duplicateFiles(acc.photos),
                documents: await duplicateFiles(acc.documents),
                thumbnail: await duplicateFile(acc.thumbnail),
            });
            await newAcc.save();
            newAccommodations.push(newAcc._id);
        }
    }
    return newAccommodations;
}

// 📌 Fonction pour dupliquer activities
async function duplicateActivities(activityIds, stepId) {
    if (!activityIds || activityIds.length === 0) return [];
    let newActivities = [];
    for (const actId of activityIds) {
        const act = await ActivityModel.findById(actId);
        if (act) {
            console.log(`🔄 Duplication de l'activité: ${act.name}`);
            const newAct = new ActivityModel({ 
                ...act.toObject(), 
                _id: new mongoose.Types.ObjectId(), 
                stepId,
                photos: await duplicateFiles(act.photos),
                documents: await duplicateFiles(act.documents),
                thumbnail: await duplicateFile(act.thumbnail),
            });
            await newAct.save();
            newActivities.push(newAct._id);
        }
    }
    return newActivities;
}

// 🚀 Lancer la migration
migrateRoadtrips();