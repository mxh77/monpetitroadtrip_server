/**
 * Script simple pour réparer manuellement un job bloqué
 * Usage direct dans MongoDB ou via l'API
 */

console.log(`
🔧 GUIDE DE RÉPARATION DU JOB BLOQUÉ
==========================================

Si vous avez un job qui reste au statut "processing", voici comment le réparer :

1️⃣ VIA MONGODB COMPASS OU SHELL :
----------------------------------
// Trouver les jobs bloqués
db.stepstoryjobs.find({ status: "processing" })

// Marquer un job spécifique comme erreur
db.stepstoryjobs.updateOne(
  { _id: ObjectId("VOTRE_JOB_ID") },
  { 
    $set: { 
      status: "error", 
      error: "Job bloqué - réparé manuellement",
      updatedAt: new Date()
    }
  }
)

// Supprimer un job bloqué pour le relancer
db.stepstoryjobs.deleteOne({ _id: ObjectId("VOTRE_JOB_ID") })

2️⃣ VIA L'API REST :
-------------------
// Vérifier le statut d'un job
GET /api/steps/:stepId/story/status/:jobId

// Relancer la génération de récit asynchrone
POST /api/steps/:stepId/story/async

3️⃣ CAUSES POSSIBLES DU BLOCAGE :
---------------------------------
✅ Correction appliquée : Population des photos manquante dans le job async
❌ Erreur OpenAI API (quota, timeout, etc.)
❌ Problème de connexion réseau
❌ Erreur dans collectStepPhotos()
❌ Problème de mémoire/performance

4️⃣ PRÉVENTION :
----------------
- Ajouter un timeout sur les jobs (recommandé: 10 minutes)
- Implémenter un système de retry automatique
- Monitorer les jobs avec un worker de nettoyage

5️⃣ COMMANDES DE DEBUG :
------------------------
// Compter les jobs par statut
db.stepstoryjobs.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
])

// Trouver les jobs anciens (plus de 1 heure)
db.stepstoryjobs.find({
  status: "processing",
  createdAt: { $lt: new Date(Date.now() - 60*60*1000) }
})

// Nettoyer tous les jobs bloqués
db.stepstoryjobs.updateMany(
  { 
    status: "processing", 
    updatedAt: { $lt: new Date(Date.now() - 10*60*1000) }
  },
  { 
    $set: { 
      status: "error", 
      error: "Timeout - job bloqué plus de 10 minutes"
    }
  }
)
`);

// Fonction utilitaire pour créer une requête de réparation
const generateRepairQuery = (jobId) => {
    return `
// Réparer le job ${jobId}
db.stepstoryjobs.updateOne(
  { _id: ObjectId("${jobId}") },
  { 
    $set: { 
      status: "error", 
      error: "Job réparé manuellement - était bloqué en processing",
      updatedAt: new Date()
    }
  }
)`;
};

const generateDeleteQuery = (jobId) => {
    return `
// Supprimer le job ${jobId} pour le relancer
db.stepstoryjobs.deleteOne({ _id: ObjectId("${jobId}") })`;
};

// Si un job ID est fourni en paramètre
const jobId = process.argv[2];
if (jobId) {
    console.log('\n🎯 COMMANDES POUR VOTRE JOB SPÉCIFIQUE:');
    console.log('=======================================');
    console.log(generateRepairQuery(jobId));
    console.log(generateDeleteQuery(jobId));
    console.log(`
// Puis relancer via API
POST /api/steps/VOTRE_STEP_ID/story/async
    `);
}

console.log(`
💡 AMÉLIORATION APPLIQUÉE :
===========================
✅ Population des photos ajoutée dans generateStepStoryAsync
✅ Logs d'erreur améliorés dans le job asynchrone
✅ Fonction collectStepPhotos optimisée

Le problème principal était que les accommodations et activities 
n'étaient pas populés avec leurs photos dans le job asynchrone,
ce qui causait un échec silencieux dans collectStepPhotos().

🚀 PROCHAINES ÉTAPES :
======================
1. Réparer le job bloqué avec les commandes ci-dessus
2. Relancer la génération de récit
3. Le nouveau code devrait fonctionner correctement

Need help? Provide your job ID: node repairJobGuide.js YOUR_JOB_ID
`);
