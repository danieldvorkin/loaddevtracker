import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "./lib/firebase";
import { NavLink, useNavigate } from "react-router-dom";
import { FirebaseStatusBlinker } from "./FirebaseStatusBlinker";

const navLinks = [
  { name: "Home", href: "/" },
  { name: "Settings", href: "/settings" },
];

export function Navbar({ showToast }: { showToast?: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      showToast?.("Signed out");
      setOpen(false);
    } catch (e) {
      console.error("Sign out failed", e);
      showToast?.("Sign out failed");
    }
  };

  return (
    <nav className="relative bg-gray-900 text-white border-b border-gray-800 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Section */}
          <div className="flex-shrink-0 flex items-center">
            <span className="text-xl font-bold tracking-tight">
              Load Dev Tracker
            </span>
          </div>

          {/* Desktop Menu (Hidden on Mobile) */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            {navLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.href}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${isActive ? "text-blue-400" : "text-gray-300 hover:text-white"}`
                }
              >
                {link.name}
              </NavLink>
            ))}

            <FirebaseStatusBlinker />

            <div className="flex items-center space-x-4 border-l border-gray-700 pl-6">
              {user === undefined ? (
                <span className="text-xs text-gray-500">Loading...</span>
              ) : user ? (
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 rounded-md transition"
                >
                  Logout
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate("/auth/signin")}
                    className="text-sm font-medium hover:text-blue-400"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => navigate("/auth/signup")}
                    className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 rounded-md transition"
                  >
                    Register
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Mobile Button (Hidden on Desktop) */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setOpen(!open)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              {/* Hamburger Icon */}
              <svg
                className={`h-6 w-6 ${open ? "hidden" : "block"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              {/* Close Icon */}
              <svg
                className={`h-6 w-6 ${open ? "block" : "hidden"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <div
        className={`md:hidden ${open ? "block" : "hidden"} absolute w-full bg-gray-900 border-b border-gray-800 shadow-xl`}
      >
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          {navLinks.map((link) => (
            <NavLink
              key={link.name}
              to={link.href}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-base font-medium ${isActive ? "bg-gray-800 text-blue-400" : "text-gray-300 hover:bg-gray-800 hover:text-white"}`
              }
            >
              {link.name}
            </NavLink>
          ))}
          <div className="px-3 py-2">
            <FirebaseStatusBlinker />
          </div>
        </div>

        {/* Mobile Auth Actions */}
        <div className="pt-4 pb-3 border-t border-gray-800">
          <div className="px-5 flex flex-col space-y-2">
            {user ? (
              <button
                onClick={handleSignOut}
                className="w-full text-center px-4 py-2 rounded-md bg-red-600 text-white font-medium"
              >
                Logout
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    navigate("/auth/signin");
                    setOpen(false);
                  }}
                  className="w-full text-center px-4 py-2 rounded-md border border-gray-600 text-white font-medium"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    navigate("/auth/signup");
                    setOpen(false);
                  }}
                  className="w-full text-center px-4 py-2 rounded-md bg-blue-600 text-white font-medium"
                >
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
