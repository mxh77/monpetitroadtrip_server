import express from 'express';
import { 
    getRoadtripTasks,
    getRoadtripTask,
    createRoadtripTask,
    updateRoadtripTask,
    deleteRoadtripTask,
    toggleTaskCompletion,
    reorderTasks,
    generateDefaultTasks
} from '../controllers/roadtripTaskController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(auth);

// Routes pour la gestion des tâches de roadtrip
router.get('/:roadtripId/tasks', getRoadtripTasks);
router.get('/:roadtripId/tasks/:taskId', getRoadtripTask);
router.post('/:roadtripId/tasks', createRoadtripTask);
router.put('/:roadtripId/tasks/:taskId', updateRoadtripTask);
router.delete('/:roadtripId/tasks/:taskId', deleteRoadtripTask);

// Routes spéciales
router.patch('/:roadtripId/tasks/:taskId/toggle-completion', toggleTaskCompletion);
router.patch('/:roadtripId/tasks/reorder', reorderTasks);
router.post('/:roadtripId/tasks/generate-defaults', generateDefaultTasks);

export default router;
