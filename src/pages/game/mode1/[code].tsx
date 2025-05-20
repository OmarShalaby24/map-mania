import React, { useEffect, useState, useRef } from 'react';
import socket from '@/utils/socket';
import { useRouter } from 'next/router';
import { useUser } from '@/context/UserContext';
import { Copy, Icon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import Image from 'next/image';


export default function Game() {
  const router = useRouter();
  const { user } = useUser();
  const { code, userName } = router.query;
  const [question, setQuestion] = useState<{ flag: string, choices: any[] } | null>(null);
  const [answer, setAnswer] = useState('');
  const [gameStarted, setGameStarted] = useState(false);

  const [players, setPlayers] = useState<string[]>([]);
  const hasJoinedRef = useRef(false);

  const [correctAnswer, setCorrectAnswer] = useState("");

  const [roundTimer, setRoundTimer] = useState(10);

  useEffect(() => {
    if (!question || answer !== "" || correctAnswer !== "") return;

    const interval = setInterval(() => {
      setRoundTimer(prev => {
        if (prev === 1 && answer === "") {
          console.log('time out');
          setAnswer("none");
          socket.emit('choicePicked', { roomId: code, choice: "none" });
          // clearInterval(interval);
          return 0;
        }
        return prev > 0 ? prev - 1 : 0;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [question, answer, correctAnswer, code]);

  useEffect(() => {
    if (!code || !user?.userName) return;

    if (!hasJoinedRef.current) {
      socket.emit('joinRoom', { roomId: code, username: user.userName });
      hasJoinedRef.current = true;
    }

    const handleRoomUsers = (userList: string[]) => {
      setPlayers(userList);
    };

    const handleUserJoined = (players: any) => {
      console.log(players);
      setPlayers(players.players);
    };

    const handleUserLeft = ({ username }: { username: string }) => {
      setPlayers((prev) => prev.filter((u) => u !== username));
    };

    const handleGameStarted = () => {
      setGameStarted(true);
    }

    const handleNewQuestion = (newQuestion: { flag: string, choices: any[] }) => {
      console.log("here")
      setAnswer("");
      setRoundTimer(10);
      setCorrectAnswer("");
      setQuestion(newQuestion);
    };

    const handleAllUsersPicked = (ans: any) => {
      console.log(ans)
      setCorrectAnswer(ans.answer);
      setRoundTimer(0);

      // setAnswer("");
      // setQuestion(null);
    };

    socket.on('roomUsers', handleRoomUsers);
    socket.on('userJoined', handleUserJoined);
    socket.on('userLeft', handleUserLeft);
    socket.on('gameStarted', handleGameStarted);
    socket.on('newQuestion', handleNewQuestion);
    socket.on('allUsersPicked', handleAllUsersPicked);

    return () => {
      // Emit leaveRoom when component unmounts or code/user changes
      socket.emit('leaveRoom', { roomId: code, username: user.userName });

      socket.off('roomUsers', handleRoomUsers);
      socket.off('userJoined', handleUserJoined);
      socket.off('userLeft', handleUserLeft);
      socket.off('gameStarted', handleGameStarted);
      socket.off('newQuestion', handleNewQuestion);
    };
  }, [code, user?.userName]);

  const handleStartGame = () => {
    socket.emit('startGame', { roomId: code })
    setGameStarted(true);
  }

  const handleAnswerClick = (ans: string) => {
    setAnswer(ans);
    socket.emit('choicePicked', { roomId: code, choice: ans });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="flex items-center justify-center gap-4">
        <p>Room: {code}</p>
        <Copy size={15} onClick={() => { navigator.clipboard.writeText(code as string) }} />
      </div>
      <p>Players:</p>
      <ul className="list-disc">
        {players && players.map((u, i) => (
          <li key={i}>{u}</li>
        ))}
      </ul>
      {
        (user?.isHost && !gameStarted) ?
          <button className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-500" onClick={handleStartGame}>Start Game</button>
          : (!gameStarted ? <p>Wait for host to start</p> : null)
      }
      <Progress
        value={roundTimer / 10 * 100}
        className="w-48 h-2 bg-orange-500 rounded-full"
      />
      <p>{roundTimer} s</p>
      {/* <button
        className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-500"
        onClick={() => {
          socket.emit('nextQuestion', { roomId: code });
        }}
      >
        Next
      </button> */}

      {question && (
        <>
          <Image src={`https://flagcdn.com/w640/${question.flag}.png`} width={200} height={130} alt={question.flag} />
          {question.choices.map((choice) => (
            <button
              disabled={answer !== "" ? true : false}
              className={
                `px-4 py-2 rounded w-48 text-center ` +
                (
                  answer === ""
                    ? "bg-purple-600 text-white"
                    : correctAnswer === ""
                      ? (choice.properties.name === answer
                        ? "bg-purple-600 text-white"
                        : "bg-gray-200 text-black")
                      : correctAnswer === choice.properties.name
                        ? "bg-green-500 text-white"
                        : answer === choice.properties.name
                          ? "bg-red-500 text-white"
                          : "bg-gray-200 text-black"
                )
              }
              key={choice.properties.name}
              onClick={() => handleAnswerClick(choice.properties.name)}
            >
              {choice.properties.name}
            </button>
          ))}
        </>
      )}
    </div>
  );
}
