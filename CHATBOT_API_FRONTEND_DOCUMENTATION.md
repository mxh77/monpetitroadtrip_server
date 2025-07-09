# 🤖 API Chatbot - Documentation Frontend

## 📋 Vue d'ensemble

Le chatbot IA permet d'interagir avec les roadtrips via des commandes en langage naturel. L'API est basée sur un système de **jobs asynchrones** où chaque requête utilisateur déclenche un traitement en arrière-plan.

## 🔗 Configuration de base

### URL de base
```
http://localhost:3000/api/roadtrips/{idRoadtrip}/chat
```

### Authentification
- **Flexible** : Supporte JWT Bearer Token ET mode anonyme
- **Header** : `Authorization: Bearer {token}` (optionnel)
- **Mode test** : Fonctionne sans token pour les tests

## 📡 Routes API Chatbot

### 1. **Traitement des requêtes utilisateur**

#### `POST /api/roadtrips/{idRoadtrip}/chat/query`

**Description :** Traite une requête utilisateur en langage naturel et lance un job asynchrone.

**Paramètres URL :**
- `idRoadtrip` : ID du roadtrip (string, obligatoire)

**Body JSON :**
```json
{
  "query": "Ajoute une étape à Paris du 15 au 17 juillet",
  "conversationId": "optional_conversation_id"
}
```

**Réponse immédiate (200) :**
```json
{
  "success": true,
  "jobId": "job_67890abcdef",
  "conversationId": "conv_12345",
  "message": "Je traite votre demande...",
  "estimatedTime": "30 seconds",
  "intent": "add_step",
  "entities": {
    "location": "Paris",
    "startDate": "2024-07-15",
    "endDate": "2024-07-17"
  }
}
```

**Exemple JavaScript :**
```javascript
async function sendChatMessage(roadtripId, query, conversationId = null) {
  const response = await fetch(`/api/roadtrips/${roadtripId}/chat/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` // Optionnel
    },
    body: JSON.stringify({
      query: query,
      conversationId: conversationId || `chat_${Date.now()}`
    })
  });
  
  return await response.json();
}
```

---

### 2. **Statut des jobs**

#### `GET /api/roadtrips/{idRoadtrip}/chat/jobs/{jobId}/status`

**Description :** Récupère le statut d'un job asynchrone pour suivre son exécution.

**Paramètres URL :**
- `idRoadtrip` : ID du roadtrip (string, obligatoire)
- `jobId` : ID du job (string, obligatoire)

**Réponse (200) :**
```json
{
  "jobId": "job_67890abcdef",
  "status": "completed", // "pending" | "processing" | "completed" | "failed"
  "progress": {
    "percentage": 100,
    "currentStep": "Étape ajoutée",
    "steps": [
      {
        "name": "Analyse de la requête",
        "status": "completed",
        "timestamp": "2024-07-09T10:30:00Z"
      },
      {
        "name": "Création de l'étape",
        "status": "completed",
        "timestamp": "2024-07-09T10:30:15Z"
      }
    ]
  },
  "result": {
    "success": true,
    "action": "add_step",
    "message": "Étape 'Paris' ajoutée avec succès",
    "data": {
      "_id": "step_12345",
      "name": "Paris",
      "arrivalDateTime": "2024-07-15T10:00:00Z",
      "departureDateTime": "2024-07-17T18:00:00Z"
    }
  },
  "executionTime": 15000,
  "completedAt": "2024-07-09T10:30:15Z"
}
```

**Exemple JavaScript :**
```javascript
async function checkJobStatus(roadtripId, jobId) {
  const response = await fetch(`/api/roadtrips/${roadtripId}/chat/jobs/${jobId}/status`, {
    headers: {
      'Authorization': `Bearer ${token}` // Optionnel
    }
  });
  
  return await response.json();
}

// Polling pour suivre un job
async function pollJobStatus(roadtripId, jobId, onUpdate) {
  const poll = async () => {
    const status = await checkJobStatus(roadtripId, jobId);
    onUpdate(status);
    
    if (status.status === 'pending' || status.status === 'processing') {
      setTimeout(poll, 2000); // Vérifier toutes les 2 secondes
    }
  };
  
  poll();
}
```

---

### 3. **Historique des conversations**

#### `GET /api/roadtrips/{idRoadtrip}/chat/conversations`

**Description :** Récupère l'historique des conversations pour un roadtrip.

**Paramètres URL :**
- `idRoadtrip` : ID du roadtrip (string, obligatoire)

**Paramètres de requête :**
- `conversationId` : ID de conversation spécifique (string, optionnel)
- `limit` : Nombre max de messages (number, défaut: 50)

**Réponse (200) :**
```json
{
  "success": true,
  "conversations": [
    {
      "conversationId": "conv_12345",
      "messages": [
        {
          "role": "user",
          "content": "Ajoute une étape à Paris du 15 au 17 juillet",
          "timestamp": "2024-07-09T10:30:00Z"
        },
        {
          "role": "assistant",
          "content": "Je traite votre demande...",
          "timestamp": "2024-07-09T10:30:01Z",
          "intent": "add_step",
          "jobId": "job_67890abcdef"
        },
        {
          "role": "system",
          "content": "✅ Étape 'Paris' ajoutée avec succès",
          "timestamp": "2024-07-09T10:30:15Z",
          "actionType": "add_step",
          "actionResult": { "success": true }
        }
      ]
    }
  ]
}
```

