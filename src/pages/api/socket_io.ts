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
//                 roomId => { socketId => username }
const rooms: Record<string, Record<string, string>> = {};
//                roomId => username
const hosts: Record<string, string> = {};
//                roomId => { answer: string }
const questions: Record<string, { answer: string }> = {};
//                roomId => [username]
const choices: Record<string, string[]> = {};
//                roomId => { username => score }
const scoreboard: Record<string, Record<string, number>> = {};

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
        io.to(roomId).emit('gameStarted');
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
      socket.on('checkRoom', (roomId, callback) => {
        const exists = !!rooms[roomId];
        callback(exists);
      });

      // this event is triggered when a user picks a choice
      // it will check if all users have picked a choice
      // after all users have picked a choice if loop in choices of the room and add score for correct answer
      // then emit the answer and scores to all users
      // then generate a new question
      // socket.on('choicePicked', ({ roomId, choice }) => {
      //   const { username } = socket.data;
      //   if (!choices[roomId]) choices[roomId] = [];
      //   choices[roomId].push(username);

      //   const totalUsers = Object.keys(rooms[roomId] || {}).length;
      //   if (choices[roomId].length === totalUsers) {
      //     // console.log(questions[roomId].answer);
      //     io.to(roomId).emit('allUsersPicked', {
      //       answer: questions[roomId].answer,
      //     });
      //     // add score for correct answer
      //     if (!scores[roomId]) scores[roomId] = {};
      //     if (!scores[roomId][username]) scores[roomId][username] = 0;
      //     if (questions[roomId].answer === choice) {
      //       scores[roomId][username] += 1;
      //     }

      //     choices[roomId] = [];
      //     setTimeout(() => {
      //       generateQuestion(roomId);
      //     }, 3000);
      //   }
      //   socket.to(roomId).emit('userPickedChoice', { username, choice });
      //   console.log(`🟡 ${username} picked ${choice} in room ${roomId}`);
      // });
      socket.on('choicePicked', ({ roomId, choice }) => {
        if (!choices[roomId]) choices[roomId] = [];
        choices[roomId].push(choice);

        const allChoices = choices[roomId];
        const allUsernames = Object.values(rooms[roomId]);

        if (allChoices.length === allUsernames.length) {
          // All users have picked a choice
          const correctAnswer = questions[roomId]?.answer;
          const scoresForRoom = scoreboard[roomId] || {};

          allUsernames.forEach((username, index) => {
            if (!scoresForRoom[username]) scoresForRoom[username] = 0;
            if (allChoices[index] === correctAnswer) {
              scoresForRoom[username]++;
            }
          });
          scoreboard[roomId] = scoresForRoom; // Update scores for the room
          console.log({ scores: scoreboard });
          io.to(roomId).emit('allUsersPicked', {
            answer: correctAnswer,
            scores: scoresForRoom,
          });

          choices[roomId] = []; // Reset choices for the next question
          setTimeout(() => {
            generateQuestion(roomId);
          }, 2000);
        }
      });

      const generateQuestion = async (roomId: string) => {
        const question = await makeQuestion(4, countries);
        // console.log(question);
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
