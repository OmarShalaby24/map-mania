import { useUser } from '@/context/UserContext';
import socket from '@/utils/socket';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';


export default function Home() {
  const router = useRouter();
  const { user, setUser } = useUser()
  useEffect(() => {
    let userName = user?.userName || "";
    console.log(user?.userName);
    while (userName.length < 3) {
      userName = prompt("Enter your name (min 3 chars):") || "";
    }
    setUser({ userName, isHost: false });
  }, []);

  const handleCreateGame = () => {
    const roomId = uuidv4().slice(0, 6);
    setUser({ userName: user!.userName, isHost: true });
    router.push({
      pathname: `/game/mode1/${roomId}`
    });
  };

  const handleJoinGame = () => {
    const roomId = prompt("Enter the room ID you want to join:");
    if (roomId && roomId?.length >= 6) {
      checkRoomExists(roomId);
    }
    else if (!roomId) {
      return;
    } else {
      alert("Invalid room ID");
      return;
    }
  };

  const checkRoomExists = (roomId: string) => {
    console.log("here")
    socket.emit('checkRoom', roomId, (exists: boolean) => {
      console.log({ exists })
      if (exists) {
        router.push(`/game/mode1/${roomId}`);
      } else {
        alert("Room does not exist");
      }
    });
  }


  return (
    <main className="">
      <div className='w-full'>
        <h1 className="text-3xl font-bold">Welcome {user?.userName}</h1>
      </div>
      <div className='flex flex-col items-center justify-center min-h-screen gap-4'>

        <h1 className="text-3xl font-bold">🌍 Map Mania</h1>
        <div className='flex flex-col gap-4 '>
          <button
            onClick={handleCreateGame}
            className="mt-4 px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-500"          >
            Create a Game
          </button>
          <button
            onClick={handleJoinGame}
            className="mt-4 px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-500"          >
            Join a Game
          </button>
        </div>
      </div>
    </main>
  );
}
