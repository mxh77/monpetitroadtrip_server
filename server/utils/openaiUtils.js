import OpenAI from 'openai';
import { getAvisRandonnéeViaAlgolia } from './algoliaUtils.js';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

export const genererSyntheseAvis = async (avisArray) => {
    const avisText = avisArray.map((avis, i) =>
        `Avis ${i + 1} (${avis.rating}/5) : ${avis.comment}`
    ).join('\n');

    const prompt = `Voici une liste d'avis d'utilisateurs sur un lieu touristique. Fais une synthèse concise, claire, et neutre de ces avis en français :
  
  ${avisText}
  
  Synthèse :`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
          });

        return response.choices[0].message.content;

    } catch (error) {
        console.error('Error in OpenAI API call:', error.response?.data || error.message);
        throw new Error('Failed to generate summary from OpenAI');
    }
};

export const genererRecitStep = async (stepData, systemPrompt) => {
    try {
        // Fonction utilitaire pour formater les dates sans décalage de fuseau horaire
        const formatDateWithoutTimezone = (dateString) => {
            if (!dateString) return null;
            const date = new Date(dateString);
            return date.toLocaleString('fr-FR', { 
                timeZone: 'UTC',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        // Prompt utilisateur (récit)
        const prompt = `Tu es un narrateur de voyage expert. Raconte de manière engageante et chronologique le déroulement d'un step de voyage en français, en te basant sur les informations suivantes :

**Informations du Step :**
- Nom : ${stepData.step.name || 'Non spécifié'}
- Type : ${stepData.step.type || 'Non spécifié'}
- Adresse : ${stepData.step.address || 'Non spécifiée'}
- Arrivée : ${formatDateWithoutTimezone(stepData.step.arrivalDateTime) || 'Non spécifiée'}
- Départ : ${formatDateWithoutTimezone(stepData.step.departureDateTime) || 'Non spécifié'}
- Distance depuis l'étape précédente : ${stepData.step.distancePreviousStep || 0} km
- Temps de trajet depuis l'étape précédente : ${stepData.step.travelTimePreviousStep || 0} minutes
- Notes : ${stepData.step.notes || 'Aucune note'}

${stepData.accommodations.length > 0 ? `**Hébergements :**
${stepData.accommodations.map((acc, index) => `
${index + 1}. ${acc.name}
   - Adresse : ${acc.address || 'Non spécifiée'}
   - Arrivée : ${formatDateWithoutTimezone(acc.arrivalDateTime) || 'Non spécifiée'}
   - Départ : ${formatDateWithoutTimezone(acc.departureDateTime) || 'Non spécifié'}
   - Nombre de nuits : ${acc.nights || 0}
   - Prix : ${acc.price || 0} ${acc.currency || 'USD'}
   - Numéro de réservation : ${acc.reservationNumber || 'Non spécifié'}
   - Notes : ${acc.notes || 'Aucune note'}
`).join('')}` : ''}

${stepData.activities.length > 0 ? `**Activités :**
${stepData.activities.map((act, index) => `
${index + 1}. ${act.name} (${act.type || 'Type non spécifié'})
   - Adresse : ${act.address || 'Non spécifiée'}
   - Début : ${formatDateWithoutTimezone(act.startDateTime) || 'Non spécifié'}
   - Fin : ${formatDateWithoutTimezone(act.endDateTime) || 'Non spécifié'}
   - Durée : ${act.duration || 0} ${act.typeDuration === 'M' ? 'minutes' : act.typeDuration === 'H' ? 'heures' : 'jours'}
   - Prix : ${act.price || 0} ${act.currency || 'USD'}
   ${act.type === 'Randonnée' ? `- Distance : ${act.trailDistance || 0} km
   - Dénivelé : ${act.trailElevation || 0} m
   - Type de sentier : ${act.trailType || 'Non spécifié'}` : ''}
   - Numéro de réservation : ${act.reservationNumber || 'Non spécifié'}
   - Notes : ${act.notes || 'Aucune note'}
`).join('')}` : ''}

Instructions :
1. Crée un récit chronologique (primordial) et fluide qui raconte cette étape du voyage à la 1ère personne du pluriel
2. Intègre naturellement tous les éléments fournis (dates, prix, notes, etc.)
3. Utilise un ton engageant mais informatif
4. Respecte l'ordre chronologique des événements
5. Mentionne les aspects pratiques (prix, réservations) de manière naturelle
6. Si certaines informations manquent, n'invente pas, mais adapte le récit
7. Limite le récit à environ 300-400 mots
8. Commence par contextualiser l'arrivée dans ce lieu

Récit :`;

        // System prompt par défaut si non fourni
        const systemMsg = systemPrompt || "Tu es le narrateur officiel de MonPetitRoadtrip, une application de roadtrip personnalisée pour les familles et amis. Sois chaleureux, informatif et inclusif.";

        // Log du prompt utilisé (system + user)
        console.log("\n===== SYSTEM PROMPT =====\n" + systemMsg + "\n========================\n");
        console.log("\n===== USER PROMPT =====\n" + prompt + "\n======================\n");

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemMsg },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 800
        });

        return {
            story: response.choices[0].message.content,
            prompt: prompt
        };

    } catch (error) {
        console.error('Error in OpenAI API call for step story:', error.response?.data || error.message);
        throw new Error('Failed to generate step story from OpenAI');
    }
};

