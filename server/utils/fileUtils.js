import multer from 'multer';
import { Storage } from '@google-cloud/storage';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Configuration de Google Cloud Storage
const storage = new Storage({
    credentials: {
        type: process.env.GCS_TYPE,
        project_id: process.env.GCS_PROJECT_ID,
        private_key_id: process.env.GCS_PRIVATE_KEY_ID,
        private_key: process.env.GCS_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.GCS_CLIENT_EMAIL,
        client_id: process.env.GCS_CLIENT_ID,
        auth_uri: process.env.GCS_AUTH_URI,
        token_uri: process.env.GCS_TOKEN_URI,
        auth_provider_x509_cert_url: process.env.GCS_AUTH_PROVIDER_X509_CERT_URL,
        client_x509_cert_url: process.env.GCS_CLIENT_X509_CERT_URL
    },
    projectId: process.env.GCS_PROJECT_ID
});

const bucket = storage.bucket('monpetitroadtrip'); // Remplacez par le nom de votre bucket

// Configuration de multer pour gérer les uploads de fichiers
const multerStorage = multer.memoryStorage();
const uploadPhotos = multer({ storage: multerStorage }).array('photos', 10); // Limite à 10 fichiers
const uploadThumbnail = multer({ storage: multerStorage }).single('thumbnail'); // Pour un seul fichier nommé 'thumbnail'

// Exporter les configurations de multer
export { uploadPhotos, uploadThumbnail };

// Fonction pour uploader un fichier sur Google Cloud Storage
export const uploadToGCS = (file, entityId) => {
    return new Promise((resolve, reject) => {
        // Validation des paramètres d'entrée
        if (!file || !file.buffer || !file.originalname) {
            return reject(new Error('Fichier invalide ou manquant'));
        }
        
        if (!entityId) {
            return reject(new Error('Entity ID manquant'));
        }

        console.log('Uploading to GCS:', { 
            originalname: file.originalname, 
            entityId, 
            size: file.buffer.length,
            mimetype: file.mimetype 
        });

        // Vérifier la taille du fichier (limite 20MB)
        if (file.buffer.length > 20 * 1024 * 1024) {
            return reject(new Error('Fichier trop volumineux (max 20MB)'));
        }

        const fileExtension = path.extname(file.originalname);
        const newFileName = `${entityId}/${uuidv4()}${fileExtension}`;
        console.log('Generated new file name:', newFileName);

        const blob = bucket.file(newFileName);
        const blobStream = blob.createWriteStream({
            resumable: false, // Garder false pour les fichiers < 20MB
            contentType: file.mimetype,
            metadata: {
                contentType: file.mimetype,
                cacheControl: 'public, max-age=31536000',
            }
        });

        // Timeout adapté pour les gros fichiers
        const timeout = setTimeout(() => {
            blobStream.destroy();
            reject(new Error('Timeout lors de l\'upload vers GCS'));
        }, 60000); // 60 secondes pour les gros fichiers

        blobStream.on('error', (err) => {
            clearTimeout(timeout);
            console.error('Error during blob stream:', err);
            reject(new Error(`Erreur upload GCS: ${err.message}`));
        });

        blobStream.on('finish', async () => {
            clearTimeout(timeout);
            try {
                console.log('File uploaded successfully to GCS');
                
                // Générer l'URL signée avec une expiration longue
                const [url] = await blob.getSignedUrl({
                    action: 'read',
                    expires: '03-01-2500' // Expiration en 2500
                });
                
                console.log('Signed URL generated:', url);
                resolve(url);
            } catch (err) {
                console.error('Error getting signed URL:', err);
                reject(new Error(`Erreur finalisation upload: ${err.message}`));
            }
        });

        blobStream.end(file.buffer);
    });
};

// Fonction pour uploader une image pour une entité
export const uploadEntityImage = async (req, res, entity, entityId, imageField) => {
    try {
        console.log('Uploading entity image:', { entityId, imageField });

        const imageUrl = await uploadToGCS(req.files[imageField][0], entityId);
        console.log('Image URL:', imageUrl);

        // Mettre à jour le champ d'image spécifié
        entity[imageField] = imageUrl;
        await entity.save();

        console.log('Entity updated successfully:', entity);
        res.json(entity);
    } catch (err) {
        console.error('Error uploading entity image:', err.message);
        res.status(500).send('Server error');
    }
};

// Fonction pour supprimer un fichier de Google Cloud Storage
export const deleteFromGCS = (fileUrl) => {
    return new Promise((resolve, reject) => {
        console.log('Deleting from GCS:', fileUrl);

        let fileName;
        if (fileUrl.startsWith('https://storage.googleapis.com/')) {
            fileName = fileUrl.split('/').slice(4).join('/').split('?')[0];
        } else if (fileUrl.startsWith('https://storage.cloud.google.com/')) {
            fileName = fileUrl.split('/').slice(4).join('/').split('?')[0];
        } else if (fileUrl.startsWith('gs://')) {
            fileName = fileUrl.split('/').slice(3).join('/');
        } else {
            const error = new Error('Invalid URL format');
            console.error(error);
            return reject(error);
        }

        console.log('Parsed file name:', fileName);

        const file = bucket.file(fileName);
        file.delete((err, apiResponse) => {
            if (err) {
                console.error('Error deleting file:', err);
                return reject(err);
            }
            console.log('File deleted successfully:', apiResponse);
            resolve(apiResponse);
        });
    });
};