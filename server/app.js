import express from 'express';
import cookieParser from 'cookie-parser';
import axios from 'axios';
import path from 'path';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { auth } from './middleware/auth.js';
import User from './models/User.js';
import authRoutes from './routes/authRoutes.js';
import roadtripRoutes from './routes/roadtripRoutes.js';
import stepRoutes from './routes/stepRoutes.js';
// import stageRoutes from './routes/stageRoutes.js';
// import stopRoutes from './routes/stopRoutes.js';
import accommodationRoutes from './routes/accommodationRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import googleMapsRoutes from './routes/googleMapsRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import aiRoadtripRoutes from './routes/aiRoadtripRoutes.js';
import roadtripTaskRoutes from './routes/roadtripTaskRoutes.js';
import { connectDB } from './config/db.js';

const app = express();

// Convertir l'URL du module en chemin de fichier
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to database
connectDB();

//Log des variables d'environnement
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('JWT_SECRET:', process.env.JWT_SECRET);
console.log('GOOGLE_MAPS_API_KEY:', process.env.GOOGLE_MAPS_API_KEY);
console.log('EMAIL:', process.env.EMAIL);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS - Configuration flexible pour développement local
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001", 
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://192.168.1.2:3000", 
  "http://192.168.1.2:3001",
  // Ajouter d'autres IP courantes de réseaux locaux
  "http://192.168.0.2:3000",
  "http://192.168.0.2:3001",
  "http://192.168.1.3:3000",
  "http://192.168.1.3:3001",
  "http://192.168.1.4:3000",
  "http://192.168.1.4:3001"
];

app.use(cors({
  origin: function (origin, callback) {
    // Permettre les requêtes sans origin (Postman, mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    // Permettre tous les localhost et 127.0.0.1
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    
    // Permettre tous les réseaux locaux 192.168.x.x
    if (origin.match(/^http:\/\/192\.168\.\d+\.\d+:(3000|3001)$/)) {
      return callback(null, true);
    }
    
    // Vérifier la liste explicite
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS: Origin not allowed:', origin);
      console.log('CORS: Allowed patterns: localhost:*, 127.0.0.1:*, 192.168.x.x:3000/3001');
      callback(null, true); // En développement, on peut être plus permissif
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));



// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Configure le répertoire des vues

// Route pour servir login.html
app.get('/auth/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

// Routes avec authentification
app.use('/auth', authRoutes);
app.use('/roadtrips', auth, roadtripRoutes);
app.use('/roadtrips', auth, roadtripTaskRoutes);
app.use('/steps', auth, stepRoutes);
// app.use('/stages', auth, stageRoutes);
// app.use('/stops', auth, stopRoutes);
app.use('/accommodations', auth, accommodationRoutes);
app.use('/activities', auth, activityRoutes);
app.use('/gm', auth, googleMapsRoutes);
app.use('/settings', auth, settingsRoutes);
app.use('/', auth, aiRoadtripRoutes);

// Route pour servir index.html
app.get('/home', auth, (req, res) => {
  console.log('Route /home called');
  res.sendFile(path.resolve(path.join(__dirname, '../public/index.html')));
});

// Rediriger vers /home si l'utilisateur est connecté
app.get('/', auth, (req, res) => {
  console.log('Route / called');
  res.redirect('/home');
});

// Route pour vérifier l'état de connexion
app.get('/auth/status', async (req, res) => {
  const token = req.cookies.token;
  
  if (!token) {
    return res.json({ isAuthenticated: false });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.user.id;
    
    // Récupérer les informations complètes de l'utilisateur depuis la base de données
    const user = await User.findById(userId).select('-password -resetPasswordToken -resetPasswordExpires');
    
    if (!user) {
      return res.json({ isAuthenticated: false });
    }

    res.json({ 
      isAuthenticated: true,
      user: {
        _id: user._id.toString(), // Convertir ObjectId en string
        name: user.username, // Utiliser username comme name
        email: user.email
      }
    });
  } catch (err) {
    console.log('Token is not valid:', err.message);
    res.json({ isAuthenticated: false });
  }
});

app.get('/autocomplete', async (req, res) => {
  const input = req.query.input;  // Input de l'utilisateur

  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json`,
      {
        params: {
          input: input,
          key: process.env.GOOGLE_MAPS_API_KEY,
          types: '',  // Filtrer par type, par exemple pour des adresses
        },
      }
    );

    res.json(response.data);  // Envoi des résultats au client
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la requête à l\'API Google Places' });
  }
});


// Start server
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0'; // Écouter sur toutes les interfaces

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`Server accessible via:`);
  console.log(`  - http://localhost:${PORT}`);
  console.log(`  - http://127.0.0.1:${PORT}`);
  console.log(`  - http://192.168.1.2:${PORT} (your current IP)`);
  console.log(`CORS enabled for local development (localhost, 127.0.0.1, 192.168.x.x)`);
});