/**
 * Récupère les avis d'une randonnée via Algolia (infos .env) et génère une synthèse IA
 * @param {string} nomRandonnee - Le nom de la randonnée à rechercher
 * @param {string} indexName - Le nom de l'index Algolia à utiliser
 * @param {number} [maxAvis=10] - Nombre maximum d'avis à récupérer
 * @returns {Promise<string>} - Synthèse générée
 */
export const genererSyntheseAvisRandonnée = async (nomRandonnee, indexName, maxAvis = 10) => {
    const applicationId = process.env.ALGOLIA_APP_ID;
    const apiKey = process.env.ALGOLIA_API_KEY;
    const avis = await getAvisRandonnéeViaAlgolia(applicationId, apiKey, indexName, nomRandonnee, maxAvis);
    const avisArray = avis.map(a => ({
        comment: a.comment || a.text || '',
        rating: a.rating || a.stars || 0
    }));
    return await genererSyntheseAvis(avisArray);
};

export const analyserPromptEtape = async (prompt, userLocation = null) => {
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

    const systemPrompt = `Tu es un assistant qui analyse des prompts en langage naturel pour créer des étapes de voyage.

CONTEXTE TEMPOREL ACTUEL :
Nous sommes le ${currentDateTime} (heure de Paris).

${userLocation ? `LOCALISATION DE L'UTILISATEUR :
L'utilisateur se trouve actuellement près de : ${userLocation.address}
Coordonnées : ${userLocation.latitude}, ${userLocation.longitude}
Si aucune adresse spécifique n'est mentionnée dans le prompt, utilise cette localisation comme point de référence.` : ''}
    
Extrait les informations suivantes du prompt de l'utilisateur et retourne UNIQUEMENT un objet JSON valide avec ces champs :
- name : le nom/titre de l'étape (string)
- address : l'adresse ou lieu mentionné (string) ${userLocation ? '- si aucune adresse n\'est mentionnée, utilise la localisation de l\'utilisateur' : ''}
- arrivalDateTime : date et heure d'arrivée au format ISO 8601 (string) ou null si non spécifié
- departureDateTime : date et heure de départ au format ISO 8601 (string) ou null si non spécifié
- type : "Stage" ou "Stop" selon le contexte (string, défaut "Stage")
- notes : notes ou détails supplémentaires (string)
- useUserLocation : true si tu as utilisé la localisation de l'utilisateur faute d'adresse spécifique (boolean)

Instructions importantes :
- Si aucune date n'est mentionnée, utilise null
- Si seule une date est mentionnée sans heure, ajoute une heure par défaut (10:00 pour l'arrivée, 18:00 pour le départ)
- Si seule une heure est mentionnée, utilise la date du jour
- Pour les dates relatives (demain, dans 3 jours, etc.), calcule la date absolue par rapport à ${currentDateTime}
- Extrais l'adresse la plus précise possible depuis le texte
- ${userLocation ? 'Si aucune adresse spécifique n\'est mentionnée, utilise l\'adresse de l\'utilisateur et marque useUserLocation: true' : 'Si aucune adresse n\'est mentionnée, essaie d\'inférer un lieu générique'}
- Si c'est juste un arrêt rapide ou de passage, utilise type "Stop", sinon "Stage"

Exemple de réponse :
{
  "name": "Visite du Louvre",
  "address": "Musée du Louvre, Paris, France",
  "arrivalDateTime": "2025-07-01T10:00:00.000Z",
  "departureDateTime": "2025-07-01T16:00:00.000Z",
  "type": "Stage",
  "notes": "Réserver les billets à l'avance",
  "useUserLocation": false
}`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3,
        });

        const result = response.choices[0].message.content.trim();
        
        // Nettoyer le résultat pour s'assurer qu'on a du JSON valide
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Aucun JSON valide trouvé dans la réponse');
        }
        
        const stepData = JSON.parse(jsonMatch[0]);
        
        // Validation des champs requis
        if (!stepData.name) {
            throw new Error('Le nom de l\'étape est requis');
        }
        
        // Si aucune adresse n'est fournie et qu'on n'utilise pas la localisation utilisateur
        if (!stepData.address && !stepData.useUserLocation) {
            throw new Error('Une adresse ou une localisation est requise');
        }
        
        return stepData;

    } catch (error) {
        console.error('Error in OpenAI prompt analysis:', error.response?.data || error.message);
        throw new Error(`Échec de l'analyse du prompt : ${error.message}`);
    }
};

