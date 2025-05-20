import { Server } from 'socket.io';
import type { NextApiRequest } from 'next';
import type { Server as HTTPServer } from 'http';
import type { NextApiResponseServerIO } from '@/types/next';
import { Countries } from '@/utils/countries';
import { makeQuestion } from '@/utils/makeQuestion';

const countries = Countries;

interface RoomState {
  roomId: string;
  started: boolean;
  currentAnswer: string;
  host: string;
  choices: string[];
}

// In-memory store of rooms and users
const rooms: Record<string, Record<string, string>> = {};
const hosts: Record<string, string> = {};
const questions: Record<string, { answer: string }> = {};
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
        socket.to(roomId).emit('userJoined', { players: allUsernames });

        console.log(`✅ ${username} joined room ${roomId}`);
      });

      socket.on('createRoom', ({ roomId }) => {
        socket.join(roomId);
        socket.data.roomId = roomId;
        socket.emit('roomCreated', { roomId });
        console.log(`✅ Room ${roomId} created by Host`);
      });

      socket.on('startGame', async ({ roomId }) => {
        console.log(`🟢 Game started in room ${roomId}`);
        generateQuestion(roomId);
      });

      socket.on('nextQuestion', async ({ roomId, answer }) => {
        generateQuestion(roomId);
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
        if (!choices[roomId]) choices[roomId] = [];
        choices[roomId].push(username);

        const totalUsers = Object.keys(rooms[roomId] || {}).length;
        if (choices[roomId].length === totalUsers) {
          console.log(questions[roomId].answer);
          io.to(roomId).emit('allUsersPicked', {
            answer: questions[roomId].answer,
          });
          choices[roomId] = [];
          setTimeout(() => {
            generateQuestion(roomId);
          }, 3000);
        }
        socket.to(roomId).emit('userPickedChoice', { username, choice });
        console.log(`🟡 ${username} picked ${choice} in room ${roomId}`);
      });

      const generateQuestion = async (roomId: string) => {
        const question = await makeQuestion(4, countries);
        console.log(question);
        io.to(roomId).emit('newQuestion', {
          flag: question.answer.code,
          choices: question.choices,
        });
        questions[roomId] = { answer: question.answer.properties!.name };
      };
    });
  }

  res.end();
};

export default SocketHandler;
