/**
 * SOLARIS UI Event Bus for Voice Control
 * Decouples speech intent execution from React components.
 */

import { useEffect } from 'react';

export type VoiceUiActionType =
  | 'NAVIGATE'
  | 'SELECT_BODY_HOTSPOT'
  | 'BODY_CAMERA'
  | 'BODY_LAYER'
  | 'TIMELINE_SCRUB'
  | 'ANALYTICS_RANGE'
  | 'ANALYTICS_COMPARE'
  | 'DRAWER_ACTION'
  | 'MEASURE_INPUT'
  | 'CHECKIN_ACTION'
  | 'GENERIC_CLICK'
  | 'SCROLL'
  | 'SHOW_HELP';

export interface VoiceUiEvent<T = any> {
  type: VoiceUiActionType;
  payload: T;
  timestamp: number;
}

type Handler<T = any> = (payload: T) => void;

class VoiceUiBus {
  private listeners: Map<VoiceUiActionType, Set<Handler>> = new Map();

  subscribe<T = any>(type: VoiceUiActionType, handler: Handler<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler);
    return () => {
      this.listeners.get(type)?.delete(handler);
    };
  }

  emit<T = any>(type: VoiceUiActionType, payload: T): void {
    const handlers = this.listeners.get(type);
    if (handlers) {
      handlers.forEach((h) => {
        try {
          h(payload);
        } catch (err) {
          console.error(`[uiBus] Error in handler for ${type}:`, err);
        }
      });
    }
  }
}

export const uiBus = new VoiceUiBus();

/**
 * React hook to subscribe to voice UI events cleanly
 */
export function useVoiceUi<T = any>(type: VoiceUiActionType, handler: Handler<T>) {
  useEffect(() => {
    const unsubscribe = uiBus.subscribe<T>(type, handler);
    return unsubscribe;
  }, [type, handler]);
}
