import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    const { userId } = socket.handshake.query || {};
    if (userId) {
      socket.join(`user:${userId}`);
    }

    socket.on('joinPurchaseRoom', (prId) => {
      if (prId) socket.join(`purchase:${prId}`);
    });

    socket.on('leavePurchaseRoom', (prId) => {
      if (prId) socket.leave(`purchase:${prId}`);
    });
  });

  return io;
};

export const getIO = () => io;
