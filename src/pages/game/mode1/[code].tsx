import React, { useEffect, useState, useRef } from 'react';
import socket from '@/utils/socket';
import { useRouter } from 'next/router';
import { useUser } from '@/context/UserContext';
import { Check, Copy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import Image from 'next/image';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FinalScoresModal } from '@/components/FinalScoresModal';


export default function Game() {
  const [questionNumber, setQuestionNumber] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const router = useRouter();
  const { user } = useUser();
  const { code, userName } = router.query;
  const [question, setQuestion] = useState<{ flag: string, choices: any[] } | null>(null);
  const [answer, setAnswer] = useState('');
  const [gameStarted, setGameStarted] = useState(false);

  const [players, setPlayers] = useState<string[]>([]);
  const hasJoinedRef = useRef(false);

  const [correctAnswer, setCorrectAnswer] = useState("");
  const [scores, setScores] = useState<Record<string, number>>({});

  const [roundTimer, setRoundTimer] = useState(10);

  useEffect(() => {
    if (!question || answer !== "" || correctAnswer !== "") return;

    const interval = setInterval(() => {
      setRoundTimer(prev => {
        if (prev === 1 && answer === "") {
          console.log('time out');
          setAnswer("none");
          socket.emit('choicePicked', { roomId: code, choice: "none" });
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
      socket.emit('joinRoom', { roomId: code, username: user.userName }, (response: { success: boolean, error?: string }) => {
        if (!response.success) {
          alert('Cannot join: ' + response.error);
          router.push('/lobby'); // Redirect to lobby if join fails
          return;
        }
        hasJoinedRef.current = true;
      });
    }

    // Handle browser close/refresh
    const handleBeforeUnload = () => {
      socket.emit('leaveRoom', { roomId: code, username: user.userName });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

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
      console.log("hehe")
      setGameStarted(true);
    }

    const handleNewQuestion = (newQuestion: { flag: string, choices: any[], questionNumber: number, isGameOver: boolean }) => {
      console.log("here")
      setAnswer("");
      setRoundTimer(10);
      setCorrectAnswer("");
      setQuestion(newQuestion);
      setQuestionNumber(newQuestion.questionNumber);
      if (newQuestion.isGameOver) {
        setIsGameOver(true);
      }
    };

    const handleAllUsersPicked = (data: { answer: string, scores: Record<string, number> }) => {
      console.log(data);
      setCorrectAnswer(data.answer);
      setRoundTimer(0);
      setScores(data.scores);
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

      // Remove the beforeunload event listener
      window.removeEventListener('beforeunload', handleBeforeUnload);

      socket.off('roomUsers', handleRoomUsers);
      socket.off('userJoined', handleUserJoined);
      socket.off('userLeft', handleUserLeft);
      socket.off('gameStarted', handleGameStarted);
      socket.off('newQuestion', handleNewQuestion);
      socket.off('allUsersPicked', handleAllUsersPicked);

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

  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code as string);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const renderScores = (players: string[]) => {
    return players.map((player: string, index: number) => (
      <TableRow key={index} className='hover:bg-transparent'>
        <TableHead className="text-left">{player}</TableHead>
        <TableHead className="text-center">{scores[player] || 0}</TableHead>
      </TableRow>
    ));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <FinalScoresModal scores={scores} isOpen={isGameOver} />
      <div className="flex items-center justify-center gap-4">
        <p>Room: {code}</p>
        {copied ?
          <Check size={15} className="text-green-500" />
          : <Copy size={15} onClick={handleCopy} />
        }
      </div>
      {gameStarted && (
        <div className="text-lg font-semibold">
          Question {questionNumber}/10
        </div>
      )}
      <div>

        <Table>
          <TableHeader>
            <TableRow className='hover:bg-transparent'>
              <TableHead className="text-left">Player</TableHead>
              <TableHead className="text-left">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {players && renderScores(players)}
          </TableBody>
        </Table>
      </div>
      {
        (user?.isHost && !gameStarted) ?
          <button className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-500" onClick={handleStartGame}>Start Game</button>
          : (!gameStarted ? <p>Wait for host to start</p> : null)
      }
      {
        gameStarted ?

          <div className="flex items-center justify-center gap-4">
            <Progress
              value={(10 - roundTimer) / 10 * 100}
              className="w-48 h-2 bg-orange-500 rounded-full"
            />
            <p>{roundTimer} s</p>

          </div>
          : null
      }

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
