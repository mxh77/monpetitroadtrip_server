# Guide d'Authentification - Frontend Agent

## 🔐 Vue d'ensemble du système d'authentification

L'application utilise un système d'authentification hybride basé sur **JWT (JSON Web Tokens)** avec stockage en **cookies HTTP-only** pour la sécurité, et support des headers `Authorization` pour l'API.

## 📋 Table des matières
- [Architecture d'authentification](#architecture-dauthentification)
- [Endpoints d'authentification](#endpoints-dauthentification)
- [Types de middleware](#types-de-middleware)
- [Formats de tokens](#formats-de-tokens)
- [Gestion des cookies](#gestion-des-cookies)
- [Exemples d'intégration](#exemples-dintégration)
- [Gestion d'erreurs](#gestion-derreurs)
- [Tests et débogage](#tests-et-débogage)

---

## 🏗️ Architecture d'authentification

### Composants principaux

1. **JWT Tokens** : Tokens signés contenant les informations utilisateur
2. **Cookies HTTP-only** : Stockage sécurisé côté client
3. **Middleware d'authentification** : Validation des requêtes
4. **Support multi-format** : Headers Authorization + Cookies

### Configuration JWT

```javascript
// Configuration par défaut
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

// Structure du payload JWT
{
  "user": {
    "id": "user_id_here"
  },
  "iat": 1234567890,  // Issued at
  "exp": 1234567890   // Expiration
}
```

---

## 🚪 Endpoints d'authentification

### Base URL
```
http://localhost:3000/auth
```

### 1. Inscription (`POST /auth/register`)

**Payload requis :**
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**Réponse succès (201) :**
```json
{
  "token": "jwt_token_here"
}
```

**Réponses d'erreur :**
- `400` : Utilisateur existant
- `500` : Erreur serveur

### 2. Connexion (`POST /auth/login`)

**Payload requis :**
```json
{
  "email": "string",
  "password": "string"
}
```

**Réponse succès (200) :**
```json
{
  "msg": "Login successful",
  "redirectTo": "/home"
}
```

**Cookie défini automatiquement :**
```
Set-Cookie: token=jwt_token_here; HttpOnly; SameSite=lax
```

**Réponses d'erreur :**
- `400` : Identifiants invalides
- `500` : Erreur serveur

### 3. Déconnexion (`GET /auth/logout`)

**Effet :** Supprime le cookie `token`

**Réponse :** Redirection vers `/auth/login`

### 4. Mot de passe oublié (`POST /auth/forgot-password`)

**Payload requis :**
```json
{
  "email": "string"
}
```

### 5. Réinitialisation (`POST /auth/reset-password/:token`)

**Payload requis :**
```json
{
  "password": "string"
}
```

---

## 🛡️ Types de middleware

### 1. Middleware Standard (`auth`)

**Fichier :** `server/middleware/auth.js`

**Comportement :**
- Lit le token depuis les **cookies uniquement**
- Redirige vers `/auth/login` si token manquant/invalide
- Utilise pour les routes web traditionnelles

**Usage dans les routes :**
```javascript
import { auth } from '../middleware/auth.js';

// Protection d'une route
router.get('/protected', auth, controller.method);
```

### 2. Middleware Flexible (`authFlexible`)

**Fichier :** `server/middleware/authFlexible.js`

**Comportement :**
- Lit le token depuis **cookies ET headers Authorization**
- Mode dégradé pour les tests (utilisateur anonyme si token manquant)
- Utilisé pour l'API et les tests

**Ordre de priorité :**
1. Cookie `token`
2. Header `Authorization: Bearer <token>`
3. Mode test anonyme (utilisateur par défaut)

**Usage dans les routes :**
```javascript
import { authFlexible } from '../middleware/authFlexible.js';

// Protection flexible d'une route API
router.post('/api/flexible', authFlexible, controller.method);
```

### 3. Middleware Strict (`authStrict`)

**Comportement :**
- Validation stricte (pas de mode dégradé)
- Rejette les requêtes sans token valide
- Utilise pour la production

---

## 🎫 Formats de tokens

### Structure du payload utilisateur

**Format standard :**
```javascript
{
  "user": {
    "id": "507f1f77bcf86cd799439011"
  }
}
```

**Format étendu (tests) :**
```javascript
{
  "id": "test_user_123",
  "email": "test@example.com", 
  "name": "Test User",
  "role": "user"
}
```

### Durées de validité

- **Inscription :** 360000 secondes (~100 heures)
- **Connexion :** 3600 secondes (1 heure)
- **Tests :** 30 jours (configurable)

---

## 🍪 Gestion des cookies

### Configuration des cookies

```javascript
res.cookie('token', token, {
    httpOnly: true,        // Pas d'accès JavaScript
    secure: false,         // true en HTTPS uniquement
    sameSite: "lax",      // Protection CSRF
});
```

### Lecture côté frontend

**❌ Impossible via JavaScript (httpOnly)**
```javascript
// Ceci ne fonctionne PAS
const token = document.cookie; // Vide car httpOnly
```

**✅ Requêtes automatiques**
```javascript
// Le cookie est envoyé automatiquement
fetch('/api/roadtrips', {
    method: 'GET',
    credentials: 'same-origin'  // Important !
});
```

---

## 🔧 Exemples d'intégration

### 1. Authentification avec cookies (Web App)

```javascript
// Connexion
async function login(email, password) {
    const response = await fetch('/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'same-origin'
    });
    
    if (response.ok) {
        const data = await response.json();
        // Cookie défini automatiquement
        window.location.href = data.redirectTo;
    }
}

// Requête protégée
async function getRoadtrips() {
    const response = await fetch('/api/roadtrips', {
        credentials: 'same-origin'  // Envoie automatiquement le cookie
    });
    
    if (response.status === 401) {
        // Token expiré, rediriger vers login
        window.location.href = '/auth/login';
        return;
    }
    
    return await response.json();
}
```

### 2. Authentification avec headers (API/Mobile)

```javascript
// Stockage du token (localStorage, secure storage, etc.)
let authToken = null;

// Connexion et récupération du token
async function loginAPI(email, password) {
    const response = await fetch('/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
    });
    
    if (response.ok) {
        // Le token est dans le cookie, mais pour l'API on peut l'extraire
        // ou utiliser l'endpoint qui retourne le token en JSON
        const data = await response.json();
        // Stocker le token selon le contexte (localStorage, secure storage, etc.)
    }
}

// Requête avec header Authorization
async function getRoadtripsAPI() {
    const response = await fetch('/api/roadtrips', {
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        }
    });
    
    if (response.status === 401) {
        // Token expiré, relancer l'authentification
        await refreshToken();
    }
    
    return await response.json();
}
```

### 3. Vérification du statut d'authentification

```javascript
export function checkAuthStatus() {
    return fetch('/auth/status', {
        method: 'GET',
        credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(data => {
        if (!data.isAuthenticated) {
            window.location.href = '/auth/login';
        }
        return data;
    })
    .catch(error => {
        console.error('Error checking auth status:', error);
        window.location.href = '/auth/login';
    });
}
```

---

## ⚠️ Gestion d'erreurs

### Codes de réponse d'authentification

| Code | Signification | Action frontend |
|------|---------------|-----------------|
| `200` | Succès | Continuer |
| `400` | Données invalides | Afficher erreur utilisateur |
| `401` | Non autorisé | Rediriger vers login |
| `403` | Accès interdit | Afficher erreur permissions |
| `500` | Erreur serveur | Afficher erreur générique |

### Gestion des tokens expirés

```javascript
async function makeAuthenticatedRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        credentials: 'same-origin'
    });
    
    if (response.status === 401) {
        // Token expiré
        console.log('Token expiré, redirection vers login');
        window.location.href = '/auth/login';
        return null;
    }
    
    return response;
}
```

### Intercepteur global pour les erreurs

```javascript
// Wrapper pour toutes les requêtes API
class APIClient {
    static async request(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        if (response.status === 401) {
            this.handleAuthError();
            return null;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response.json();
    }
    
    static handleAuthError() {
        console.log('Authentification requise');
        window.location.href = '/auth/login';
    }
}
```

---

## 🧪 Tests et débogage

### Génération de tokens de test

```javascript
// Fonction utilitaire pour les tests
function generateTestToken() {
    const testUser = {
        id: 'test_user_123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user'
    };
    
    const token = jwt.sign(testUser, JWT_SECRET, { expiresIn: '30d' });
    return token;
}
```

### Test avec curl

```bash
# Test avec cookie (après login web)
curl -b "token=your_jwt_token" http://localhost:3000/api/roadtrips

# Test avec header Authorization
curl -H "Authorization: Bearer your_jwt_token" http://localhost:3000/api/roadtrips
```

### Test avec Postman

1. **Méthode Cookie :**
   - Faire un POST sur `/auth/login`
   - Le cookie sera défini automatiquement
   - Les requêtes suivantes l'utiliseront

2. **Méthode Header :**
   - Ajouter header `Authorization: Bearer <token>`
   - Utiliser pour toutes les requêtes

### Débogage des tokens

```javascript
// Côté serveur - logs dans les middlewares
console.log('Token from cookie:', req.cookies.token);
console.log('Token from header:', req.headers.authorization);
console.log('Decoded user:', req.user);
```

---

## 🔒 Sécurité et bonnes pratiques

### Configuration CORS

L'application accepte les requêtes depuis :
- `localhost:3000`, `localhost:3001`
- `127.0.0.1:3000`, `127.0.0.1:3001`
- Réseaux locaux `192.168.x.x:3000/3001`

### Recommandations frontend

1. **Toujours inclure `credentials: 'same-origin'`** pour les cookies
2. **Gérer les erreurs 401** avec redirection automatique
3. **Ne pas stocker de tokens sensibles** en localStorage (sauf contexte sécurisé)
4. **Utiliser HTTPS en production** pour `secure: true` sur les cookies
5. **Implémenter un refresh token** pour les sessions longues

### Variables d'environnement importantes

```bash
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=30d
MONGODB_URI=mongodb://localhost:27017/roadtrip
EMAIL=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

---

## 📚 Ressources additionnelles

- **Modèle utilisateur :** `server/models/User.js`
- **Controllers :** `server/controllers/authController.js`
- **Middlewares :** `server/middleware/auth.js`, `server/middleware/authFlexible.js`
- **Routes :** `server/routes/authRoutes.js`
- **Tests :** `testAuth.js`, `testAuthToken.js`

---

*Dernière mise à jour : Juillet 2025*
