/**
 * Générateur de réponses pour le chatbot
 */

/**
 * Générer un message de succès selon l'intention et le résultat
 */
export const generateSuccessMessage = (intent, result) => {
    const messages = {
        'add_step': (data) => {
            const stepName = data.data?.name || 'nouvelle étape';
            return `✅ L'étape "${stepName}" a été ajoutée avec succès à votre roadtrip !`;
        },
        
        'delete_step': (data) => {
            const stepName = data.data?.name || 'étape';
            return `✅ L'étape "${stepName}" a été supprimée de votre roadtrip.`;
        },
        
        'add_accommodation': (data) => {
            const accommodationName = data.data?.name || 'hébergement';
            const stepName = data.data?.stepName || 'étape';
            return `✅ L'hébergement "${accommodationName}" a été ajouté à l'étape "${stepName}".`;
        },
        
        'delete_accommodation': (data) => {
            const accommodationName = data.data?.name || 'hébergement';
            return `✅ L'hébergement "${accommodationName}" a été supprimé.`;
        },
        
        'add_activity': (data) => {
            const activityName = data.data?.name || 'activité';
            const stepName = data.data?.stepName || 'étape';
            return `✅ L'activité "${activityName}" a été ajoutée à l'étape "${stepName}".`;
        },
        
        'delete_activity': (data) => {
            const activityName = data.data?.name || 'activité';
            return `✅ L'activité "${activityName}" a été supprimée.`;
        },
        
        'add_task': (data) => {
            const taskName = data.data?.name || 'tâche';
            return `✅ La tâche "${taskName}" a été ajoutée à votre roadtrip.`;
        },
        
        'delete_task': (data) => {
            const taskName = data.data?.name || 'tâche';
            return `✅ La tâche "${taskName}" a été supprimée.`;
        },
        
        'update_dates': (data) => {
            return `✅ Les dates de votre roadtrip ont été mises à jour avec succès.`;
        },
        
        'modify_step': (data) => {
            const stepName = data.data?.name || 'étape';
            return `✅ L'étape "${stepName}" a été modifiée avec succès.`;
        },
        
        'get_info': (data) => {
            return `ℹ️ Voici les informations demandées sur votre roadtrip.`;
        },
        
        'help': (data) => {
            return `💡 J'espère que ces informations vous aident ! N'hésitez pas si vous avez d'autres questions.`;
        }
    };
    
    const generator = messages[intent];
    if (generator) {
        return generator(result);
    }
    
    return result.message || 'Action exécutée avec succès !';
};

/**
 * Générer un message d'erreur selon l'intention et l'erreur
 */
export const generateErrorMessage = (intent, error) => {
    const specificMessages = {
        'add_step': 'Impossible d\'ajouter l\'étape. Vérifiez que le nom et la destination sont corrects.',
        'delete_step': 'Impossible de supprimer l\'étape. Vérifiez qu\'elle existe dans votre roadtrip.',
        'add_accommodation': 'Impossible d\'ajouter l\'hébergement. Vérifiez les informations fournies.',
        'delete_accommodation': 'Impossible de supprimer l\'hébergement. Vérifiez qu\'il existe.',
        'add_activity': 'Impossible d\'ajouter l\'activité. Vérifiez les informations fournies.',
        'delete_activity': 'Impossible de supprimer l\'activité. Vérifiez qu\'elle existe.',
        'add_task': 'Impossible d\'ajouter la tâche. Vérifiez les informations fournies.',
        'delete_task': 'Impossible de supprimer la tâche. Vérifiez qu\'elle existe.',
        'update_dates': 'Impossible de mettre à jour les dates. Vérifiez le format des dates.',
        'modify_step': 'Impossible de modifier l\'étape. Vérifiez les informations fournies.',
        'get_info': 'Impossible de récupérer les informations demandées.'
    };
    
    const specificMessage = specificMessages[intent];
    if (specificMessage) {
        return `❌ ${specificMessage} (${error.message})`;
    }
    
    return `❌ Une erreur s'est produite : ${error.message}`;
};

/**
 * Générer un message de confirmation avant action
 */
