import axios from 'axios';
import dotenv from 'dotenv';
import colors from 'colors';

// Charger les variables d'environnement
dotenv.config();

// URL de base de l'API
const API_URL = process.env.API_URL || 'http://localhost:3000/api';

// Token d'authentification (à remplacer par un token valide)
const TOKEN = process.env.JWT_TOKEN;

if (!TOKEN) {
  console.error(colors.red('Erreur: JWT_TOKEN n\'est pas défini dans les variables d\'environnement'));
  process.exit(1);
}

// Headers pour les requêtes
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`
};

/**
 * Teste la génération de tâches par IA pour un roadtrip
 */
async function testGenerateAITasks() {
  try {
    // 1. Récupérer les roadtrips de l'utilisateur
    console.log(colors.yellow('Récupération des roadtrips...'));
    const roadtripsResponse = await axios.get(`${API_URL}/roadtrips`, { headers });
    
    if (!roadtripsResponse.data || roadtripsResponse.data.length === 0) {
      console.error(colors.red('Aucun roadtrip trouvé. Créez d\'abord un roadtrip.'));
      process.exit(1);
    }
    
    // Utiliser le premier roadtrip pour le test
    const roadtripId = roadtripsResponse.data[0]._id;
    const roadtripName = roadtripsResponse.data[0].name;
    console.log(colors.green(`Roadtrip trouvé: ${roadtripName} (${roadtripId})`));
    
    // 2. Vérifier les tâches existantes
    console.log(colors.yellow('Vérification des tâches existantes...'));
    const tasksResponse = await axios.get(`${API_URL}/roadtrips/${roadtripId}/tasks`, { headers });
    const existingTasks = tasksResponse.data || [];
    
    console.log(colors.blue(`Le roadtrip contient ${existingTasks.length} tâches existantes.`));
    
    // 3. Demander à l'utilisateur s'il veut remplacer les tâches existantes
    let replace = false;
    if (existingTasks.length > 0) {
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const response = await new Promise(resolve => {
        readline.question(colors.yellow('Des tâches existent déjà. Voulez-vous les remplacer? (O/n): '), answer => {
          readline.close();
          resolve(answer.toLowerCase());
        });
      });
      
      replace = response === 'o' || response === 'oui' || response === 'y' || response === 'yes' || response === '';
    }
    
    // 4. Générer des tâches avec l'IA
    console.log(colors.yellow(`Génération de tâches par IA pour le roadtrip "${roadtripName}"...`));
    console.log(colors.gray('Cela peut prendre jusqu\'à 30 secondes, veuillez patienter...'));
    
    const startTime = Date.now();
    const aiResponse = await axios.post(
      `${API_URL}/roadtrips/${roadtripId}/tasks/generate-ai`,
      { replace },
      { headers }
    );
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // 5. Afficher les résultats
    const generatedTasks = aiResponse.data.tasks;
    console.log(colors.green(`✅ ${generatedTasks.length} tâches générées en ${duration} secondes!`));
    
    // Afficher un résumé des tâches par catégorie
    const categories = {};
    generatedTasks.forEach(task => {
      if (!categories[task.category]) {
        categories[task.category] = 0;
      }
      categories[task.category]++;
    });
    
    console.log(colors.cyan('\nRésumé des tâches générées par catégorie:'));
    Object.keys(categories).sort().forEach(category => {
      console.log(colors.white(`  - ${category}: ${categories[category]} tâches`));
    });
    
    // Afficher quelques exemples de tâches
    console.log(colors.cyan('\nExemples de tâches générées:'));
    const sampleTasks = generatedTasks.slice(0, 5);
    sampleTasks.forEach((task, index) => {
      console.log(colors.white(`\n${index + 1}. ${task.title} (${task.category}, priorité: ${task.priority})`));
      console.log(colors.gray(`   ${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}`));
      console.log(colors.gray(`   Échéance: ${new Date(task.dueDate).toLocaleDateString()}`));
    });
    
    console.log(colors.green('\n✅ Test terminé avec succès'));
    
  } catch (error) {
    console.error(colors.red('Erreur lors du test:'), error.response?.data || error.message);
    process.exit(1);
  }
}

// Exécuter le test
testGenerateAITasks();
