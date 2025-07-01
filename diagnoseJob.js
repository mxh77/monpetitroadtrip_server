/**
 * Script pour diagnostiquer un job spécifique de génération de récit
 */

import mongoose from 'mongoose';
import StepStoryJob from './server/models/StepStoryJob.js';
import Step from './server/models/Step.js';
import Accommodation from './server/models/Accommodation.js';
import Activity from './server/models/Activity.js';
import UserSetting from './server/models/UserSetting.js';

// Configuration de la base de données
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/monpetitroadtrip';
        await mongoose.connect(mongoURI);
        console.log('✅ Connexion à MongoDB établie');
    } catch (error) {
        console.error('❌ Erreur de connexion à MongoDB:', error);
        process.exit(1);
    }
};

/**
 * Diagnostique un job spécifique
 */
const diagnoseSpecificJob = async (jobId) => {
    console.log(`\n🔍 Diagnostic du job ${jobId}...`);
    
    try {
        // Récupérer le job
        const job = await StepStoryJob.findById(jobId);
        
        if (!job) {
            console.log('❌ Job non trouvé');
            return;
        }
        
        console.log('\n📋 Informations du job:');
        console.log(`   ID: ${job._id}`);
        console.log(`   Step ID: ${job.stepId}`);
        console.log(`   Statut: ${job.status}`);
        console.log(`   Créé: ${job.createdAt.toLocaleString()}`);
        console.log(`   Mis à jour: ${job.updatedAt.toLocaleString()}`);
        console.log(`   Erreur: ${job.error || 'Aucune'}`);
        
        const timeSinceCreation = Math.round((Date.now() - job.createdAt.getTime()) / (60 * 1000));
        const timeSinceUpdate = Math.round((Date.now() - job.updatedAt.getTime()) / (60 * 1000));
        console.log(`   Durée depuis création: ${timeSinceCreation} min`);
        console.log(`   Durée depuis MAJ: ${timeSinceUpdate} min`);
        
        // Récupérer le step associé
        const step = await Step.findById(job.stepId);
        
        if (!step) {
            console.log('\n❌ Step associé non trouvé');
            return;
        }
        
        console.log('\n📍 Informations du step:');
        console.log(`   Nom: ${step.name}`);
        console.log(`   Type: ${step.type}`);
        console.log(`   Adresse: ${step.address}`);
        console.log(`   User ID: ${step.userId}`);
        console.log(`   Récit existant: ${step.story ? 'Oui' : 'Non'} (${step.story?.length || 0} caractères)`);
        
        // Vérifier les accommodations
        const accommodations = await Accommodation.find({ 
            stepId: new mongoose.Types.ObjectId(job.stepId), 
            active: true 
        }).populate('photos').populate('thumbnail');
        
        console.log(`\n🏨 Hébergements: ${accommodations.length}`);
        accommodations.forEach((acc, index) => {
            const photosCount = acc.photos ? acc.photos.length : 0;
            const hasThumbnail = !!acc.thumbnail;
            console.log(`   ${index + 1}. ${acc.name} - ${photosCount} photo(s), thumbnail: ${hasThumbnail}`);
        });
        
        // Vérifier les activités
        const allActivities = await Activity.find({ 
            stepId: new mongoose.Types.ObjectId(job.stepId) 
        }).populate('photos').populate('thumbnail');
        
        const activities = allActivities.filter(act => {
            if (act.active === true || act.active === 'true' || act.active === 1) return true;
            if (act.active === undefined || act.active === null) return true;
            return false;
        });
        
        console.log(`\n🎯 Activités: ${activities.length} actives sur ${allActivities.length} totales`);
        activities.forEach((act, index) => {
            const photosCount = act.photos ? act.photos.length : 0;
            const hasThumbnail = !!act.thumbnail;
            console.log(`   ${index + 1}. ${act.name} (${act.type}) - ${photosCount} photo(s), thumbnail: ${hasThumbnail}`);
        });
        
        // Vérifier les paramètres utilisateur
        const userSettings = await UserSetting.findOne({ userId: step.userId });
        console.log('\n⚙️  Paramètres utilisateur:');
        if (userSettings) {
            console.log(`   Photos activées: ${userSettings.enablePhotosInStories !== false}`);
            console.log(`   System prompt: ${userSettings.systemPrompt ? 'Personnalisé' : 'Par défaut'}`);
        } else {
            console.log('   Aucun paramètre trouvé (utilisation des valeurs par défaut)');
        }
        
        // Calculer le nombre total de photos disponibles
        let totalPhotos = 0;
        accommodations.forEach(acc => {
            if (acc.photos) totalPhotos += acc.photos.length;
            if (acc.thumbnail) totalPhotos += 1;
        });
        activities.forEach(act => {
            if (act.photos) totalPhotos += act.photos.length;
            if (act.thumbnail) totalPhotos += 1;
        });
        
        console.log(`\n📸 Photos disponibles: ${totalPhotos} au total`);
        
        // Analyser le problème potentiel
        console.log('\n🔧 Analyse du problème:');
        
        if (job.status === 'processing' && timeSinceUpdate > 5) {
            console.log('   ⚠️  Job bloqué en processing depuis plus de 5 minutes');
            console.log('   💡 Solution: Marquer le job comme erreur et le relancer');
        }
        
        if (totalPhotos > 0 && userSettings?.enablePhotosInStories !== false) {
            console.log('   ℹ️  Le job devrait utiliser GPT-4 Vision avec photos');
        } else if (userSettings?.enablePhotosInStories === false) {
            console.log('   ℹ️  Le job devrait utiliser GPT-4o-mini (photos désactivées)');
        } else {
            console.log('   ℹ️  Le job devrait utiliser GPT-4o-mini (pas de photos)');
        }
        
        if (accommodations.length === 0 && activities.length === 0) {
            console.log('   ⚠️  Aucun hébergement ni activité trouvé pour ce step');
        }
        
        // Recommandations
        console.log('\n💡 Recommandations:');
        
        if (job.status === 'processing' && timeSinceUpdate > 5) {
            console.log('   1. Marquer le job comme erreur: node fixStoryJobs.js repair');
            console.log('   2. Relancer le job: node fixStoryJobs.js retry ' + jobId);
        }
        
        if (job.status === 'error') {
            console.log('   1. Vérifier les logs d\'erreur OpenAI');
            console.log('   2. Relancer le job: node fixStoryJobs.js retry ' + jobId);
        }
        
        if (totalPhotos === 0 && userSettings?.enablePhotosInStories !== false) {
            console.log('   1. Ajouter des photos aux hébergements/activités');
            console.log('   2. Ou désactiver les photos dans les paramètres utilisateur');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors du diagnostic:', error);
    }
};

/**
 * Fonction principale
 */
const main = async () => {
    const jobId = process.argv[2];
    
    if (!jobId) {
        console.log('❌ Job ID requis');
        console.log('Usage: node diagnoseJob.js <jobId>');
        console.log('Exemple: node diagnoseJob.js 64a1b2c3d4e5f6789');
        return;
    }
    
    console.log('🔍 Diagnostic détaillé du job de génération de récit');
    console.log('=' .repeat(60));
    
    await connectDB();
    await diagnoseSpecificJob(jobId);
    await mongoose.disconnect();
    
    console.log('\n👋 Diagnostic terminé');
};

// Gestion des erreurs non capturées
process.on('unhandledRejection', (err) => {
    console.error('❌ Erreur non gérée:', err);
    process.exit(1);
});

// Lancer le script
main().catch(console.error);
