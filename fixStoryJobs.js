/**
 * Script pour diagnostiquer et réparer les jobs de génération de récit bloqués
 */

import mongoose from 'mongoose';
import StepStoryJob from './server/models/StepStoryJob.js';

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
 * Diagnostique les jobs bloqués
 */
const diagnoseStuckJobs = async () => {
    console.log('\n🔍 Diagnostic des jobs bloqués...');
    
    try {
        // Rechercher tous les jobs processing depuis plus de 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        const stuckJobs = await StepStoryJob.find({
            status: 'processing',
            updatedAt: { $lt: fiveMinutesAgo }
        });

        console.log(`📊 ${stuckJobs.length} job(s) bloqué(s) en statut 'processing' depuis plus de 5 minutes`);
        
        if (stuckJobs.length > 0) {
            console.log('\n📋 Jobs bloqués détectés:');
            stuckJobs.forEach((job, index) => {
                const timeSinceUpdate = Math.round((Date.now() - job.updatedAt.getTime()) / (60 * 1000));
                console.log(`${index + 1}. Job ID: ${job._id}`);
                console.log(`   Step ID: ${job.stepId}`);
                console.log(`   Statut: ${job.status}`);
                console.log(`   Créé: ${job.createdAt.toLocaleString()}`);
                console.log(`   Mis à jour: ${job.updatedAt.toLocaleString()} (il y a ${timeSinceUpdate} min)`);
                console.log(`   Erreur: ${job.error || 'Aucune'}`);
                console.log('---');
            });
        }
        
        // Statistiques générales
        const allJobs = await StepStoryJob.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    avgDuration: {
                        $avg: {
                            $subtract: ['$updatedAt', '$createdAt']
                        }
                    }
                }
            }
        ]);
        
        console.log('\n📈 Statistiques des jobs:');
        allJobs.forEach(stat => {
            const avgDurationMin = stat.avgDuration ? Math.round(stat.avgDuration / (60 * 1000)) : 0;
            console.log(`   ${stat._id}: ${stat.count} job(s) (durée moyenne: ${avgDurationMin} min)`);
        });
        
        return stuckJobs;
        
    } catch (error) {
        console.error('❌ Erreur lors du diagnostic:', error);
        return [];
    }
};

/**
 * Répare les jobs bloqués en les marquant comme erreur
 */
const repairStuckJobs = async (stuckJobs) => {
    if (stuckJobs.length === 0) {
        console.log('\n✅ Aucun job à réparer');
        return;
    }
    
    console.log(`\n🔧 Réparation de ${stuckJobs.length} job(s) bloqué(s)...`);
    
    try {
        const result = await StepStoryJob.updateMany(
            { 
                _id: { $in: stuckJobs.map(job => job._id) }
            },
            { 
                status: 'error',
                error: 'Job bloqué automatiquement réparé - Timeout dépassé',
                updatedAt: new Date()
            }
        );
        
        console.log(`✅ ${result.modifiedCount} job(s) marqué(s) comme erreur`);
        
        // Afficher les jobs réparés
        console.log('\n📋 Jobs réparés:');
        stuckJobs.forEach((job, index) => {
            console.log(`${index + 1}. Job ID: ${job._id} - Step ID: ${job.stepId}`);
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de la réparation:', error);
    }
};

/**
 * Nettoie les anciens jobs (plus de 7 jours)
 */
const cleanOldJobs = async () => {
    console.log('\n🧹 Nettoyage des anciens jobs...');
    
    try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        const oldJobs = await StepStoryJob.find({
            createdAt: { $lt: sevenDaysAgo }
        });
        
        if (oldJobs.length > 0) {
            const result = await StepStoryJob.deleteMany({
                createdAt: { $lt: sevenDaysAgo }
            });
            
            console.log(`✅ ${result.deletedCount} ancien(s) job(s) supprimé(s) (plus de 7 jours)`);
        } else {
            console.log('✅ Aucun ancien job à supprimer');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error);
    }
};

/**
 * Relance un job spécifique
 */
const retryJob = async (jobId) => {
    console.log(`\n🔄 Relance du job ${jobId}...`);
    
    try {
        const job = await StepStoryJob.findById(jobId);
        
        if (!job) {
            console.log('❌ Job non trouvé');
            return;
        }
        
        // Remettre le job en pending pour qu'il puisse être retraité
        job.status = 'pending';
        job.error = null;
        job.updatedAt = new Date();
        await job.save();
        
        console.log('✅ Job remis en pending');
        console.log('⚠️  Note: Vous devez relancer manuellement le traitement ou attendre le prochain cycle');
        
    } catch (error) {
        console.error('❌ Erreur lors de la relance:', error);
    }
};

/**
 * Fonction principale
 */
const main = async () => {
    console.log('🚀 Script de diagnostic et réparation des jobs de récit');
    console.log('=' .repeat(60));
    
    await connectDB();
    
    const command = process.argv[2];
    const jobId = process.argv[3];
    
    switch (command) {
        case 'diagnose':
            await diagnoseStuckJobs();
            break;
            
        case 'repair':
            const stuckJobs = await diagnoseStuckJobs();
            await repairStuckJobs(stuckJobs);
            break;
            
        case 'clean':
            await cleanOldJobs();
            break;
            
        case 'retry':
            if (!jobId) {
                console.log('❌ Job ID requis pour retry');
                console.log('Usage: node fixStoryJobs.js retry <jobId>');
                break;
            }
            await retryJob(jobId);
            break;
            
        case 'all':
            const stuckJobsAll = await diagnoseStuckJobs();
            await repairStuckJobs(stuckJobsAll);
            await cleanOldJobs();
            break;
            
        default:
            console.log('📋 Commandes disponibles:');
            console.log('  diagnose - Diagnostique les jobs bloqués');
            console.log('  repair   - Répare les jobs bloqués');
            console.log('  clean    - Nettoie les anciens jobs');
            console.log('  retry    - Relance un job spécifique');
            console.log('  all      - Exécute diagnose + repair + clean');
            console.log('');
            console.log('📋 Exemples:');
            console.log('  node fixStoryJobs.js diagnose');
            console.log('  node fixStoryJobs.js repair');
            console.log('  node fixStoryJobs.js retry 64a1b2c3d4e5f6789');
            console.log('  node fixStoryJobs.js all');
    }
    
    await mongoose.disconnect();
    console.log('\n👋 Déconnexion de MongoDB');
};

// Gestion des erreurs non capturées
process.on('unhandledRejection', (err) => {
    console.error('❌ Erreur non gérée:', err);
    process.exit(1);
});

// Lancer le script
main().catch(console.error);
