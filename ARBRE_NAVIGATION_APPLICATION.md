# Arbre de Navigation - MonPetitRoadtrip Application

## 🏠 HomeScreen (Point d'entrée principal)
**Route**: `/home` ou `/` (avec redirection)  
**Fichier**: `public/index.html`  
**Contrôleur**: `server/app.js` (routes `/home` et `/`)

---

## 📱 Structure Principale de l'Interface

### 🔐 **Zone d'Authentification**
- **🔑 Login Screen**
  - Route: `/auth/login`
  - Fichier: `public/login.html`
  - Actions disponibles:
    - Connexion utilisateur
    - Mot de passe oublié
    - Création de compte

### 🏠 **Interface Principale (HomeScreen)**

#### **1. 📋 Sidebar Gauche (Gestion des Roadtrips)**
- **Liste des Roadtrips**
  - Affichage : `#roadtrips-list`
  - Actions :
    - ➕ **Créer un Roadtrip** (bouton principal)
    - 📋 **Sélection d'un Roadtrip** (navigation vers le détail)
    - 📱 **Vue des Roadtrips de l'utilisateur**

#### **2. 🎯 Header Principal (Zone Utilisateur)**
- **Informations Utilisateur**
  - 👤 **Profil Utilisateur** (icône `fas fa-user`)
  - 🚪 **Déconnexion** (icône `fas fa-sign-out-alt`)
  - 🔔 **Notifications** (système de notifications)

#### **3. 🧭 Zone de Navigation des Vues**
- **Sélecteur de Jour**
  - Navigation temporelle par jour
  - Boutons : `<<`, `<`, Jour actuel, `>`, `>>`
  
- **Modes de Visualisation**
  - 🗺️ **Vue Étapes** (`#steps-button`)
  - 📅 **Vue Calendrier** (`#calendar-button`)
  - 📊 **Vue Timeline** (`#timeline-button`)
  - 📈 **Vue Gantt** (`#gantt-button`)
  - 🛣️ **Vue Itinéraire** (`#itinerary-button`)

---

## 🗺️ **Écrans de Gestion des Roadtrips**

### **A. 📋 Liste des Roadtrips**
**Route API**: `GET /roadtrips`
- **Actions disponibles**:
  - 👁️ Visualiser les roadtrips
  - ➕ Créer un nouveau roadtrip
  - 🔍 Sélectionner un roadtrip

### **B. 📝 Détail d'un Roadtrip**
**Route API**: `GET /roadtrips/:idRoadtrip`
- **Actions disponibles**:
  - ✏️ Modifier le roadtrip
  - 🗑️ Supprimer le roadtrip
  - 📎 Gérer les fichiers (thumbnail, photos, documents)

### **C. 🤖 Génération IA de Roadtrip**
**Routes API**: 
- `POST /roadtrips/ai` (synchrone)
- `POST /roadtrips/ai/async` (asynchrone)
- `GET /roadtrips/ai/jobs/:jobId` (statut du job)

---

## 🚩 **Écrans de Gestion des Étapes (Steps)**

### **A. 📍 Vue Liste des Étapes**
**Section**: `#main-left-section`
- **Types d'étapes**:
  - 🏨 **Stages** (hébergements) - icône `fa-bed`
  - 🚩 **Stops** (arrêts/visites) - icône `fa-flag`

### **B. 📋 Détail d'une Étape**
**Section**: `#main-right-section`
**Routes API**: `GET /steps/:idStep`

#### **🏨 Écran Détail Stage (Hébergement)**
- **Informations générales**:
  - 📝 Nom, adresse, site web
  - 📞 Téléphone, email
  - 🎫 Numéro de réservation
  - 📅 Dates d'arrivée/départ
  - 🌙 Nombre de nuits
  - 📝 Notes
- **Gestion des fichiers**:
  - 🖼️ Vignette
  - 📸 Photos
  - 📄 Documents
- **Actions**:
  - 💾 Sauvegarde
  - 🗑️ Suppression

#### **🚩 Écran Détail Stop (Arrêt/Visite)**
- **Informations générales**:
  - 📝 Nom, adresse, site web
  - 📞 Téléphone, email
  - 🎫 Numéro de réservation
  - 📅 Dates/heures d'arrivée/départ
  - ⏱️ Durée
  - 💰 Prix
  - 📝 Notes
- **Actions spéciales**:
  - 🗺️ Ouvrir dans Google Maps
  - 🥾 Lister les randonnées
  - 📸 Gestion photos/documents

