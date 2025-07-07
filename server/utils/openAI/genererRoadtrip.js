import openai from './index.js';

/**
 * Génère un roadtrip complet avec étapes, hébergements et activités
 * @param {Object} aiParameters - Paramètres du roadtrip
 * @returns {Promise<Object>} - Données complètes du roadtrip généré
 */
export const genererRoadtripComplet = async (aiParameters) => {
    // Obtenir la date et heure courante
    const now = new Date();
    const currentDateTime = now.toLocaleString('fr-FR', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Paris'
    });

    // Formater les préférences de voyage
    const formattedPreferences = aiParameters.preferences ? JSON.stringify(aiParameters.preferences, null, 2) : 'Non spécifiées';
    
    // Formater les contraintes
    const formattedConstraints = aiParameters.constraints ? JSON.stringify(aiParameters.constraints, null, 2) : 'Non spécifiées';
    
    // Format budget
    const formattedBudget = aiParameters.budget ? `${aiParameters.budget} EUR` : 'Non spécifié';
    
    // Format dates
    const formattedStartDate = aiParameters.startDate ? new Date(aiParameters.startDate).toLocaleDateString('fr-FR') : 'Non spécifiée';
    const formattedEndDate = aiParameters.endDate ? new Date(aiParameters.endDate).toLocaleDateString('fr-FR') : 'Non spécifiée';
    
    const systemPrompt = `Tu es un assistant expert en planification de voyages qui va générer un roadtrip complet.

CONTEXTE TEMPOREL ACTUEL :
Nous sommes le ${currentDateTime} (heure de Paris).

PARAMÈTRES DU ROADTRIP :
- Point de départ : ${aiParameters.startLocation.address} (Coordonnées: ${aiParameters.startLocation.coordinates.lat}, ${aiParameters.startLocation.coordinates.lng})
- Destination finale : ${aiParameters.endLocation ? aiParameters.endLocation.address : 'Non spécifiée'}
- Date de début : ${formattedStartDate}
- Date de fin : ${formattedEndDate}
- Durée (jours) : ${aiParameters.duration || 'Non spécifiée'}
- Budget : ${formattedBudget}
- Voyageurs : ${aiParameters.travelers || 'Non spécifié'}

DESCRIPTION (PRIORITAIRE):
${aiParameters.description || 'Non fournie'}

PRÉFÉRENCES DE VOYAGE :
${formattedPreferences}

CONTRAINTES :
${formattedConstraints}

Ta mission est de créer un roadtrip complet en fonction de ces informations. La DESCRIPTION est très importante et doit guider tes choix d'étapes et d'activités. Fournis une réponse uniquement au format JSON avec les champs suivants :

{
  "name": "Titre du roadtrip",
  "description": "Description globale du roadtrip",
  "currency": "EUR",
  "steps": [
    {
      "name": "Nom de l'étape",
      "type": "Stage",
      "location": "Adresse de l'étape",
      "arrivalDateTime": "YYYY-MM-DDThh:mm:ss.sssZ",
      "departureDateTime": "YYYY-MM-DDThh:mm:ss.sssZ",
      "description": "Description de l'étape",
      "accommodations": [
        {
          "name": "Nom de l'hébergement",
          "address": "Adresse de l'hébergement",
          "nights": 2,
          "price": 120,
          "currency": "EUR",
          "description": "Description brève"
        }
      ],
      "activities": [
        {
          "name": "Nom de l'activité",
          "type": "Visite",
          "address": "Adresse de l'activité",
          "startDateTime": "YYYY-MM-DDThh:mm:ss.sssZ",
          "endDateTime": "YYYY-MM-DDThh:mm:ss.sssZ",
          "duration": 120,
          "typeDuration": "M",
          "price": 15,
          "currency": "EUR",
          "description": "Description brève"
        }
      ]
    }
  ]
}

INSTRUCTIONS IMPORTANTES :
1. Crée un itinéraire réaliste et logique géographiquement
2. Respecte strictement les dates de début et de fin
3. Inclus 1-2 hébergements recommandés par étape (sauf pour les étapes de type "Stop")
4. Suggère 2-3 activités pertinentes par étape
5. Garde les descriptions TRÈS COURTES (max 100 caractères) pour éviter les problèmes de formatage
6. Limite-toi à 5-7 étapes principales maximum
7. Utilise le type "Stop" pour les arrêts courts (moins de 3 heures) et "Stage" pour les étapes avec nuitée

RETOURNE UNIQUEMENT LE JSON, sans commentaires ni explications supplémentaires.`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',  // Utiliser un modèle plus léger qui gère bien les sorties structurées
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Crée un roadtrip complet basé sur les paramètres fournis. 
Sois particulièrement attentif à la DESCRIPTION qui contient les points d'intérêt spécifiques souhaités par l'utilisateur.

