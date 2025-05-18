'use client';

import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io({ path: '/api/socket_io' });

export default function Lobby() {
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [joined, setJoined] = useState(false);
  const [users, setUsers] = useState<string[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [question, setQuestion] = useState<{ name: string; flag: string } | null>(null);

  useEffect(() => {
    socket.on('roomUsers', (userList: string[]) => {
      setUsers(userList);
    });

    socket.on('userJoined', ({ username }: { username: string }) => {
      setUsers(prev => [...prev, username]);
    });

    socket.on('userLeft', ({ username }: { username: string }) => {
      setUsers(prev => prev.filter(u => u !== username));
    });

    socket.on('newQuestion', (q: { name: string; flag: string }) => {
      setQuestion(q);
    });

    return () => {
      socket.off('roomUsers');
      socket.off('userJoined');
      socket.off('userLeft');
      socket.off('newQuestion');
    };
  }, []);

  const handleJoin = () => {
    if (roomId && username) {
      socket.emit('joinRoom', { roomId, username });
      setJoined(true);
      setIsHost(users.length === 0);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h2 className="text-2xl font-bold">Join or Create a Room</h2>

      {!joined ? (
        <>
          <input
            type="text"
            placeholder="Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="border px-3 py-2 rounded"
          />
          <input
            type="text"
            placeholder="Your Name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="border px-3 py-2 rounded"
          />
          <button
            onClick={handleJoin}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-500"
          >
            Join Room
          </button>
        </>
      ) : (
        <>
          <p>✅ Joined room: {roomId}</p>
          <p>Players:</p>
          <ul className="list-disc">
            {users.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>

          {isHost && (
            <button
              onClick={() => socket.emit('startGame', { roomId })}
              className="mt-4 px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-500"
            >
              Start Game
            </button>
          )}

          {question && (
            <div className="mt-8 p-4 border rounded shadow">
              <p className="text-lg font-semibold mb-2">🌍 Guess this country:</p>
              <img src={question.flag} alt="Flag" className="w-32 h-auto" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
