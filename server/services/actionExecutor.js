import Step from '../models/Step.js';
import Accommodation from '../models/Accommodation.js';
import Activity from '../models/Activity.js';
import RoadtripTask from '../models/RoadtripTask.js';
import Roadtrip from '../models/Roadtrip.js';
import nlpService from './nlpService.js';
import { getCoordinates } from '../utils/googleMapsUtils.js';

/**
 * Service d'exécution des actions du chatbot
 */
class ActionExecutor {
    
    /**
     * Exécute une action selon l'intention et les entités
     */
    async executeAction(job) {
        const { intent, entities, roadtripId, userId } = job;
        
        console.log(`🎬 Exécution action: ${intent} pour roadtrip ${roadtripId}`);
        
        try {
            switch (intent) {
                case 'add_step':
                    return await this.addStep(roadtripId, entities, userId);
                    
                case 'delete_step':
                    return await this.deleteStep(roadtripId, entities, userId);
                    
                case 'modify_step':
                    return await this.modifyStep(roadtripId, entities, userId);
                    
                case 'add_accommodation':
                    return await this.addAccommodation(roadtripId, entities, userId);
                    
                case 'delete_accommodation':
                    return await this.deleteAccommodation(roadtripId, entities, userId);
                    
                case 'add_activity':
                    return await this.addActivity(roadtripId, entities, userId);
                    
                case 'delete_activity':
                    return await this.deleteActivity(roadtripId, entities, userId);
                    
                case 'add_task':
                    return await this.addTask(roadtripId, entities, userId);
                    
                case 'delete_task':
                    return await this.deleteTask(roadtripId, entities, userId);
                    
                case 'modify_dates':
                    return await this.modifyDates(roadtripId, entities, userId);
                    
                case 'get_info':
                    return await this.getInfo(roadtripId, entities, userId);
                    
                default:
                    throw new Error(`Action non supportée: ${intent}`);
            }
        } catch (error) {
            console.error(`❌ Erreur exécution ${intent}:`, error);
            throw error;
        }
    }
    
    /**
     * Ajouter une nouvelle étape
     */
    async addStep(roadtripId, entities, userId) {
        console.log(`📍 Ajout d'une étape:`, entities);
        
        // Extraire les détails du step
        const stepDetails = await nlpService.extractStepDetails(entities);
        
        if (!stepDetails.name && !stepDetails.address) {
            throw new Error('Impossible de déterminer le lieu de l\'étape');
        }
        
        // Obtenir les coordonnées si on a une adresse
        let coordinates = {};
        if (stepDetails.address) {
            try {
                coordinates = await getCoordinates(stepDetails.address);
            } catch (error) {
                console.warn('⚠️ Impossible d\'obtenir les coordonnées:', error.message);
            }
        }
        
        // Créer le step
        const step = await Step.create({
            roadtripId,
            userId,
            name: stepDetails.name,
            address: stepDetails.address,
            latitude: coordinates.lat || 0,
            longitude: coordinates.lng || 0,
            arrivalDateTime: stepDetails.arrivalDateTime,
            departureDateTime: stepDetails.departureDateTime,
            notes: stepDetails.notes || `Créé via chatbot IA`
        });
        
        // Ajouter aux steps du roadtrip
        await Roadtrip.findByIdAndUpdate(roadtripId, {
            $push: { steps: step._id }
        });
        
        console.log(`✅ Étape créée:`, step.name);
        
        return {
            success: true,
            action: 'add_step',
            data: step,
            message: `Étape "${step.name}" ajoutée avec succès à votre roadtrip`,
            createdItems: [step._id],
            createdItemsModel: 'Step'
        };
    }
    
