import { Server } from 'socket.io';
import type { NextApiRequest } from 'next';
import type { Server as HTTPServer } from 'http';
import type { NextApiResponseServerIO } from '@/types/next';

const countries = [
  { name: 'France', flag: '/flags/france.png' },
  { name: 'Japan', flag: '/flags/japan.png' },
  { name: 'Brazil', flag: '/flags/brazil.png' },
];

// In-memory store of rooms and users
const rooms: Record<string, Record<string, string>> = {};

const SocketHandler = (_: NextApiRequest, res: NextApiResponseServerIO) => {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server as HTTPServer, {
      path: '/api/socket_io',
    });

    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log(`🔌 Connected: ${socket.id}`);

      socket.on('joinRoom', ({ roomId, username }) => {
        socket.join(roomId);
        socket.data.roomId = roomId;
        socket.data.username = username;

        // Init room
        if (!rooms[roomId]) rooms[roomId] = {};
        rooms[roomId][socket.id] = username;

        // Send full user list to the new user
        const allUsernames = Object.values(rooms[roomId]);
        socket.emit('roomUsers', allUsernames);

        // Notify others
        socket.to(roomId).emit('userJoined', { username });

        console.log(`✅ ${username} joined room ${roomId}`);
      });

      socket.on('startGame', ({ roomId }) => {
        const question =
          countries[Math.floor(Math.random() * countries.length)];
        console.log(`🟢 Game started in room ${roomId}`);
        io.to(roomId).emit('newQuestion', question);
      });

      socket.on('disconnect', () => {
        const { roomId, username } = socket.data;
        if (roomId && rooms[roomId]) {
          delete rooms[roomId][socket.id];

          socket.to(roomId).emit('userLeft', { username });

          if (Object.keys(rooms[roomId]).length === 0) {
            delete rooms[roomId]; // Clean up empty room
          }

          console.log(`❌ ${username} left room ${roomId}`);
        }
      });
    });
  }

  res.end();
};

export default SocketHandler;
