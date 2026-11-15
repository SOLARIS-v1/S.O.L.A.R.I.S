/**
 * Runs the heavy mesh preparation (suit shell, skin, organs) in a Web Worker, off the main thread, so loading the
 * body doesn't freeze the page. Each job also carries a synchronous fallback: if workers are unavailable or the
 * worker fails, the same pure function runs here instead and the result is applied just the same.
 *
 * Body3D calls installPrepWorker() once on the main thread, making it the runner behind prepRunner.runPrep.
 */
import { type PrepKind, setPrepRunner } from './prepRunner';

interface Pending {
  sync: () => unknown;
  apply: (out: unknown) => void;
}

let worker: Worker | null | undefined;
let seq = 0;
const pending = new Map<number, Pending>();

/** Finishes every outstanding job on the main thread (the worker died or could not start). */
function fallBack() {
  worker?.terminate();
  worker = null;
  const jobs = [...pending.values()];
  pending.clear();
  for (const job of jobs) job.apply(job.sync());
}

function getWorker() {
  if (worker !== undefined) return worker;
  if (typeof Worker === 'undefined') return (worker = null);
  try {
    worker = new Worker(new URL('./prepWorker.ts', import.meta.url), { type: 'module', name: 'astra-body-prep' });
  } catch {
    return (worker = null);
  }
  worker.addEventListener('message', (e: MessageEvent<{ id: number; out?: unknown; error?: string }>) => {
    const job = pending.get(e.data.id);
    if (!job) return;
    pending.delete(e.data.id);
    job.apply(e.data.error === undefined ? e.data.out : job.sync());
  });
  worker.addEventListener('error', (e) => {
    e.preventDefault();
    fallBack();
  });
  worker.addEventListener('messageerror', fallBack);
  return worker;
}

/**
 * Computes `kind` from `input` in the worker (or with `sync` when that is not possible) and passes the result to
 * `apply`. Inputs are copied to the worker; results come back as transferred buffers.
 */
function runInWorker<I, O>(kind: PrepKind, input: I, sync: (input: I) => O, apply: (out: O) => void) {
  const w = getWorker();
  if (!w) {
    apply(sync(input));
    return;
  }
  const id = ++seq;
  pending.set(id, { sync: () => sync(input), apply: apply as (out: unknown) => void });
  try {
    w.postMessage({ id, kind, input }, []);
  } catch {
    pending.delete(id);
    apply(sync(input));
  }
}

/** Sends mesh preparation to the worker from now on (call once on the main thread). */
export function installPrepWorker() {
  setPrepRunner(runInWorker);
}
