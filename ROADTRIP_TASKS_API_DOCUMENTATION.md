# API de Gestion des Tâches de Roadtrip

## Vue d'ensemble

Cette API permet de gérer une liste de tâches (todo list) associées à chaque roadtrip. Les utilisateurs peuvent créer, modifier, supprimer et organiser leurs tâches de préparation de voyage.

## URL de Base

```
http://localhost:3000
```

## Authentification

Toutes les routes nécessitent un token JWT dans l'en-tête Authorization :

```
Authorization: Bearer <JWT_TOKEN>
```

## Structure des Données

### Modèle de Tâche (RoadtripTask)

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "roadtripId": "ObjectId", 
  "title": "string (requis, max 200 chars)",
  "description": "string (max 1000 chars)",
  "category": "enum", // Voir catégories ci-dessous
  "priority": "enum", // low, medium, high, urgent
  "status": "enum", // pending, in_progress, completed, cancelled
  "dueDate": "Date|null",
  "completedAt": "Date|null", // Automatique quand status = completed
  "assignedTo": "string (max 100 chars)", // Nom de la personne
  "estimatedDuration": "number|null", // En minutes
  "reminderDate": "Date|null",
  "attachments": ["ObjectId"], // Références vers des fichiers
  "notes": "string (max 2000 chars)",
  "order": "number", // Pour le tri/réorganisation
  "isRecurring": "boolean",
  "recurringPattern": "enum|null", // daily, weekly, monthly
  "createdAt": "Date",
  "updatedAt": "Date",
  // Champs virtuels calculés:
  "isOverdue": "boolean", // true si dueDate passée et pas completed
  "timeRemaining": "number|null" // millisecondes restantes
}
```

### Catégories Disponibles

- `preparation` - Préparation du voyage
- `booking` - Réservations  
- `packing` - Bagages
- `documents` - Documents/papiers
- `transport` - Transport
- `accommodation` - Hébergement
- `activities` - Activités
- `health` - Santé/médicaments
- `finances` - Finances
- `communication` - Communication
- `other` - Autre

### Priorités

- `low` - Faible
- `medium` - Moyenne (défaut)
- `high` - Élevée
- `urgent` - Urgente

### Statuts

- `pending` - En attente (défaut)
- `in_progress` - En cours
- `completed` - Terminée
- `cancelled` - Annulée

## Endpoints

### 1. Récupérer toutes les tâches d'un roadtrip

```http
GET /roadtrips/{roadtripId}/tasks
```

**Paramètres de requête (optionnels) :**

- `status` - Filtrer par statut
- `category` - Filtrer par catégorie  
- `priority` - Filtrer par priorité
- `assignedTo` - Filtrer par personne assignée (recherche partielle)
- `sortBy` - Champ de tri (défaut: `order`)
- `sortOrder` - Ordre de tri `asc` ou `desc` (défaut: `asc`)
- `includeCompleted` - Inclure les tâches terminées `true`/`false` (défaut: `true`)

**Exemple de requête :**

```http
GET /roadtrips/64f1a2b3c4d5e6f7g8h9i0j1/tasks?category=booking&sortBy=dueDate&sortOrder=asc
```

**Réponse :**

```json
{
  "tasks": [
    {
      "_id": "64f1a2b3c4d5e6f7g8h9i0j2",
      "title": "Réserver l'hôtel à Paris",
      "description": "Hôtel 4 étoiles dans le centre",
      "category": "booking",
      "priority": "high",
      "status": "pending",
      "dueDate": "2025-07-15T00:00:00.000Z",
      "assignedTo": "Marie",
      "estimatedDuration": 30,
      "order": 1,
      "isOverdue": false,
      "timeRemaining": 604800000,
      "createdAt": "2025-07-08T10:00:00.000Z",
      "updatedAt": "2025-07-08T10:00:00.000Z"
    }
  ],
  "stats": {
    "total": 8,
    "pending": 5,
    "in_progress": 2,
    "completed": 1,
    "cancelled": 0,
    "completionPercentage": 13
  }
}
```

### 2. Récupérer une tâche spécifique

```http
GET /roadtrips/{roadtripId}/tasks/{taskId}
```

**Réponse :**

```json
{
  "_id": "64f1a2b3c4d5e6f7g8h9i0j2",
  "title": "Réserver l'hôtel à Paris",
  "description": "Hôtel 4 étoiles dans le centre",
  "category": "booking",
  "priority": "high",
  "status": "pending",
  "dueDate": "2025-07-15T00:00:00.000Z",
  "assignedTo": "Marie",
  "estimatedDuration": 30,
  "notes": "Vérifier les avis sur TripAdvisor",
  "attachments": [],
  "order": 1,
  "isOverdue": false,
  "timeRemaining": 604800000,
  "createdAt": "2025-07-08T10:00:00.000Z",
  "updatedAt": "2025-07-08T10:00:00.000Z"
}
```

### 3. Créer une nouvelle tâche

```http
POST /roadtrips/{roadtripId}/tasks
```

**Corps de la requête :**

```json
{
  "title": "Faire les valises",
  "description": "Préparer les vêtements selon la météo",
  "category": "packing",
  "priority": "medium",
  "dueDate": "2025-07-20T00:00:00.000Z",
  "assignedTo": "Pierre",
  "estimatedDuration": 120,
  "reminderDate": "2025-07-19T20:00:00.000Z",
  "notes": "Ne pas oublier les médicaments"
}
```

**Champs requis :**
- `title` (string, max 200 caractères)

**Champs optionnels :**
- `description`, `category`, `priority`, `dueDate`, `assignedTo`, `estimatedDuration`, `reminderDate`, `notes`, `attachments`

**Réponse :**

```json
{
  "_id": "64f1a2b3c4d5e6f7g8h9i0j3",
  "title": "Faire les valises",
  "description": "Préparer les vêtements selon la météo",
  "category": "packing",
  "priority": "medium",
  "status": "pending",
  "dueDate": "2025-07-20T00:00:00.000Z",
  "assignedTo": "Pierre",
  "estimatedDuration": 120,
  "reminderDate": "2025-07-19T20:00:00.000Z",
  "notes": "Ne pas oublier les médicaments",
  "order": 9,
  "createdAt": "2025-07-08T10:30:00.000Z",
  "updatedAt": "2025-07-08T10:30:00.000Z"
}
```

### 4. Mettre à jour une tâche

```http
PUT /roadtrips/{roadtripId}/tasks/{taskId}
```

**Corps de la requête :**

```json
{
  "status": "in_progress",
  "notes": "Commencé à regarder les options sur Booking.com"
}
```

**Champs modifiables :**
- `title`, `description`, `category`, `priority`, `status`, `dueDate`, `assignedTo`, `estimatedDuration`, `reminderDate`, `notes`, `attachments`, `order`

**Réponse :**
Objet tâche mis à jour (même format que GET)

### 5. Supprimer une tâche

```http
DELETE /roadtrips/{roadtripId}/tasks/{taskId}
```

**Réponse :**

```json
{
  "msg": "Tâche supprimée avec succès",
  "deletedTaskId": "64f1a2b3c4d5e6f7g8h9i0j3"
}
```

### 6. Basculer le statut de completion

```http
PATCH /roadtrips/{roadtripId}/tasks/{taskId}/toggle-completion
```

Bascule automatiquement entre `completed` et `pending`.

**Réponse :**
Objet tâche mis à jour avec le nouveau statut.

### 7. Réorganiser les tâches

```http
PATCH /roadtrips/{roadtripId}/tasks/reorder
```

**Corps de la requête :**

```json
{
  "taskOrders": [
    { "taskId": "64f1a2b3c4d5e6f7g8h9i0j2", "order": 1 },
    { "taskId": "64f1a2b3c4d5e6f7g8h9i0j3", "order": 2 },
    { "taskId": "64f1a2b3c4d5e6f7g8h9i0j4", "order": 3 }
  ]
}
```

**Réponse :**

```json
{
  "msg": "Tâches réorganisées avec succès",
  "tasks": [
    // Array des tâches dans le nouvel ordre
  ]
}
```

### 8. Générer des tâches par défaut

```http
POST /roadtrips/{roadtripId}/tasks/generate-defaults
```

Crée automatiquement 8 tâches prédéfinies basées sur les dates du roadtrip :

1. Vérifier la validité du passeport (2 semaines avant)
2. Réserver les hébergements (2 semaines avant)
3. Vérifier l'assurance voyage (1 semaine avant)
4. Préparer la trousse de premiers secours (1 semaine avant)
5. Faire les valises (3 jours avant)
6. Vérifier les moyens de paiement (3 jours avant)
7. Télécharger les cartes hors ligne (3 jours avant)
8. Vérifier l'état du véhicule (3 jours avant)

**Réponse :**

```json
{
  "msg": "Tâches prédéfinies créées avec succès",
  "tasks": [
    // Array des 8 tâches créées
  ],
  "count": 8
}
```

**Note :** Cette route ne fonctionne que si aucune tâche n'existe déjà pour le roadtrip.

## Codes d'Erreur

### 400 - Bad Request
- Données invalides ou manquantes
- Titre de tâche vide
- Tentative de générer des tâches par défaut quand des tâches existent déjà

### 401 - Unauthorized
- Token JWT manquant ou invalide

### 404 - Not Found  
- Roadtrip non trouvé ou pas d'autorisation
- Tâche non trouvée ou pas d'autorisation

### 500 - Internal Server Error
- Erreur serveur (problème de base de données, etc.)

## Exemples d'Usage Frontend

### React - Hook personnalisé

```javascript
import { useState, useEffect } from 'react';
import axios from 'axios';

