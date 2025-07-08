import openai from './index.js';

/**
 * Génère une liste de tâches pour un roadtrip en utilisant l'IA
 * @param {Object} roadtrip - L'objet roadtrip contenant les informations du voyage
 * @param {Array} steps - Les étapes du roadtrip avec leurs détails
 * @returns {Promise<Array>} - Liste de tâches générées
 */
export const genererTachesRoadtrip = async (roadtrip, steps = []) => {
    try {
        // Formatage des données du roadtrip pour le prompt
        const formattedStartDate = roadtrip.startDateTime 
            ? new Date(roadtrip.startDateTime).toLocaleDateString('fr-FR') 
            : 'Non spécifiée';
        
        const formattedEndDate = roadtrip.endDateTime 
            ? new Date(roadtrip.endDateTime).toLocaleDateString('fr-FR') 
            : 'Non spécifiée';

        // Formatage des étapes
        const formattedSteps = steps.map(step => {
            const arrivalDate = step.arrivalDateTime 
                ? new Date(step.arrivalDateTime).toLocaleDateString('fr-FR') 
                : 'Non spécifiée';
            
            const departureDate = step.departureDateTime 
                ? new Date(step.departureDateTime).toLocaleDateString('fr-FR') 
                : 'Non spécifiée';
            
            return {
                name: step.name,
                type: step.type,
                address: step.address,
                arrivalDate,
                departureDate,
                hasAccommodation: step.accommodations && step.accommodations.length > 0
            };
        });

        const prompt = `
Je suis en train de préparer un roadtrip et j'ai besoin d'une liste de tâches à accomplir pour bien le préparer. Voici les détails du voyage :

Nom du roadtrip: ${roadtrip.name}
Lieu de départ: ${roadtrip.startLocation || 'Non spécifié'}
Date de départ: ${formattedStartDate}
Lieu d'arrivée: ${roadtrip.endLocation || 'Non spécifié'}
Date de retour: ${formattedEndDate}

${steps.length > 0 ? `Le voyage comporte ${steps.length} étapes:
${JSON.stringify(formattedSteps, null, 2)}` : 'Le voyage ne comporte pas encore d\'étapes définies.'}

Génère une liste de tâches à accomplir pour préparer ce voyage. Pour chaque tâche, inclus :
1. Un titre clair et concis
2. Une description détaillée
3. Une catégorie parmi: preparation, booking, packing, documents, transport, accommodation, activities, health, finances, communication, other
4. Une priorité (high, medium, low)
5. Une échéance recommandée par rapport à la date de départ (exemple: "3 jours avant le départ")

Assure-toi de couvrir tous les aspects importants pour ce type de voyage, en tenant compte des destinations et de la durée. Les tâches doivent être concrètes, réalisables, et organisées de façon logique.

IMPORTANT: Réponds UNIQUEMENT avec un JSON valide dans ce format exact:
{
  "tasks": [
    {
      "title": "Titre de la tâche",
      "description": "Description détaillée",
      "category": "preparation",
      "priority": "high",
      "dueDate": "3 jours avant le départ"
    }
  ]
}`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            response_format: { type: "json_object" },
        });

        // Extraire et analyser le JSON retourné
        const content = response.choices[0].message.content;
        
        // Nettoyer le contenu pour extraire le JSON
        let cleanedContent = content.trim();
        
        // Supprimer les balises markdown si présentes
        if (cleanedContent.startsWith('```json')) {
            cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedContent.startsWith('```')) {
            cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        let parsedTasks;
        try {
            parsedTasks = JSON.parse(cleanedContent);
        } catch (parseError) {
            console.error('Erreur de parsing JSON:', parseError);
            console.log('Contenu reçu:', content);
            
            // Tentative de récupération du JSON avec une regex
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    parsedTasks = JSON.parse(jsonMatch[0]);
                } catch (regexParseError) {
                    throw new Error('Impossible de parser la réponse IA en JSON valide');
                }
            } else {
                throw new Error('Aucun JSON valide trouvé dans la réponse IA');
            }
        }
        
        // S'assurer que les tâches sont dans un format valide
        if (parsedTasks && parsedTasks.tasks && Array.isArray(parsedTasks.tasks)) {
            return parsedTasks.tasks;
        } else if (Array.isArray(parsedTasks)) {
            return parsedTasks;
        }
        
        throw new Error("Format de réponse IA invalide - structure des tâches non reconnue");

    } catch (error) {
        console.error("Erreur lors de la génération des tâches:", error);
        
        // Si l'erreur concerne response_format, essayer la version de fallback
        if (error.message?.includes('response_format') || error.param === 'response_format') {
            console.log("Tentative avec la version de fallback sans response_format...");
            try {
                return await genererTachesRoadtripFallback(roadtrip, steps);
            } catch (fallbackError) {
                console.error("Erreur avec la version de fallback:", fallbackError);
                throw fallbackError;
            }
        }
        
        throw error;
    }
};

