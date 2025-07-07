import openai from './index.js';

/**
 * Analyse un prompt en langage naturel pour extraire des informations sur une étape de voyage
 * @param {string} prompt - Texte d'entrée en langage naturel
 * @param {Object} userLocation - Localisation de l'utilisateur (optionnel)
 * @returns {Promise<Object>} - Données structurées de l'étape
 */
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

/**
 * Analyse un prompt en langage naturel pour extraire des informations sur une activité
 * @param {string} prompt - Texte d'entrée en langage naturel
 * @param {Object} stepData - Données de l'étape associée
 * @param {Object} userLocation - Localisation de l'utilisateur (optionnel)
 * @returns {Promise<Object>} - Données structurées de l'activité
 */
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
- Si aucune adresse spécifique n'est mentionnée, utilise l'adresse de l'étape ou de l'utilisateur selon le contexte
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
