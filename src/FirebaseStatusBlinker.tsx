import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./lib/firebase";

// Simple blinker: green if connected, red if not
export function FirebaseStatusBlinker() {
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    // Listen for auth state changes as a proxy for Firebase connectivity
    const unsubscribe = onAuthStateChanged(
      auth,
      () => {
        setConnected(true);
      },
      () => {
        setConnected(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  let color = "gray",
    label = "Checking...";
  if (connected === true) {
    color = "green";
    label = "DB";
  } else if (connected === false) {
    color = "red";
    label = "DB";
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <style>
        {`
          @keyframes glow {
            0% {
              box-shadow: 0 0 0px ${color};
            }
            50% {
              box-shadow: 0 0 12px 4px ${color};
            }
            100% {
              box-shadow: 0 0 0px ${color};
            }
          }
        `}
      </style>
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: color,
          display: "inline-block",
          animation: "glow 1s infinite",
        }}
      />
      <span style={{ fontSize: 12 }}>{label}</span>
    </span>
  );
}
