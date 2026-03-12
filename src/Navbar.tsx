import React, { useState } from "react";
import { FirebaseStatusBlinker } from "./FirebaseStatusBlinker";

const navLinks = [
  { name: "Home", href: "#" },
  { name: "About", href: "#" },
  { name: "Contact", href: "#" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
      <div className="text-lg font-bold">Load Dev Tracker</div>
      <button
        className="md:hidden flex flex-col justify-center items-center w-8 h-8"
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle navigation"
      >
        <span
          className={`block h-0.5 w-6 bg-white mb-1 transition-transform ${open ? "rotate-45 translate-y-1.5" : ""}`}
        ></span>
        <span
          className={`block h-0.5 w-6 bg-white mb-1 ${open ? "opacity-0" : ""}`}
        ></span>
        <span
          className={`block h-0.5 w-6 bg-white transition-transform ${open ? "-rotate-45 -translate-y-1.5" : ""}`}
        ></span>
      </button>
      <ul
        className={`md:flex md:items-center md:static absolute left-0 w-full md:w-auto bg-gray-900 md:bg-transparent top-14 md:top-auto transition-all duration-200 z-10 ${open ? "block" : "hidden md:block"}`}
      >
        {navLinks.map((link) => (
          <li key={link.name} className="md:ml-6 my-2 md:my-0 text-center">
            <a href={link.href} className="hover:text-blue-400 block px-4 py-2">
              {link.name}
            </a>
          </li>
        ))}
        <li className="md:ml-6 my-2 md:my-0 text-center">
          <FirebaseStatusBlinker />
        </li>
      </ul>
    </nav>
  );
}
