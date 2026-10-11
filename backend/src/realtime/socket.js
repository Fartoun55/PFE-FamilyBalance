const { Server } = require('socket.io');
const User = require('../models/User');
const { verifyAccessToken } = require('../utils/tokenService');
const { corsOrigin } = require('../config/cors');

let io = null;

const userRoom = (userId) => `user:${userId}`;

/**
 * Attache Socket.IO au serveur HTTP existant (même port que l'API).
 * Authentification : le jeton d'accès JWT (le même que l'en-tête Authorization de l'API)
 * est transmis dans le handshake ; chaque socket rejoint uniquement la salle privée de
 * son utilisateur, donc un client ne reçoit jamais les événements d'un autre compte.
 */
const initRealtime = (httpServer) => {
  io = new Server(httpServer, {
    path: '/socket.io',
    cors: { origin: corsOrigin, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        next(new Error('Authentification requise.'));
        return;
      }
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.sub).select('_id role isActive').lean();
      if (!user || !user.isActive) {
        next(new Error('Compte introuvable ou désactivé.'));
        return;
      }
      socket.data.userId = String(user._id);
      next();
    } catch {
      next(new Error('Token invalide ou expiré.'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(userRoom(socket.data.userId));
  });

  return io;
};

/** Envoie un événement à toutes les sessions ouvertes d'un utilisateur (sans effet si personne n'est connecté). */
const emitToUser = (userId, event, payload) => {
  if (!io || !userId) return;
  io.to(userRoom(String(userId))).emit(event, payload);
};

module.exports = { initRealtime, emitToUser };
