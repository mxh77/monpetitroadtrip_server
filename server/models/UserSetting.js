import mongoose from 'mongoose';

const UserSettingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  systemPrompt: { type: String, default: "Tu es le narrateur officiel de MonPetitRoadtrip, une application de roadtrip personnalisée pour les familles et amis. Sois chaleureux, informatif et inclusif." },
  // Ajoute ici d'autres paramètres personnalisables si besoin
});

export default mongoose.model('UserSetting', UserSettingSchema);
