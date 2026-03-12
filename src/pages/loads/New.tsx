import React, { useState, useEffect } from "react";
import { useMachine } from "@xstate/react";
import loadMachine from "../../machines/loadMachine";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../lib/firebase";
import { signInAnonymously } from "firebase/auth";

const NewLoadForm = () => {
  const [state, send] = useMachine(loadMachine);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const emptyEntry = {
    powderGrains: "",
    mv: "",
    sd: "",
    shotCount: "",
    es: "",
  };
  const [entry, setEntry] = useState<any>(emptyEntry);

  const creating = state.matches("creating");
  const ready = state.matches("ready");
  const failure = state.matches("failure");

  useEffect(() => {
    if (failure) {
      const err = (state.context as any)?.error;
      console.error("Create load failed (UI):", err);
      try {
        const msg = err?.message ?? JSON.stringify(err ?? "Unknown error");
        // visible alert for quick debugging
        alert("Create load failed: " + msg);
      } catch (e) {
        alert("Create load failed (see console)");
      }
    }
  }, [failure, state.context]);

  const entries = (state.context as any)?.loadData?.entries || [];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    // transition machine to creating
    send({ type: "CREATE", data: { name, description } });

    (async () => {
      try {
        // Debug: log current user before sign-in
        // eslint-disable-next-line no-console
        console.info("auth.currentUser (before sign-in):", auth.currentUser);
        if (!auth.currentUser) await signInAnonymously(auth);
        // Debug: log current user after ensuring auth
        // eslint-disable-next-line no-console
        console.info(
          "auth.currentUser (after sign-in):",
          auth.currentUser && (auth.currentUser as any).uid,
        );

        const currentUid = (auth.currentUser as any)?.uid ?? null;
        // include any entries added in the local machine state when creating
        const entriesForCreate =
          (state.context as any)?.loadData?.entries ?? [];
        const docRef = await addDoc(collection(db, "loads"), {
          name,
          description,
          entries: entriesForCreate,
          ownerId: currentUid,
          createdAt: serverTimestamp(),
        });
        // Debug: log created document id
        // eslint-disable-next-line no-console
        console.info("Created load doc id:", docRef.id);
        send({
          type: "CREATED",
          data: {
            id: docRef.id,
            name,
            description,
            entries: entriesForCreate,
          } as any,
        });
      } catch (err: any) {
        console.error("Create load failed:", err);
        send({ type: "ERROR", data: err } as any);
      }
    })();
  };

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = {
      powderGrains: Number(entry.powderGrains) || 0,
      mv: Number(entry.mv) || 0,
      sd: Number(entry.sd) || 0,
      shotCount: Number(entry.shotCount) || 0,
      es: Number(entry.es) || 0,
    };
    send({ type: "ADD_ENTRY", entry: parsed });
    setEntry(emptyEntry);
  };

  const handleRemove = (id: number) =>
    send({ type: "REMOVE_ENTRY", entryId: id });

  return (
    <div>
      {!ready && (
        <form className="space-y-4" onSubmit={handleCreate}>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Load Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter load name"
              disabled={creating}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter load description"
              disabled={creating}
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            disabled={creating}
          >
            {creating ? "Creating..." : "Create Load"}
          </button>
          {failure && (
            <div className="text-red-600">
              <div>Failed to create load. Try again.</div>
              {((state.context as any)?.error as any)?.message ? (
                <div className="mt-2 text-sm">
                  {(state.context as any).error.message}
                </div>
              ) : (
                <pre className="mt-2 text-sm whitespace-pre-wrap">
                  {JSON.stringify((state.context as any).error, null, 2)}
                </pre>
              )}
            </div>
          )}
        </form>
      )}
      {ready && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold">Entries</h3>

          <div className="mt-2 mb-4">
            <div className="text-lg font-medium">
              {(state.context as any)?.loadData?.name || name}
            </div>
            <div className="text-sm text-gray-600">
              {(state.context as any)?.loadData?.description || description}
            </div>
          </div>

          <ul className="space-y-2">
            {(entries || [])
              .slice()
              .reverse()
              .map((ent: any) => (
                <li
                  key={ent.id}
                  className="flex justify-between items-center border rounded p-2"
                >
                  <div>
                    <div className="font-medium">
                      Powder: {ent.powderGrains} gr
                    </div>
                    <div className="text-sm text-gray-600">
                      MV: {ent.mv} | SD: {ent.sd} | Shots: {ent.shotCount} | ES:{" "}
                      {ent.es}
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => handleRemove(ent.id)}
                      className="px-3 py-1 bg-red-600 text-white rounded"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
          </ul>

          <form
            className="grid grid-cols-1 md:grid-cols-5 gap-2 my-4"
            onSubmit={handleAddEntry}
          >
            <input
              placeholder="Powder (grains)"
              value={entry.powderGrains}
              onChange={(e) =>
                setEntry({ ...entry, powderGrains: e.target.value })
              }
              className="border rounded p-2"
            />
            <input
              placeholder="Muzzle Velocity"
              value={entry.mv}
              onChange={(e) => setEntry({ ...entry, mv: e.target.value })}
              className="border rounded p-2"
            />
            <input
              placeholder="SD"
              value={entry.sd}
              onChange={(e) => setEntry({ ...entry, sd: e.target.value })}
              className="border rounded p-2"
            />
            <input
              placeholder="Shot Count"
              value={entry.shotCount}
              onChange={(e) =>
                setEntry({ ...entry, shotCount: e.target.value })
              }
              className="border rounded p-2"
            />
            <div className="flex gap-2">
              <input
                placeholder="ES"
                value={entry.es}
                onChange={(e) => setEntry({ ...entry, es: e.target.value })}
                className="border rounded p-2 flex-1"
              />
              <button
                className="px-4 py-2 bg-green-600 text-white rounded"
                type="submit"
              >
                Add
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default NewLoadForm;
