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
            model: 'gpt-4',
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