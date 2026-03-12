import { assign, createMachine } from "xstate";
import type { AnyStateMachine } from "xstate";
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

export type LoadEvent =
  | { type: "CREATE"; data: { name: string; description?: string } }
  | {
      type: "CREATED";
      data: {
        id: string;
        name: string;
        description?: string;
        entries?: Entry[];
      };
    }
  | { type: "ERROR"; data?: unknown }
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

const createMachineAny = createMachine as unknown as (
  ...args: unknown[]
) => AnyStateMachine;
const assignAny = assign as unknown as (...args: unknown[]) => unknown;

const loadMachine = createMachineAny(
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
            actions: assignAny({
              loadData: (_ctx: unknown, evt: unknown) => {
                const ev = evt as { data?: unknown } | Record<string, unknown>;
                const payload = (
                  ev && "data" in ev && ev.data != null ? ev.data : ev
                ) as Record<string, unknown>;
                return {
                  id: "",
                  name: String(payload?.name ?? ""),
                  description:
                    (payload?.description as string | undefined) ?? undefined,
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
            actions: assignAny({
              error: (_ctx: unknown, evt: unknown) => {
                const ev = evt as { data?: unknown } | unknown;
                const raw =
                  ev &&
                  typeof ev === "object" &&
                  "data" in (ev as Record<string, unknown>) &&
                  (ev as Record<string, unknown>).data != null
                    ? (ev as Record<string, unknown>).data
                    : (ev ?? { message: String(ev ?? "Unknown error") });
                let message = String(raw);
                let stack: string | undefined = undefined;
                if (raw && typeof raw === "object") {
                  if ("message" in (raw as Record<string, unknown>)) {
                    message = String(
                      (raw as Record<string, unknown>).message ?? message,
                    );
                  }
                  if ("stack" in (raw as Record<string, unknown>)) {
                    stack = (raw as Record<string, unknown>).stack as
                      | string
                      | undefined;
                  }
                }
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
      setLoadData: assignAny({
        loadData: (ctx: unknown, evt: unknown) => {
          const ev = evt as { data?: unknown } | Record<string, unknown> | null;
          const data = (ev && "data" in ev ? ev.data : ev) as Record<
            string,
            unknown
          > | null;
          if (!data) return null;
          const base = (ctx as LoadContext).loadData ?? {
            id: "",
            name: String(data.name ?? ""),
            description: (data.description as string | undefined) ?? undefined,
            entries: (data.entries as Entry[]) ?? [],
          };
          return {
            id: String(data.id ?? (base as Record<string, unknown>).id ?? ""),
            name: String(data.name ?? base.name ?? ""),
            description:
              (data.description as string | undefined) ?? base.description,
            entries:
              (data.entries as Entry[]) ?? (base.entries as Entry[]) ?? [],
          };
        },
        error: () => null,
      }),

      setError: assignAny({
        error: (_ctx: unknown, evt: unknown) => {
          // evt may be null/undefined in some edge cases, ensure we always set a usable object
          console.error("loadMachine setError evt:", evt);
          const ev = evt as { data?: unknown } | unknown;
          const raw =
            ev &&
            typeof ev === "object" &&
            "data" in (ev as Record<string, unknown>) &&
            (ev as Record<string, unknown>).data != null
              ? (ev as Record<string, unknown>).data
              : (ev ?? null);
          let message = raw?.toString?.() ?? String(raw ?? "Unknown error");
          let stack: string | undefined = undefined;
          if (raw && typeof raw === "object") {
            if ("message" in (raw as Record<string, unknown>)) {
              message = String(
                (raw as Record<string, unknown>).message ?? message,
              );
            }
            if ("stack" in (raw as Record<string, unknown>)) {
              stack = (raw as Record<string, unknown>).stack as
                | string
                | undefined;
            }
          }
          return { message, stack, raw };
        },
      }),

      clearLoadData: assignAny({
        loadData: () => null,
        error: () => null,
      }),

      addEntryLocally: assignAny({
        loadData: (ctx: unknown, evt: unknown) => {
          const context = ctx as LoadContext;
          if (!context.loadData) return context.loadData;
          const ev = evt as
            | { entry?: Record<string, unknown> }
            | Record<string, unknown>;
          const entrySrc = (ev && "entry" in ev ? ev.entry : ev) as
            | Record<string, unknown>
            | undefined;
          const entry: Entry = {
            id: Date.now(),
            powderGrains: Number(entrySrc?.powderGrains ?? 0) || 0,
            mv: Number(entrySrc?.mv ?? 0) || 0,
            sd: Number(entrySrc?.sd ?? 0) || 0,
            shotCount: Number(entrySrc?.shotCount ?? 0) || 0,
            es: Number(entrySrc?.es ?? 0) || 0,
          };
          return {
            ...context.loadData,
            entries: [...context.loadData.entries, entry],
          };
        },
      }),

      updateEntryLocally: assignAny({
        loadData: (ctx: unknown, evt: unknown) => {
          const context = ctx as LoadContext;
          if (!context.loadData) return context.loadData;
          const ev = evt as
            | { entry?: Record<string, unknown> }
            | Record<string, unknown>;
          const entrySrc = (ev && "entry" in ev ? ev.entry : ev) as
            | Record<string, unknown>
            | undefined;
          if (!entrySrc || (typeof entrySrc === "object") === false)
            return context.loadData;
          const updated = context.loadData.entries.map((e: Entry) =>
            e.id === Number(entrySrc.id ?? NaN)
              ? {
                  ...e,
                  powderGrains:
                    Number(entrySrc.powderGrains ?? e.powderGrains) ||
                    e.powderGrains,
                  mv: Number(entrySrc.mv ?? e.mv) || e.mv,
                  sd: Number(entrySrc.sd ?? e.sd) || e.sd,
                  shotCount:
                    Number(entrySrc.shotCount ?? e.shotCount) || e.shotCount,
                  es: Number(entrySrc.es ?? e.es) || e.es,
                }
              : e,
          );
          return {
            ...context.loadData,
            entries: updated,
          };
        },
      }),

      removeEntryLocally: assignAny({
        loadData: (ctx: unknown, evt: unknown) => {
          const context = ctx as LoadContext;
          if (!context.loadData) return context.loadData;
          const ev = evt as { entryId?: unknown } | Record<string, unknown>;
          const entryId = Number(
            (ev && "entryId" in ev
              ? ev.entryId
              : (ev as Record<string, unknown>).entryId) ?? NaN,
          );
          if (Number.isNaN(entryId)) return context.loadData;
          return {
            ...context.loadData,
            entries: context.loadData.entries.filter(
              (e: Entry) => e.id !== entryId,
            ),
          };
        },
      }),

      syncEntries: (_ctx: unknown) => {
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

          updateDoc(getLoadRef(ctx.loadData!.id), {
            entries: ctx.loadData!.entries,
          }).catch((err) => {
            console.error("Firestore sync failed:", err);
          });
        })();
      },
    },
  },
);

export default loadMachine;
