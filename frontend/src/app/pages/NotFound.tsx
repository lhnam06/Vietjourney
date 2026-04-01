import { Link } from 'react-router';
import { MapPin, Home } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function NotFound() {
  return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <MapPin className="w-24 h-24 text-[#0A4A6E] mx-auto mb-6 opacity-50" />
        <h1 className="text-6xl font-bold text-[#0A4A6E] mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-slate-700 mb-2">Page Not Found</h2>
        <p className="text-slate-600 mb-8 max-w-md mx-auto">
          Looks like you've wandered off the map. Let's get you back on track!
        </p>
        <Link to="/">
          <Button className="bg-[#0A4A6E] hover:bg-[#0d5d8a]">
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
