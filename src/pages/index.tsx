import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-3xl font-bold">🌍 Country Quiz</h1>
      <Link href="/lobby" className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500">
        Join a Game
      </Link>
    </main>
  );
}
