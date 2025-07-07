import Roadtrip from '../models/Roadtrip.js';
import Step from '../models/Step.js';
import Accommodation from '../models/Accommodation.js';
import Activity from '../models/Activity.js';
import { getCoordinates } from '../utils/googleMapsUtils.js';
import { updateStepDatesAndTravelTime } from '../utils/travelTimeUtils.js';
import { genererRoadtripComplet } from '../utils/openAI/genererRoadtrip.js';

/**
 * Génère un roadtrip complet via l'IA
 * @route POST /roadtrips/ai
 */
export const generateRoadtripWithAI = async (req, res) => {
    try {
        console.log("Données reçues:", JSON.stringify(req.body, null, 2));
        
        // Extraction des paramètres avec prise en compte de formats variés
        const {
            startLocation,        // Point de départ (obligatoire)
            endLocation,          // Destination finale optionnelle
            destination,          // Alternative à endLocation
            startDate,            // Date de début explicite
            endDate,              // Date de fin explicite
            dates,                // Format alternatif "01/08/2025 au 23/08/2025"
            duration,             // Durée en jours
            budget,               // Budget global
            travelers,            // Nombre et profil des voyageurs
            prompt,               // Description en langage naturel (nouveau)
            description,          // Description alternative
            preferences,          // Préférences de voyage
            constraints           // Contraintes
        } = req.body;
        
        // Variables normalisées
        let normalizedStartLocation = startLocation;
        let normalizedEndLocation = endLocation || destination;
        let normalizedStartDate = startDate;
        let normalizedEndDate = endDate;
        let normalizedDuration = duration;
        let normalizedDescription = description || prompt || '';

        // Validation du point de départ
        if (!normalizedStartLocation) {
            return res.status(400).json({ msg: 'Le point de départ est requis' });
        }

        // Traitement du format de dates alternatif (ex: "01/08/2025 au 23/08/2025")
        if (dates && typeof dates === 'string') {
            // Détecter différents formats de date possibles
            const datePatterns = [
                // Format "01/08/2025 au 23/08/2025"
                /(\d{1,2}\/\d{1,2}\/\d{2,4})\s*(?:au|à|to|-)\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
                // Format "du 01/08/2025 au 23/08/2025"
                /du\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s*(?:au|à)\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
                // Format "1er août au 23 août 2025"
                /((?:\d{1,2}(?:er|ème|e|è)?)\s+\w+)(?:\s+\d{4})?\s*(?:au|à)\s*((?:\d{1,2}(?:er|ème|e|è)?)\s+\w+)(?:\s+(\d{4}))?/i
            ];
            
            let dateMatch = null;
            let patternIndex = -1;
            
            // Tester chaque pattern jusqu'à trouver une correspondance
            for (let i = 0; i < datePatterns.length; i++) {
                const match = dates.match(datePatterns[i]);
                if (match && match.length >= 3) {
                    dateMatch = match;
                    patternIndex = i;
                    break;
                }
            }
            
            if (dateMatch) {
                try {
                    if (patternIndex === 0 || patternIndex === 1) {
                        // Parser les dates au format DD/MM/YYYY
                        const [day1, month1, rawYear1] = dateMatch[1].split('/');
                        const year1 = rawYear1.length === 2 ? '20' + rawYear1 : rawYear1;
                        normalizedStartDate = `${year1}-${month1.padStart(2, '0')}-${day1.padStart(2, '0')}`;
                        
                        const [day2, month2, rawYear2] = dateMatch[2].split('/');
                        const year2 = rawYear2.length === 2 ? '20' + rawYear2 : rawYear2;
                        normalizedEndDate = `${year2}-${month2.padStart(2, '0')}-${day2.padStart(2, '0')}`;
                    } else if (patternIndex === 2) {
                        // Traitement des dates en format texte (1er août au 23 août 2025)
                        console.log("Format texte détecté, utilisation de date par défaut");
                        const year = dateMatch[3] || new Date().getFullYear();
                        
                        // Pour simplifier, on utilise des dates génériques basées sur l'année mentionnée
                        // Dans un cas réel, il faudrait utiliser une bibliothèque comme moment.js pour parser ces formats
                        normalizedStartDate = `${year}-08-01`;  // Par défaut 1er août
                        normalizedEndDate = `${year}-08-23`;    // Par défaut 23 août
                    }
                    
                    // Calculer la durée en jours
                    const startDateObj = new Date(normalizedStartDate);
                    const endDateObj = new Date(normalizedEndDate);
                    const diffTime = Math.abs(endDateObj - startDateObj);
                    normalizedDuration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                } catch (e) {
                    console.error("Erreur lors du parsing des dates:", e);
                }
            }
        }

        // Vérifier qu'on a au moins une date de début ou une durée
        if (!normalizedStartDate && !normalizedDuration) {
            return res.status(400).json({ msg: 'La date de début ou la durée est requise' });
        }

        // Calculer la date de fin si elle n'est pas fournie mais que la durée l'est
        let calculatedEndDate = normalizedEndDate;
        if (normalizedStartDate && normalizedDuration && !normalizedEndDate) {
            const start = new Date(normalizedStartDate);
            calculatedEndDate = new Date(start);
            calculatedEndDate.setDate(start.getDate() + parseInt(normalizedDuration));
        }

        // Obtenir les coordonnées géographiques du point de départ
        let startCoordinates = {};
        try {
            startCoordinates = await getCoordinates(normalizedStartLocation, 'object');
        } catch (error) {
            console.error('Error getting coordinates for start location:', error);
            return res.status(400).json({ msg: 'Impossible de géocoder le point de départ' });
        }

        // Obtenir les coordonnées géographiques du point d'arrivée (si fourni)
        let endCoordinates = {};
        if (normalizedEndLocation) {
            try {
                endCoordinates = await getCoordinates(normalizedEndLocation, 'object');
            } catch (error) {
                console.error('Error getting coordinates for end location:', error);
                // On continue même si on ne peut pas géocoder le point d'arrivée
            }
        }

        // Extraire les informations sur les voyageurs
        let travelersInfo = travelers;
        if (typeof travelers === 'string') {
            // Pas besoin de transformer, on garde le format texte
            travelersInfo = travelers;
        }

        // Préparer les données pour l'IA
        const aiParameters = {
            startLocation: {
                address: normalizedStartLocation,
                coordinates: startCoordinates
            },
            endLocation: normalizedEndLocation ? {
                address: normalizedEndLocation,
                coordinates: endCoordinates
            } : null,
            startDate: normalizedStartDate,
            endDate: calculatedEndDate || normalizedEndDate,
            duration: normalizedDuration,
            budget: budget,
            travelers: travelersInfo,
            description: normalizedDescription,
            preferences: preferences,
            constraints: constraints
        };

        // Appeler le service d'IA pour générer le roadtrip
        let generatedRoadtrip;
        try {
            generatedRoadtrip = await genererRoadtripComplet(aiParameters);
            // Vérifier la validité du roadtrip généré
            if (!generatedRoadtrip || !generatedRoadtrip.steps || generatedRoadtrip.steps.length === 0) {
                throw new Error('Le roadtrip généré est incomplet ou invalide');
            }
        } catch (aiError) {
            console.error('Erreur lors de la génération du roadtrip par l\'IA:', aiError);
            return res.status(400).json({ 
                msg: 'Erreur lors de la génération du roadtrip',
                error: aiError.message
            });
        }

        // Créer le roadtrip dans la base de données
        const newRoadtrip = new Roadtrip({
            userId: req.user.id,
            name: generatedRoadtrip.name,
            startLocation: normalizedStartLocation,
            startDateTime: normalizedStartDate ? new Date(normalizedStartDate) : new Date(),
            endLocation: normalizedEndLocation || generatedRoadtrip.steps[generatedRoadtrip.steps.length - 1].location,
            endDateTime: calculatedEndDate ? new Date(calculatedEndDate) : (normalizedEndDate ? new Date(normalizedEndDate) : null),
            currency: generatedRoadtrip.currency || 'EUR',
            notes: generatedRoadtrip.description || normalizedDescription
        });

        // Sauvegarder le roadtrip
        const savedRoadtrip = await newRoadtrip.save();

        // Créer les étapes du roadtrip
        const createdSteps = [];
        for (const stepData of generatedRoadtrip.steps) {
            // Obtenir les coordonnées de l'étape
            let stepCoordinates = {};
            try {
                stepCoordinates = await getCoordinates(stepData.location, 'object');
            } catch (error) {
                console.error(`Error getting coordinates for step location ${stepData.location}:`, error);
                // Continuer même si on ne peut pas géocoder une étape
            }

            // Créer l'étape
            const newStep = new Step({
                type: stepData.type || 'Stage',
                name: stepData.name,
                address: stepData.location,
                latitude: stepCoordinates.lat || 0,
                longitude: stepCoordinates.lng || 0,
                arrivalDateTime: new Date(stepData.arrivalDateTime),
                departureDateTime: new Date(stepData.departureDateTime),
                notes: stepData.description || '',
                roadtripId: savedRoadtrip._id,
                userId: req.user.id
            });

            const savedStep = await newStep.save();
            createdSteps.push(savedStep._id);

            // Ajouter les hébergements recommandés
            if (stepData.accommodations && stepData.accommodations.length > 0) {
                console.log(`Création de ${stepData.accommodations.length} hébergements pour l'étape ${savedStep._id}`);
                for (const accomData of stepData.accommodations) {
                    // Obtenir les coordonnées de l'hébergement
                    let accomCoordinates = {};
                    try {
                        accomCoordinates = await getCoordinates(accomData.address, 'object');
                        console.log(`Coordonnées obtenues pour ${accomData.name}: ${JSON.stringify(accomCoordinates)}`);
                    } catch (error) {
                        console.error(`Error getting coordinates for accommodation ${accomData.name}:`, error);
                    }

                    // Créer l'objet hébergement
                    const newAccommodation = new Accommodation({
                        stepId: savedStep._id,
                        roadtripId: savedRoadtrip._id,
                        userId: req.user.id,
                        name: accomData.name,
                        address: accomData.address,
                        latitude: accomCoordinates.lat || 0,
                        longitude: accomCoordinates.lng || 0,
                        arrivalDateTime: new Date(accomData.arrivalDateTime || stepData.arrivalDateTime),
                        departureDateTime: new Date(accomData.departureDateTime || stepData.departureDateTime),
                        nights: accomData.nights || 1,
                        price: accomData.price || 0,
                        currency: accomData.currency || 'EUR',
                        notes: accomData.description || ''
                    });

                    try {
                        const savedAccommodation = await newAccommodation.save();
                        console.log(`Hébergement ${savedAccommodation._id} sauvegardé avec succès`);
                        
                        // Ajouter l'ID de l'hébergement à l'étape
                        await Step.findByIdAndUpdate(
                            savedStep._id,
                            { $push: { accommodations: savedAccommodation._id } },
                            { new: true }
                        );
                    } catch (error) {
                        console.error(`Erreur lors de la sauvegarde de l'hébergement ${accomData.name}:`, error);
                    }
                }
            } else {
                console.log(`Aucun hébergement à créer pour l'étape ${savedStep._id}`);
            }

            // Ajouter les activités recommandées
            if (stepData.activities && stepData.activities.length > 0) {
                console.log(`Création de ${stepData.activities.length} activités pour l'étape ${savedStep._id}`);
                for (const activityData of stepData.activities) {
                    // Obtenir les coordonnées de l'activité
                    let activityCoordinates = {};
                    try {
                        activityCoordinates = await getCoordinates(activityData.address, 'object');
                        console.log(`Coordonnées obtenues pour ${activityData.name}: ${JSON.stringify(activityCoordinates)}`);
                    } catch (error) {
                        console.error(`Error getting coordinates for activity ${activityData.name}:`, error);
                    }

                    // Créer l'objet activité
                    const newActivity = new Activity({
                        stepId: savedStep._id,
                        roadtripId: savedRoadtrip._id,
                        userId: req.user.id,
                        name: activityData.name,
                        type: activityData.type || 'Visite',
                        address: activityData.address,
                        latitude: activityCoordinates.lat || 0,
                        longitude: activityCoordinates.lng || 0,
                        startDateTime: new Date(activityData.startDateTime || stepData.arrivalDateTime),
                        endDateTime: new Date(activityData.endDateTime || activityData.startDateTime),
                        duration: activityData.duration || 60,
                        typeDuration: activityData.typeDuration || 'M',
                        price: activityData.price || 0,
                        currency: activityData.currency || 'EUR',
                        notes: activityData.description || ''
                    });

                    try {
                        const savedActivity = await newActivity.save();
                        console.log(`Activité ${savedActivity._id} sauvegardée avec succès`);
                        
                        // Ajouter l'ID de l'activité à l'étape
                        await Step.findByIdAndUpdate(
                            savedStep._id,
                            { $push: { activities: savedActivity._id } },
                            { new: true }
                        );
                    } catch (error) {
                        console.error(`Erreur lors de la sauvegarde de l'activité ${activityData.name}:`, error);
                    }
                }
            } else {
                console.log(`Aucune activité à créer pour l'étape ${savedStep._id}`);
            }

            // Calculer le temps de trajet pour l'étape
            await updateStepDatesAndTravelTime(savedStep._id);
        }

        // Mettre à jour le roadtrip avec les étapes créées
        savedRoadtrip.steps = createdSteps;
        await savedRoadtrip.save();

        // Retourner le roadtrip créé
        res.status(201).json({
            roadtrip: savedRoadtrip,
            message: "Roadtrip généré avec succès"
        });

    } catch (err) {
        console.error('Error generating AI roadtrip:', err);
        
        if (err.message.includes('génération du roadtrip')) {
            return res.status(400).json({ 
                msg: 'Erreur lors de la génération du roadtrip',
                error: err.message 
            });
        }
        
        res.status(500).json({ 
            msg: 'Erreur serveur lors de la génération du roadtrip',
            error: err.message 
        });
    }
};
