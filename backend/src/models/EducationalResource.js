const mongoose = require('mongoose');

const { Schema } = mongoose;

const educationalResourceSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    // Catégorie thématique définie librement par l'administrateur (ex. "Écrans & sommeil",
    // "Cyberharcèlement"...) : remplace l'ancien champ `type` (article/video/activity/worksheet),
    // qui figeait la classification sur 4 valeurs codées en dur côté serveur.
    category: { type: String, required: true, trim: true },
    ageMin: { type: Number, required: true, min: 3, max: 18 },
    ageMax: { type: Number, required: true, min: 3, max: 18 },
    // Nature du contenu principal de la ressource : détermine quel champ (fileUrl ou
    // externalUrl) porte le contenu réel.
    contentType: {
      type: String,
      enum: ['image', 'pdf', 'video', 'link'],
      required: true,
    },
    // Fichier hébergé par le serveur (upload admin), pour contentType 'image' ou 'pdf'.
    fileUrl: { type: String, trim: true },
    // URL externe (vidéo hébergée ailleurs, ou lien externe), pour contentType 'video' ou 'link'.
    externalUrl: { type: String, trim: true },
    themes: [{ type: String, trim: true, lowercase: true }],
    estimatedMinutes: { type: Number, min: 1, max: 240, default: 10 },
    difficulty: {
      type: String,
      enum: ['debutant', 'intermediaire', 'avance'],
      default: 'debutant',
      required: true,
    },
    // Workflow de publication : une ressource en brouillon n'est jamais visible côté Parent.
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
      required: true,
    },
    publishedAt: { type: Date },
    // Optionnel : absent sur les ressources historiques créées avant ce champ.
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Conserve la compatibilité avec le frontend existant, qui affiche `item.contentUrl`
// sans se soucier de savoir si le contenu est un fichier hébergé ou un lien externe.
educationalResourceSchema.virtual('contentUrl').get(function contentUrl() {
  return this.fileUrl || this.externalUrl || null;
});

educationalResourceSchema.pre('validate', function validateContent(next) {
  if (this.ageMin != null && this.ageMax != null && this.ageMin > this.ageMax) {
    next(new Error("La tranche d'âge est invalide : l'âge minimum dépasse l'âge maximum."));
    return;
  }

  if (['image', 'pdf'].includes(this.contentType) && !this.fileUrl) {
    next(new Error('Un fichier est requis pour une ressource de type image ou PDF.'));
    return;
  }

  if (['video', 'link'].includes(this.contentType) && !this.externalUrl) {
    next(new Error('Une URL est requise pour une ressource de type vidéo ou lien externe.'));
    return;
  }

  next();
});

educationalResourceSchema.index({ category: 1, ageMin: 1, ageMax: 1, status: 1 });
educationalResourceSchema.index({ themes: 1 });

module.exports = mongoose.model('EducationalResource', educationalResourceSchema);
