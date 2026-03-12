import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db, auth } from "../../lib/firebase";
import { signInAnonymously } from "firebase/auth";
import LoadChart from "../../components/LoadChart";

type LoadData = {
  id: string;
  name: string;
  description?: string;
  entries?: any[];
};

const LoadView: React.FC<{ edit?: boolean; add?: boolean }> = ({
  edit = false,
  add = false,
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [load, setLoad] = useState<LoadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    (async () => {
      try {
        if (!auth.currentUser) await signInAnonymously(auth);
      } catch (err) {
        console.error("Anonymous sign-in failed before read:", err);
      }

      try {
        const ref = doc(db, "loads", id);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setLoad(null);
          return;
        }
        const data = snap.data() as any;
        const currentUid = (auth.currentUser as any)?.uid;
        // Only expose the load if it belongs to the current user
        if (!data || data.ownerId !== currentUid) {
          setLoad(null);
          return;
        }
        const loaded: LoadData = {
          id: snap.id,
          name: data.name ?? "",
          description: data.description ?? "",
          entries: data.entries ?? [],
        };
        setLoad(loaded);
        setName(loaded.name);
        setDescription(loaded.description ?? "");
      } catch (err) {
        console.error("Failed to load doc:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      if (!auth.currentUser) await signInAnonymously(auth);
    } catch (err) {
      console.error("Anonymous sign-in failed before update:", err);
    }
    try {
      const ref = doc(db, "loads", id);
      await updateDoc(ref, { name, description });
      setLoad((l) => (l ? { ...l, name, description } : l));
      // after saving, navigate to add-entry view for this load
      navigate(`/loads/${id}/add`);
    } catch (err) {
      console.error("Failed to update load:", err);
    } finally {
      setSaving(false);
    }
  };

  // Add-entry form state and handler
  const [powderGrains, setPowderGrains] = useState("");
  const [mv, setMv] = useState("");
  const [sd, setSd] = useState("");
  const [shotCount, setShotCount] = useState("");
  const [es, setEs] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setAdding(true);
    const entry = {
      id: Date.now(),
      powderGrains: Number(powderGrains) || 0,
      mv: Number(mv) || 0,
      sd: Number(sd) || 0,
      shotCount: Number(shotCount) || 0,
      es: Number(es) || 0,
    };
    try {
      if (!auth.currentUser) await signInAnonymously(auth);
    } catch (err) {
      console.error("Anonymous sign-in failed before adding entry:", err);
    }

    try {
      const ref = doc(db, "loads", id);
      const current = (load?.entries ?? []) as any[];
      const payload = { entries: [...current, entry] };
      // Debug: log auth UID and payload before update
      // eslint-disable-next-line no-console
      console.info(
        "Adding entry - uid, ref, payload:",
        (auth.currentUser as any)?.uid,
        ref.path,
        payload,
      );
      await updateDoc(ref, payload);
      // update local state and navigate back to view
      setLoad((l) =>
        l ? { ...l, entries: [...(l.entries ?? []), entry] } : l,
      );
      navigate(`/loads/${id}`);
    } catch (err) {
      console.error("Failed to add entry:", err);
    } finally {
      setAdding(false);
    }
  };

  // Entry edit/remove state + handlers
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [editPowderGrains, setEditPowderGrains] = useState("");
  const [editMv, setEditMv] = useState("");
  const [editSd, setEditSd] = useState("");
  const [editShotCount, setEditShotCount] = useState("");
  const [editEs, setEditEs] = useState("");
  const [savingEntryEdit, setSavingEntryEdit] = useState(false);

  const startEdit = (ent: any) => {
    setEditingEntryId(ent.id);
    setEditPowderGrains(String(ent.powderGrains ?? ""));
    setEditMv(String(ent.mv ?? ""));
    setEditSd(String(ent.sd ?? ""));
    setEditShotCount(String(ent.shotCount ?? ""));
    setEditEs(String(ent.es ?? ""));
  };

  const cancelEdit = () => {
    setEditingEntryId(null);
  };

  const saveEntryEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || editingEntryId == null) return;
    setSavingEntryEdit(true);
    try {
      if (!auth.currentUser) await signInAnonymously(auth);
    } catch (err) {
      console.error("Anonymous sign-in failed before saving entry edit:", err);
    }

    try {
      const ref = doc(db, "loads", id);
      const updatedEntries = (load?.entries ?? []).map((en: any) =>
        en.id === editingEntryId
          ? {
              ...en,
              powderGrains: Number(editPowderGrains) || 0,
              mv: Number(editMv) || 0,
              sd: Number(editSd) || 0,
              shotCount: Number(editShotCount) || 0,
              es: Number(editEs) || 0,
            }
          : en,
      );
      const payload = { entries: updatedEntries };
      // Debug: log auth UID and payload before update
      // eslint-disable-next-line no-console
      console.info(
        "Saving entry edit - uid, ref, payload:",
        (auth.currentUser as any)?.uid,
        ref.path,
        payload,
      );
      await updateDoc(ref, payload);
      setLoad((l) => (l ? { ...l, entries: updatedEntries } : l));
      setEditingEntryId(null);
    } catch (err) {
      console.error("Failed to save entry edit:", err);
    } finally {
      setSavingEntryEdit(false);
    }
  };

  const removeEntry = async (entryId: number) => {
    if (!id) return;
    try {
      if (!auth.currentUser) await signInAnonymously(auth);
    } catch (err) {
      console.error("Anonymous sign-in failed before removing entry:", err);
    }
    try {
      const ref = doc(db, "loads", id);
      const filtered = (load?.entries ?? []).filter(
        (en: any) => en.id !== entryId,
      );
      const payload = { entries: filtered };
      // Debug: log auth UID and payload before update
      // eslint-disable-next-line no-console
      console.info(
        "Removing entry - uid, ref, payload:",
        (auth.currentUser as any)?.uid,
        ref.path,
        payload,
      );
      await updateDoc(ref, payload);
      setLoad((l) => (l ? { ...l, entries: filtered } : l));
    } catch (err) {
      console.error("Failed to remove entry:", err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!load) return <div>Load not found.</div>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{load.name}</h2>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 bg-gray-200 rounded"
            onClick={() => navigate(-1)}
          >
            Back
          </button>
          {!edit && (
            <>
              <button
                className="px-3 py-1 bg-green-600 text-white rounded"
                onClick={() => navigate("add")}
              >
                Add Entry
              </button>
              <button
                className="px-3 py-1 bg-blue-600 text-white rounded"
                onClick={() => navigate("edit")}
              >
                Edit
              </button>
              <button
                className="px-3 py-1 bg-red-600 text-white rounded"
                onClick={async () => {
                  if (!id) return;
                  const ok = window.confirm(
                    "Delete this load and all its entries? This cannot be undone.",
                  );
                  if (!ok) return;
                  setDeleting(true);
                  try {
                    if (!auth.currentUser) await signInAnonymously(auth);
                  } catch (err) {
                    console.error(
                      "Anonymous sign-in failed before delete:",
                      err,
                    );
                  }
                  try {
                    const ref = doc(db, "loads", id);
                    await deleteDoc(ref);
                    navigate("/");
                  } catch (err) {
                    console.error("Failed to delete load:", err);
                  } finally {
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </>
          )}
        </div>
      </div>

      {edit ? (
        <form className="mt-4 space-y-4" onSubmit={handleSave}>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              className="mt-1 block w-full border rounded p-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              className="mt-1 block w-full border rounded p-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-gray-200 rounded"
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : add ? (
        <form className="mt-4 space-y-4" onSubmit={handleAddEntry}>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <input
              placeholder="Powder (grains)"
              value={powderGrains}
              onChange={(e) => setPowderGrains(e.target.value)}
              className="border rounded p-2"
            />
            <input
              placeholder="Muzzle Velocity"
              value={mv}
              onChange={(e) => setMv(e.target.value)}
              className="border rounded p-2"
            />
            <input
              placeholder="SD"
              value={sd}
              onChange={(e) => setSd(e.target.value)}
              className="border rounded p-2"
            />
            <input
              placeholder="Shot Count"
              value={shotCount}
              onChange={(e) => setShotCount(e.target.value)}
              className="border rounded p-2"
            />
            <div className="flex gap-2">
              <input
                placeholder="ES"
                value={es}
                onChange={(e) => setEs(e.target.value)}
                className="border rounded p-2 flex-1"
              />
              <button
                className="px-4 py-2 bg-green-600 text-white rounded"
                type="submit"
              >
                {adding ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="mt-4">
          <div className="text-sm text-gray-600">{load.description}</div>
          <div className="mt-4">
            <LoadChart data={(load.entries ?? []) as any[]} />
            <h3 className="font-medium">
              Entries ({(load.entries || []).length})
            </h3>
            <ul className="mt-2 space-y-2">
              {(load.entries || []).map((ent: any, idx: number) => (
                <li key={ent.id ?? idx} className="border rounded p-2">
                  {editingEntryId === ent.id ? (
                    <form onSubmit={saveEntryEdit} className="space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                        <input
                          value={editPowderGrains}
                          onChange={(e) => setEditPowderGrains(e.target.value)}
                          className="border rounded p-2"
                        />
                        <input
                          value={editMv}
                          onChange={(e) => setEditMv(e.target.value)}
                          className="border rounded p-2"
                        />
                        <input
                          value={editSd}
                          onChange={(e) => setEditSd(e.target.value)}
                          className="border rounded p-2"
                        />
                        <input
                          value={editShotCount}
                          onChange={(e) => setEditShotCount(e.target.value)}
                          className="border rounded p-2"
                        />
                        <div className="flex gap-2">
                          <input
                            value={editEs}
                            onChange={(e) => setEditEs(e.target.value)}
                            className="border rounded p-2 flex-1"
                          />
                          <button
                            type="submit"
                            className="px-3 py-1 bg-green-600 text-white rounded"
                          >
                            {savingEntryEdit ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-3 py-1 bg-gray-200 rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div>
                        <div>Powder: {ent.powderGrains} gr</div>
                        <div className="text-sm text-gray-600">
                          MV: {ent.mv} | SD: {ent.sd} | Shots: {ent.shotCount} |
                          ES: {ent.es}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(ent)}
                          className="px-3 py-1 bg-yellow-400 rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => removeEntry(ent.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadView;
