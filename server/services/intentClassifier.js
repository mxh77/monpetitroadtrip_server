/**
 * Classification des intentions basée sur des règles regex
 * Utilisé comme fallback si l'IA n'est pas disponible
 */

export const classifyIntent = (query) => {
    const queryLower = query.toLowerCase();
    
    const intents = {
        // Ajouter des éléments
        'add_step': [
            /ajouter?.*(?:étape|step|ville|destination)/i,
            /aller\s+(?:à|vers|dans)/i,
            /nouvelle?\s+(?:étape|destination)/i,
            /partir\s+(?:à|vers|pour)/i
        ],
        
        'add_accommodation': [
            /ajouter?.*(?:hébergement|hôtel|logement|hotel)/i,
            /réserver.*(?:hôtel|logement|chambre)/i,
            /nouveau.*(?:hébergement|hôtel)/i
        ],
        
        'add_activity': [
            /ajouter?.*(?:activité|visite|attraction|sortie)/i,
            /visiter?.*(?:musée|monument|parc|lieu)/i,
            /faire.*(?:activité|visite|tour)/i,
            /nouvelle?\s+(?:activité|visite)/i
        ],
        
        'add_task': [
            /ajouter?.*(?:tâche|todo|à faire|task)/i,
            /nouvelle?\s+(?:tâche|mission)/i,
            /il faut.*(?:faire|réserver|acheter|préparer)/i,
            /ne pas oublier/i
        ],
        
        // Supprimer des éléments
        'delete_step': [
            /supprimer?.*(?:étape|step|ville|destination)/i,
            /enlever.*(?:étape|ville)/i,
            /annuler.*(?:étape|voyage)/i,
            /retirer.*(?:étape|destination)/i
        ],
        
        'delete_accommodation': [
            /supprimer?.*(?:hébergement|hôtel|logement)/i,
            /annuler.*(?:réservation|hôtel|chambre)/i,
            /enlever.*(?:hébergement|hôtel)/i
        ],
        
        'delete_activity': [
            /supprimer?.*(?:activité|visite|attraction)/i,
            /annuler.*(?:visite|sortie|activité)/i,
            /enlever.*(?:activité|visite)/i
        ],
        
        'delete_task': [
            /supprimer?.*(?:tâche|todo|task)/i,
            /enlever.*(?:tâche|mission)/i,
            /annuler.*(?:tâche|todo)/i
        ],
        
        // Modifier des éléments
        'modify_step': [
            /modifier?.*(?:étape|step|ville)/i,
            /changer.*(?:étape|destination|ville)/i,
            /mettre à jour.*(?:étape|step)/i
        ],
        
        'modify_dates': [
            /modifier?.*(?:dates?|horaires?|planning)/i,
            /changer.*(?:dates?|horaires?)/i,
            /décaler.*(?:voyage|roadtrip|dates?)/i,
            /reporter.*(?:voyage|roadtrip)/i
        ],
        
        // Obtenir des informations
        'get_info': [
            /(?:informations?|détails?|voir|afficher|montrer)/i,
            /qu'est-ce que.*(?:roadtrip|voyage|étape)/i,
            /combien.*(?:étapes?|jours?|coût)/i,
            /liste.*(?:étapes?|activités?|hébergements?)/i,
            /résumé.*(?:roadtrip|voyage)/i
        ],
        
        // Aide
        'help': [
            /aide|help|comment/i,
            /que peux-tu faire/i,
            /comment (?:utiliser|marche|fonctionne)/i,
            /quelles sont.*(?:commandes?|possibilités?)/i
        ],
        
        // Salutations et contexte
        'greeting': [
            /(?:bonjour|salut|hello|hi|bonsoir)/i,
            /comment (?:allez-vous|vas-tu|ça va)/i
        ],
        
        'farewell': [
            /(?:au revoir|bye|goodbye|merci|à bientôt)/i,
            /bonne (?:journée|soirée|nuit)/i
        ]
    };
    
    // Chercher la première intention qui match
    for (const [intent, patterns] of Object.entries(intents)) {
        for (const pattern of patterns) {
            if (pattern.test(queryLower)) {
                return intent;
            }
        }
    }
    
    return 'unknown';
};

/**
 * Calcul de confiance pour une intention
 */
export const calculateConfidence = (query, intent) => {
    const queryLower = query.toLowerCase();
    let confidence = 0.5; // Confiance de base
    
    // Mots-clés qui augmentent la confiance
    const strongKeywords = {
        'add_step': ['ajouter', 'nouvelle', 'aller', 'étape', 'ville'],
        'delete_step': ['supprimer', 'enlever', 'annuler', 'retirer'],
        'add_accommodation': ['hôtel', 'hébergement', 'réserver', 'logement'],
        'add_activity': ['activité', 'visite', 'visiter', 'attraction'],
        'add_task': ['tâche', 'todo', 'oublier', 'faire']
    };
    
    if (strongKeywords[intent]) {
        const keywordMatches = strongKeywords[intent].filter(keyword => 
            queryLower.includes(keyword)
        ).length;
        
        confidence += (keywordMatches * 0.2);
    }
    
    // Longueur de la requête (plus c'est précis, plus on est confiant)
    if (query.length > 20) confidence += 0.1;
    if (query.length > 50) confidence += 0.1;
    
    return Math.min(confidence, 0.95); // Max 95%
};

/**
 * Suggestions d'intentions alternatives
 */
export const getSuggestedIntents = (query) => {
    const allIntents = [
        'add_step', 'delete_step', 'modify_step',
        'add_accommodation', 'delete_accommodation',
        'add_activity', 'delete_activity',
        'add_task', 'delete_task',
        'modify_dates', 'get_info', 'help'
    ];
    
    const suggestions = allIntents
        .map(intent => ({
            intent,
            confidence: calculateConfidence(query, intent)
        }))
        .filter(item => item.confidence > 0.3)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3);
    
    return suggestions;
};