    /**
     * Supprimer une étape
     */
    async deleteStep(roadtripId, entities, userId) {
        console.log(`🗑️ Suppression d'une étape:`, entities);
        
        const locationToDelete = entities.location || entities.name;
        if (!locationToDelete) {
            throw new Error('Impossible de déterminer quelle étape supprimer');
        }
        
        // Chercher l'étape à supprimer
        const roadtrip = await Roadtrip.findById(roadtripId).populate('steps');
        if (!roadtrip) {
            throw new Error('Roadtrip introuvable');
        }
        
        const stepToDelete = roadtrip.steps.find(step => 
            step.name.toLowerCase().includes(locationToDelete.toLowerCase()) ||
            (step.address && step.address.toLowerCase().includes(locationToDelete.toLowerCase()))
        );
        
        if (!stepToDelete) {
            throw new Error(`Aucune étape trouvée correspondant à "${locationToDelete}"`);
        }
        
        // Supprimer le step de la liste du roadtrip
        await Roadtrip.findByIdAndUpdate(roadtripId, {
            $pull: { steps: stepToDelete._id }
        });
        
        // Supprimer le step lui-même
        await Step.findByIdAndDelete(stepToDelete._id);
        
        console.log(`✅ Étape supprimée:`, stepToDelete.name);
        
        return {
            success: true,
            action: 'delete_step',
            data: { deletedStep: stepToDelete.name },
            message: `Étape "${stepToDelete.name}" supprimée avec succès de votre roadtrip`
        };
    }
    
    /**
     * Ajouter un hébergement
     */
    async addAccommodation(roadtripId, entities, userId) {
        console.log(`🏨 Ajout d'un hébergement:`, entities);
        
        const accommodationName = entities.name;
        const location = entities.location;
        
        if (!accommodationName && !location) {
            throw new Error('Impossible de déterminer l\'hébergement à ajouter');
        }
        
        // Trouver l'étape associée ou créer un hébergement général
        let stepId = null;
        if (location) {
            const roadtrip = await Roadtrip.findById(roadtripId).populate('steps');
            const relatedStep = roadtrip.steps.find(step => 
                step.name.toLowerCase().includes(location.toLowerCase()) ||
                (step.address && step.address.toLowerCase().includes(location.toLowerCase()))
            );
            if (relatedStep) {
                stepId = relatedStep._id;
            }
        }
        
        // Obtenir les coordonnées
        let coordinates = {};
        if (location) {
            try {
                coordinates = await getCoordinates(location);
            } catch (error) {
                console.warn('⚠️ Impossible d\'obtenir les coordonnées:', error.message);
            }
        }
        
        // Créer l'hébergement
        const accommodation = await Accommodation.create({
            userId,
            stepId,
            name: accommodationName || `Hébergement à ${location}`,
            address: location || '',
            latitude: coordinates.lat || 0,
            longitude: coordinates.lng || 0,
            arrivalDateTime: entities.dates?.arrival ? new Date(entities.dates.arrival) : null,
            departureDateTime: entities.dates?.departure ? new Date(entities.dates.departure) : null,
            price: entities.price || 0,
            notes: `Créé via chatbot IA`
        });
        
        // Associer à l'étape si trouvée
        if (stepId) {
            await Step.findByIdAndUpdate(stepId, {
                $push: { accommodations: accommodation._id }
            });
        }
        
        console.log(`✅ Hébergement créé:`, accommodation.name);
        
        return {
            success: true,
            action: 'add_accommodation',
            data: accommodation,
            message: `Hébergement "${accommodation.name}" ajouté avec succès${stepId ? ' à l\'étape correspondante' : ''}`,
            createdItems: [accommodation._id],
            createdItemsModel: 'Accommodation'
        };
    }
    
    /**
     * Ajouter une activité
     */
    async addActivity(roadtripId, entities, userId) {
        console.log(`🎯 Ajout d'une activité:`, entities);
        
        const activityName = entities.name;
        const location = entities.location;
        
        if (!activityName && !location) {
            throw new Error('Impossible de déterminer l\'activité à ajouter');
        }
        
        // Trouver l'étape associée
        let stepId = null;
        if (location) {
            const roadtrip = await Roadtrip.findById(roadtripId).populate('steps');
            const relatedStep = roadtrip.steps.find(step => 
                step.name.toLowerCase().includes(location.toLowerCase()) ||
                (step.address && step.address.toLowerCase().includes(location.toLowerCase()))
            );
            if (relatedStep) {
                stepId = relatedStep._id;
            }
        }
        
        // Obtenir les coordonnées
        let coordinates = {};
        if (location) {
            try {
                coordinates = await getCoordinates(location);
            } catch (error) {
                console.warn('⚠️ Impossible d\'obtenir les coordonnées:', error.message);
            }
        }
        
        // Créer l'activité
        const activity = await Activity.create({
            userId,
            stepId,
            name: activityName || `Activité à ${location}`,
            address: location || '',
            latitude: coordinates.lat || 0,
            longitude: coordinates.lng || 0,
            startDateTime: entities.dates?.arrival ? new Date(entities.dates.arrival) : null,
            endDateTime: entities.dates?.departure ? new Date(entities.dates.departure) : null,
            price: entities.price || 0,
            notes: `Créé via chatbot IA`
        });
        
        // Associer à l'étape si trouvée
        if (stepId) {
            await Step.findByIdAndUpdate(stepId, {
                $push: { activities: activity._id }
            });
        }
        
        console.log(`✅ Activité créée:`, activity.name);
        
        return {
            success: true,
            action: 'add_activity',
            data: activity,
            message: `Activité "${activity.name}" ajoutée avec succès${stepId ? ' à l\'étape correspondante' : ''}`,
            createdItems: [activity._id],
            createdItemsModel: 'Activity'
        };
    }
    
