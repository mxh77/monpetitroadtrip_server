import OpenAI from 'openai';
import { classifyIntent } from './intentClassifier.js';
import { extractEntities } from './entityExtractor.js';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

/**
 * Service principal d'analyse du langage naturel
 */
class NLPService {
    
    /**
     * Analyse complète d'une requête utilisateur
     * @param {string} query - La requête utilisateur
     * @param {Object} roadtrip - Le roadtrip concerné (pour le contexte)
     * @returns {Object} Résultat de l'analyse
     */
    async analyzeQuery(query, roadtrip = null) {
        try {
            console.log(`🔍 Analyse de la requête: "${query}"`);
            
            // 1. Classification de l'intention
            const intent = await this.classifyIntentWithAI(query, roadtrip);
            
            // 2. Extraction des entités
            const entities = await this.extractEntitiesWithAI(query, intent);
            
            // 3. Validation de la cohérence
            const validation = this.validateQuery(intent, entities);
            
            const result = {
                intent: intent.name,
                confidence: intent.confidence,
                entities,
                validation,
                roadtripContext: roadtrip ? {
                    id: roadtrip._id,
                    name: roadtrip.name,
                    stepCount: roadtrip.steps?.length || 0
                } : null
            };
            
            console.log(`✅ Analyse terminée:`, result);
            return result;
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'analyse NLP:', error);
            throw new Error(`Erreur d'analyse: ${error.message}`);
        }
    }
    
    /**
     * Classification d'intention avec l'IA
     */
    async classifyIntentWithAI(query, roadtrip) {
        const prompt = `
Analyse cette requête utilisateur et détermine l'intention principale.

Requête: "${query}"

${roadtrip ? `Contexte du roadtrip:
- Nom: ${roadtrip.name}
- Nombre d'étapes: ${roadtrip.steps?.length || 0}
- Dates: ${roadtrip.startDateTime} - ${roadtrip.endDateTime}` : ''}

Intentions possibles:
- add_step: Ajouter une nouvelle étape/ville
- delete_step: Supprimer une étape existante
- modify_step: Modifier une étape existante
- add_accommodation: Ajouter un hébergement
- delete_accommodation: Supprimer un hébergement
- add_activity: Ajouter une activité/visite
- delete_activity: Supprimer une activité
- add_task: Ajouter une tâche/todo
- delete_task: Supprimer une tâche
- modify_dates: Modifier les dates
- get_info: Demander des informations
- help: Demander de l'aide
- unknown: Intention non reconnue

Réponds en JSON avec:
{
    "name": "intention",
    "confidence": 0.95,
    "reasoning": "explication"
}`;

        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-4',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                max_tokens: 200
            });
            
            const result = JSON.parse(response.choices[0].message.content);
            
            // Fallback sur la classification basique si l'IA échoue
            if (!result.name || result.confidence < 0.3) {
                return {
                    name: classifyIntent(query),
                    confidence: 0.5,
                    reasoning: 'Fallback classification'
                };
            }
            
            return result;
            
        } catch (error) {
            console.warn('⚠️ Classification IA échouée, fallback sur regex:', error.message);
            return {
                name: classifyIntent(query),
                confidence: 0.5,
                reasoning: 'Regex fallback'
            };
        }
    }
    
    /**
     * Extraction d'entités avec l'IA
     */
    async extractEntitiesWithAI(query, intent) {
        const prompt = `
Extrait les entités importantes de cette requête pour l'intention "${intent.name}".

Requête: "${query}"
Intention: ${intent.name}

Entités à extraire selon l'intention:
- Noms de lieux (villes, adresses, lieux)
- Dates et heures
- Noms d'hôtels, activités, tâches
- Durées
- Prix
- Nombres de personnes
- Instructions spéciales

Réponds en JSON avec:
{
    "location": "nom du lieu",
    "dates": {
        "arrival": "2024-07-15",
        "departure": "2024-07-17"
    },
    "name": "nom de l'élément",
    "duration": "2 jours",
    "price": 150,
    "people": 2,
    "notes": "instructions spéciales"
}

Mets null pour les entités non trouvées.`;

        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-4',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                max_tokens: 300
            });
            
            const entities = JSON.parse(response.choices[0].message.content);
            
            // Fallback sur extraction basique
            const fallbackEntities = extractEntities(query);
            
            // Fusionner les résultats
            return {
                ...fallbackEntities,
                ...entities
            };
            
        } catch (error) {
            console.warn('⚠️ Extraction IA échouée, fallback sur regex:', error.message);
            return extractEntities(query);
        }
    }
    
    /**
     * Extrait les détails d'un step à partir des entités
     */
    async extractStepDetails(entities) {
        const details = {
            name: entities.location || entities.name || 'Nouvelle étape',
            address: entities.location || '',
            arrivalDateTime: entities.dates?.arrival ? new Date(entities.dates.arrival) : null,
            departureDateTime: entities.dates?.departure ? new Date(entities.dates.departure) : null,
            notes: entities.notes || ''
        };
        
        // Si on a seulement une date, calculer l'autre avec une durée par défaut
        if (details.arrivalDateTime && !details.departureDateTime && entities.duration) {
            const duration = this.parseDuration(entities.duration);
            details.departureDateTime = new Date(details.arrivalDateTime.getTime() + duration);
        }
        
        return details;
    }
    
    /**
     * Parse une durée en millisecondes
     */
    parseDuration(durationStr) {
        const matches = durationStr.match(/(\d+)\s*(jour|jours|heure|heures|h|j)/i);
        if (matches) {
            const value = parseInt(matches[1]);
            const unit = matches[2].toLowerCase();
            
            if (unit.includes('jour') || unit === 'j') {
                return value * 24 * 60 * 60 * 1000; // jours en ms
            } else if (unit.includes('heure') || unit === 'h') {
                return value * 60 * 60 * 1000; // heures en ms
            }
        }
        
        return 24 * 60 * 60 * 1000; // 1 jour par défaut
    }
    
    /**
     * Valide la cohérence d'une requête
     */
    validateQuery(intent, entities) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: []
        };
        
        // Validation spécifique par intention
        switch (intent.name) {
            case 'add_step':
                if (!entities.location && !entities.name) {
                    validation.errors.push('Aucun lieu spécifié pour la nouvelle étape');
                }
                break;
                
            case 'delete_step':
                if (!entities.location && !entities.name) {
                    validation.errors.push('Aucune étape spécifiée à supprimer');
                }
                break;
                
            case 'add_accommodation':
                if (!entities.name && !entities.location) {
                    validation.errors.push('Aucun hébergement ou lieu spécifié');
                }
                break;
        }
        
        validation.isValid = validation.errors.length === 0;
        return validation;
    }
    
    /**
     * Génère une réponse contextuelle
     */
    async generateResponse(intent, entities, context = {}) {
        const responses = {
            add_step: `Je vais ajouter l'étape "${entities.location || entities.name}" à votre roadtrip.`,
            delete_step: `Je vais supprimer l'étape "${entities.location || entities.name}" de votre roadtrip.`,
            add_accommodation: `Je vais ajouter l'hébergement "${entities.name}" à votre roadtrip.`,
            add_activity: `Je vais ajouter l'activité "${entities.name}" à votre roadtrip.`,
            add_task: `Je vais ajouter la tâche "${entities.name}" à votre roadtrip.`,
            help: 'Je peux vous aider à gérer votre roadtrip. Vous pouvez me demander d\'ajouter ou supprimer des étapes, hébergements, activités, ou tâches.',
            unknown: 'Je n\'ai pas bien compris votre demande. Pouvez-vous la reformuler ?'
        };
        
        return responses[intent] || responses.unknown;
    }
}

export const nlpService = new NLPService();
export default nlpService;
