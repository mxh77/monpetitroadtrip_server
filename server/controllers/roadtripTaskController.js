import RoadtripTask from '../models/RoadtripTask.js';
import Roadtrip from '../models/Roadtrip.js';

/**
 * Récupère toutes les tâches d'un roadtrip
 * @route GET /api/roadtrips/:roadtripId/tasks
 */
export const getRoadtripTasks = async (req, res) => {
    try {
        const { roadtripId } = req.params;
        const { 
            status, 
            category, 
            priority, 
            assignedTo,
            sortBy = 'order',
            sortOrder = 'asc',
            includeCompleted = 'true'
        } = req.query;

        // Vérifier que le roadtrip appartient à l'utilisateur
        const roadtrip = await Roadtrip.findOne({ 
            _id: roadtripId, 
            userId: req.user.id 
        });

        if (!roadtrip) {
            return res.status(404).json({ 
                msg: 'Roadtrip non trouvé ou vous n\'avez pas les permissions nécessaires' 
            });
        }

        // Construire les filtres
        const filters = { 
            roadtripId: roadtripId,
            userId: req.user.id 
        };

        if (status) {
            filters.status = status;
        }

        if (category) {
            filters.category = category;
        }

        if (priority) {
            filters.priority = priority;
        }

        if (assignedTo) {
            filters.assignedTo = new RegExp(assignedTo, 'i');
        }

        // Exclure les tâches complétées si demandé
        if (includeCompleted === 'false') {
            filters.status = { $ne: 'completed' };
        }

        // Définir l'ordre de tri
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Récupérer les tâches
        const tasks = await RoadtripTask.find(filters)
            .populate('attachments')
            .sort(sortOptions)
            .lean();

        // Statistiques sur les tâches
        const stats = await RoadtripTask.aggregate([
            { $match: { roadtripId: roadtrip._id, userId: req.user._id } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const taskStats = {
            total: 0,
            pending: 0,
            in_progress: 0,
            completed: 0,
            cancelled: 0
        };

        stats.forEach(stat => {
            taskStats[stat._id] = stat.count;
            taskStats.total += stat.count;
        });

        // Calculer le pourcentage de completion
        const completionPercentage = taskStats.total > 0 
            ? Math.round((taskStats.completed / taskStats.total) * 100) 
            : 0;

        res.json({
            tasks,
            stats: {
                ...taskStats,
                completionPercentage
            }
        });

    } catch (err) {
        console.error('Error fetching roadtrip tasks:', err);
        res.status(500).json({ 
            msg: 'Erreur serveur lors de la récupération des tâches',
            error: err.message 
        });
    }
};

/**
 * Récupère une tâche spécifique
 * @route GET /api/roadtrips/:roadtripId/tasks/:taskId
 */
export const getRoadtripTask = async (req, res) => {
    try {
        const { roadtripId, taskId } = req.params;

        const task = await RoadtripTask.findOne({
            _id: taskId,
            roadtripId: roadtripId,
            userId: req.user.id
        }).populate('attachments');

        if (!task) {
            return res.status(404).json({ 
                msg: 'Tâche non trouvée ou vous n\'avez pas les permissions nécessaires' 
            });
        }

        res.json(task);

    } catch (err) {
        console.error('Error fetching roadtrip task:', err);
        res.status(500).json({ 
            msg: 'Erreur serveur lors de la récupération de la tâche',
            error: err.message 
        });
    }
};

/**
 * Crée une nouvelle tâche pour un roadtrip
 * @route POST /api/roadtrips/:roadtripId/tasks
 */
export const createRoadtripTask = async (req, res) => {
    try {
        const { roadtripId } = req.params;
        const {
            title,
            description,
            category,
            priority,
            dueDate,
            assignedTo,
            estimatedDuration,
            reminderDate,
            notes,
            attachments
        } = req.body;

        // Vérifier que le roadtrip appartient à l'utilisateur
        const roadtrip = await Roadtrip.findOne({ 
            _id: roadtripId, 
            userId: req.user.id 
        });

        if (!roadtrip) {
            return res.status(404).json({ 
                msg: 'Roadtrip non trouvé ou vous n\'avez pas les permissions nécessaires' 
            });
        }

        // Validation des données requises
        if (!title || title.trim().length === 0) {
            return res.status(400).json({ 
                msg: 'Le titre de la tâche est requis' 
            });
        }

        // Calculer l'ordre pour la nouvelle tâche (à la fin)
        const lastTask = await RoadtripTask.findOne({ 
            roadtripId: roadtripId 
        }).sort({ order: -1 });

        const newOrder = lastTask ? lastTask.order + 1 : 1;

        // Créer la nouvelle tâche
        const newTask = new RoadtripTask({
            userId: req.user.id,
            roadtripId: roadtripId,
            title: title.trim(),
            description: description?.trim() || '',
            category: category || 'preparation',
            priority: priority || 'medium',
            dueDate: dueDate ? new Date(dueDate) : null,
            assignedTo: assignedTo?.trim() || '',
            estimatedDuration: estimatedDuration || null,
            reminderDate: reminderDate ? new Date(reminderDate) : null,
            notes: notes?.trim() || '',
            attachments: attachments || [],
            order: newOrder
        });

        const savedTask = await newTask.save();
        await savedTask.populate('attachments');

        res.status(201).json(savedTask);

    } catch (err) {
        console.error('Error creating roadtrip task:', err);
        res.status(500).json({ 
            msg: 'Erreur serveur lors de la création de la tâche',
            error: err.message 
        });
    }
};

/**
 * Met à jour une tâche existante
 * @route PUT /api/roadtrips/:roadtripId/tasks/:taskId
 */
export const updateRoadtripTask = async (req, res) => {
    try {
        const { roadtripId, taskId } = req.params;
        const updateData = req.body;

        // Vérifier que la tâche appartient à l'utilisateur
        const task = await RoadtripTask.findOne({
            _id: taskId,
            roadtripId: roadtripId,
            userId: req.user.id
        });

        if (!task) {
            return res.status(404).json({ 
                msg: 'Tâche non trouvée ou vous n\'avez pas les permissions nécessaires' 
            });
        }

        // Filtrer les champs autorisés à la mise à jour
        const allowedFields = [
            'title', 'description', 'category', 'priority', 'status',
            'dueDate', 'assignedTo', 'estimatedDuration', 'reminderDate',
            'notes', 'attachments', 'order'
        ];

        const filteredUpdateData = {};
        Object.keys(updateData).forEach(key => {
            if (allowedFields.includes(key)) {
                if (key === 'dueDate' || key === 'reminderDate') {
                    filteredUpdateData[key] = updateData[key] ? new Date(updateData[key]) : null;
                } else if (key === 'title' || key === 'description' || key === 'assignedTo' || key === 'notes') {
                    filteredUpdateData[key] = updateData[key]?.trim() || '';
                } else {
                    filteredUpdateData[key] = updateData[key];
                }
            }
        });

        // Validation du titre si modifié
        if (filteredUpdateData.title !== undefined && filteredUpdateData.title.length === 0) {
            return res.status(400).json({ 
                msg: 'Le titre de la tâche ne peut pas être vide' 
            });
        }

        // Mettre à jour la tâche
        const updatedTask = await RoadtripTask.findByIdAndUpdate(
            taskId,
            filteredUpdateData,
            { new: true, runValidators: true }
        ).populate('attachments');

        res.json(updatedTask);

    } catch (err) {
        console.error('Error updating roadtrip task:', err);
        res.status(500).json({ 
            msg: 'Erreur serveur lors de la mise à jour de la tâche',
            error: err.message 
        });
    }
};

/**
 * Supprime une tâche
 * @route DELETE /api/roadtrips/:roadtripId/tasks/:taskId
 */
export const deleteRoadtripTask = async (req, res) => {
    try {
        const { roadtripId, taskId } = req.params;

        // Vérifier que la tâche appartient à l'utilisateur
        const task = await RoadtripTask.findOne({
            _id: taskId,
            roadtripId: roadtripId,
            userId: req.user.id
        });

        if (!task) {
            return res.status(404).json({ 
                msg: 'Tâche non trouvée ou vous n\'avez pas les permissions nécessaires' 
            });
        }

        await RoadtripTask.findByIdAndDelete(taskId);

        res.json({ 
            msg: 'Tâche supprimée avec succès',
            deletedTaskId: taskId 
        });

    } catch (err) {
        console.error('Error deleting roadtrip task:', err);
        res.status(500).json({ 
            msg: 'Erreur serveur lors de la suppression de la tâche',
            error: err.message 
        });
    }
};

/**
 * Marque une tâche comme complétée ou non complétée
 * @route PATCH /api/roadtrips/:roadtripId/tasks/:taskId/toggle-completion
 */
export const toggleTaskCompletion = async (req, res) => {
    try {
        const { roadtripId, taskId } = req.params;

        // Vérifier que la tâche appartient à l'utilisateur
        const task = await RoadtripTask.findOne({
            _id: taskId,
            roadtripId: roadtripId,
            userId: req.user.id
        });

        if (!task) {
            return res.status(404).json({ 
                msg: 'Tâche non trouvée ou vous n\'avez pas les permissions nécessaires' 
            });
        }

        // Basculer le statut
        const newStatus = task.status === 'completed' ? 'pending' : 'completed';
        
        const updatedTask = await RoadtripTask.findByIdAndUpdate(
            taskId,
            { status: newStatus },
            { new: true, runValidators: true }
        ).populate('attachments');

        res.json(updatedTask);

    } catch (err) {
        console.error('Error toggling task completion:', err);
        res.status(500).json({ 
            msg: 'Erreur serveur lors de la modification du statut de la tâche',
            error: err.message 
        });
    }
};

/**
 * Réorganise l'ordre des tâches
 * @route PATCH /api/roadtrips/:roadtripId/tasks/reorder
 */
export const reorderTasks = async (req, res) => {
    try {
        const { roadtripId } = req.params;
        const { taskOrders } = req.body; // Array d'objets { taskId, order }

        if (!Array.isArray(taskOrders)) {
            return res.status(400).json({ 
                msg: 'taskOrders doit être un tableau d\'objets { taskId, order }' 
            });
        }

        // Vérifier que le roadtrip appartient à l'utilisateur
        const roadtrip = await Roadtrip.findOne({ 
            _id: roadtripId, 
            userId: req.user.id 
        });

        if (!roadtrip) {
            return res.status(404).json({ 
                msg: 'Roadtrip non trouvé ou vous n\'avez pas les permissions nécessaires' 
            });
        }

        // Mettre à jour l'ordre de chaque tâche
        const updatePromises = taskOrders.map(({ taskId, order }) => 
            RoadtripTask.findOneAndUpdate(
                { 
                    _id: taskId, 
                    roadtripId: roadtripId, 
                    userId: req.user.id 
                },
                { order: order },
                { new: true }
            )
        );

        await Promise.all(updatePromises);

        // Récupérer toutes les tâches dans le nouvel ordre
        const reorderedTasks = await RoadtripTask.find({ 
            roadtripId: roadtripId,
            userId: req.user.id 
        })
        .populate('attachments')
        .sort({ order: 1 });

        res.json({ 
            msg: 'Tâches réorganisées avec succès',
            tasks: reorderedTasks 
        });

    } catch (err) {
        console.error('Error reordering tasks:', err);
        res.status(500).json({ 
            msg: 'Erreur serveur lors de la réorganisation des tâches',
            error: err.message 
        });
    }
};

/**
 * Crée des tâches prédéfinies pour un roadtrip
 * @route POST /api/roadtrips/:roadtripId/tasks/generate-defaults
 */
export const generateDefaultTasks = async (req, res) => {
    try {
        const { roadtripId } = req.params;

        // Vérifier que le roadtrip appartient à l'utilisateur
        const roadtrip = await Roadtrip.findOne({ 
            _id: roadtripId, 
            userId: req.user.id 
        });

        if (!roadtrip) {
            return res.status(404).json({ 
                msg: 'Roadtrip non trouvé ou vous n\'avez pas les permissions nécessaires' 
            });
        }

        // Vérifier s'il y a déjà des tâches
        const existingTasksCount = await RoadtripTask.countDocuments({ 
            roadtripId: roadtripId 
        });

        if (existingTasksCount > 0) {
            return res.status(400).json({ 
                msg: 'Des tâches existent déjà pour ce roadtrip' 
            });
        }

        // Tâches prédéfinies basées sur les dates du roadtrip
        const startDate = new Date(roadtrip.startDate);
        const threeDaysBefore = new Date(startDate);
        threeDaysBefore.setDate(startDate.getDate() - 3);
        
        const oneWeekBefore = new Date(startDate);
        oneWeekBefore.setDate(startDate.getDate() - 7);

        const twoWeeksBefore = new Date(startDate);
        twoWeeksBefore.setDate(startDate.getDate() - 14);

        const defaultTasks = [
            {
                title: 'Vérifier la validité du passeport',
                category: 'documents',
                priority: 'high',
                dueDate: twoWeeksBefore,
                description: 'S\'assurer que le passeport est valide pendant toute la durée du voyage',
                order: 1
            },
            {
                title: 'Réserver les hébergements',
                category: 'booking',
                priority: 'high',
                dueDate: twoWeeksBefore,
                description: 'Finaliser toutes les réservations d\'hébergements',
                order: 2
            },
            {
                title: 'Vérifier l\'assurance voyage',
                category: 'documents',
                priority: 'medium',
                dueDate: oneWeekBefore,
                description: 'S\'assurer d\'avoir une assurance voyage valide',
                order: 3
            },
            {
                title: 'Préparer la trousse de premiers secours',
                category: 'health',
                priority: 'medium',
                dueDate: oneWeekBefore,
                description: 'Rassembler médicaments et matériel de premiers secours',
                order: 4
            },
            {
                title: 'Faire les valises',
                category: 'packing',
                priority: 'medium',
                dueDate: threeDaysBefore,
                description: 'Préparer tous les bagages selon la météo et les activités prévues',
                order: 5
            },
            {
                title: 'Vérifier les moyens de paiement',
                category: 'finances',
                priority: 'medium',
                dueDate: threeDaysBefore,
                description: 'S\'assurer d\'avoir espèces, cartes bancaires et moyens de paiement à l\'étranger',
                order: 6
            },
            {
                title: 'Télécharger les cartes hors ligne',
                category: 'preparation',
                priority: 'low',
                dueDate: threeDaysBefore,
                description: 'Télécharger les cartes Google Maps ou autres pour utilisation hors ligne',
                order: 7
            },
            {
                title: 'Vérifier l\'état du véhicule',
                category: 'transport',
                priority: 'high',
                dueDate: threeDaysBefore,
                description: 'Contrôle technique, niveaux, pneus, etc.',
                order: 8
            }
        ];

        // Créer toutes les tâches
        const createdTasks = await Promise.all(
            defaultTasks.map(taskData => {
                const newTask = new RoadtripTask({
                    ...taskData,
                    userId: req.user.id,
                    roadtripId: roadtripId
                });
                return newTask.save();
            })
        );

        res.status(201).json({
            msg: 'Tâches prédéfinies créées avec succès',
            tasks: createdTasks,
            count: createdTasks.length
        });

    } catch (err) {
        console.error('Error generating default tasks:', err);
        res.status(500).json({ 
            msg: 'Erreur serveur lors de la génération des tâches prédéfinies',
            error: err.message 
        });
    }
};
