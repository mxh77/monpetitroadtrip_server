/**
 * Utilitaires pour le traitement du langage naturel
 */

/**
 * Normaliser une chaîne pour la comparaison
 */
export const normalizeString = (str) => {
    return str.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
        .replace(/[^\w\s]/g, ' ') // Remplacer la ponctuation par des espaces
        .replace(/\s+/g, ' ') // Normaliser les espaces
        .trim();
};

/**
 * Extraire les mots-clés d'une phrase
 */
export const extractKeywords = (text) => {
    const normalized = normalizeString(text);
    const words = normalized.split(' ');
    
    // Mots vides français
    const stopWords = new Set([
        'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'da', 'dans', 'sur',
        'avec', 'pour', 'par', 'sans', 'sous', 'vers', 'chez', 'entre', 'pendant',
        'avant', 'après', 'depuis', 'jusqu', 'jusque', 'à', 'au', 'aux', 'en',
        'et', 'ou', 'mais', 'donc', 'or', 'ni', 'car', 'que', 'qui', 'dont',
        'où', 'quand', 'comme', 'si', 'bien', 'plus', 'moins', 'très', 'assez',
        'trop', 'beaucoup', 'peu', 'encore', 'déjà', 'toujours', 'jamais',
        'souvent', 'parfois', 'quelquefois', 'aujourd', 'hier', 'demain',
        'maintenant', 'alors', 'puis', 'ensuite', 'enfin', 'd', 'l', 'n', 's',
        't', 'c', 'qu', 'j', 'm', 'ce', 'cette', 'ces', 'cet', 'mon', 'ma',
        'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses', 'notre', 'nos', 'votre',
        'vos', 'leur', 'leurs', 'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils',
        'elles', 'me', 'te', 'se', 'lui', 'leur', 'y', 'en', 'ne', 'pas',
        'point', 'rien', 'personne', 'aucun', 'aucune', 'nul', 'nulle'
    ]);
    
    return words.filter(word => 
        word.length > 2 && 
        !stopWords.has(word) && 
        isNaN(word)
    );
};

/**
 * Calculer la similarité entre deux chaînes
 */
export const calculateSimilarity = (str1, str2) => {
    const words1 = new Set(extractKeywords(str1));
    const words2 = new Set(extractKeywords(str2));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
};

/**
 * Détecter la langue d'un texte (français ou anglais)
 */
export const detectLanguage = (text) => {
    const frenchWords = [
        'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'ou', 'avec',
        'pour', 'dans', 'sur', 'par', 'sans', 'sous', 'vers', 'chez', 'entre',
        'ajouter', 'supprimer', 'modifier', 'voir', 'afficher', 'créer', 'mettre',
        'jour', 'aide', 'bonjour', 'salut', 'merci', 'oui', 'non', 'peut', 'être',
        'avoir', 'faire', 'aller', 'venir', 'dire', 'prendre', 'donner', 'voir',
        'savoir', 'pouvoir', 'vouloir', 'devoir', 'falloir'
    ];
    
    const englishWords = [
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'with', 'by', 'from', 'about', 'into', 'through', 'during', 'before',
        'after', 'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under',
        'add', 'remove', 'delete', 'modify', 'update', 'create', 'show', 'view',
        'help', 'hello', 'hi', 'thanks', 'yes', 'no', 'can', 'could', 'will',
        'would', 'should', 'must', 'have', 'has', 'had', 'do', 'does', 'did',
        'is', 'are', 'was', 'were', 'be', 'been', 'being', 'go', 'went', 'gone'
    ];
    
    const normalized = normalizeString(text);
    const words = normalized.split(' ');
    
    let frenchScore = 0;
    let englishScore = 0;
    
    words.forEach(word => {
        if (frenchWords.includes(word)) frenchScore++;
        if (englishWords.includes(word)) englishScore++;
    });
    
    return frenchScore > englishScore ? 'fr' : 'en';
};

/**
 * Extraire les entités temporelles d'un texte
 */
