import jwt from 'jsonwebtoken';

export const auth = (req, res, next) => {
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
        //retourner une erreur 401
        res.status(401).json({ msg: 'No token, authorization denied' });
        res.redirect('/auth/login');
    }
};