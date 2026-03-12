import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { signInAnonymously } from "firebase/auth";

type LoadSummary = {
  id: string;
  name: string;
  description?: string;
  entries?: any[];
};

export default function Dashboard() {
  const [loads, setLoads] = useState<LoadSummary[]>([]);

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try {
        if (!auth.currentUser) await signInAnonymously(auth);
      } catch (err) {
        console.error(
          "Anonymous sign-in failed for dashboard subscription:",
          err,
        );
      }

      try {
        const uid = (auth.currentUser as any)?.uid;
        const q = query(collection(db, "loads"), where("ownerId", "==", uid));
        const realUnsub = onSnapshot(
          q,
          (snap) => {
            const docs = snap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as any),
            }));
            setLoads(docs);
          },
          (err) => console.error("Failed to subscribe to loads:", err),
        );
        unsub = realUnsub;
      } catch (err) {
        console.error("Failed to set up loads query:", err);
      }
    })();

    return () => unsub();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <Link
          to="/loads/new"
          className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Create New Load
        </Link>
      </div>

      <div className="mt-6">
        {loads.length === 0 ? (
          <div className="text-gray-600">No loads yet.</div>
        ) : (
          <ul className="space-y-3">
            {loads.map((l) => (
              <li
                key={l.id}
                className="border rounded p-4 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">{l.name}</div>
                  <div className="text-sm text-gray-600">{l.description}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Entries: {(l.entries || []).length}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/loads/${l.id}`}
                    className="px-3 py-1 bg-gray-200 rounded"
                  >
                    View
                  </Link>
                  <Link
                    to={`/loads/${l.id}/edit`}
                    className="px-3 py-1 bg-blue-600 text-white rounded"
                  >
                    Edit
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