const useRoadtripTasks = (roadtripId, token) => {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const fetchTasks = async (filters = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filters);
      const response = await axios.get(
        `/roadtrips/${roadtripId}/tasks?${params}`,
        { headers }
      );
      setTasks(response.data.tasks);
      setStats(response.data.stats);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (taskData) => {
    try {
      const response = await axios.post(
        `/roadtrips/${roadtripId}/tasks`,
        taskData,
        { headers }
      );
      setTasks(prev => [...prev, response.data]);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.msg || 'Erreur lors de la création');
      throw err;
    }
  };

  const updateTask = async (taskId, updateData) => {
    try {
      const response = await axios.put(
        `/roadtrips/${roadtripId}/tasks/${taskId}`,
        updateData,
        { headers }
      );
      setTasks(prev => prev.map(task => 
        task._id === taskId ? response.data : task
      ));
      return response.data;
    } catch (err) {
      setError(err.response?.data?.msg || 'Erreur lors de la mise à jour');
      throw err;
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await axios.delete(
        `/roadtrips/${roadtripId}/tasks/${taskId}`,
        { headers }
      );
      setTasks(prev => prev.filter(task => task._id !== taskId));
    } catch (err) {
      setError(err.response?.data?.msg || 'Erreur lors de la suppression');
      throw err;
    }
  };

  const toggleCompletion = async (taskId) => {
    try {
      const response = await axios.patch(
        `/roadtrips/${roadtripId}/tasks/${taskId}/toggle-completion`,
        {},
        { headers }
      );
      setTasks(prev => prev.map(task => 
        task._id === taskId ? response.data : task
      ));
      return response.data;
    } catch (err) {
      setError(err.response?.data?.msg || 'Erreur lors du changement de statut');
      throw err;
    }
  };

  const reorderTasks = async (taskOrders) => {
    try {
      const response = await axios.patch(
        `/roadtrips/${roadtripId}/tasks/reorder`,
        { taskOrders },
        { headers }
      );
      setTasks(response.data.tasks);
      return response.data.tasks;
    } catch (err) {
      setError(err.response?.data?.msg || 'Erreur lors de la réorganisation');
      throw err;
    }
  };

  const generateDefaults = async () => {
    try {
      const response = await axios.post(
        `/roadtrips/${roadtripId}/tasks/generate-defaults`,
        {},
        { headers }
      );
      setTasks(response.data.tasks);
      return response.data.tasks;
    } catch (err) {
      setError(err.response?.data?.msg || 'Erreur lors de la génération');
      throw err;
    }
  };

  useEffect(() => {
    if (roadtripId && token) {
      fetchTasks();
    }
  }, [roadtripId, token]);

  return {
    tasks,
    stats,
    loading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    toggleCompletion,
    reorderTasks,
    generateDefaults
  };
};

