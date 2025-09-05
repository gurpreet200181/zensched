
import { Calendar, Settings } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import zenschedLogo from "@/assets/zensched-logo.png";

const AppNav = () => {
  return (
    <nav className="border-b border-white/20 bg-white/40 backdrop-blur-md">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={zenschedLogo} alt="ZenSched Logo" className="w-10 h-10" />
            <h1 className="text-xl font-bold gradient-text">ZenSched</h1>
          </Link>

          <div className="flex items-center gap-2">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm transition ${
                  isActive ? "bg-primary/10 text-primary" : "text-gray-700 hover:bg-white"
                }`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/analytics"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm transition ${
                  isActive ? "bg-primary/10 text-primary" : "text-gray-700 hover:bg-white"
                }`
              }
            >
              Analytics
            </NavLink>
            <Button variant="ghost" size="sm" className="ml-2">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default AppNav;