### **C. 🎯 Actions sur les Étapes**
**Routes API**:
- `PUT /steps/:idStep` (modification)
- `DELETE /steps/:idStep` (suppression)
- `POST /roadtrips/:idRoadtrip/steps` (création)
- `POST /roadtrips/:idRoadtrip/steps/natural-language` (création IA)

---

## 🏠 **Écrans de Gestion des Hébergements**

### **A. 📋 Liste des Hébergements**
**Intégré dans**: Détail d'une étape
**Route API**: `GET /accommodations/:idAccommodation`

### **B. 📝 Détail d'un Hébergement**
**Routes API**: 
- `GET /accommodations/:idAccommodation`
- `PUT /accommodations/:idAccommodation`
- `DELETE /accommodations/:idAccommodation`

#### **Sections disponibles**:
- **📋 Informations générales**
- **📸 Gestion des Photos**
  - `GET /accommodations/:idAccommodation/photos`
  - `PATCH /accommodations/:idAccommodation/photos`
  - `DELETE /accommodations/:idAccommodation/photos/:idPhoto`
- **📄 Gestion des Documents**
  - `GET /accommodations/:idAccommodation/documents`
  - `PATCH /accommodations/:idAccommodation/documents`
  - `DELETE /accommodations/:idAccommodation/documents/:idDocument`

### **C. ➕ Création d'Hébergement**
**Route API**: `POST /roadtrips/:idRoadtrip/steps/:idStep/accommodations`

---

## 🎯 **Écrans de Gestion des Activités**

### **A. 📋 Liste des Activités**
**Intégré dans**: Détail d'une étape
**Route API**: `GET /activities/:idActivity`

### **B. 📝 Détail d'une Activité**
**Routes API**:
- `GET /activities/:idActivity`
- `PUT /activities/:idActivity`
- `DELETE /activities/:idActivity`
- `PATCH /activities/:idActivity/dates`

#### **Sections disponibles**:
- **📋 Informations générales**
- **📸 Gestion des Photos**
  - `GET /activities/:idActivity/photos`
  - `PATCH /activities/:idActivity/photos`
  - `DELETE /activities/:idActivity/photos/:idPhoto`
- **📄 Gestion des Documents**
  - `GET /activities/:idActivity/documents`
  - `PATCH /activities/:idActivity/documents`
  - `DELETE /activities/:idActivity/documents/:idDocument`
- **🔗 Liaison Algolia**
  - `POST /activities/:idActivity/link/algolia`
  - `GET /activities/:idActivity/search/algolia`

### **C. ➕ Création d'Activité**
**Routes API**:
- `POST /roadtrips/:idRoadtrip/steps/:idStep/activities`
- `POST /roadtrips/:idRoadtrip/steps/:idStep/activities/natural-language` (IA)

---

## 📊 **Écrans de Visualisation**

### **A. 📅 Vue Calendrier**
**Fonction**: `showCalendar()`
**Fichier**: `public/js/calendar.js`
- Affichage des événements du roadtrip
- Navigation temporelle

### **B. 📊 Vue Timeline**
**Fonction**: `showTimeline()`
**Fichier**: `public/js/timeline.js`
- Chronologie visuelle du roadtrip

### **C. 📈 Vue Gantt**
**Fonction**: `showGantt()`
**Fichier**: `public/js/gantt.js`
- Planification projet du roadtrip

### **D. 🛣️ Vue Itinéraire**
**Fonction**: `showItinerary()`
**Fichier**: `public/js/itinerary.js`
- Carte et directions Google Maps
- Calcul des trajets

---

## 🔧 **Écrans de Configuration**

### **A. ⚙️ Paramètres Globaux**
**Routes API**:
- `GET /settings` (récupération)
- `PUT /settings` (modification)

### **B. 👤 Gestion du Compte**
**Routes API**:
- `GET /auth/status` (statut de connexion)
- `POST /auth/logout` (déconnexion)

---

## 🤖 **Écrans IA et Automatisation**

### **A. 🧠 Génération IA de Roadtrip**
**Routes API**:
- `POST /roadtrips/ai`
- `POST /roadtrips/ai/async`
- `GET /roadtrips/ai/jobs/:jobId`
- `GET /roadtrips/ai/jobs`

### **B. 📝 Génération de Récits**
**Routes API**:
- `GET /steps/:idStep/story`
- `GET /steps/:idStep/story/with-photos`
- `POST /steps/:idStep/story/async`
- `GET /steps/:idStep/story/:jobId/status`
- `PATCH /steps/:idStep/story/regenerate`