    /**
     * Ajouter une tâche
     */
    async addTask(roadtripId, entities, userId) {
        console.log(`✅ Ajout d'une tâche:`, entities);
        
        const taskName = entities.name;
        if (!taskName) {
            throw new Error('Impossible de déterminer la tâche à ajouter');
        }
        
        // S'assurer que taskName est une string
        const taskNameStr = typeof taskName === 'string' ? taskName : String(taskName);
        
        // Déterminer la catégorie automatiquement
        const category = this.determineTaskCategory(taskNameStr);
        
        // Créer la tâche
        const task = await RoadtripTask.create({
            roadtripId,
            userId,
            title: taskNameStr,
            description: entities.notes || `Créé via chatbot IA`,
            category: category,
            priority: 'medium',
            dueDate: entities.dates?.arrival ? new Date(entities.dates.arrival) : null
        });
        
        console.log(`✅ Tâche créée:`, task.title);
        
        return {
            success: true,
            action: 'add_task',
            data: task,
            message: `Tâche "${task.title}" ajoutée avec succès à votre roadtrip`,
            createdItems: [task._id],
            createdItemsModel: 'RoadtripTask'
        };
    }
    
    /**
     * Détermine la catégorie d'une tâche en fonction de son nom
     */
    determineTaskCategory(taskName) {
        // S'assurer que taskName est une string
        const taskNameStr = typeof taskName === 'string' ? taskName : String(taskName);
        const name = taskNameStr.toLowerCase();
        
        // Mots-clés pour chaque catégorie
        const categoryKeywords = {
            booking: ['réserver', 'réservation', 'book', 'booking', 'billets', 'tickets', 'restaurant', 'hôtel', 'vol', 'train'],
            documents: ['passeport', 'visa', 'carte', 'documents', 'papiers', 'assurance', 'permis'],
            packing: ['valise', 'bagages', 'emballer', 'pack', 'packing', 'vêtements', 'affaires'],
            health: ['médecin', 'vaccin', 'médicaments', 'santé', 'health', 'pharmacie'],
            transport: ['transport', 'voiture', 'location', 'carburant', 'essence', 'parking'],
            accommodation: ['hébergement', 'logement', 'hotel', 'airbnb', 'chambre'],
            activities: ['activité', 'visite', 'excursion', 'spectacle', 'musée', 'attraction'],
            finances: ['budget', 'argent', 'banque', 'change', 'devise', 'finances'],
            communication: ['téléphone', 'internet', 'wifi', 'roaming', 'communication'],
            preparation: ['préparer', 'planifier', 'organiser', 'rechercher', 'vérifier']
        };
        
        // Rechercher la catégorie correspondante
        for (const [category, keywords] of Object.entries(categoryKeywords)) {
            if (keywords.some(keyword => name.includes(keyword))) {
                return category;
            }
        }
        
        // Par défaut, retourner 'other'
        return 'other';
    }
    