export default useRoadtripTasks;
```

### Composant React d'exemple

```jsx
import React, { useState } from 'react';
import useRoadtripTasks from './hooks/useRoadtripTasks';

const TaskList = ({ roadtripId, token }) => {
  const {
    tasks,
    stats,
    loading,
    error,
    createTask,
    toggleCompletion,
    generateDefaults
  } = useRoadtripTasks(roadtripId, token);

  const [newTaskTitle, setNewTaskTitle] = useState('');

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    try {
      await createTask({
        title: newTaskTitle.trim(),
        category: 'preparation',
        priority: 'medium'
      });
      setNewTaskTitle('');
    } catch (err) {
      console.error('Erreur création tâche:', err);
    }
  };

  const handleToggleComplete = async (taskId) => {
    try {
      await toggleCompletion(taskId);
    } catch (err) {
      console.error('Erreur toggle:', err);
    }
  };

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error}</div>;

  return (
    <div className="task-list">
      <div className="stats">
        <h3>Progression: {stats.completionPercentage}%</h3>
        <p>{stats.completed}/{stats.total} tâches terminées</p>
      </div>

      <form onSubmit={handleCreateTask}>
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Nouvelle tâche..."
          maxLength={200}
        />
        <button type="submit">Ajouter</button>
      </form>

      {tasks.length === 0 && (
        <button onClick={generateDefaults}>
          Générer les tâches par défaut
        </button>
      )}

      <ul>
        {tasks.map(task => (
          <li key={task._id} className={`task ${task.status}`}>
            <input
              type="checkbox"
              checked={task.status === 'completed'}
              onChange={() => handleToggleComplete(task._id)}
            />
            <span className={task.isOverdue ? 'overdue' : ''}>
              {task.title}
            </span>
            {task.dueDate && (
              <small>
                Échéance: {new Date(task.dueDate).toLocaleDateString()}
              </small>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TaskList;
```

## Intégration UI/UX Recommandée

### Fonctionnalités Essentielles
1. **Liste des tâches** avec cases à cocher
2. **Filtrage** par catégorie, statut, priorité
3. **Tri** par échéance, priorité, ordre personnalisé
4. **Drag & drop** pour réorganiser
5. **Indicateur de progression** (% completion)
6. **Badges de priorité** (couleurs différentes)
7. **Alertes pour les tâches en retard**

### Fonctionnalités Avancées
1. **Création rapide** de tâches avec auto-complétion
2. **Édition inline** des titres
3. **Modal détaillée** pour l'édition complète
4. **Groupement** par catégorie avec accordéons
5. **Vue calendrier** pour les échéances
6. **Notifications** pour les rappels
7. **Templates** de listes de tâches par type de voyage

### Responsive Design
- **Mobile** : Liste compacte, swipe actions
- **Tablet** : Vue en grille avec plus de détails
- **Desktop** : Sidebar avec filtres, vue détaillée

## Support Technique

Pour toute question technique ou problème d'intégration :

1. Vérifiez que le serveur est démarré (`npm start`)
2. Testez les endpoints avec le script `testRoadtripTasks.js`
3. Vérifiez l'authentification JWT
4. Consultez les logs serveur pour les erreurs détaillées

## Évolutions Futures

Fonctionnalités prévues :
- **Notifications push** pour les rappels
- **Partage de tâches** entre utilisateurs
- **Templates personnalisés** 
- **Intégration calendrier** externe
- **Import/export** de listes
- **Tâches récurrentes** avancées
