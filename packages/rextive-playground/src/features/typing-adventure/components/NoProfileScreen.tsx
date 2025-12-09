import { Link } from "@tanstack/react-router";

export function NoProfileScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500 p-4">
      <div className="card text-center">
        <div className="text-5xl mb-4">🎮</div>
        <h2 className="font-display text-xl font-bold text-gray-800">
          Please select a profile first
        </h2>
        <Link to="/" className="btn btn-primary mt-4">
          Go Home
        </Link>
      </div>
    </div>
  );
}