export const extractTimeEntities = (text) => {
    const normalized = normalizeString(text);
    const timeEntities = [];
    
    // Patterns pour les dates
    const datePatterns = [
        /(\d{1,2})\s*(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)/g,
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/g,
        /(\d{1,2})-(\d{1,2})-(\d{4})/g,
        /(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/g,
        /(aujourd'hui|demain|hier|après-demain|avant-hier)/g,
        /(ce matin|cet après-midi|ce soir|cette nuit)/g,
        /(la semaine prochaine|le mois prochain|l'année prochaine)/g
    ];
    
    // Patterns pour les heures
    const timePatterns = [
        /(\d{1,2})[h:](\d{2})/g,
        /(\d{1,2})\s*heure[s]?/g,
        /(\d{1,2})\s*h/g,
        /(matin|après-midi|soir|nuit)/g,
        /(midi|minuit)/g
    ];
    
    // Patterns pour les durées
    const durationPatterns = [
        /(\d+)\s*(jour[s]?|semaine[s]?|mois|année[s]?)/g,
        /(\d+)\s*(heure[s]?|minute[s]?)/g,
        /(quelques|plusieurs)\s*(jour[s]?|semaine[s]?|mois|année[s]?)/g
    ];
    
    // Extraire les entités
    [...datePatterns, ...timePatterns, ...durationPatterns].forEach(pattern => {
        let match;
        while ((match = pattern.exec(normalized)) !== null) {
            timeEntities.push({
                text: match[0],
                type: 'time',
                position: match.index
            });
        }
    });
    
    return timeEntities;
};

/**
 * Extraire les entités de lieu d'un texte
 */
export const extractLocationEntities = (text) => {
    const normalized = normalizeString(text);
    const locationEntities = [];
    
    // Patterns pour les lieux
    const locationPatterns = [
        /(?:à|au|aux|en|dans|vers|chez|près de|proche de)\s+([A-Za-z][A-Za-z\s\-']{2,})/g,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*,?\s*(?:France|Paris|Lyon|Marseille|Toulouse|Nice|Nantes|Bordeaux|Lille|Strasbourg|Montpellier|Rennes|Reims|Le Havre|Cergy|Saint-Denis|Argenteuil|Montreuil|Boulogne-Billancourt|Nanterre|Créteil|Avignon|Poitiers|Dunkerque|Amiens|Tours|Limoges|Annecy|Clermont-Ferrand|Villeurbanne|Besançon|Orléans|Metz|Rouen|Mulhouse|Caen|Brest|Nancy|Argenteuil|Montreuil)/gi,
        /(rue|avenue|boulevard|place|square|impasse|allée|chemin|route|autoroute)\s+([A-Za-z][A-Za-z\s\-']{2,})/g
    ];
    
    locationPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            locationEntities.push({
                text: match[0],
                location: match[1] || match[2],
                type: 'location',
                position: match.index
            });
        }
    });
    
    return locationEntities;
};

/**
 * Extraire les entités numériques d'un texte
 */
export const extractNumericEntities = (text) => {
    const normalized = normalizeString(text);
    const numericEntities = [];
    
    // Patterns pour les nombres
    const numberPatterns = [
        /(\d+(?:\.\d+)?)\s*(euros?|€|dollars?|\$)/g,
        /(\d+)\s*(personne[s]?|adulte[s]?|enfant[s]?|nuit[s]?|jour[s]?)/g,
        /(\d+)\s*étoile[s]?/g,
        /(première?|deuxième|troisième|quatrième|cinquième|sixième|septième|huitième|neuvième|dixième)/g,
        /(un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)/g
    ];
    
    numberPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(normalized)) !== null) {
            numericEntities.push({
                text: match[0],
                value: match[1],
                unit: match[2],
                type: 'numeric',
                position: match.index
            });
        }
    });
    
    return numericEntities;
};

/**
 * Nettoyer et formater un texte pour l'affichage
 */
export const cleanText = (text) => {
    return text
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, ' ')
        .trim();
};

/**
 * Générer des variations d'un mot pour améliorer la correspondance
 */
export const generateWordVariations = (word) => {
    const variations = [word];
    
    // Variations courantes en français
    const rules = [
        { from: 'é', to: 'e' },
        { from: 'è', to: 'e' },
        { from: 'ê', to: 'e' },
        { from: 'à', to: 'a' },
        { from: 'ç', to: 'c' },
        { from: 'ô', to: 'o' },
        { from: 'î', to: 'i' },
        { from: 'ù', to: 'u' },
        { from: 'û', to: 'u' },
        { from: 'ü', to: 'u' },
        { from: 'ë', to: 'e' },
        { from: 'ï', to: 'i' },
        { from: 'ÿ', to: 'y' }
    ];
    
    rules.forEach(rule => {
        if (word.includes(rule.from)) {
            variations.push(word.replace(new RegExp(rule.from, 'g'), rule.to));
        }
    });
    
    // Pluriels/singuliers
    if (word.endsWith('s') && word.length > 3) {
        variations.push(word.slice(0, -1));
    } else if (!word.endsWith('s')) {
        variations.push(word + 's');
    }
    
    return [...new Set(variations)];
};

export default {
    normalizeString,
    extractKeywords,
    calculateSimilarity,
    detectLanguage,
    extractTimeEntities,
    extractLocationEntities,
    extractNumericEntities,
    cleanText,
    generateWordVariations
};
