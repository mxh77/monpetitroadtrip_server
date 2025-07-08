import axios from 'axios';
import dotenv from 'dotenv';
import readline from 'readline';

// Charger les variables d'environnement
dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:3000/api';

// Créer une interface de ligne de commande
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Demander à l'utilisateur de s'authentifier
const authenticate = async () => {
  return new Promise((resolve) => {
    rl.question('Email: ', (email) => {
      rl.question('Mot de passe: ', async (password) => {
        try {
          const response = await axios.post(`${API_URL}/auth/login`, {
            email,
            password
          });
          
          console.log('Authentification réussie!');
          resolve(response.data.token);
        } catch (error) {
          console.error('Erreur d\'authentification:', error.response?.data?.msg || error.message);
          process.exit(1);
        }
      });
    });
  });
};

// Récupérer la liste des roadtrips
const getRoadtrips = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/roadtrips`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des roadtrips:', error.response?.data?.msg || error.message);
    return [];
  }
};

// Afficher la liste des roadtrips et demander à l'utilisateur d'en choisir un
const selectRoadtrip = async (token) => {
  const roadtrips = await getRoadtrips(token);
  
  if (roadtrips.length === 0) {
    console.log('Aucun roadtrip trouvé. Veuillez en créer un d\'abord.');
    process.exit(1);
  }
  
  console.log('\nListe des roadtrips:');
  roadtrips.forEach((roadtrip, index) => {
    console.log(`${index + 1}. ${roadtrip.name} (ID: ${roadtrip._id})`);
  });
  
  return new Promise((resolve) => {
    rl.question('\nChoisissez un roadtrip (numéro): ', (answer) => {
      const index = parseInt(answer) - 1;
      if (index >= 0 && index < roadtrips.length) {
        resolve(roadtrips[index]);
      } else {
        console.log('Choix invalide.');
        process.exit(1);
      }
    });
  });
};

// Lancer la génération asynchrone de tâches
const startTaskGeneration = async (token, roadtripId, replace = false) => {
  try {
    const response = await axios.post(
      `${API_URL}/roadtrips/${roadtripId}/tasks/generate-ai-async`,
      { replace },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.existingTasksCount) {
      console.log(`Ce roadtrip a déjà ${error.response.data.existingTasksCount} tâches.`);
      
      return new Promise((resolve) => {
        rl.question('Voulez-vous les remplacer? (o/n): ', async (answer) => {
          if (answer.toLowerCase() === 'o') {
            const result = await startTaskGeneration(token, roadtripId, true);
            resolve(result);
          } else {
            console.log('Génération annulée.');
            process.exit(0);
          }
        });
      });
    } else if (error.response?.status === 409) {
      console.log('Un job de génération est déjà en cours pour ce roadtrip.');
      console.log(`Job ID: ${error.response.data.jobId}`);
      console.log(`Statut: ${error.response.data.status}`);
      
      return {
        jobId: error.response.data.jobId,
        status: error.response.data.status
      };
    } else {
      console.error('Erreur lors du lancement de la génération:', error.response?.data?.msg || error.message);
      process.exit(1);
    }
  }
};

// Vérifier le statut du job
const checkJobStatus = async (token, roadtripId, jobId) => {
  try {
    const response = await axios.get(
      `${API_URL}/roadtrips/${roadtripId}/tasks/jobs/${jobId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la vérification du statut:', error.response?.data?.msg || error.message);
    return null;
  }
};

// Attendre que le job soit terminé
const waitForJobCompletion = async (token, roadtrip, jobId) => {
  console.log(`\nSuivi du job ${jobId} pour le roadtrip "${roadtrip.name}":\n`);
  
  let isCompleted = false;
  let previousStatus = null;
  
  while (!isCompleted) {
    const jobStatus = await checkJobStatus(token, roadtrip._id, jobId);
    
    if (!jobStatus) {
      console.log('Impossible de récupérer le statut du job.');
      break;
    }
    
    if (jobStatus.status !== previousStatus) {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] Statut: ${jobStatus.status}`);
      previousStatus = jobStatus.status;
    }
    
    if (jobStatus.status === 'completed') {
      console.log(`\n✅ Génération terminée avec succès!`);
      console.log(`📝 ${jobStatus.taskCount} tâches générées.`);
      
      if (jobStatus.tasks && jobStatus.tasks.length > 0) {
        console.log('\nExemples de tâches générées:');
        jobStatus.tasks.slice(0, 3).forEach((task, index) => {
          console.log(`${index + 1}. ${task.title} (${task.category}, priorité: ${task.priority})`);
        });
        console.log(`... et ${jobStatus.tasks.length - 3} autres tâches.`);
      }
      
      isCompleted = true;
    } else if (jobStatus.status === 'failed') {
      console.log(`\n❌ Échec de la génération: ${jobStatus.error}`);
      isCompleted = true;
    } else {
      // Attendre 2 secondes avant de vérifier à nouveau
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
};

// Fonction principale
const main = async () => {
  try {
    // Authentification
    const token = await authenticate();
    
    // Sélection d'un roadtrip
    const selectedRoadtrip = await selectRoadtrip(token);
    console.log(`\nRoadtrip sélectionné: ${selectedRoadtrip.name}`);
    
    // Lancer la génération
    console.log('\nLancement de la génération de tâches par IA...');
    const result = await startTaskGeneration(token, selectedRoadtrip._id);
    
    if (!result || !result.jobId) {
      console.log('Aucun job lancé.');
      process.exit(0);
    }
    
    // Attendre la fin du job
    await waitForJobCompletion(token, selectedRoadtrip, result.jobId);
    
  } catch (error) {
    console.error('Erreur:', error.message);
  } finally {
    rl.close();
  }
};

// Exécuter la fonction principale
main();
