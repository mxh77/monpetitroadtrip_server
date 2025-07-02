// Script pour corriger les problèmes de calcul des dates dans les steps
// Usage: node fixStepDatesCalculation.js

import mongoose from 'mongoose';
import Accommodation from './server/models/Accommodation.js';
import Activity from './server/models/Activity.js';
import Step from './server/models/Step.js';
import { updateStepDates } from './server/utils/travelTimeUtils.js';

// Configuration de la base de données
const MONGODB_URI = 'mongodb://localhost:27017/monpetitroadtrip';

// Fonction pour calculer le nombre de nuits
function calculateNights(arrivalDateTime, departureDateTime) {
    if (!arrivalDateTime || !departureDateTime) return 0;
    
    const arrival = new Date(arrivalDateTime);
    const departure = new Date(departureDateTime);
    
    // Calculer la différence en jours
    const diffTime = departure.getTime() - arrival.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
}

// Fonction pour analyser si un gap temporel est normal ou problématique
function analyzeGap(gapMinutes, fromType, toType) {
    const gapHours = Math.round(gapMinutes / 60 * 10) / 10;
    
    // Définir les seuils selon le type de transition
    let normalThreshold, warningThreshold;
    
    if (fromType === 'activity' && toType === 'accommodation') {
        normalThreshold = 360; // 6h pour temps de trajet + check-in
        warningThreshold = 720; // 12h
    } else if (fromType === 'activity' && toType === 'activity') {
        normalThreshold = 60; // 1h entre activités
        warningThreshold = 180; // 3h
    } else if (fromType === 'accommodation' && toType === 'activity') {
        normalThreshold = 180; // 3h pour check-out + déplacement
        warningThreshold = 360; // 6h
    } else {
        normalThreshold = 120; // 2h par défaut
        warningThreshold = 360; // 6h par défaut
    }
    
    if (gapMinutes < 0) {
        return {
            type: 'error',
            message: `❌ Chevauchement de ${Math.round(Math.abs(gapMinutes))} minutes`,
            severity: 'high'
        };
    } else if (gapMinutes <= normalThreshold) {
        return {
            type: 'info',
            message: `ℹ️  Gap normal de ${gapHours}h (${fromType} → ${toType})`,
            severity: 'none'
        };
    } else if (gapMinutes <= warningThreshold) {
        return {
            type: 'warning',
            message: `⚠️  Gap important de ${gapHours}h (vérifier si normal)`,
            severity: 'medium'
        };
    } else {
        return {
            type: 'error',
            message: `❌ Gap très important de ${gapHours}h (probablement problématique)`,
            severity: 'high'
        };
    }
}

// Fonction pour corriger les accommodations
async function fixAccommodationNights() {
    console.log('🔧 Correction du calcul des nuits pour les accommodations...');
    
    const accommodations = await Accommodation.find({});
    let fixed = 0;
    
    for (const accommodation of accommodations) {
        const calculatedNights = calculateNights(accommodation.arrivalDateTime, accommodation.departureDateTime);
        
        if (accommodation.nights !== calculatedNights) {
            console.log(`📍 Accommodation "${accommodation.name}"`);
            console.log(`   Arrivée: ${accommodation.arrivalDateTime}`);
            console.log(`   Départ: ${accommodation.departureDateTime}`);
            console.log(`   Nuits actuelles: ${accommodation.nights} → Nuits calculées: ${calculatedNights}`);
            
            accommodation.nights = calculatedNights;
            await accommodation.save();
            fixed++;
        }
    }
    
    console.log(`✅ ${fixed} accommodations corrigées\n`);
}

// Fonction pour synchroniser les dates des steps
async function synchronizeStepDates() {
    console.log('🔧 Synchronisation des dates des steps...');
    
    const steps = await Step.find({}).populate('accommodations').populate('activities');
    let synchronized = 0;
    
    for (const step of steps) {
        console.log(`\n📋 Step: "${step.name}" (${step._id})`);
        console.log(`   Dates actuelles: ${step.arrivalDateTime} → ${step.departureDateTime}`);
        
        try {
            await updateStepDates(step._id);
            
            // Recharger le step pour voir les changements
            const updatedStep = await Step.findById(step._id);
            
            const hasChanged = 
                step.arrivalDateTime?.getTime() !== updatedStep.arrivalDateTime?.getTime() ||
                step.departureDateTime?.getTime() !== updatedStep.departureDateTime?.getTime();
            
            if (hasChanged) {
                console.log(`   ✅ Nouvelles dates: ${updatedStep.arrivalDateTime} → ${updatedStep.departureDateTime}`);
                synchronized++;
            } else {
                console.log(`   ℹ️  Aucun changement nécessaire`);
            }
        } catch (error) {
            console.log(`   ❌ Erreur: ${error.message}`);
        }
    }
    
    console.log(`\n✅ ${synchronized} steps synchronisés\n`);
}

