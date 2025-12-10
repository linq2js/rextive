import { Link } from "@tanstack/react-router";
import { Icon } from "@/components/Icons";

export function NoProfileScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500 p-4">
      <div className="card text-center">
        <div className="text-primary-500 mb-4 flex justify-center">
          <Icon name="controller" size={64} />
        </div>
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

