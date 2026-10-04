const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const AppError = require('../utils/AppError');

// Racine de stockage des fichiers uploadés par l'administrateur pour les ressources
// éducatives (image ou PDF). Servi statiquement en lecture seule depuis app.js.
const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads', 'education');
fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const ALLOWED_MIME_BY_TYPE = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  pdf: ['application/pdf'],
};

const EXTENSION_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
};

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 Mo, suffisant pour une image ou un PDF pédagogique.

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_ROOT),
  filename: (_req, file, cb) => {
    const ext = EXTENSION_BY_MIME[file.mimetype] || path.extname(file.originalname) || '';
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  // `contentType` est envoyé dans le corps multipart par le formulaire admin : il détermine
  // quels types MIME sont acceptés pour CE champ fichier précis (une image ne doit pas
  // pouvoir être uploadée déguisée en "pdf" ou inversement).
  const declaredType = req.body?.contentType;
  const allowed = ALLOWED_MIME_BY_TYPE[declaredType];

  if (!allowed) {
    cb(new AppError("Type de contenu invalide : attendu 'image' ou 'pdf' pour un fichier uploadé.", 400));
    return;
  }

  if (!allowed.includes(file.mimetype)) {
    cb(new AppError(`Format de fichier non autorisé pour une ressource de type ${declaredType}.`, 400));
    return;
  }

  cb(null, true);
};

const singleFileUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
}).single('file');

// Convertit les erreurs multer (ex. fichier trop volumineux) en AppError avec le bon
// statut HTTP 400, plutôt que de laisser le gestionnaire d'erreurs global retomber sur
// un 500 générique pour ce qui reste une erreur de saisie côté client.
const uploadResourceFile = (req, res, next) => {
  singleFileUpload(req, res, (err) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Le fichier dépasse la taille maximale autorisée (15 Mo).'
          : `Erreur de téléversement du fichier : ${err.message}`;
      next(new AppError(message, 400));
      return;
    }
    next(err);
  });
};

// Supprime physiquement un fichier précédemment uploadé (remplacement ou suppression de
// ressource). Échoue silencieusement si le fichier n'existe déjà plus.
const deleteUploadedFile = (fileUrl) => {
  if (!fileUrl || !fileUrl.startsWith('/uploads/education/')) {
    return;
  }

  const filePath = path.join(__dirname, '..', '..', fileUrl);
  fs.unlink(filePath, () => {});
};

// `fileFilter` ne peut se fier qu'au Content-Type déclaré par le client pour la partie
// multipart — un champ HTTP entièrement falsifiable, jamais vérifié contre le contenu réel
// du fichier. Un админ (ou une session admin compromise) pourrait donc téléverser n'importe
// quel contenu sous une extension .png/.pdf de confiance. On revérifie ici la signature
// binaire réelle (magic bytes) une fois le fichier écrit sur disque, et on le rejette s'il
// ne correspond pas au type annoncé — l'appelant doit alors supprimer le fichier et
// renvoyer une erreur, exactement comme pour toute autre validation de saisie.
const FILE_SIGNATURES = [
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
];

const matchesSignature = (buffer, expectedMime) => {
  if (expectedMime === 'image/webp') {
    // RIFF <4 octets de taille> WEBP
    return (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    );
  }

  const signature = FILE_SIGNATURES.find((item) => item.mime === expectedMime);
  if (!signature) {
    return false;
  }

  return signature.bytes.every((byte, index) => buffer[index] === byte);
};

const verifyUploadedFileSignature = (filePath, declaredMimetype) => {
  const fd = fs.openSync(filePath, 'r');
  const header = Buffer.alloc(12);
  fs.readSync(fd, header, 0, 12, 0);
  fs.closeSync(fd);

  return matchesSignature(header, declaredMimetype);
};

module.exports = { uploadResourceFile, deleteUploadedFile, verifyUploadedFileSignature, UPLOAD_ROOT };
