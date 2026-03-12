import { assign, createMachine } from "xstate";
import { updateDoc, doc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { signInAnonymously } from "firebase/auth";

export type Entry = {
  id: number;
  powderGrains: number;
  mv: number;
  sd: number;
  shotCount: number;
  es: number;
};

interface LoadContext {
  loadData: {
    id: string;
    name: string;
    description?: string;
    entries: Entry[];
  } | null;
  error: { message: string; stack?: string } | null;
}

type LoadEvent =
  | { type: "CREATE"; data: { name: string; description?: string } }
  | { type: "ADD_ENTRY"; entry: Omit<Entry, "id"> }
  | { type: "UPDATE_ENTRY"; entry: Entry }
  | { type: "REMOVE_ENTRY"; entryId: number }
  | { type: "RESET" }
  | { type: "RETRY"; data: { name: string; description?: string } };

// ─── helpers ────────────────────────────────────────────────────────────────
function getLoadRef(id: string) {
  return doc(db, "loads", id);
}

// ─── machine ────────────────────────────────────────────────────────────────

const loadMachine = createMachine<LoadContext, LoadEvent>(
  {
    id: "load",
    context: {
      loadData: null,
      error: null,
    },
    initial: "idle",
    states: {
      // ── idle ──────────────────────────────────────────────────────────────
      idle: {
        on: {
          CREATE: {
            target: "creating",
            actions: assign({
              loadData: (_ctx, evt: any) => {
                const payload = evt?.data ?? evt ?? {};
                return {
                  id: "",
                  name: payload.name,
                  description: payload.description,
                  entries: [],
                };
              },
            }),
          },
        },
      },
      // ── creating ──────────────────────────────────────────────────────────
      // Creation is performed by the UI (New.tsx) which will send CREATED or ERROR
      creating: {
        on: {
          CREATED: {
            target: "ready",
            actions: "setLoadData",
          },
          ERROR: {
            target: "failure",
            actions: assign({
              error: (_ctx, evt: any) => {
                const raw = evt?.data ??
                  evt ?? { message: String(evt ?? "Unknown error") };
                const message = raw?.message ?? String(raw);
                const stack = raw?.stack ?? undefined;
                return { message, stack, raw };
              },
            }),
          },
        },
      },

      // ── ready ─────────────────────────────────────────────────────────────
      ready: {
        on: {
          ADD_ENTRY: {
            actions: ["addEntryLocally", "syncEntries"],
          },
          UPDATE_ENTRY: {
            actions: ["updateEntryLocally", "syncEntries"],
          },
          REMOVE_ENTRY: {
            actions: ["removeEntryLocally", "syncEntries"],
          },
          RESET: {
            target: "idle",
            actions: "clearLoadData",
          },
        },
        // Sync entry changes to Firestore while in the ready state
        // (performed as an action after local mutations rather than an invoked actor)
      },

      // ── failure ───────────────────────────────────────────────────────────
      failure: {
        on: {
          // Retry re-uses the original CREATE data stored in context.error
          // — caller should send RETRY with the same data shape as CREATE.
          RETRY: "creating",
          RESET: {
            target: "idle",
            actions: "clearLoadData",
          },
        },
      },
    },
  },
  {
    actions: {
      setLoadData: assign({
        loadData: (ctx, evt: any) => {
          const data = evt?.data ?? evt ?? null;
          if (!data) return null;
          const base = ctx.loadData ?? {
            id: "",
            name: data.name ?? "",
            description: data.description,
            entries: data.entries ?? [],
          };
          return {
            id: data.id ?? base.id ?? "",
            name: data.name ?? base.name ?? "",
            description: data.description ?? base.description,
            entries: data.entries ?? base.entries ?? [],
          };
        },
        error: () => null,
      }),

      setError: assign({
        error: (_ctx, evt: any) => {
          // evt may be null/undefined in some edge cases, ensure we always set a usable object
          console.error("loadMachine setError evt:", evt);
          const raw = evt?.data ?? evt ?? null;
          const message =
            raw?.message ??
            raw?.toString?.() ??
            (raw === null ? "null" : String(raw ?? "Unknown error"));
          const stack = raw?.stack ?? undefined;
          return { message, stack, raw };
        },
      }),

      clearLoadData: assign({
        loadData: () => null,
        error: () => null,
      }),

      addEntryLocally: assign({
        loadData: (ctx, evt: any) => {
          if (!ctx.loadData) return ctx.loadData;
          const entry: Entry = { id: Date.now(), ...evt.entry };
          return {
            ...ctx.loadData,
            entries: [...ctx.loadData.entries, entry],
          };
        },
      }),

      updateEntryLocally: assign({
        loadData: (ctx, evt: any) => {
          if (!ctx.loadData) return ctx.loadData;
          return {
            ...ctx.loadData,
            entries: ctx.loadData.entries.map((e) =>
              e.id === evt.entry.id ? { ...e, ...evt.entry } : e,
            ),
          };
        },
      }),

      removeEntryLocally: assign({
        loadData: (ctx, evt: any) => {
          if (!ctx.loadData) return ctx.loadData;
          return {
            ...ctx.loadData,
            entries: ctx.loadData.entries.filter((e) => e.id !== evt.entryId),
          };
        },
      }),

      syncEntries: (_ctx: any) => {
        const ctx = _ctx as LoadContext;
        if (!ctx.loadData?.id) return;
        // ensure anonymous auth before writing
        (async () => {
          try {
            if (!auth.currentUser) await signInAnonymously(auth);
          } catch (err) {
            console.error("Anonymous sign-in failed (syncEntries):", err);
            // proceed anyway; updateDoc may fail and will be logged
          }

          updateDoc(getLoadRef(ctx.loadData.id), {
            entries: ctx.loadData.entries,
          }).catch((err) => {
            console.error("Firestore sync failed:", err);
          });
        })();
      },
    },
  },
);

export default loadMachine;
