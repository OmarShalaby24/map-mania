import { Server } from 'socket.io';
import type { NextApiRequest } from 'next';
import type { Server as HTTPServer } from 'http';
import type { NextApiResponseServerIO } from '@/types/next';
import { Countries } from '@/utils/countries';
import { makeQuestion } from '@/utils/makeQuestion';

const countries = Countries;

// In-memory store of rooms and users
const rooms: Record<string, Record<string, string>> = {};
const hosts: Record<string, string> = {};
const question: Record<string, { answer: string; choices: string[] }> = {};
const choices: Record<string, string[]> = {};

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
        if (!hosts[roomId]) hosts[roomId] = username;

        // Send full user list to the new user
        const allUsernames = Object.values(rooms[roomId]);
        socket.emit('roomUsers', allUsernames);

        // Notify others
        socket.to(roomId).emit('userJoined', { username });

        console.log(`✅ ${username} joined room ${roomId}`);
      });

      socket.on('startGame', async ({ roomId }) => {
        const question = await makeQuestion(4, countries);
        console.log(question);
        console.log(`🟢 Game started in room ${roomId}`);
        io.to(roomId).emit('newQuestion', {
          flag: question.answer.code,
          choices: question.choices,
        });
      });

      socket.on('disconnect', () => {
        const { roomId, username } = socket.data;
        if (hosts[roomId] === username) {
          delete hosts[roomId];
          socket.to(roomId).emit('hostLeft');
        }
        if (roomId && rooms[roomId]) {
          delete rooms[roomId][socket.id];

          socket.to(roomId).emit('userLeft', { username });

          if (Object.keys(rooms[roomId]).length === 0) {
            delete rooms[roomId]; // Clean up empty room
          }

          console.log(`❌ ${username} left room ${roomId}`);
        }
      });

      socket.on('choicePicked', ({ roomId, choice }) => {
        const { username } = socket.data;
        socket.to(roomId).emit('userPickedChoice', { username, choice });
        console.log(`🟡 ${username} picked ${choice} in room ${roomId}`);
      });
    });
  }

  res.end();
};

export default SocketHandler;
