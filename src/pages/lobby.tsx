'use client';

import React, { useEffect, useState } from 'react';
import socket from '@/utils/socket';

export default function Lobby() {
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [users, setUsers] = useState<string[]>([]);

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

    return () => {
      socket.off('roomUsers');
      socket.off('userJoined');
      socket.off('userLeft');
    };
  }, []);

  const handleJoin = () => {
    if (!roomId || !username) return;
    socket.emit('joinRoom', { roomId, username });
    const isHost = users.length === 0;
    // onJoin(roomId, username, isHost);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h2 className="text-2xl font-bold">Join or Create a Room</h2>

      <input
        type="text"
        placeholder="Room ID"
        value={roomId}
        onChange={e => setRoomId(e.target.value)}
        className="border px-3 py-2 rounded"
      />
      <input
        type="text"
        placeholder="Your Name"
        value={username}
        onChange={e => setUsername(e.target.value)}
        className="border px-3 py-2 rounded"
      />
      <button
        onClick={handleJoin}
        className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-500"
      >
        Join Room
      </button>

      {users.length > 0 && (
        <>
          <p>Players in room:</p>
          <ul className="list-disc">
            {users.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
