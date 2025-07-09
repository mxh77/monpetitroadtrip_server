// Middleware d'authentification pour les tests (accepte tokens JWT et cookies)
import jwt from 'jsonwebtoken';

export const authFlexible = (req, res, next) => {
    let token = null;
    
    // Chercher le token dans les cookies d'abord
    if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
        console.log('Token trouvé dans les cookies:', token);
    }
    
    // Chercher le token dans l'en-tête Authorization
    if (!token && req.headers.authorization) {
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
            console.log('Token trouvé dans l\'en-tête Authorization:', token);
        }
    }
    
    if (!token) {
        console.log('Aucun token trouvé, mode test anonyme');
        // En mode test, on peut continuer sans token
        req.user = {
            id: 'test_user_anonymous',
            email: 'test@anonymous.com',
            name: 'Test User Anonymous',
            role: 'user'
        };
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-here');
        req.user = decoded.user || decoded; // Support pour différents formats de token
        console.log('Token valide, utilisateur:', req.user);
        next();
    } catch (err) {
        console.log('Token invalide:', err.message);
        // En mode test, on peut continuer même avec un token invalide
        req.user = {
            id: 'test_user_invalid',
            email: 'test@invalid.com',
            name: 'Test User Invalid',
            role: 'user'
        };
        next();
    }
};

// Middleware strict pour la production
export const authStrict = (req, res, next) => {
    const token = req.cookies.token;
    console.log('token:', token);
    
    if (!token) {
        console.log('No token found, redirecting to /auth/login');
        return res.redirect('/auth/login');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        console.log('Token is not valid:', err.message);
        res.status(401).json({ msg: 'No token, authorization denied' });
        res.redirect('/auth/login');
    }
};
