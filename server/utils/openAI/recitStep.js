import openai from './index.js';

/**
 * Fonction utilitaire pour formater les dates sans décalage de fuseau horaire
 * @param {string} dateString - Date au format ISO
 * @returns {string|null} - Date formatée ou null
 */
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

/**
 * Génère un récit pour une étape de voyage
 * @param {Object} stepData - Données de l'étape
 * @param {string} systemPrompt - Prompt système personnalisé
 * @returns {Promise<Object>} - Récit et prompt utilisé
 */
export const genererRecitStep = async (stepData, systemPrompt) => {
    try {
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
 * Génère un récit de step enrichi avec les photos des hébergements et activités
 * @param {Object} stepData - Données du step
 * @param {string} systemPrompt - Prompt système personnalisé
 * @param {Array} photos - Photos des hébergements et activités
 * @returns {Promise<Object>} - Récit et prompt utilisé
 */
export const genererRecitStepAvecPhotos = async (stepData, systemPrompt, photos = []) => {
    try {
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