export const generateConfirmationMessage = (intent, entities) => {
    const messages = {
        'add_step': (entities) => {
            const place = entities.location || 'lieu non spécifié';
            const dates = entities.dates ? ` du ${entities.dates.start} au ${entities.dates.end}` : '';
            return `Je vais ajouter une étape à ${place}${dates}. Voulez-vous continuer ?`;
        },
        
        'delete_step': (entities) => {
            const place = entities.location || 'étape spécifiée';
            return `Je vais supprimer l'étape de ${place}. Voulez-vous continuer ?`;
        },
        
        'add_accommodation': (entities) => {
            const name = entities.name || 'hébergement';
            const place = entities.location || 'lieu spécifié';
            return `Je vais ajouter l'hébergement "${name}" à ${place}. Voulez-vous continuer ?`;
        },
        
        'delete_accommodation': (entities) => {
            const name = entities.name || 'hébergement spécifié';
            return `Je vais supprimer l'hébergement "${name}". Voulez-vous continuer ?`;
        },
        
        'add_activity': (entities) => {
            const name = entities.name || 'activité';
            const place = entities.location || 'lieu spécifié';
            return `Je vais ajouter l'activité "${name}" à ${place}. Voulez-vous continuer ?`;
        },
        
        'delete_activity': (entities) => {
            const name = entities.name || 'activité spécifiée';
            return `Je vais supprimer l'activité "${name}". Voulez-vous continuer ?`;
        },
        
        'add_task': (entities) => {
            const name = entities.name || 'tâche';
            return `Je vais ajouter la tâche "${name}". Voulez-vous continuer ?`;
        },
        
        'update_dates': (entities) => {
            const dates = entities.dates ? ` du ${entities.dates.start} au ${entities.dates.end}` : '';
            return `Je vais modifier les dates de votre roadtrip${dates}. Voulez-vous continuer ?`;
        }
    };
    
    const generator = messages[intent];
    if (generator) {
        return generator(entities);
    }
    
    return 'Je vais exécuter cette action. Voulez-vous continuer ?';
};

/**
 * Générer un message d'aide
 */
export const generateHelpMessage = (context = null) => {
    const baseHelp = `
🤖 **Assistant IA pour votre roadtrip**

**Commandes disponibles :**
• **Étapes** : "Ajoute une étape à Paris", "Supprime l'étape de Lyon"
• **Hébergements** : "Ajoute un hôtel à Marseille", "Supprime l'hébergement de Nice"
• **Activités** : "Ajoute une visite du Louvre", "Supprime l'activité à Bordeaux"
• **Tâches** : "Ajoute une tâche réserver les billets", "Supprime la tâche billets"
• **Dates** : "Modifie les dates du 15 au 20 juillet"
• **Infos** : "Montre-moi les détails de l'étape de Nice"

**Exemples d'utilisation :**
• "Ajoute une étape à Paris du 15 au 17 juillet"
• "Ajoute un hébergement Hôtel de la Paix à Marseille"
• "Ajoute une activité visite du Louvre le 16 juillet à 14h"
• "Ajoute une tâche réserver les billets de train"

**💡 Conseil :** Plus vous êtes précis dans vos demandes, mieux je peux vous aider !
`;
    
    if (context) {
        return baseHelp + `\n**Contexte actuel :** ${context}`;
    }
    
    return baseHelp.trim();
};

/**
 * Générer un message d'accueil
 */
export const generateWelcomeMessage = (userName = null, roadtripName = null) => {
    const greeting = userName ? `Bonjour ${userName} !` : 'Bonjour !';
    const roadtripInfo = roadtripName ? ` pour votre roadtrip "${roadtripName}"` : '';
    
    return `${greeting} 👋

Je suis votre assistant IA${roadtripInfo}. Je peux vous aider à :
• Ajouter ou supprimer des étapes
• Gérer vos hébergements et activités
• Organiser vos tâches
• Modifier les dates de votre voyage

**Comment puis-je vous aider aujourd'hui ?**

_Tapez "aide" pour voir toutes les commandes disponibles._`;
};