// Fonction pour analyser les gaps entre activités et accommodations
async function analyzeStepGaps() {
    console.log('🔍 Analyse des gaps dans les steps...');
    
    const steps = await Step.find({})
        .populate({
            path: 'accommodations',
            match: { active: true }
        })
        .populate({
            path: 'activities', 
            match: { active: true }
        });
    
    for (const step of steps) {
        if (step.accommodations.length === 0 && step.activities.length === 0) continue;
        
        console.log(`\n📋 Step: "${step.name}"`);
        console.log(`   Step dates: ${step.arrivalDateTime} → ${step.departureDateTime}`);
        
        // Analyser les activités
        if (step.activities.length > 0) {
            const sortedActivities = step.activities
                .filter(act => act.startDateTime && act.endDateTime)
                .sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));
            
            console.log(`   🎯 Activités (${sortedActivities.length}):`);
            sortedActivities.forEach((act, index) => {
                console.log(`      ${index + 1}. ${act.name}: ${act.startDateTime} → ${act.endDateTime}`);
            });
            
            // Vérifier les gaps entre activités
            for (let i = 0; i < sortedActivities.length - 1; i++) {
                const current = sortedActivities[i];
                const next = sortedActivities[i + 1];
                
                const currentEnd = new Date(current.endDateTime);
                const nextStart = new Date(next.startDateTime);
                const gapMinutes = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60);
                
                const gapAnalysis = analyzeGap(gapMinutes, 'activity', 'activity');
                console.log(`      ${gapAnalysis.message}`);
            }
        }
        
        // Analyser les accommodations
        if (step.accommodations.length > 0) {
            const sortedAccommodations = step.accommodations
                .filter(acc => acc.arrivalDateTime && acc.departureDateTime)
                .sort((a, b) => new Date(a.arrivalDateTime) - new Date(b.arrivalDateTime));
            
            console.log(`   🏨 Accommodations (${sortedAccommodations.length}):`);
            sortedAccommodations.forEach((acc, index) => {
                const nights = calculateNights(acc.arrivalDateTime, acc.departureDateTime);
                console.log(`      ${index + 1}. ${acc.name}: ${acc.arrivalDateTime} → ${acc.departureDateTime} (${nights} nuits, DB: ${acc.nights})`);
                
                if (nights !== acc.nights) {
                    console.log(`         ⚠️  Nuits incorrectes dans la DB: ${acc.nights} vs calculé: ${nights}`);
                }
            });
        }
        
        // Analyser le gap entre la dernière activité et la première accommodation
        if (step.activities.length > 0 && step.accommodations.length > 0) {
            const lastActivity = step.activities
                .filter(act => act.endDateTime)
                .sort((a, b) => new Date(b.endDateTime) - new Date(a.endDateTime))[0];
            
            const firstAccommodation = step.accommodations
                .filter(acc => acc.arrivalDateTime)
                .sort((a, b) => new Date(a.arrivalDateTime) - new Date(b.arrivalDateTime))[0];
            
            if (lastActivity && firstAccommodation) {
                const activityEnd = new Date(lastActivity.endDateTime);
                const accommodationStart = new Date(firstAccommodation.arrivalDateTime);
                const gapMinutes = (accommodationStart.getTime() - activityEnd.getTime()) / (1000 * 60);
                
                const gapAnalysis = analyzeGap(gapMinutes, 'activity', 'accommodation');
                console.log(`   ${gapAnalysis.message}`);
            }
        }
    }
}

// Fonction principale
async function main() {
    try {
        console.log('🚀 Démarrage de la correction des dates des steps\n');
        
        // Connexion à la base de données
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connexion à MongoDB établie\n');
        
        // 1. Analyser les problèmes actuels
        await analyzeStepGaps();
        
        // 2. Corriger le calcul des nuits
        await fixAccommodationNights();
        
        // 3. Synchroniser les dates des steps
        await synchronizeStepDates();
        
        // 4. Analyser les résultats après correction
        console.log('📊 Analyse après correction:');
        await analyzeStepGaps();
        
        console.log('✅ Correction terminée avec succès!');
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Connexion MongoDB fermée');
    }
}

// Ajout d'une fonction utilitaire pour corriger un step spécifique
async function fixSpecificStep(stepId) {
    try {
        await mongoose.connect(MONGODB_URI);
        
        console.log(`🔧 Correction du step spécifique: ${stepId}`);
        
        const step = await Step.findById(stepId);
        if (!step) {
            console.log('❌ Step non trouvé');
            return;
        }
        
        console.log(`📋 Step: "${step.name}"`);
        console.log(`   Dates avant: ${step.arrivalDateTime} → ${step.departureDateTime}`);
        
        // Corriger les accommodations
        const accommodations = await Accommodation.find({ stepId });
        for (const acc of accommodations) {
            const calculatedNights = calculateNights(acc.arrivalDateTime, acc.departureDateTime);
            if (acc.nights !== calculatedNights) {
                console.log(`   🏨 ${acc.name}: ${acc.nights} → ${calculatedNights} nuits`);
                acc.nights = calculatedNights;
                await acc.save();
            }
        }
        
        // Synchroniser les dates du step
        await updateStepDates(stepId);
        
        const updatedStep = await Step.findById(stepId);
        console.log(`   Dates après: ${updatedStep.arrivalDateTime} → ${updatedStep.departureDateTime}`);
        
        console.log('✅ Step corrigé avec succès!');
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await mongoose.disconnect();
    }
}

// Si un argument est fourni, corriger seulement ce step
if (process.argv[2]) {
    const stepId = process.argv[2];
    fixSpecificStep(stepId);
} else {
    main();
}