/**
 * Version de fallback qui n'utilise pas response_format pour compatibilité avec tous les modèles
 * @param {Object} roadtrip - L'objet roadtrip contenant les informations du voyage
 * @param {Array} steps - Les étapes du roadtrip avec leurs détails
 * @returns {Promise<Array>} - Liste de tâches générées
 */
export const genererTachesRoadtripFallback = async (roadtrip, steps = []) => {
    try {
        // Formatage des données du roadtrip pour le prompt
        const formattedStartDate = roadtrip.startDateTime 
            ? new Date(roadtrip.startDateTime).toLocaleDateString('fr-FR') 
            : 'Non spécifiée';
        
        const formattedEndDate = roadtrip.endDateTime 
            ? new Date(roadtrip.endDateTime).toLocaleDateString('fr-FR') 
            : 'Non spécifiée';

        // Formatage des étapes
        const formattedSteps = steps.map(step => {
            const arrivalDate = step.arrivalDateTime 
                ? new Date(step.arrivalDateTime).toLocaleDateString('fr-FR') 
                : 'Non spécifiée';
            
            const departureDate = step.departureDateTime 
                ? new Date(step.departureDateTime).toLocaleDateString('fr-FR') 
                : 'Non spécifiée';
            
            return {
                name: step.name,
                type: step.type,
                address: step.address,
                arrivalDate,
                departureDate,
                hasAccommodation: step.accommodations && step.accommodations.length > 0
            };
        });

        const prompt = `
Je suis en train de préparer un roadtrip et j'ai besoin d'une liste de tâches à accomplir pour bien le préparer. Voici les détails du voyage :

Nom du roadtrip: ${roadtrip.name}
Lieu de départ: ${roadtrip.startLocation || 'Non spécifié'}
Date de départ: ${formattedStartDate}
Lieu d'arrivée: ${roadtrip.endLocation || 'Non spécifié'}
Date de retour: ${formattedEndDate}

${steps.length > 0 ? `Le voyage comporte ${steps.length} étapes:
${JSON.stringify(formattedSteps, null, 2)}` : 'Le voyage ne comporte pas encore d\'étapes définies.'}

Génère une liste de tâches à accomplir pour préparer ce voyage. Pour chaque tâche, inclus :
1. Un titre clair et concis
2. Une description détaillée
3. Une catégorie parmi: preparation, booking, packing, documents, transport, accommodation, activities, health, finances, communication, other
4. Une priorité (high, medium, low)
5. Une échéance recommandée par rapport à la date de départ (exemple: "3 jours avant le départ")

Assure-toi de couvrir tous les aspects importants pour ce type de voyage, en tenant compte des destinations et de la durée. Les tâches doivent être concrètes, réalisables, et organisées de façon logique.

IMPORTANT: Réponds UNIQUEMENT avec un JSON valide dans ce format exact:
{
  "tasks": [
    {
      "title": "Titre de la tâche",
      "description": "Description détaillée",
      "category": "preparation",
      "priority": "high",
      "dueDate": "3 jours avant le départ"
    }
  ]
}`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'user', content: prompt }
            ],
            temperature: 0.7
        });

        // Extraire et analyser le JSON retourné
        const content = response.choices[0].message.content;
        
        // Nettoyer le contenu pour extraire le JSON
        let cleanedContent = content.trim();
        
        // Supprimer les balises markdown si présentes
        if (cleanedContent.startsWith('```json')) {
            cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedContent.startsWith('```')) {
            cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        let parsedTasks;
        try {
            parsedTasks = JSON.parse(cleanedContent);
        } catch (parseError) {
            console.error('Erreur de parsing JSON:', parseError);
            console.log('Contenu reçu:', content);
            
            // Tentative de récupération du JSON avec une regex
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    parsedTasks = JSON.parse(jsonMatch[0]);
                } catch (regexParseError) {
                    throw new Error('Impossible de parser la réponse IA en JSON valide');
                }
            } else {
                throw new Error('Aucun JSON valide trouvé dans la réponse IA');
            }
        }
        
        // S'assurer que les tâches sont dans un format valide
        if (parsedTasks && parsedTasks.tasks && Array.isArray(parsedTasks.tasks)) {
            return parsedTasks.tasks;
        } else if (Array.isArray(parsedTasks)) {
            return parsedTasks;
        }
        
        throw new Error("Format de réponse IA invalide - structure des tâches non reconnue");

    } catch (error) {
        console.error("Erreur lors de la génération des tâches:", error);
        throw error;
    }
};