/**
 * Générer un message de compréhension partielle
 */
export const generatePartialUnderstandingMessage = (intent, missingEntities) => {
    const messages = {
        'add_step': (missing) => {
            if (missing.includes('location')) {
                return 'Je veux bien ajouter une étape, mais où souhaitez-vous aller ?';
            }
            return 'Je veux bien ajouter une étape. Pouvez-vous me donner plus de détails ?';
        },
        
        'add_accommodation': (missing) => {
            if (missing.includes('location')) {
                return 'Je veux bien ajouter un hébergement, mais dans quelle ville ?';
            }
            if (missing.includes('name')) {
                return 'Je veux bien ajouter un hébergement. Quel est son nom ?';
            }
            return 'Je veux bien ajouter un hébergement. Pouvez-vous me donner plus de détails ?';
        },
        
        'add_activity': (missing) => {
            if (missing.includes('location')) {
                return 'Je veux bien ajouter une activité, mais dans quelle ville ?';
            }
            if (missing.includes('name')) {
                return 'Je veux bien ajouter une activité. Laquelle ?';
            }
            return 'Je veux bien ajouter une activité. Pouvez-vous me donner plus de détails ?';
        },
        
        'delete_step': (missing) => {
            if (missing.includes('location')) {
                return 'Je veux bien supprimer une étape, mais laquelle ?';
            }
            return 'Je veux bien supprimer une étape. Pouvez-vous me dire laquelle ?';
        }
    };
    
    const generator = messages[intent];
    if (generator) {
        return generator(missingEntities);
    }
    
    return 'Je comprends ce que vous voulez faire, mais j\'ai besoin de plus d\'informations. Pouvez-vous être plus précis ?';
};

/**
 * Générer un message pour une intention non reconnue
 */
export const generateUnknownIntentMessage = (query) => {
    return `Je ne suis pas sûr de comprendre votre demande : "${query}"

**Voici ce que je peux faire :**
• Ajouter/supprimer des étapes, hébergements, activités
• Gérer vos tâches
• Modifier les dates de votre roadtrip
• Vous donner des informations sur votre voyage

**Essayez par exemple :**
• "Ajoute une étape à Paris"
• "Supprime l'hébergement de Lyon"
• "Ajoute une activité visite du Louvre"

_Tapez "aide" pour voir toutes les commandes disponibles._`;
};

/**
 * Générer un message d'estimation de temps
 */
export const generateTimeEstimationMessage = (intent, estimatedTime) => {
    const actions = {
        'add_step': 'ajouter l\'étape',
        'delete_step': 'supprimer l\'étape',
        'add_accommodation': 'ajouter l\'hébergement',
        'delete_accommodation': 'supprimer l\'hébergement',
        'add_activity': 'ajouter l\'activité',
        'delete_activity': 'supprimer l\'activité',
        'add_task': 'ajouter la tâche',
        'delete_task': 'supprimer la tâche',
        'update_dates': 'mettre à jour les dates',
        'modify_step': 'modifier l\'étape',
        'get_info': 'récupérer les informations'
    };
    
    const action = actions[intent] || 'exécuter cette action';
    
    if (estimatedTime <= 5) {
        return `⚡ Je vais ${action} rapidement...`;
    } else if (estimatedTime <= 15) {
        return `⏱️ Je vais ${action}, cela prendra environ ${estimatedTime} secondes...`;
    } else {
        return `⏳ Je vais ${action}, cela peut prendre jusqu'à ${estimatedTime} secondes...`;
    }
};

/**
 * Générer un message de progression
 */
export const generateProgressMessage = (intent, progress) => {
    const percentage = Math.round(progress.percentage || 0);
    const step = progress.currentStep || 'traitement';
    
    return `🔄 ${step}... (${percentage}%)`;
};

export default {
    generateSuccessMessage,
    generateErrorMessage,
    generateConfirmationMessage,
    generateHelpMessage,
    generateWelcomeMessage,
    generatePartialUnderstandingMessage,
    generateUnknownIntentMessage,
    generateTimeEstimationMessage,
    generateProgressMessage
};
