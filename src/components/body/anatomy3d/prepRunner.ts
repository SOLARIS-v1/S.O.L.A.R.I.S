/**
 * The seam between mesh preparation and where it runs. Mesh code (suit.ts, organGeometry.ts) calls runPrep with a
 * pure function; on the main thread prepClient.ts registers a runner that sends the job to a Web Worker. This module
 * never creates the worker itself, so the worker bundle (which imports the mesh code) doesn't reference its own
 * entry point: that self-reference made production bundling loop forever.
 */

export type PrepKind = 'suit' | 'skin' | 'organs';

type Runner = <I, O>(kind: PrepKind, input: I, sync: (input: I) => O, apply: (out: O) => void) => void;

let runner: Runner | null = null;

/** Installs the runner (prepClient.ts does this on the main thread). */
export function setPrepRunner(r: Runner) {
  runner = r;
}

/**
 * Computes `kind` from `input` and passes the result to `apply`: in the worker when a runner is installed, otherwise
 * right here with `sync`.
 */
export function runPrep<I, O>(kind: PrepKind, input: I, sync: (input: I) => O, apply: (out: O) => void) {
  if (runner) runner(kind, input, sync, apply);
  else apply(sync(input));
}

/** Every ArrayBuffer inside a result, to transfer rather than copy. */
export function buffersOf(value: unknown, out: ArrayBuffer[] = []): ArrayBuffer[] {
  if (ArrayBuffer.isView(value)) {
    if (value.buffer instanceof ArrayBuffer && !out.includes(value.buffer)) out.push(value.buffer);
  } else if (Array.isArray(value)) {
    for (const v of value) buffersOf(v, out);
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) buffersOf(v, out);
  }
  return out;
}