**Exemple JavaScript :**
```javascript
async function getChatHistory(roadtripId, conversationId = null, limit = 50) {
  const params = new URLSearchParams();
  if (conversationId) params.append('conversationId', conversationId);
  params.append('limit', limit);
  
  const response = await fetch(`/api/roadtrips/${roadtripId}/chat/conversations?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}` // Optionnel
    }
  });
  
  return await response.json();
}
```

---

### 4. **Conversation spécifique**

#### `GET /api/roadtrips/{idRoadtrip}/chat/conversations/{conversationId}`

**Description :** Récupère une conversation spécifique par son ID.

**Paramètres URL :**
- `idRoadtrip` : ID du roadtrip (string, obligatoire)
- `conversationId` : ID de la conversation (string, obligatoire)

**Réponse (200) :**
```json
{
  "success": true,
  "conversation": {
    "conversationId": "conv_12345",
    "createdAt": "2024-07-09T10:30:00Z",
    "messages": [
      {
        "role": "user",
        "content": "Ajoute une étape à Paris du 15 au 17 juillet",
        "timestamp": "2024-07-09T10:30:00Z"
      },
      {
        "role": "assistant",
        "content": "Je traite votre demande...",
        "timestamp": "2024-07-09T10:30:01Z",
        "intent": "add_step",
        "jobId": "job_67890abcdef"
      }
    ]
  }
}
```

**Exemple JavaScript :**
```javascript
async function getConversation(roadtripId, conversationId) {
  const response = await fetch(`/api/roadtrips/${roadtripId}/chat/conversations/${conversationId}`, {
    headers: {
      'Authorization': `Bearer ${token}` // Optionnel
    }
  });
  
  return await response.json();
}
```

## 🎯 Flux d'utilisation recommandé

### 1. **Envoi d'un message**
```javascript
// 1. Envoyer la requête utilisateur
const result = await sendChatMessage(roadtripId, "Ajoute une étape à Paris");

// 2. Afficher la réponse immédiate
displayMessage('assistant', result.message);

// 3. Suivre le statut du job
if (result.jobId) {
  pollJobStatus(roadtripId, result.jobId, (status) => {
    if (status.status === 'completed') {
      displayMessage('system', status.result.message);
    } else if (status.status === 'failed') {
      displayMessage('error', status.errorMessage);
    }
  });
}
```

### 2. **Gestion des conversations**
```javascript
// Récupérer l'historique au chargement
const history = await getChatHistory(roadtripId);
displayChatHistory(history.conversations);

// Maintenir un conversationId pour la session
let currentConversationId = `chat_${Date.now()}`;
```

## 🎤 Commandes supportées

### **Gestion des étapes**
```javascript
const stepCommands = [
  "Ajoute une étape à Paris du 15 au 17 juillet",
  "Supprime l'étape de Lyon", 
  "Modifie l'étape de Paris pour finir le 18 juillet",
  "Montre-moi les étapes du roadtrip"
];
```

### **Gestion des hébergements**
```javascript
const accommodationCommands = [
  "Ajoute un hébergement Hôtel Ibis à Paris",
  "Supprime l'hébergement Hôtel de la Paix",
  "Ajoute un logement Airbnb à Marseille du 20 au 22 juillet"
];
```

### **Gestion des activités**
```javascript
const activityCommands = [
  "Ajoute une activité visite du Louvre à Paris le 16 juillet à 14h",
  "Supprime l'activité Tour Eiffel",
  "Ajoute une visite du Château de Versailles"
];
```

### **Gestion des tâches**
```javascript
const taskCommands = [
  "Ajoute une tâche réserver les billets de train",
  "Marque la tâche réservation comme terminée",
  "Supprime la tâche réserver restaurant"
];

// Le chatbot détermine automatiquement la catégorie des tâches :
const taskCategories = {
  booking: "Ajoute une tâche réserver un restaurant",
  documents: "Ajoute une tâche vérifier le passeport", 
  packing: "Ajoute une tâche préparer les valises",
  health: "Ajoute une tâche prendre des médicaments",
  transport: "Ajoute une tâche louer une voiture",
  accommodation: "Ajoute une tâche confirmer l'hôtel",
  activities: "Ajoute une tâche réserver visite du musée",
  finances: "Ajoute une tâche changer de l'argent",
  communication: "Ajoute une tâche activer le roaming",
  preparation: "Ajoute une tâche planifier l'itinéraire",
  other: "Ajoute une tâche autre chose" // Catégorie par défaut
};
```

### **Informations et aide**
```javascript
const helpCommands = [
  "Aide",
  "Que peux-tu faire ?",
  "Montre-moi le résumé du roadtrip",
  "Quelles sont les prochaines étapes ?"
];
```

## ⚠️ Gestion des erreurs

### **Codes d'erreur courants**

