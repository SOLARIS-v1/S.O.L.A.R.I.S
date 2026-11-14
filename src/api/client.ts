import {
  HealthRecord,
  Finding,
  CrewMember,
  MissionTask,
  LinkState,
  MissionEnvironment,
} from './types';
import { useAstraStore } from './mockClient';

export interface ApiClient {
  getRecords(subject_id?: string, limit?: number): Promise<HealthRecord[]>;
  postRecord(
    record: Omit<HealthRecord, 'id' | 'synced' | 'synced_at'>
  ): Promise<HealthRecord>;
  getFindings(subject_id?: string): Promise<Finding[]>;
  updateFinding(id: string, updates: Partial<Finding>): Promise<Finding>;
  getCrew(): Promise<CrewMember[]>;
  getTasks(): Promise<MissionTask[]>;
  getLinkState(): Promise<{ state: LinkState; pendingCount: number; lastSync: string }>;
  setLinkState(state: LinkState): Promise<void>;
  drainSyncQueue(): Promise<number>;
  setEnvironment(env: MissionEnvironment): Promise<void>;
  getEnvironment(): Promise<MissionEnvironment>;
  injectFault(
    faultType: 'fever' | 'bad_sleep' | 'raised_bp' | 'missed_checkin' | 'link_down',
    subjectId?: string
  ): Promise<void>;
  resetDemo(): Promise<void>;
}

/**
 * Mock implementation of ApiClient that interfaces with Zustand store.
 * When real FastAPI backend is connected, an Axios/fetch implementation
 * will target http://localhost:8000/api.
 */
export const mockApiClient: ApiClient = {
  async getRecords(subject_id, limit) {
    const records = useAstraStore.getState().records;
    let filtered = subject_id ? records.filter(r => r.subject_id === subject_id) : records;
    if (limit) filtered = filtered.slice(-limit);
    return filtered;
  },

  async postRecord(recData) {
    return useAstraStore.getState().postRecord(recData);
  },

  async getFindings(subject_id) {
    const findings = useAstraStore.getState().findings;
    return subject_id ? findings.filter(f => f.subject_id === subject_id) : findings;
  },

  async updateFinding(id, updates) {
    const f = useAstraStore.getState().findings.find(x => x.id === id);
    if (!f) throw new Error(`Finding ${id} not found`);
    if (updates.status) {
      useAstraStore.getState().updateFindingStatus(id, updates.status, updates.review_notes);
    }
    return { ...f, ...updates };
  },

  async getCrew() {
    return useAstraStore.getState().crew;
  },

  async getTasks() {
    return useAstraStore.getState().tasks;
  },

  async getLinkState() {
    const store = useAstraStore.getState();
    const pendingCount = store.records.filter(r => !r.synced).length;
    return {
      state: store.linkState,
      pendingCount,
      lastSync: store.lastSyncTime,
    };
  },

  async setLinkState(state: LinkState) {
    useAstraStore.getState().setLinkState(state);
  },

  async drainSyncQueue() {
    return useAstraStore.getState().drainSyncQueue();
  },

  async setEnvironment(env: MissionEnvironment) {
    useAstraStore.getState().setEnvironment(env);
  },

  async getEnvironment() {
    return useAstraStore.getState().environment;
  },

  async injectFault(faultType, subjectId) {
    useAstraStore.getState().injectFault(faultType, subjectId);
  },

  async resetDemo() {
    useAstraStore.getState().resetAll();
  },
};

export const api: ApiClient = mockApiClient;
