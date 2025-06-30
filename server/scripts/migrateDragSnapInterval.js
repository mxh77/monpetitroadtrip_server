import mongoose from 'mongoose';
import UserSetting from '../models/UserSetting.js';
import { connectDB } from '../config/db.js';

/**
 * Script de migration pour ajouter le paramètre dragSnapInterval aux utilisateurs existants
 * Usage: node server/scripts/migrateDragSnapInterval.js
 */

const migrateDragSnapInterval = async () => {
    try {
        console.log('🚀 Début de la migration dragSnapInterval...');
        
        // Se connecter à la base de données
        await connectDB();
        
        // Rechercher tous les paramètres utilisateur sans dragSnapInterval
        const settingsWithoutDragSnap = await UserSetting.find({
            dragSnapInterval: { $exists: false }
        });
        
        console.log(`📊 ${settingsWithoutDragSnap.length} utilisateur(s) trouvé(s) sans dragSnapInterval`);
        
        if (settingsWithoutDragSnap.length === 0) {
            console.log('✅ Aucune migration nécessaire, tous les utilisateurs ont déjà le paramètre dragSnapInterval');
            return;
        }
        
        // Mettre à jour tous les paramètres sans dragSnapInterval
        const result = await UserSetting.updateMany(
            { dragSnapInterval: { $exists: false } },
            { $set: { dragSnapInterval: 15 } } // Valeur par défaut
        );
        
        console.log(`✅ Migration terminée avec succès:`);
        console.log(`   - ${result.modifiedCount} utilisateur(s) mis à jour`);
        console.log(`   - Valeur par défaut appliquée: 15 minutes`);
        
        // Vérification
        const totalSettings = await UserSetting.countDocuments();
        const settingsWithDragSnap = await UserSetting.countDocuments({
            dragSnapInterval: { $exists: true }
        });
        
        console.log(`🔍 Vérification:`);
        console.log(`   - Total des paramètres utilisateur: ${totalSettings}`);
        console.log(`   - Avec dragSnapInterval: ${settingsWithDragSnap}`);
        
        if (totalSettings === settingsWithDragSnap) {
            console.log('✅ Migration vérifiée avec succès!');
        } else {
            console.log('⚠️ Attention: Certains utilisateurs n\'ont toujours pas le paramètre');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de la migration:', error);
        process.exit(1);
    } finally {
        // Fermer la connexion
        await mongoose.connection.close();
        console.log('🔌 Connexion fermée');
        process.exit(0);
    }
};

// Exécuter la migration
migrateDragSnapInterval();
