import express from 'express';
import { generateRoadtripWithAI } from '../controllers/aiRoadtripController.js';
import { 
    startAsyncRoadtripGeneration, 
    getRoadtripJobStatus, 
    getRoadtripJobsHistory 
} from '../controllers/aiRoadtripAsyncController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Synchronous roadtrip generation (legacy)
router.post('/roadtrips/ai', generateRoadtripWithAI);

// Asynchronous roadtrip generation (new)
router.post('/roadtrips/ai/async', startAsyncRoadtripGeneration);
router.get('/roadtrips/ai/jobs/:jobId', getRoadtripJobStatus);
router.get('/roadtrips/ai/jobs', getRoadtripJobsHistory);

export default router;
