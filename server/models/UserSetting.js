import mongoose from 'mongoose';

const UserSettingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  systemPrompt: { type: String, default: "Tu es le narrateur officiel de MonPetitRoadtrip, une application de roadtrip personnalisée pour les familles et amis. Sois chaleureux, informatif et inclusif." },
  algoliaSearchRadius: { type: Number, default: 50000, min: 1000, max: 200000 }, // Rayon de recherche Algolia en mètres (défaut: 50km, min: 1km, max: 200km)
  dragSnapInterval: { type: Number, default: 15, enum: [5, 10, 15, 30, 60] }, // Pas de déplacement en minutes pour le planning du roadtrip
  enablePhotosInStories: { type: Boolean, default: true }, // Activer l'analyse des photos dans la génération de récits (GPT-4 Vision)
  // Ajoute ici d'autres paramètres personnalisables si besoin
});

export default mongoose.model('UserSetting', UserSettingSchema);