Je veux UNIQUEMENT une réponse JSON bien formatée, sans introduction ni conclusion.
Respecte scrupuleusement le format d'exemple avec des descriptions courtes pour chaque élément.
N'ajoute pas d'échappements inutiles dans le JSON.
Vérifie que ton JSON est valide et syntaxiquement correct avant de le soumettre.
Assure-toi que chaque objet dans un tableau se termine correctement avec une virgule sauf le dernier.
Vérifie la validité de toutes les dates au format ISO.` }
            ],
            temperature: 0.4,  // Réduire encore plus la température pour une sortie plus prévisible
            max_tokens: 5000,  // Limiter la taille de la sortie
            response_format: { type: "json_object" }  // Forcer le format JSON
        });

        const result = response.choices[0].message.content.trim();
        
        // Nettoyer le résultat pour s'assurer qu'on a du JSON valide
        let roadtripData;
        try {
            // Essayer d'abord de parser le résultat complet
            roadtripData = JSON.parse(result);
        } catch (parseError) {
            console.error('Erreur de parsing JSON direct, tentative de nettoyage:', parseError);
            console.error('Message d\'erreur:', parseError.message);
            
            try {
                // Essayer d'extraire uniquement la partie JSON entre accolades
                const jsonMatch = result.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error('Aucun JSON valide trouvé dans la réponse');
                }
                
                // Nettoyer les caractères potentiellement problématiques
                let cleanedJson = jsonMatch[0]
                    .replace(/\n/g, ' ')                      // Remplacer les sauts de ligne
                    .replace(/,\s*}/g, '}')                   // Supprimer les virgules trailing avant }
                    .replace(/,\s*]/g, ']')                   // Supprimer les virgules trailing avant ]
                    .replace(/([^\\])\\([^"\\\/bfnrtu])/g, '$1$2') // Supprimer les échappements incorrects
                    .replace(/([^":\\])\s+([^":{}\[\],\s])/g, '$1 $2') // Corriger les espaces dans les valeurs
                    .replace(/,(\s*[\]}])/g, '$1'); // Supprimer les virgules finales dans arrays/objects
                
                // Tentative de correction des erreurs dans les tableaux
                if (parseError.message.includes('after array element')) {
                    const pos = parseError.message.match(/position (\d+)/)?.[1];
                    if (pos) {
                        const errorPos = parseInt(pos);
                        // Trouver où dans le JSON se trouve l'erreur
                        const contextStart = Math.max(0, errorPos - 50);
                        const contextEnd = Math.min(cleanedJson.length, errorPos + 50);
                        const errorContext = cleanedJson.substring(contextStart, contextEnd);
                        
                        console.error(`Contexte de l'erreur: "${errorContext}"`);
                        
                        // Traiter spécifiquement cette erreur en insérant une virgule ou fermant le tableau
                        const before = cleanedJson.substring(0, errorPos);
                        const after = cleanedJson.substring(errorPos);
                        
                        // Si ça ressemble à une virgule manquante, l'ajouter
                        if (/\}[\s\n]*\{/.test(errorContext)) {
                            cleanedJson = before.replace(/\}([\s\n]*)\{/g, '},$1{') + after;
                        }
                        // Si c'est un array qui n'est pas correctement fermé
                        else if (/\][^\],]*[\{\[]/.test(errorContext)) {
                            cleanedJson = before.replace(/\]([\s\n]*[\{\[])/g, '],$1') + after;
                        }
                    }
                }
                
                // Logger le JSON nettoyé pour debug
                console.log('Tentative de parsing avec JSON nettoyé:', cleanedJson.substring(0, 100) + '...');
                
                roadtripData = JSON.parse(cleanedJson);
            } catch (secondError) {
                console.error('Échec du nettoyage JSON, dernière tentative de réparation:', secondError);
                
                try {
                    // Dernière tentative avec une bibliothèque plus tolérante
                    // Implémentation d'un parser JSON plus tolérant "maison"
                    const fixedJson = result
                        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":') // Ensure property names are quoted
                        .replace(/'/g, '"') // Convert single quotes to double quotes
                        .replace(/,\s*([\]}])/g, '$1') // Remove trailing commas
                        .replace(/([}\]])\s*([{["])/g, '$1,$2') // Add missing commas between objects/arrays
                        .replace(/([^\\])\\([^"\\\/bfnrtu])/g, '$1$2'); // Remove invalid escapes
                    
                    roadtripData = JSON.parse(fixedJson);
                    console.log('JSON réparé avec succès par le parser tolérant');
                } catch (finalError) {
                    // Enregistrer la réponse brute pour débogage
                    console.error('Réponse OpenAI brute:', result);
                    console.error('Erreur finale:', finalError);
                    
                    throw new Error('Impossible de parser la réponse JSON: ' + finalError.message);
                }
            }
        }
        
        // Validation des champs requis
        if (!roadtripData.name) {
            throw new Error('Le nom du roadtrip est requis');
        }
        
        if (!roadtripData.steps || !Array.isArray(roadtripData.steps) || roadtripData.steps.length === 0) {
            throw new Error('Au moins une étape est requise');
        }
        
        return roadtripData;

    } catch (error) {
        console.error('Error in OpenAI roadtrip generation:', error.response?.data || error.message);
        
        // Si l'erreur est liée au parsing JSON, essayer avec un autre modèle et une approche différente
        if (error.message.includes('Impossible de parser la réponse JSON')) {
            console.log('Tentative de génération avec un modèle de secours...');
            try {
                // Essayer avec GPT-4o et une structure plus simple
                const fallbackResponse = await openai.chat.completions.create({
                    model: 'gpt-4o',  // Modèle plus puissant comme fallback
                    messages: [
                        { 
                            role: 'system', 
                            content: `Tu es un assistant qui génère UNIQUEMENT du JSON valide. 
Tu vas créer un roadtrip selon ces paramètres:
- Départ: ${aiParameters.startLocation.address}
- Arrivée: ${aiParameters.endLocation ? aiParameters.endLocation.address : 'Non spécifiée'}
- Dates: ${formattedStartDate} à ${formattedEndDate}
- Description: ${aiParameters.description || 'Non fournie'}

Format requis (STRICTEMENT):
{
  "name": "Titre du roadtrip",
  "description": "Description courte",
  "currency": "EUR",
  "steps": [
    {
      "name": "Nom étape",
      "type": "Stage",
      "location": "Adresse",
      "arrivalDateTime": "YYYY-MM-DDThh:mm:ss.sssZ",
      "departureDateTime": "YYYY-MM-DDThh:mm:ss.sssZ",
      "description": "Description courte",
      "accommodations": [{"name":"Hôtel","address":"Adresse","nights":2,"price":120,"currency":"EUR","description":"Description"}],
      "activities": [{"name":"Activité","type":"Visite","address":"Adresse","startDateTime":"YYYY-MM-DDThh:mm:ss.sssZ","endDateTime":"YYYY-MM-DDThh:mm:ss.sssZ","duration":120,"typeDuration":"M","price":15,"currency":"EUR","description":"Description"}]
    }
  ]
}` 
                        },
                        { 
                            role: 'user', 
                            content: `Génère un roadtrip avec maximum 5 étapes et descriptions très courtes (moins de 100 caractères).
Fournis UNIQUEMENT du JSON valide sans explication ni commentaire.
Vérifie minutieusement la syntaxe JSON et les dates ISO.` 
                        }
                    ],
                    temperature: 0.2,
                    max_tokens: 2000,
                    response_format: { type: "json_object" }
                });
                
                const fallbackResult = fallbackResponse.choices[0].message.content.trim();
                const fallbackData = JSON.parse(fallbackResult);
                
                console.log('Génération de secours réussie');
                return fallbackData;
                
            } catch (fallbackError) {
                console.error('Échec de la tentative de secours:', fallbackError);
                throw new Error(`Échec de la génération du roadtrip après multiples tentatives: ${error.message}`);
            }
        }
        
        throw new Error(`Échec de la génération du roadtrip : ${error.message}`);
    }
};

/**
 * Génère un plan global de roadtrip avec l'IA (Agent planificateur)
 * Cette fonction génère uniquement le plan général avec des informations de base pour chaque étape
 * @param {Object} parameters - Paramètres du roadtrip (dates, lieux, préférences, etc.)
 * @returns {Promise<Object>} Résultat contenant le plan et les métadonnées
 */
export const genererPlanRoadtrip = async (parameters) => {
    // Obtenir la date et heure courante
    const now = new Date();
    const currentDateTime = now.toLocaleString('fr-FR', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Paris'
    });

    // Formater les préférences de voyage
    const formattedPreferences = parameters.preferences ? JSON.stringify(parameters.preferences, null, 2) : 'Non spécifiées';
    
    // Formater les contraintes
    const formattedConstraints = parameters.constraints ? JSON.stringify(parameters.constraints, null, 2) : 'Non spécifiées';
    
    // Format budget
    const formattedBudget = parameters.budget ? `${parameters.budget} EUR` : 'Non spécifié';
    
    // Format dates
    const formattedStartDate = parameters.startDate ? new Date(parameters.startDate).toLocaleDateString('fr-FR') : 'Non spécifiée';
    const formattedEndDate = parameters.endDate ? new Date(parameters.endDate).toLocaleDateString('fr-FR') : 'Non spécifiée';
    
    const systemPrompt = `Tu es un agent planificateur expert qui va créer un plan de roadtrip.

CONTEXTE TEMPOREL ACTUEL :
Nous sommes le ${currentDateTime} (heure de Paris).

PARAMÈTRES DU ROADTRIP :
- Point de départ : ${parameters.startLocation.address} (Coordonnées: ${parameters.startLocation.coordinates.lat}, ${parameters.startLocation.coordinates.lng})
- Destination finale : ${parameters.endLocation ? parameters.endLocation.address : 'Non spécifiée'}
- Date de début : ${formattedStartDate}
- Date de fin : ${formattedEndDate}
- Durée (jours) : ${parameters.duration || 'Non spécifiée'}
- Budget : ${formattedBudget}
- Voyageurs : ${parameters.travelers || 'Non spécifié'}

DESCRIPTION (PRIORITAIRE):
${parameters.description || 'Non fournie'}

PRÉFÉRENCES DE VOYAGE :
${formattedPreferences}

CONTRAINTES :
${formattedConstraints}

MISSION:
Tu es un PLANIFICATEUR qui doit créer uniquement l'ossature générale du roadtrip avec les étapes principales.
Un autre agent (DÉTAILLEUR) complétera ensuite chaque étape avec des activités et hébergements détaillés.

Ta mission est de:
1. Déterminer les principales étapes du voyage
2. Créer un itinéraire logique et réaliste géographiquement
3. Assigner des dates/heures d'arrivée et de départ pour chaque étape
4. Fournir une description générale très brève pour chaque étape

IMPORTANT: NE PAS INCLURE de détails précis sur les hébergements ou activités, seulement les noms des étapes,
dates, emplacements et brèves descriptions. Un autre agent s'occupera de ces détails.

Fournis une réponse uniquement au format JSON avec les champs suivants :

{
  "name": "Titre du roadtrip",
  "description": "Description globale du roadtrip (max 100 caractères)",
  "currency": "EUR",
  "steps": [
    {
      "name": "Nom de l'étape",
      "type": "Stage",
      "location": "Adresse de l'étape",
      "arrivalDateTime": "YYYY-MM-DDThh:mm:ss.sssZ",
      "departureDateTime": "YYYY-MM-DDThh:mm:ss.sssZ",
      "description": "Description très brève (max 60 caractères)"
    }
  ]
}

INSTRUCTIONS IMPORTANTES :
1. Limite-toi à 7 étapes principales maximum
2. Respecte scrupuleusement les dates de début et de fin
3. Utilise le type "Stop" pour les arrêts courts (moins de 3 heures) et "Stage" pour les étapes avec nuitée
4. Garde les descriptions TRÈS COURTES (max 60 caractères)
5. IMPORTANT: NE PAS inclure d'hébergements ou d'activités dans cette phase!
6. RETOURNE UNIQUEMENT LE JSON, sans commentaires ni explications supplémentaires`;

    try {
        console.log("Génération du plan de roadtrip...");
        
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Crée uniquement le squelette du plan de roadtrip basé sur les paramètres.
N'inclus PAS d'hébergements ni d'activités spécifiques, seulement les étapes principales.
Je veux UNIQUEMENT une réponse JSON bien formatée, sans introduction ni conclusion.
Vérifie la validité de toutes les dates au format ISO.` }
            ],
            temperature: 0.4,
            max_tokens: 2000,
            response_format: { type: "json_object" }
        });

        const result = response.choices[0].message.content.trim();
        const planData = JSON.parse(result);
        
        // Valider le plan généré
        if (!planData.name || !planData.steps || !Array.isArray(planData.steps) || planData.steps.length === 0) {
            throw new Error('Le plan de roadtrip généré est incomplet ou invalide');
        }
        
        return {
            data: planData,
            tokensUsed: response.usage.total_tokens,
            model: 'gpt-4o-mini',
            timestamp: new Date()
        };

    } catch (error) {
        console.error('Erreur lors de la génération du plan de roadtrip:', error);
        throw new Error(`Échec de la génération du plan: ${error.message}`);
    }
};

/**
 * Génère les détails complets pour une étape spécifique (Agent détailleur)
 * Cette fonction enrichit une étape avec des hébergements et activités détaillés
 * @param {Object} stepData - Données de base de l'étape
 * @param {Object} parameters - Paramètres globaux du roadtrip
 * @returns {Promise<Object>} Résultat contenant l'étape détaillée et les métadonnées
 */
export const genererDetailsEtape = async (stepData, parameters) => {
    // Obtenir la date et heure courante
    const now = new Date();
    const currentDateTime = now.toLocaleString('fr-FR', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Paris'
    });

    // Formater les dates de l'étape
    const formattedArrival = stepData.arrivalDateTime ? new Date(stepData.arrivalDateTime).toLocaleString('fr-FR') : 'Non spécifiée';
    const formattedDeparture = stepData.departureDateTime ? new Date(stepData.departureDateTime).toLocaleString('fr-FR') : 'Non spécifiée';
    
    // Calculer la durée de l'étape en heures
    let dureeEtape = 0;
    if (stepData.arrivalDateTime && stepData.departureDateTime) {
        const arrival = new Date(stepData.arrivalDateTime);
        const departure = new Date(stepData.departureDateTime);
        dureeEtape = Math.round((departure - arrival) / (1000 * 60 * 60));
    }
    
    // Extraire les préférences et contraintes pertinentes
    const formattedPreferences = parameters.preferences ? JSON.stringify(parameters.preferences, null, 2) : 'Non spécifiées';
    const formattedConstraints = parameters.constraints ? JSON.stringify(parameters.constraints, null, 2) : 'Non spécifiées';
    
    const systemPrompt = `Tu es un agent détailleur expert qui enrichit une étape de roadtrip avec des hébergements et activités.

CONTEXTE TEMPOREL ACTUEL :
Nous sommes le ${currentDateTime} (heure de Paris).

INFORMATIONS SUR L'ÉTAPE :
- Nom : ${stepData.name}
- Type : ${stepData.type}
- Lieu : ${stepData.location}
- Arrivée prévue : ${formattedArrival}
- Départ prévu : ${formattedDeparture}
- Durée sur place : ${dureeEtape} heures
- Description : ${stepData.description}

CONTEXTE GLOBAL DU ROADTRIP :
- Description globale : ${parameters.description || 'Non fournie'}
- Budget global : ${parameters.budget || 'Non spécifié'} EUR
- Voyageurs : ${parameters.travelers || 'Non spécifié'}

PRÉFÉRENCES DE VOYAGE :
${formattedPreferences}

CONTRAINTES :
${formattedConstraints}

MISSION:
Tu es un DÉTAILLEUR d'étape qui doit enrichir cette étape avec:
1. Des hébergements pertinents et réalistes (si l'étape est de type "Stage")
2. Des activités adaptées au lieu et à la durée du séjour
3. Des horaires cohérents pour les activités
4. Des prix approximatifs pour les hébergements et activités

Fournis une réponse uniquement au format JSON qui ÉTEND l'étape existante avec les champs suivants :

{
  "accommodations": [
    {
      "name": "Nom de l'hébergement",
      "address": "Adresse de l'hébergement",
      "nights": 2,
      "price": 120,
      "currency": "EUR",
      "description": "Description brève"
    }
  ],
  "activities": [
    {
      "name": "Nom de l'activité",
      "type": "Visite",
      "address": "Adresse de l'activité",
      "startDateTime": "YYYY-MM-DDThh:mm:ss.sssZ",
      "endDateTime": "YYYY-MM-DDThh:mm:ss.sssZ",
      "duration": 120,
      "typeDuration": "M",
      "price": 15,
      "currency": "EUR",
      "description": "Description brève"
    }
  ]
}

INSTRUCTIONS IMPORTANTES :
1. Si l'étape est de type "Stage" (avec nuitée), inclure 1 hébergement adapté
2. Si l'étape est de type "Stop" (sans nuitée), ne pas inclure d'hébergement
3. Inclure 2-3 activités adaptées à la durée de l'étape et pertinentes pour le lieu
4. S'assurer que les horaires des activités sont cohérents avec l'arrivée et le départ
5. Proposer des activités variées (culturelles, naturelles, gastronomiques, etc.)
6. Garder les descriptions COURTES (max 60 caractères)
7. S'assurer que les prix sont réalistes pour la région
8. RETOURNE UNIQUEMENT LE JSON d'enrichissement, sans inclure les champs de base de l'étape`;

    try {
        console.log(`Génération des détails pour l'étape: ${stepData.name}`);
        
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',  // Utiliser GPT-4o pour plus de précision sur les détails
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Enrichis cette étape avec des hébergements et activités pertinents.
Respecte scrupuleusement le format JSON demandé.
Assure-toi que les activités sont adaptées à ${stepData.location} et aux dates du séjour.
Les horaires des activités doivent être cohérents avec l'arrivée (${formattedArrival}) et le départ (${formattedDeparture}).
${stepData.type === 'Stop' ? "Cette étape est un simple arrêt, n'inclus PAS d'hébergement." : ""}` }
            ],
            temperature: 0.5,
            max_tokens: 2500,
            response_format: { type: "json_object" }
        });

        const result = response.choices[0].message.content.trim();
        const detailsData = JSON.parse(result);
        
        // Fusionner les détails avec les données de base de l'étape
        const enhancedStep = {
            ...stepData,
            accommodations: detailsData.accommodations || [],
            activities: detailsData.activities || []
        };
        
        return {
            data: enhancedStep,
            tokensUsed: response.usage.total_tokens,
            model: 'gpt-4o',
            timestamp: new Date()
        };

    } catch (error) {
        console.error(`Erreur lors de la génération des détails pour l'étape ${stepData.name}:`, error);
        throw new Error(`Échec de la génération des détails: ${error.message}`);
    }
};

/**
 * Envoie une notification par email à l'utilisateur (à implémenter selon votre système)
 * @param {string} userId - ID de l'utilisateur
 * @param {Object} data - Données pour la notification
 * @returns {Promise<Object>} Résultat de l'envoi
 */
export const envoyerEmailNotification = async (userId, data) => {
    // Cette fonction est un placeholder - vous devrez l'implémenter selon votre système d'envoi d'emails
    console.log(`[NOTIFICATION] Envoi d'un email à l'utilisateur ${userId} pour le roadtrip ${data.roadtripId}`);
    
    // Simuler un délai pour l'envoi d'email
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Dans une implémentation réelle, vous appelleriez votre service d'email ici
    // Exemple: await emailService.send(userId, 'Votre roadtrip est prêt', templateData);
    
    return {
        success: true,
        timestamp: new Date(),
        messageId: `notification-${Date.now()}`
    };
};