### **C. 🤖 Chatbot Assistant**
**Routes API**:
- `POST /roadtrips/:idRoadtrip/chat/query`
- `GET /roadtrips/:idRoadtrip/chat/jobs/:jobId/status`
- `GET /roadtrips/:idRoadtrip/chat/conversations`
- `GET /roadtrips/:idRoadtrip/chat/conversations/:conversationId`

---

## 🔔 **Système de Notifications**

### **A. 📬 Écran des Notifications**
**Routes API**:
- `GET /roadtrips/:idRoadtrip/notifications`
- `PATCH /roadtrips/:idRoadtrip/notifications/:notificationId/read`
- `DELETE /roadtrips/:idRoadtrip/notifications/:notificationId`

---

## 🗺️ **Intégrations Externes**

### **A. 🌍 Google Maps**
**Routes API**:
- `GET /gm/trails` (sentiers de randonnée)
- `GET /gm/steps/reviews` (avis de lieux)
- `GET /gm/directions` (directions)
- `GET /autocomplete` (autocomplétion d'adresses)

### **B. 🥾 Recherche de Randonnées**
**Routes API**:
- `GET /steps/:idStep/hikes-algolia`
- `GET /steps/:idStep/hikes-suggestion`
- `GET /steps/trails/:idTrail/reviews/summary`

---

## 📱 **Gestion des Tâches**

### **A. ✅ Tâches de Roadtrip**
**Routes API**:
- `GET /roadtrips/:roadtripId/tasks`
- `GET /roadtrips/:roadtripId/tasks/:taskId`
- `POST /roadtrips/:roadtripId/tasks`
- `PUT /roadtrips/:roadtripId/tasks/:taskId`
- `DELETE /roadtrips/:roadtripId/tasks/:taskId`
- `PATCH /roadtrips/:roadtripId/tasks/:taskId/toggle-completion`
- `PATCH /roadtrips/:roadtripId/tasks/reorder`
- `POST /roadtrips/:roadtripId/tasks/generate-defaults`
- `POST /roadtrips/:roadtripId/tasks/generate-ai-async`

---

## 🔄 **Écrans de Synchronisation**

### **A. ⏱️ Synchronisation des Temps de Trajet**
**Routes API**:
- `PATCH /roadtrips/:idRoadtrip/travel-time/refresh`
- `PATCH /roadtrips/:idRoadtrip/travel-time/refresh/async`
- `GET /roadtrips/:idRoadtrip/travel-time/jobs/:jobId/status`
- `GET /roadtrips/:idRoadtrip/travel-time/jobs`

### **B. 🔄 Synchronisation des Étapes**
**Routes API**:
- `PATCH /roadtrips/:idRoadtrip/steps/sync/async`
- `GET /roadtrips/:idRoadtrip/steps/sync/jobs/:jobId/status`
- `GET /roadtrips/:idRoadtrip/steps/sync/jobs`
- `PATCH /roadtrips/:idRoadtrip/steps/:idStep/sync`
- `PATCH /roadtrips/:idRoadtrip/steps/:idStep/fix-dates`

---

## 🔑 **Points d'Entrée de Navigation**

1. **🏠 Démarrage** → `/home` (HomeScreen principal)
2. **🔑 Authentification** → `/auth/login` (si non connecté)
3. **📋 Sélection Roadtrip** → Navigation vers détail roadtrip
4. **🗺️ Sélection Étape** → Navigation vers détail étape
5. **🎯 Sélection Activité/Hébergement** → Navigation vers détail
6. **👁️ Changement de Vue** → Timeline/Calendrier/Gantt/Itinéraire
7. **⚙️ Paramètres** → Configuration application
8. **🔔 Notifications** → Système d'alertes

---

## 📚 **Fichiers Javascript Principaux**

- **`js/main.js`** : Point d'entrée et orchestration
- **`js/roadtrip.js`** : Gestion des roadtrips
- **`js/step.js`** : Gestion des étapes
- **`js/accommodation.js`** : Gestion des hébergements
- **`js/activity.js`** : Gestion des activités
- **`js/ui.js`** : Interface utilisateur et interactions
- **`js/auth.js`** : Authentification
- **`js/calendar.js`** : Vue calendrier
- **`js/timeline.js`** : Vue timeline
- **`js/gantt.js`** : Vue Gantt
- **`js/itinerary.js`** : Vue itinéraire
- **`js/googleMaps.js`** : Intégration Google Maps

Cette architecture offre une navigation complète et intuitive pour la gestion de roadtrips avec de multiples points d'entrée et modes de visualisation.