export const analyserPromptActivite = async (prompt, stepData, userLocation = null) => {
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

    const systemPrompt = `Tu es un assistant qui analyse des prompts en langage naturel pour créer des activités de voyage.

CONTEXTE TEMPOREL ACTUEL :
Nous sommes le ${currentDateTime} (heure de Paris).

CONTEXTE DE L'ÉTAPE :
- Nom de l'étape : ${stepData.name}
- Adresse de l'étape : ${stepData.address}
- Arrivée prévue : ${stepData.arrivalDateTime ? new Date(stepData.arrivalDateTime).toLocaleString('fr-FR') : 'Non spécifiée'}
- Départ prévu : ${stepData.departureDateTime ? new Date(stepData.departureDateTime).toLocaleString('fr-FR') : 'Non spécifiée'}

${userLocation ? `LOCALISATION DE L'UTILISATEUR :
L'utilisateur se trouve actuellement près de : ${userLocation.address}
Coordonnées : ${userLocation.latitude}, ${userLocation.longitude}
Si aucune adresse spécifique n'est mentionnée dans le prompt, utilise cette localisation comme point de référence.` : ''}
    
Extrait les informations suivantes du prompt de l'utilisateur et retourne UNIQUEMENT un objet JSON valide avec ces champs :
- name : le nom/titre de l'activité (string)
- address : l'adresse ou lieu mentionné (string) ${userLocation ? '- si aucune adresse n\'est mentionnée, utilise la localisation de l\'utilisateur ou l\'adresse de l\'étape' : '- si aucune adresse n\'est mentionnée, utilise l\'adresse de l\'étape'}
- startDateTime : date et heure de début au format ISO 8601 (string) ou null si non spécifié
- endDateTime : date et heure de fin au format ISO 8601 (string) ou null si non spécifié
- duration : durée de l'activité en nombre (number) ou null si non spécifié
- typeDuration : unité de durée ("M" pour minutes, "H" pour heures, "J" pour jours) (string) ou "H" par défaut
- type : type d'activité ("Randonnée", "Courses", "Visite", "Autre") (string) - utilise "Autre" par défaut
- price : prix de l'activité en nombre (number) ou null si non spécifié
- currency : devise du prix ("USD", "CAD", "EUR") (string) ou "EUR" par défaut si prix spécifié
- notes : notes ou détails supplémentaires (string)
- reservationNumber : numéro de réservation si mentionné (string) ou null
- website : site web si mentionné (string) ou null
- phone : numéro de téléphone si mentionné (string) ou null
- email : email si mentionné (string) ou null
- useUserLocation : true si tu as utilisé la localisation de l'utilisateur faute d'adresse spécifique (boolean)
- useStepLocation : true si tu as utilisé l'adresse de l'étape faute d'adresse spécifique (boolean)

Instructions importantes :
- Si aucune date/heure n'est mentionnée, utilise null
- Si seule une heure est mentionnée, utilise la date de l'étape si disponible, sinon la date du jour
- Pour les dates relatives (demain, dans 2 heures, etc.), calcule par rapport à ${currentDateTime}
- Si seule une durée est mentionnée sans heure de début, essaie d'inférer une heure de début logique
- Extrais l'adresse la plus précise possible depuis le texte
- ${userLocation ? 'Si aucune adresse spécifique n\'est mentionnée, utilise l\'adresse de l\'étape ou de l\'utilisateur selon le contexte' : 'Si aucune adresse n\'est mentionnée, utilise l\'adresse de l\'étape'}
- Déduis le type d'activité le plus approprié selon le contenu
- Si c'est un restaurant/repas, utilise le type "Autre"
- Si c'est une visite touristique, utilise le type "Visite"
- Si c'est une activité physique/sport, utilise le type "Randonnée"
- Si c'est du shopping/courses, utilise le type "Courses"
- Pour les unités de durée : utilise "M" pour les minutes, "H" pour les heures, "J" pour les jours
- Pour la devise : utilise uniquement "USD", "CAD" ou "EUR"