#### **400 - Requête invalide**
```json
{
  "success": false,
  "error": "Query parameter is required",
  "code": "MISSING_QUERY"
}
```

#### **401 - Token invalide** (si token fourni)
```json
{
  "success": false,
  "error": "Token invalid or expired",
  "code": "INVALID_TOKEN"
}
```

#### **404 - Ressource non trouvée**
```json
{
  "success": false,
  "error": "Roadtrip not found or not authorized",
  "code": "ROADTRIP_NOT_FOUND"
}
```

#### **422 - Erreur de validation**
```json
{
  "success": false,
  "error": "Validation failed: category `general` is not a valid enum value",
  "code": "VALIDATION_ERROR",
  "details": "Specific validation error message"
}
```

#### **500 - Erreur serveur**
```json
{
  "success": false,
  "error": "Failed to process chatbot request",
  "code": "PROCESSING_ERROR",
  "details": "Specific error message"
}
```

### **Erreurs de job asynchrone**

Quand un job échoue, le statut contiendra les détails de l'erreur :

```json
{
  "jobId": "job_67890abcdef",
  "status": "failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Erreur lors de la création de la tâche",
    "details": "RoadtripTask validation failed: category: `general` is not a valid enum value for path `category`."
  },
  "executionTime": 5000,
  "failedAt": "2024-07-09T10:30:05Z"
}
```

### **Gestion des erreurs en JavaScript**
```javascript
async function handleChatRequest(roadtripId, query) {
  try {
    const result = await sendChatMessage(roadtripId, query);
    
    if (result.success) {
      return result;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Erreur chatbot:', error);
    
    // Gestion spécifique par type d'erreur
    switch (error.code) {
      case 'ROADTRIP_NOT_FOUND':
        showError('Roadtrip non trouvé');
        break;
      case 'INVALID_TOKEN':
        showError('Session expirée, reconnectez-vous');
        break;
      case 'VALIDATION_ERROR':
        showError('Données invalides: ' + error.details);
        break;
      case 'PROCESSING_ERROR':
        showError('Erreur lors du traitement de votre demande');
        break;
      default:
        showError('Une erreur inattendue s\'est produite');
    }
    
    throw error;
  }
}

// Gestion des erreurs de job
function handleJobUpdate(status) {
  if (status.status === 'completed') {
    displayMessage('system', status.result.message);
  } else if (status.status === 'failed') {
    // Afficher l'erreur détaillée
    const errorMessage = status.error?.details || status.error?.message || 'Erreur inconnue';
    displayMessage('error', `Erreur: ${errorMessage}`);
    
    // Log pour débogage
    console.error('Job failed:', status.error);
  }
}
```

## 🔧 Composant React exemple

```jsx
import React, { useState, useEffect } from 'react';

const ChatBot = ({ roadtripId, token }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentJobId, setCurrentJobId] = useState(null);
  
  // Charger l'historique au montage
  useEffect(() => {
    loadChatHistory();
  }, [roadtripId]);
  
  const loadChatHistory = async () => {
    try {
      const history = await getChatHistory(roadtripId);
      if (history.conversations.length > 0) {
        setMessages(history.conversations[0].messages);
      }
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
  };
  
  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    
    try {
      const result = await sendChatMessage(roadtripId, inputMessage);
      
      // Ajouter la réponse immédiate
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.message,
        timestamp: new Date().toISOString()
      }]);
      
      // Suivre le job si nécessaire
      if (result.jobId) {
        setCurrentJobId(result.jobId);
        pollJobStatus(roadtripId, result.jobId, handleJobUpdate);
      }
      
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'error',
        content: 'Erreur lors du traitement de votre demande',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleJobUpdate = (status) => {
    if (status.status === 'completed') {
      setMessages(prev => [...prev, {
        role: 'system',
        content: status.result.message,
        timestamp: new Date().toISOString()
      }]);
      setCurrentJobId(null);
    } else if (status.status === 'failed') {
      setMessages(prev => [...prev, {
        role: 'error',
        content: `Erreur: ${status.errorMessage}`,
        timestamp: new Date().toISOString()
      }]);
      setCurrentJobId(null);
    }
  };
  
  return (
    <div className="chatbot">
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
        {isLoading && <div className="message loading">Traitement en cours...</div>}
      </div>
      
      <div className="chat-input">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Tapez votre message..."
          disabled={isLoading}
        />
        <button onClick={sendMessage} disabled={isLoading}>
          Envoyer
        </button>
      </div>
    </div>
  );
};

export default ChatBot;
```

## 📊 Résumé des routes

| Route | Méthode | Description | Réponse |
|-------|---------|-------------|---------|
| `/chat/query` | POST | Envoie une requête utilisateur | Job ID + réponse immédiate |
| `/chat/jobs/{jobId}/status` | GET | Statut d'un job | Progression + résultat |
| `/chat/conversations` | GET | Historique des conversations | Liste des messages |
| `/chat/conversations/{id}` | GET | Conversation spécifique | Messages de la conversation |

Cette documentation vous donne tout ce qu'il faut pour implémenter le chatbot côté frontend ! 🚀
