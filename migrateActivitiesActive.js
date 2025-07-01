// Script de migration pour ajouter le champ active: true aux activités existantes
// Usage: node migrateActivitiesActive.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Activity from './server/models/Activity.js';

// Charger les variables d'environnement
dotenv.config();

// Connexion à MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/monpetitroadtrip');
        console.log('✅ Connexion MongoDB réussie');
    } catch (error) {
        console.error('❌ Erreur connexion MongoDB:', error);
        process.exit(1);
    }
};

const migrateActivities = async () => {
    console.log('🔄 Migration des activités pour ajouter le champ active: true');
    console.log('==============================================================');
    
    try {
        // Trouver toutes les activités qui n'ont pas le champ active défini
        const activitiesWithoutActive = await Activity.find({ 
            $or: [
                { active: { $exists: false } },
                { active: null },
                { active: undefined }
            ]
        });
        
        console.log(`📊 Activités sans champ 'active' trouvées: ${activitiesWithoutActive.length}`);
        
        if (activitiesWithoutActive.length === 0) {
            console.log('✅ Toutes les activités ont déjà le champ active défini.');
            return;
        }
        
        // Afficher quelques exemples
        console.log('\n📝 Exemples d\'activités à migrer:');
        activitiesWithoutActive.slice(0, 5).forEach((activity, index) => {
            console.log(`   ${index + 1}. ${activity.name} (stepId: ${activity.stepId})`);
            console.log(`      - active: ${activity.active}`);
        });
        
        // Demander confirmation
        console.log(`\n⚠️  Cette opération va mettre à jour ${activitiesWithoutActive.length} activités.`);
        console.log('🚀 Début de la migration...');
        
        // Effectuer la mise à jour en lot
        const updateResult = await Activity.updateMany(
            { 
                $or: [
                    { active: { $exists: false } },
                    { active: null },
                    { active: undefined }
                ]
            },
            { 
                $set: { active: true } 
            }
        );
        
        console.log(`✅ Migration terminée avec succès!`);
        console.log(`   - Documents correspondants: ${updateResult.matchedCount}`);
        console.log(`   - Documents modifiés: ${updateResult.modifiedCount}`);
        
        // Vérification
        const remainingActivitiesWithoutActive = await Activity.countDocuments({ 
            $or: [
                { active: { $exists: false } },
                { active: null },
                { active: undefined }
            ]
        });
        
        console.log(`\n🔍 Vérification:`);
        console.log(`   - Activités sans champ 'active' restantes: ${remainingActivitiesWithoutActive}`);
        
        const totalActiveTrue = await Activity.countDocuments({ active: true });
        const totalActiveFalse = await Activity.countDocuments({ active: false });
        const totalActivities = await Activity.countDocuments({});
        
        console.log(`   - Total activités: ${totalActivities}`);
        console.log(`   - Activités actives (true): ${totalActiveTrue}`);
        console.log(`   - Activités inactives (false): ${totalActiveFalse}`);
        
    } catch (error) {
        console.error('❌ Erreur lors de la migration:', error);
    }
};

const main = async () => {
    try {
        await connectDB();
        await migrateActivities();
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Connexion fermée');
    }
};

main();