Exemple de réponse :
{
  "name": "Déjeuner au Café de Flore",
  "address": "172 Boulevard Saint-Germain, 75006 Paris",
  "startDateTime": "2025-07-01T12:30:00.000Z",
  "endDateTime": "2025-07-01T14:00:00.000Z",
  "duration": 90,
  "typeDuration": "M",
  "type": "Autre",
  "price": 45,
  "currency": "EUR",
  "notes": "Réserver une table en terrasse",
  "reservationNumber": null,
  "website": null,
  "phone": null,
  "email": null,
  "useUserLocation": false,
  "useStepLocation": false
}`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3,
        });

        const result = response.choices[0].message.content.trim();
        
        // Nettoyer le résultat pour s'assurer qu'on a du JSON valide
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Aucun JSON valide trouvé dans la réponse');
        }
        
        const activityData = JSON.parse(jsonMatch[0]);
        
        // Validation des champs requis
        if (!activityData.name) {
            throw new Error('Le nom de l\'activité est requis');
        }
        
        // Si aucune adresse n'est fournie et qu'on n'utilise ni localisation utilisateur ni étape
        if (!activityData.address && !activityData.useUserLocation && !activityData.useStepLocation) {
            // Utiliser l'adresse de l'étape par défaut
            activityData.address = stepData.address;
            activityData.useStepLocation = true;
        }
        
        return activityData;

    } catch (error) {
        console.error('Error in OpenAI activity prompt analysis:', error.response?.data || error.message);
        throw new Error(`Échec de l'analyse du prompt d'activité : ${error.message}`);
    }
};

/**
 * Génère un récit de step enrichi avec les photos des hébergements et activités
 * @param {Object} stepData - Données du step
 * @param {string} systemPrompt - Prompt système personnalisé
 * @param {Array} photos - Photos des hébergements et activités
 * @returns {Promise<Object>} - Récit et prompt utilisé
 */
export const genererRecitStepAvecPhotos = async (stepData, systemPrompt, photos = []) => {
    try {
        // Fonction utilitaire pour formater les dates sans décalage de fuseau horaire
        const formatDateWithoutTimezone = (dateString) => {
            if (!dateString) return null;
            const date = new Date(dateString);
            return date.toLocaleString('fr-FR', { 
                timeZone: 'UTC',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        // Construire le prompt textuel de base
        const basePrompt = `Tu es un narrateur de voyage expert. Raconte de manière engageante et chronologique le déroulement d'un step de voyage en français, en te basant sur les informations suivantes :

**Informations du Step :**
- Nom : ${stepData.step.name || 'Non spécifié'}
- Type : ${stepData.step.type || 'Non spécifié'}
- Adresse : ${stepData.step.address || 'Non spécifiée'}
- Arrivée : ${formatDateWithoutTimezone(stepData.step.arrivalDateTime) || 'Non spécifiée'}
- Départ : ${formatDateWithoutTimezone(stepData.step.departureDateTime) || 'Non spécifié'}
- Distance depuis l'étape précédente : ${stepData.step.distancePreviousStep || 0} km
- Temps de trajet depuis l'étape précédente : ${stepData.step.travelTimePreviousStep || 0} minutes
- Notes : ${stepData.step.notes || 'Aucune note'}

${stepData.accommodations.length > 0 ? `**Hébergements :**
${stepData.accommodations.map((acc, index) => `
${index + 1}. ${acc.name}
   - Adresse : ${acc.address || 'Non spécifiée'}
   - Arrivée : ${formatDateWithoutTimezone(acc.arrivalDateTime) || 'Non spécifiée'}
   - Départ : ${formatDateWithoutTimezone(acc.departureDateTime) || 'Non spécifié'}
   - Nombre de nuits : ${acc.nights || 0}
   - Prix : ${acc.price || 0} ${acc.currency || 'USD'}
   - Numéro de réservation : ${acc.reservationNumber || 'Non spécifié'}
   - Notes : ${acc.notes || 'Aucune note'}
`).join('')}` : ''}