    /**
     * Obtenir des informations sur le roadtrip
     */
    async getInfo(roadtripId, entities, userId) {
        console.log(`ℹ️ Récupération d'informations:`, entities);
        
        const roadtrip = await Roadtrip.findById(roadtripId)
            .populate('steps')
            .populate({
                path: 'steps',
                populate: [
                    { path: 'accommodations' },
                    { path: 'activities' }
                ]
            });
        
        if (!roadtrip) {
            throw new Error('Roadtrip introuvable');
        }
        
        // Préparer le résumé
        const summary = {
            name: roadtrip.name,
            dates: {
                start: roadtrip.startDateTime,
                end: roadtrip.endDateTime
            },
            stepsCount: roadtrip.steps.length,
            accommodationsCount: roadtrip.steps.reduce((total, step) => total + (step.accommodations?.length || 0), 0),
            activitiesCount: roadtrip.steps.reduce((total, step) => total + (step.activities?.length || 0), 0),
            steps: roadtrip.steps.map(step => ({
                name: step.name,
                address: step.address,
                dates: {
                    arrival: step.arrivalDateTime,
                    departure: step.departureDateTime
                }
            }))
        };
        
        const message = `Voici les informations de votre roadtrip "${roadtrip.name}":
- ${summary.stepsCount} étapes
- ${summary.accommodationsCount} hébergements
- ${summary.activitiesCount} activités
- Du ${new Date(roadtrip.startDateTime).toLocaleDateString()} au ${new Date(roadtrip.endDateTime).toLocaleDateString()}`;
        
        return {
            success: true,
            action: 'get_info',
            data: summary,
            message
        };
    }
    
    /**
     * Supprimer un hébergement
     */
    async deleteAccommodation(roadtripId, entities, userId) {
        console.log(`🏨 Suppression d'un hébergement:`, entities);
        
        // Chercher l'hébergement à supprimer
        let accommodation = null;
        
        // Recherche par nom
        if (entities.name) {
            accommodation = await Accommodation.findOne({
                userId,
                name: { $regex: entities.name, $options: 'i' }
            });
        }
        
        // Recherche par lieu si pas trouvé par nom
        if (!accommodation && entities.location) {
            // Trouver d'abord le step
            const step = await Step.findOne({
                roadtripId,
                userId,
                $or: [
                    { name: { $regex: entities.location, $options: 'i' } },
                    { address: { $regex: entities.location, $options: 'i' } }
                ]
            });
            
            if (step) {
                accommodation = await Accommodation.findOne({
                    stepId: step._id,
                    userId
                });
            }
        }
        
        if (!accommodation) {
            throw new Error('Hébergement non trouvé');
        }
        
        // Supprimer l'hébergement
        await Accommodation.findByIdAndDelete(accommodation._id);
        
        return {
            success: true,
            action: 'delete_accommodation',
            data: {
                name: accommodation.name,
                _id: accommodation._id
            },
            message: `Hébergement "${accommodation.name}" supprimé avec succès`
        };
    }
    
    /**
     * Supprimer une activité
     */
    async deleteActivity(roadtripId, entities, userId) {
        console.log(`🎯 Suppression d'une activité:`, entities);
        
        // Chercher l'activité à supprimer
        let activity = null;
        
        // Recherche par nom
        if (entities.name) {
            activity = await Activity.findOne({
                userId,
                name: { $regex: entities.name, $options: 'i' }
            });
        }
        
        // Recherche par lieu si pas trouvé par nom
        if (!activity && entities.location) {
            // Trouver d'abord le step
            const step = await Step.findOne({
                roadtripId,
                userId,
                $or: [
                    { name: { $regex: entities.location, $options: 'i' } },
                    { address: { $regex: entities.location, $options: 'i' } }
                ]
            });
            
            if (step) {
                activity = await Activity.findOne({
                    stepId: step._id,
                    userId
                });
            }
        }
        
        if (!activity) {
            throw new Error('Activité non trouvée');
        }
        
        // Supprimer l'activité
        await Activity.findByIdAndDelete(activity._id);
        
        return {
            success: true,
            action: 'delete_activity',
            data: {
                name: activity.name,
                _id: activity._id
            },
            message: `Activité "${activity.name}" supprimée avec succès`
        };
    }
    
    /**
     * Supprimer une tâche
     */
    async deleteTask(roadtripId, entities, userId) {
        console.log(`✅ Suppression d'une tâche:`, entities);
        
        // Chercher la tâche à supprimer
        let task = null;
        
        // Recherche par nom/description
        if (entities.name) {
            task = await RoadtripTask.findOne({
                roadtripId,
                userId,
                $or: [
                    { name: { $regex: entities.name, $options: 'i' } },
                    { description: { $regex: entities.name, $options: 'i' } }
                ]
            });
        }
        
        if (!task) {
            throw new Error('Tâche non trouvée');
        }
        
        // Supprimer la tâche
        await RoadtripTask.findByIdAndDelete(task._id);
        
        return {
            success: true,
            action: 'delete_task',
            data: {
                name: task.name,
                _id: task._id
            },
            message: `Tâche "${task.name}" supprimée avec succès`
        };
    }
    
