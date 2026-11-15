/**
 * Web Worker for the body's mesh preparation (see prepClient.ts; this side only imports prepRunner.ts, never prepClient.ts): pure array-in, array-out functions, so the main
 * thread stays free while the suit shell, the skin and the organs are built.
 */
import { organArrays, type OrganInput } from './organGeometry';
import { buffersOf, type PrepKind } from './prepRunner';
import { type SkinInput, skinArrays, suitArrays } from './suit';

self.addEventListener('message', (e: MessageEvent<{ id: number; kind: PrepKind; input: unknown }>) => {
  const { id, kind, input } = e.data;
  try {
    const out = kind === 'suit'
      ? suitArrays(input as SkinInput)
      : kind === 'skin'
        ? skinArrays(input as SkinInput)
        : organArrays(input as OrganInput);
    self.postMessage({ id, out }, { transfer: buffersOf(out) });
  } catch (err) {
    self.postMessage({ id, error: String(err) }, { transfer: [] });
  }
});