${stepData.activities.length > 0 ? `**Activités :**
${stepData.activities.map((act, index) => `
${index + 1}. ${act.name} (${act.type || 'Type non spécifié'})
   - Adresse : ${act.address || 'Non spécifiée'}
   - Début : ${formatDateWithoutTimezone(act.startDateTime) || 'Non spécifié'}
   - Fin : ${formatDateWithoutTimezone(act.endDateTime) || 'Non spécifié'}
   - Durée : ${act.duration || 0} ${act.typeDuration === 'M' ? 'minutes' : act.typeDuration === 'H' ? 'heures' : 'jours'}
   - Prix : ${act.price || 0} ${act.currency || 'USD'}
   ${act.type === 'Randonnée' ? `- Distance : ${act.trailDistance || 0} km
   - Dénivelé : ${act.trailElevation || 0} m
   - Type de sentier : ${act.trailType || 'Non spécifié'}` : ''}
   - Numéro de réservation : ${act.reservationNumber || 'Non spécifié'}
   - Notes : ${act.notes || 'Aucune note'}
`).join('')}` : ''}

${photos.length > 0 ? `**Photos disponibles :**
Je vais également analyser ${photos.length} photo(s) liée(s) à ce step pour enrichir le récit avec des détails visuels authentiques.

Instructions pour l'analyse des photos :
- Décris les éléments visuels pertinents qui peuvent enrichir le récit
- Utilise les détails des photos pour rendre le récit plus vivant et personnel
- Mentionne les aspects atmosphériques, architecturaux ou paysagers visibles
- Intègre naturellement ces descriptions dans la narration chronologique
- Ne mentionne pas explicitement que tu analyses des photos dans le récit final` : ''}

Instructions :
1. Crée un récit chronologique (primordial) et fluide qui raconte cette étape du voyage à la 1ère personne du pluriel
2. Intègre naturellement tous les éléments fournis (dates, prix, notes, etc.)
${photos.length > 0 ? '3. Enrichis le récit avec les détails visuels des photos pour le rendre plus vivant et authentique' : ''}
${photos.length > 0 ? '4.' : '3.'} Utilise un ton engageant mais informatif
${photos.length > 0 ? '5.' : '4.'} Respecte l'ordre chronologique des événements
${photos.length > 0 ? '6.' : '5.'} Mentionne les aspects pratiques (prix, réservations) de manière naturelle
${photos.length > 0 ? '7.' : '6.'} Si certaines informations manquent, n'invente pas, mais adapte le récit
${photos.length > 0 ? '8.' : '7.'} Limite le récit à environ 400-500 mots
${photos.length > 0 ? '9.' : '8.'} Commence par contextualiser l'arrivée dans ce lieu

Récit :`;

        // System prompt par défaut si non fourni
        const systemMsg = systemPrompt || "Tu es le narrateur officiel de MonPetitRoadtrip, une application de roadtrip personnalisée pour les familles et amis. Sois chaleureux, informatif et inclusif.";

        // Construire les messages pour l'API
        const messages = [
            { role: 'system', content: systemMsg }
        ];

        // Si on a des photos, utiliser GPT-4 Vision avec les images
        if (photos.length > 0) {
            console.log(`\n===== GÉNÉRATION AVEC ${photos.length} PHOTOS =====`);
            
            // Créer le message avec texte et images
            const userMessage = {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: basePrompt
                    }
                ]
            };

            // Ajouter chaque photo comme image
            photos.forEach((photo, index) => {
                userMessage.content.push({
                    type: 'image_url',
                    image_url: {
                        url: photo.url,
                        detail: 'auto' // 'low', 'high', ou 'auto'
                    }
                });
                console.log(`Photo ${index + 1}: ${photo.source} - ${photo.url}`);
            });

            messages.push(userMessage);

            // Utiliser GPT-4 Vision
            const response = await openai.chat.completions.create({
                model: 'gpt-4o', // Modèle avec support vision
                messages: messages,
                temperature: 0.7,
                max_tokens: 1000
            });

            return {
                story: response.choices[0].message.content,
                prompt: basePrompt,
                photosAnalyzed: photos.length,
                model: 'gpt-4o-vision'
            };

        } else {
            // Pas de photos, utiliser le modèle texte standard
            console.log("\n===== GÉNÉRATION SANS PHOTOS =====");
            
            messages.push({
                role: 'user',
                content: basePrompt
            });

            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: messages,
                temperature: 0.7,
                max_tokens: 800
            });

            return {
                story: response.choices[0].message.content,
                prompt: basePrompt,
                photosAnalyzed: 0,
                model: 'gpt-4o-mini'
            };
        }

    } catch (error) {
        console.error('Error in OpenAI API call for step story with photos:', error.response?.data || error.message);
        throw new Error('Failed to generate step story with photos from OpenAI');
    }
};