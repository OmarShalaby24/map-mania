import React from 'react';
import { useRouter } from 'next/router';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface FinalScoresModalProps {
    scores: Record<string, number>;
    isOpen: boolean;
}

export function FinalScoresModal({ scores, isOpen }: FinalScoresModalProps) {
    const router = useRouter();

    if (!isOpen) return null;

    const sortedPlayers = Object.entries(scores)
        .sort(([, scoreA], [, scoreB]) => scoreB - scoreA);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg w-96 max-w-[90%] shadow-xl border-2 border-purple-500">
                <h2 className="text-2xl font-bold mb-4 text-center text-purple-600">Game Over!</h2>
                <div className="mb-6 bg-white rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow className='hover:bg-transparent'>
                                <TableHead className="text-left text-black">Player</TableHead>
                                <TableHead className="text-left text-black">Final Score</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedPlayers.map(([player, score], index) => (
                                <TableRow key={player} className='hover:bg-transparent'>
                                    <TableHead className="text-left text-black">
                                        {index === 0 ? '👑 ' : ''}{player}
                                    </TableHead>
                                    <TableHead className="text-left text-black">{score}</TableHead>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <button
                    onClick={() => router.push('/')}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-500"
                >
                    Back to Home
                </button>
            </div>
        </div>
    );
}