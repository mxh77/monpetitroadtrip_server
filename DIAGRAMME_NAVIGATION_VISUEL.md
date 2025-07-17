# 🗺️ Diagramme Visuel de Navigation - MonPetitRoadtrip

```
                                    ┌─────────────────────────────────────────────────────────────────┐
                                    │                    🔐 AUTHENTIFICATION                          │
                                    │                                                                 │
                                    │  ┌─────────────────┐    ┌─────────────────┐                  │
                                    │  │   🔑 LOGIN      │    │  📝 REGISTER    │                  │
                                    │  │  /auth/login    │    │                 │                  │
                                    │  │                 │    │                 │                  │
                                    │  └─────────────────┘    └─────────────────┘                  │
                                    │           │                        │                          │
                                    │           └────────────────────────┘                          │
                                    └─────────────────────────────────────┼─────────────────────────┘
                                                                          │
                                                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                    🏠 HOMESCREEN PRINCIPALE                                                                           │
│                                                       /home ou /                                                                                     │
├───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                                                                       │
│  ┌─────────────────────────┐    ┌───────────────────────────────────────────────────────────────────────────────────────────────┐                 │
│  │     📋 SIDEBAR          │    │                               🎯 ZONE PRINCIPALE                                                │                 │
│  │   Gestion Roadtrips     │    │                                                                                                   │                 │
│  │                         │    │  ┌─────────────────────────┐    ┌──────────────────────────────────────────────────────────┐    │                 │
│  │  ┌─────────────────┐    │    │  │    👤 HEADER UTILISATEUR │    │           🧭 NAVIGATION VUES                             │    │                 │
│  │  │  ➕ Créer       │    │    │  │                         │    │                                                          │    │                 │
│  │  │  Roadtrip       │    │    │  │  👤 Profil  🚪 Logout  │    │  🗺️ Étapes │ 📅 Calendrier │ 📊 Timeline │ 📈 Gantt │ 🛣️ Itinéraire    │    │                 │
│  │  └─────────────────┘    │    │  │  🔔 Notifications        │    │                                                          │    │                 │
│  │                         │    │  └─────────────────────────┘    └──────────────────────────────────────────────────────────┘    │                 │
│  │  📋 Liste Roadtrips:    │    │                                                                                                   │                 │
│  │  ┌─────────────────┐    │    │  ┌─────────────────────────────────────────────────────────────────────────────────────────┐    │                 │
│  │  │ 🚗 Roadtrip 1   │────┼────┼──│                        🎯 ZONE DE CONTENU DYNAMIQUE                              │    │                 │
│  │  │ 🚗 Roadtrip 2   │    │    │  │                                                                                     │    │                 │
│  │  │ 🚗 Roadtrip 3   │    │    │  │  Contenu change selon la sélection dans sidebar et navigation                      │    │                 │
│  │  └─────────────────┘    │    │  │                                                                                     │    │                 │
│  └─────────────────────────┘    │  └─────────────────────────────────────────────────────────────────────────────────────────┘    │                 │
│                                 └───────────────────────────────────────────────────────────────────────────────────────────────────┘                 │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                                          │
                        ┌─────────────────────────────────────────────────┼─────────────────────────────────────────────────┐
                        │                                                 │                                                 │
                        ▼                                                 ▼                                                 ▼
┌─────────────────────────────────────┐          ┌─────────────────────────────────────┐          ┌─────────────────────────────────────┐
│        🗺️ VUE ÉTAPES               │          │         📅 VUE CALENDRIER           │          │       📊 VUE TIMELINE              │
│                                     │          │                                     │          │                                     │
│  ┌───────────────┐ ┌─────────────┐  │          │  ┌─────────────────────────────┐    │          │  ┌─────────────────────────────┐    │
│  │ 📋 LISTE      │ │ 📝 DÉTAIL   │  │          │  │     📅 Événements          │    │          │  │    📊 Chronologie          │    │
│  │ ÉTAPES        │ │ ÉTAPE       │  │          │  │     du Roadtrip            │    │          │  │    Visuelle                 │    │
│  │               │ │             │  │          │  │                             │    │          │  │                             │    │
│  │ 🏨 Stage 1    │ │ 📋 Infos    │  │          │  │  Navigation temporelle      │    │          │  │  Ligne de temps interactive │    │
│  │ 🚩 Stop 1     │ │ 📸 Photos   │  │          │  │                             │    │          │  │                             │    │
│  │ 🏨 Stage 2    │ │ 📄 Docs     │  │          │  └─────────────────────────────┘    │          │  └─────────────────────────────┘    │
│  │ 🚩 Stop 2     │ │ 🏠 Héberg.  │  │          └─────────────────────────────────────┘          └─────────────────────────────────────┘
│  │               │ │ 🎯 Activités│  │                                                                                                   │
│  └───────────────┘ └─────────────┘  │                                                                                                   │
└─────────────────────────────────────┘                                                                                                   │
                    │                                                                                                                     │
                    ▼                                                                                                                     │
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│                                          📋 DÉTAIL D'UNE ÉTAPE                                                                      │   │
│                                                                                                                                     │   │
│  ┌─────────────────────────────────────┐                           ┌─────────────────────────────────────┐                        │   │
│  │        🏨 STAGE (Hébergement)       │                           │         🚩 STOP (Visite)            │                        │   │
│  │                                     │                           │                                     │                        │   │
│  │  📝 Informations générales:         │                           │  📝 Informations générales:         │                        │   │
│  │  • Nom, adresse, site web          │                           │  • Nom, adresse, site web          │                        │   │
│  │  • Téléphone, email                │                           │  • Téléphone, email                │                        │   │
│  │  • N° réservation                  │                           │  • N° réservation                  │                        │   │
│  │  • Dates arrivée/départ            │                           │  • Dates/heures arrivée/départ     │                        │   │
│  │  • Nombre de nuits                 │                           │  • Durée, prix                     │                        │   │
│  │  • Notes                           │                           │  • Notes                           │                        │   │
│  │                                     │                           │                                     │                        │   │
│  │  📎 Gestion fichiers:              │                           │  📎 Actions spéciales:             │                        │   │
│  │  • 🖼️ Vignette                     │                           │  • 🗺️ Ouvrir Google Maps           │                        │   │
│  │  • 📸 Photos                       │                           │  • 🥾 Lister randonnées            │                        │   │
│  │  • 📄 Documents                    │                           │  • 📸 Gestion photos/docs          │                        │   │
│  │                                     │                           │                                     │                        │   │
│  │  💾 Sauvegarde | 🗑️ Suppression    │                           │  💾 Sauvegarde | 🗑️ Suppression    │                        │   │
│  └─────────────────────────────────────┘                           └─────────────────────────────────────┘                        │   │
│                    │                                                                  │                                              │   │
│                    ▼                                                                  ▼                                              │   │
│  ┌─────────────────────────────────────┐                           ┌─────────────────────────────────────┐                        │   │
│  │         🏠 HÉBERGEMENTS             │                           │          🎯 ACTIVITÉS               │                        │   │
│  │                                     │                           │                                     │                        │   │
│  │  📋 Liste des hébergements         │                           │  📋 Liste des activités            │                        │   │
│  │  ➕ Créer hébergement              │                           │  ➕ Créer activité                 │                        │   │
│  │                                     │                           │  🤖 Créer avec IA                  │                        │   │
│  │  Pour chaque hébergement:          │                           │                                     │                        │   │
│  │  • 📝 Informations générales       │                           │  Pour chaque activité:             │                        │   │
│  │  • 📸 Gestion photos               │                           │  • 📝 Informations générales       │                        │   │
│  │  • 📄 Gestion documents            │                           │  • 📸 Gestion photos               │                        │   │
│  │  • ✏️ Modifier | 🗑️ Supprimer      │                           │  • 📄 Gestion documents            │                        │   │
│  │                                     │                           │  • 🔗 Liaison Algolia              │                        │   │
│  │                                     │                           │  • ✏️ Modifier | 🗑️ Supprimer      │                        │   │
│  └─────────────────────────────────────┘                           └─────────────────────────────────────┘                        │   │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘   │
                                                                                                                                         │
┌─────────────────────────────────────┐          ┌─────────────────────────────────────┐   ┌─────────────────────────────────────┐   │
│        📈 VUE GANTT                │          │         🛣️ VUE ITINÉRAIRE          │   │        ⚙️ CONFIGURATIONS           │   │
│                                     │          │                                     │   │                                     │   │
│  ┌─────────────────────────────┐    │          │  ┌─────────────────────────────┐    │   │  ┌─────────────────────────────┐    │   │
│  │  📊 Planification projet   │    │          │  │   🗺️ Carte Google Maps     │    │   │  │  ⚙️ Paramètres globaux     │    │   │
│  │  du roadtrip               │    │          │  │   Directions et trajets     │    │   │  │                             │    │   │
│  │                             │    │          │  │                             │    │   │  │  👤 Gestion compte         │    │   │
│  │  Diagramme de Gantt        │    │          │  │  Calcul itinéraires         │    │   │  │                             │    │   │
│  │  interactif                 │    │          │  │  Optimisation trajets       │    │   │  │  GET /settings             │    │   │
│  │                             │    │          │  │                             │    │   │  │  PUT /settings             │    │   │
│  └─────────────────────────────┘    │          │  └─────────────────────────────┘    │   │  │  GET /auth/status          │    │   │
└─────────────────────────────────────┘          └─────────────────────────────────────┘   │  │  POST /auth/logout         │    │   │
                                                                                            │  └─────────────────────────────┘    │   │
                                                                                            └─────────────────────────────────────┘   │
                                                                                                                                      │
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
│
├─── 🤖 FONCTIONNALITÉS IA & AUTOMATISATION ───────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                                                                   │
│  ┌─────────────────────────────────────┐    ┌─────────────────────────────────────┐    ┌─────────────────────────────────────┐  │
│  │     🧠 GÉNÉRATION IA ROADTRIP       │    │       📝 GÉNÉRATION RÉCITS          │    │       🤖 CHATBOT ASSISTANT          │  │
│  │                                     │    │                                     │    │                                     │  │
│  │  POST /roadtrips/ai                │    │  GET /steps/:id/story               │    │  POST /:id/chat/query               │  │
│  │  POST /roadtrips/ai/async          │    │  GET /steps/:id/story/with-photos   │    │  GET /:id/chat/jobs/:jobId/status   │  │
│  │  GET /roadtrips/ai/jobs/:jobId     │    │  POST /steps/:id/story/async        │    │  GET /:id/chat/conversations        │  │
│  │  GET /roadtrips/ai/jobs            │    │  GET /steps/:id/story/:jobId/status │    │  GET /:id/chat/conversations/:id    │  │
│  │                                     │    │  PATCH /steps/:id/story/regenerate  │    │                                     │  │
│  │  🔄 Synchrone et Asynchrone        │    │                                     │    │  💬 Assistant intelligent           │  │
│  │  📊 Suivi des jobs                 │    │  🖼️ Avec/sans photos               │    │  💾 Historique conversations       │  │
│  └─────────────────────────────────────┘    │  🔄 Régénération possible          │    │  ⚡ Traitement en temps réel       │  │
│                                              └─────────────────────────────────────┘    └─────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
│
├─── 🔔 SYSTÈME DE NOTIFICATIONS ──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                      📬 ÉCRAN DES NOTIFICATIONS                                                            │  │
│  │                                                                                                                             │  │
│  │  GET /roadtrips/:idRoadtrip/notifications                    📱 Affichage des notifications                               │  │
│  │  PATCH /roadtrips/:idRoadtrip/notifications/:id/read        ✅ Marquer comme lu                                          │  │
│  │  DELETE /roadtrips/:idRoadtrip/notifications/:id            🗑️ Supprimer notification                                    │  │
│  │                                                                                                                             │  │
│  │  🔔 Notifications en temps réel     📊 Statut des tâches    ⚡ Mises à jour instantanées                                 │  │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
│
├─── 🗺️ INTÉGRATIONS EXTERNES ────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                                                                   │
│  ┌─────────────────────────────────────┐                        ┌─────────────────────────────────────┐                        │
│  │        🌍 GOOGLE MAPS               │                        │     🥾 RECHERCHE RANDONNÉES         │                        │
│  │                                     │                        │                                     │                        │
│  │  GET /gm/trails                    │                        │  GET /steps/:id/hikes-algolia      │                        │
│  │  GET /gm/steps/reviews             │                        │  GET /steps/:id/hikes-suggestion   │                        │
│  │  GET /gm/directions                │                        │  GET /steps/trails/:id/reviews/... │                        │
│  │  GET /autocomplete                 │                        │                                     │                        │
│  │                                     │                        │  🔍 Powered by Algolia             │                        │
│  │  🗺️ Cartes et directions           │                        │  ⭐ Avis et recommandations         │                        │
│  │  📍 Autocomplétion adresses        │                        │  🏔️ Sentiers de randonnée          │                        │
│  │  ⭐ Avis de lieux                   │                        │  📊 Synthèse des avis              │                        │
│  └─────────────────────────────────────┘                        └─────────────────────────────────────┘                        │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
│
├─── 📱 GESTION DES TÂCHES ────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                        ✅ TÂCHES DE ROADTRIP                                                              │  │
│  │                                                                                                                             │  │
│  │  GET /roadtrips/:id/tasks                           📋 Liste des tâches                                                  │  │
│  │  POST /roadtrips/:id/tasks                          ➕ Créer tâche                                                       │  │
│  │  PUT /roadtrips/:id/tasks/:taskId                   ✏️ Modifier tâche                                                    │  │
│  │  DELETE /roadtrips/:id/tasks/:taskId                🗑️ Supprimer tâche                                                  │  │
│  │  PATCH /roadtrips/:id/tasks/:taskId/toggle-completion  ✅ Marquer terminée                                               │  │
│  │  PATCH /roadtrips/:id/tasks/reorder                 🔄 Réorganiser tâches                                               │  │
│  │  POST /roadtrips/:id/tasks/generate-defaults        📝 Générer tâches par défaut                                        │  │
│  │  POST /roadtrips/:id/tasks/generate-ai-async        🤖 Générer tâches avec IA                                           │  │
│  │                                                                                                                             │  │
│  │  ✅ Gestion complète du cycle de vie des tâches    🤖 Génération automatique avec IA                                    │  │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
│
└─── 🔄 SYNCHRONISATION ET AUTOMATISATION ────────────────────────────────────────────────────────────────────────────────────────┐
                                                                                                                                   │
  ┌─────────────────────────────────────┐                        ┌─────────────────────────────────────┐                        │
  │    ⏱️ SYNC TEMPS DE TRAJET          │                        │       🔄 SYNC DES ÉTAPES            │                        │
  │                                     │                        │                                     │                        │
  │  PATCH /:id/travel-time/refresh     │                        │  PATCH /:id/steps/sync/async       │                        │
  │  PATCH /:id/travel-time/refresh/... │                        │  GET /:id/steps/sync/jobs/:jobId/  │                        │
  │  GET /:id/travel-time/jobs/:jobId/  │                        │  GET /:id/steps/sync/jobs          │                        │
  │  GET /:id/travel-time/jobs          │                        │  PATCH /:id/steps/:stepId/sync     │                        │
  │                                     │                        │  PATCH /:id/steps/:stepId/fix-dates│                        │
  │  🚗 Calcul automatique trajets     │                        │                                     │                        │
  │  ⏰ Synchronisation horaires        │                        │  🔄 Sync automatique des étapes    │                        │
  │  📊 Suivi des jobs async           │                        │  📅 Correction automatique dates   │                        │
  └─────────────────────────────────────┘                        │  📊 Monitoring des processus       │                        │
                                                                  └─────────────────────────────────────┘                        │
                                                                                                                                   │
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│                                      🔑 POINTS D'ENTRÉE PRINCIPAUX                                                             │  │
│                                                                                                                                 │  │
│  1️⃣ 🏠 DÉMARRAGE → /home (HomeScreen principal)                                                                               │  │
│  2️⃣ 🔑 AUTHENTIFICATION → /auth/login (si non connecté)                                                                      │  │
│  3️⃣ 📋 SÉLECTION ROADTRIP → Navigation vers détail roadtrip                                                                  │  │
│  4️⃣ 🗺️ SÉLECTION ÉTAPE → Navigation vers détail étape                                                                        │  │
│  5️⃣ 🎯 SÉLECTION ACTIVITÉ/HÉBERGEMENT → Navigation vers détail                                                               │  │
│  6️⃣ 👁️ CHANGEMENT DE VUE → Timeline/Calendrier/Gantt/Itinéraire                                                             │  │
│  7️⃣ ⚙️ PARAMÈTRES → Configuration application                                                                                │  │
│  8️⃣ 🔔 NOTIFICATIONS → Système d'alertes                                                                                     │  │
│                                                                                                                                 │  │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘  │
                                                                                                                                   │
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│                                      📚 FICHIERS JAVASCRIPT PRINCIPAUX                                                         │  │
│                                                                                                                                 │  │
│  🎯 js/main.js → Point d'entrée et orchestration                                                                              │  │
│  🚗 js/roadtrip.js → Gestion des roadtrips                                                                                    │  │
│  🗺️ js/step.js → Gestion des étapes                                                                                           │  │
│  🏠 js/accommodation.js → Gestion des hébergements                                                                            │  │
│  🎯 js/activity.js → Gestion des activités                                                                                    │  │
│  🖥️ js/ui.js → Interface utilisateur et interactions                                                                          │  │
│  🔐 js/auth.js → Authentification                                                                                             │  │
│  📅 js/calendar.js → Vue calendrier                                                                                           │  │
│  📊 js/timeline.js → Vue timeline                                                                                             │  │
│  📈 js/gantt.js → Vue Gantt                                                                                                   │  │
│  🛣️ js/itinerary.js → Vue itinéraire                                                                                          │  │
│  🗺️ js/googleMaps.js → Intégration Google Maps                                                                               │  │
│                                                                                                                                 │  │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘  │
                                                                                                                                   │
                      ════════════════════════════════════════════════════════════════════════════════════════════════════════════┘
                      🎯 ARCHITECTURE COMPLETE: Navigation intuitive avec multiples points d'entrée et modes de visualisation
                         Plus de 50 écrans/vues accessibles | Intégration IA avancée | Synchronisation temps réel
```
