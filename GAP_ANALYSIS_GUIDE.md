# Guide des Gaps Temporels Normaux vs Problématiques

## 📊 Seuils de Tolérance par Type de Transition

### 🎯 Activité → 🏨 Accommodation
- **✅ Normal (0-6h)** : Temps de trajet, repos, check-in standard
- **⚠️ Attention (6-12h)** : Peut être normal selon le contexte (voyage long)
- **❌ Problématique (>12h)** : Probablement une erreur de planification

### 🎯 Activité → 🎯 Activité
- **✅ Normal (0-1h)** : Transition directe, déplacement court
- **⚠️ Attention (1-3h)** : Pause repas, déplacement plus long
- **❌ Problématique (>3h)** : Gap important, vérifier la planification

### 🏨 Accommodation → 🎯 Activité
- **✅ Normal (0-3h)** : Check-out, petit-déjeuner, déplacement
- **⚠️ Attention (3-6h)** : Matinée libre, déplacement long
- **❌ Problématique (>6h)** : Perte de temps importante

## 💡 Exemples de Gaps Normaux

### Cas Typique : Activités → Accommodation
```
15:00 - Fin dernière activité (ex: visite musée)
17:00 - Arrivée à l'hôtel (check-in)

Gap de 2h = ✅ NORMAL
Raisons possibles :
- Temps de trajet (30-60min)
- Pause/détente (30min)
- Check-in standard après 16h
```

### Cas Typique : Activité → Activité
```
11:00 - Fin visite matinale
13:00 - Début activité après-midi

Gap de 2h = ⚠️ ATTENTION (mais souvent normal)
Raisons possibles :
- Pause déjeuner (1-2h)
- Déplacement entre sites
```

### Cas Typique : Accommodation → Activité
```
09:00 - Check-out hôtel
11:00 - Première activité de la journée

Gap de 2h = ✅ NORMAL
Raisons possibles :
- Petit-déjeuner
- Trajet vers première activité
- Préparatifs/chargement voiture
```

## 🚨 Gaps Problématiques à Vérifier

### ❌ Chevauchements (Gap négatif)
- **Toujours problématique** : Impossible d'être à deux endroits
- **Action** : Corriger les horaires

### ❌ Gaps Très Importants
- **>12h activité→accommodation** : Vérifier si logique
- **>6h accommodation→activité** : Perte de temps possible
- **>3h activité→activité** : Planification sous-optimale

## 🔧 Paramétrage dans le Code

Le script `fixStepDatesCalculation.js` utilise ces seuils :

```javascript
function analyzeGap(gapMinutes, fromType, toType) {
    if (fromType === 'activity' && toType === 'accommodation') {
        normalThreshold = 360; // 6h
        warningThreshold = 720; // 12h
    } else if (fromType === 'activity' && toType === 'activity') {
        normalThreshold = 60; // 1h
        warningThreshold = 180; // 3h
    } else if (fromType === 'accommodation' && toType === 'activity') {
        normalThreshold = 180; // 3h
        warningThreshold = 360; // 6h
    }
}
```

## 📝 Exemple Concret (Votre Cas)

```
Norris Geyser Basin Step:
- Activités: 10:00-11:00, 12:00-13:00, 13:30-15:00
- Accommodation: 17:00-09:00 (lendemain)

Gap activité→accommodation: 2h (15:00 → 17:00)
Résultat: ✅ NORMAL - Temps de trajet et check-in standard
```

Ce type de gap est parfaitement logique et ne nécessite aucune correction !