    /**
     * Modifier une étape
     */
    async modifyStep(roadtripId, entities, userId) {
        console.log(`📝 Modification d'une étape:`, entities);
        
        // Chercher l'étape à modifier
        let step = null;
        
        // Recherche par nom/lieu
        if (entities.location) {
            step = await Step.findOne({
                roadtripId,
                userId,
                $or: [
                    { name: { $regex: entities.location, $options: 'i' } },
                    { address: { $regex: entities.location, $options: 'i' } }
                ]
            });
        }
        
        if (!step) {
            throw new Error('Étape non trouvée');
        }
        
        // Préparer les modifications
        const updates = {};
        
        // Modifier le nom si spécifié
        if (entities.newName) {
            updates.name = entities.newName;
        }
        
        // Modifier l'adresse si spécifiée
        if (entities.newAddress) {
            updates.address = entities.newAddress;
            
            // Obtenir les nouvelles coordonnées
            try {
                const coordinates = await getCoordinates(entities.newAddress);
                updates.latitude = coordinates.lat;
                updates.longitude = coordinates.lng;
            } catch (error) {
                console.warn('⚠️ Impossible d\'obtenir les coordonnées:', error.message);
            }
        }
        
        // Modifier les dates si spécifiées
        if (entities.arrivalDateTime) {
            updates.arrivalDateTime = entities.arrivalDateTime;
        }
        
        if (entities.departureDateTime) {
            updates.departureDateTime = entities.departureDateTime;
        }
        
        // Ajouter des notes si spécifiées
        if (entities.notes) {
            updates.notes = entities.notes;
        }
        
        // Mettre à jour l'étape
        const updatedStep = await Step.findByIdAndUpdate(
            step._id,
            updates,
            { new: true }
        );
        
        return {
            success: true,
            action: 'modify_step',
            data: updatedStep,
            message: `Étape "${updatedStep.name}" modifiée avec succès`
        };
    }
    
    /**
     * Modifier les dates du roadtrip
     */
    async modifyDates(roadtripId, entities, userId) {
        console.log(`📅 Modification des dates:`, entities);
        
        // Récupérer le roadtrip
        const roadtrip = await Roadtrip.findOne({
            _id: roadtripId,
            userId
        });
        
        if (!roadtrip) {
            throw new Error('Roadtrip non trouvé');
        }
        
        // Préparer les modifications
        const updates = {};
        
        if (entities.startDate) {
            updates.startDate = entities.startDate;
        }
        
        if (entities.endDate) {
            updates.endDate = entities.endDate;
        }
        
        // Mettre à jour le roadtrip
        const updatedRoadtrip = await Roadtrip.findByIdAndUpdate(
            roadtripId,
            updates,
            { new: true }
        );
        
        // Optionnel : ajuster les dates des étapes en conséquence
        if (entities.adjustSteps) {
            await this.adjustStepDates(roadtripId, entities.startDate, entities.endDate);
        }
        
        return {
            success: true,
            action: 'modify_dates',
            data: updatedRoadtrip,
            message: `Dates du roadtrip modifiées avec succès`
        };
    }
    
    /**
     * Ajuster les dates des étapes selon les nouvelles dates du roadtrip
     */
    async adjustStepDates(roadtripId, newStartDate, newEndDate) {
        const steps = await Step.find({ roadtripId }).sort({ order: 1 });
        
        if (steps.length === 0) return;
        
        const totalDuration = new Date(newEndDate) - new Date(newStartDate);
        const stepDuration = totalDuration / steps.length;
        
        for (let i = 0; i < steps.length; i++) {
            const stepStart = new Date(new Date(newStartDate).getTime() + i * stepDuration);
            const stepEnd = new Date(stepStart.getTime() + stepDuration);
            
            await Step.findByIdAndUpdate(steps[i]._id, {
                arrivalDateTime: stepStart,
                departureDateTime: stepEnd
            });
        }
    }
}

// Instance singleton
export const actionExecutor = new ActionExecutor();
export default actionExecutor;
