import {
  HealthRecord,
  Finding,
  CrewMember,
  MissionTask,
  LinkState,
  MissionEnvironment,
  BackendConnectionStatus,
  HealthCheckResult,
  SymptomAssessmentRequest,
  SymptomAssessmentResponse,
  CardiovascularAnalysisPayload,
  CardiovascularAnalysisResult,
  SleepAnalyticsResult,
  ImmuneAnalyticsResult,
  MetabolicAnalyticsResult,
  RadiationSummaryPayload,
  RadiationSummaryResult,
  OcularBonePayload,
  OcularBoneResult,
  AstronautInsightsResult,
  ResearchRegistryResult,
  ResearchStatusResult,
} from './types';
import { ApiClient } from './client';

export class ApiClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export class BackendDisconnectedError extends ApiClientError {
  constructor(endpoint: string, originalError?: any) {
    super(
      `Backend is offline or unreachable at ${endpoint}. Please verify the Python FastAPI server is running on http://127.0.0.1:8000 or toggle Demo Mode.`
    );
    this.name = 'BackendDisconnectedError';
  }
}

export class ApiTimeoutError extends ApiClientError {
  constructor(endpoint: string, timeoutMs: number) {
    super(`Request to ${endpoint} timed out after ${timeoutMs}ms.`);
    this.name = 'ApiTimeoutError';
  }
}

export class ApiHttpError extends ApiClientError {
  public status: number;
  public statusText: string;
  public body: any;

  constructor(status: number, statusText: string, endpoint: string, body: any) {
    const detail = typeof body === 'object' && body?.detail ? body.detail : JSON.stringify(body);
    super(`HTTP ${status} (${statusText}) at ${endpoint}: ${detail}`);
    this.name = 'ApiHttpError';
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

// Configurable base URL
const DEFAULT_API_URL = 'http://127.0.0.1:8000';
let API_BASE_URL: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || DEFAULT_API_URL;

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export function setApiBaseUrl(url: string): void {
  API_BASE_URL = url.replace(/\/+$/, '');
}

// Internal connection tracking
let currentConnectionStatus: BackendConnectionStatus = 'DISCONNECTED';
let lastHealthResult: HealthCheckResult | null = null;
const connectionListeners = new Set<(status: BackendConnectionStatus) => void>();

export function onConnectionStatusChange(listener: (status: BackendConnectionStatus) => void): () => void {
  connectionListeners.add(listener);
  listener(currentConnectionStatus);
  return () => connectionListeners.delete(listener);
}

function updateConnectionStatus(newStatus: BackendConnectionStatus) {
  if (currentConnectionStatus !== newStatus) {
    currentConnectionStatus = newStatus;
    connectionListeners.forEach((fn) => {
      try {
        fn(newStatus);
      } catch (e) {
        console.error('Error in connection listener:', e);
      }
    });
  }
}

/**
 * Robust fetch wrapper with timeout, signal abortion, and typed error handling.
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs = 4000
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      let body: any = null;
      try {
        body = await res.json();
      } catch {
        try {
          body = await res.text();
        } catch {
          body = null;
        }
      }
      throw new ApiHttpError(res.status, res.statusText, endpoint, body);
    }

    updateConnectionStatus('CONNECTED');
    return (await res.json()) as T;
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      updateConnectionStatus('DISCONNECTED');
      throw new ApiTimeoutError(endpoint, timeoutMs);
    }
    if (err instanceof ApiHttpError) {
      // Backend answered, so it is reachable
      updateConnectionStatus('CONNECTED');
      throw err;
    }
    // Network failure (ConnectionRefused, DNS, etc.)
    updateConnectionStatus('DISCONNECTED');
    throw new BackendDisconnectedError(url, err);
  }
}

export const httpClient: ApiClient & {
  checkHealth: (timeoutMs?: number) => Promise<HealthCheckResult>;
  assessSymptoms: (req: SymptomAssessmentRequest) => Promise<SymptomAssessmentResponse>;
  getCrewTelemetry: (name: string) => Promise<any>;
  submitCheckin: (req: any) => Promise<any>;
  getCheckinLogs: (name?: string) => Promise<any[]>;
  getMlStatus: () => Promise<any>;
} = {
  async getConnectionStatus(): Promise<BackendConnectionStatus> {
    try {
      const h = await this.checkHealth(1500);
      return h.status;
    } catch {
      return 'DISCONNECTED';
    }
  },

  async checkHealth(timeoutMs = 2000): Promise<HealthCheckResult> {
    const startTime = performance.now();
    try {
      const data = await request<any>('/api/health', { method: 'GET' }, timeoutMs);
      const latency = Math.round(performance.now() - startTime);
      const result: HealthCheckResult = {
        status: 'CONNECTED',
        online: true,
        timestamp: new Date().toISOString(),
        url: API_BASE_URL,
        engine: data.engine || 'Scikit-Learn ML Engine',
        database: data.database || 'Local SQLite',
        mode: data.mode || 'LOCAL AIR-GAPPED',
        models_loaded: data.models_loaded ?? true,
        latencyMs: latency,
      };
      lastHealthResult = result;
      updateConnectionStatus('CONNECTED');
      return result;
    } catch (err: any) {
      const result: HealthCheckResult = {
        status: 'DISCONNECTED',
        online: false,
        timestamp: new Date().toISOString(),
        url: API_BASE_URL,
        error: err.message || 'Connection refused',
      };
      lastHealthResult = result;
      updateConnectionStatus('DISCONNECTED');
      return result;
    }
  },

  async getCrew(): Promise<CrewMember[]> {
    try {
      // Attempt generic /api/crew collection endpoint
      return await request<CrewMember[]>('/api/crew', { method: 'GET' });
    } catch (err: any) {
      if (err instanceof ApiHttpError && err.status === 404) {
        // Fall back to querying individual crew profiles that backend supports
        const crewNames = ['vance', 'patel', 'chen'];
        const results: CrewMember[] = [];
        for (const name of crewNames) {
          try {
            const data = await request<any>(`/api/crew/${name}`, { method: 'GET' });
            if (data?.crew) {
              const c = data.crew;
              results.push({
                id: c.id,
                name: c.name,
                callsign: c.callsign,
                role: c.role,
                gender: c.id === 'chen' ? 'female' : 'male',
                mission_day: 142,
                status: c.heart_rate_bpm > 90 ? 'review' : 'normal',
                scenario: c.summaryVerdict || 'Orbital Telemetry Stream',
                baseline_established: true,
              });
            }
          } catch {
            // ignore individual 404
          }
        }
        if (results.length > 0) return results;
      }
      throw err;
    }
  },

  async getCrewTelemetry(name: string): Promise<any> {
    return request<any>(`/api/crew/${name}`, { method: 'GET' });
  },

  async assessSymptoms(req: SymptomAssessmentRequest): Promise<SymptomAssessmentResponse> {
    return request<SymptomAssessmentResponse>('/api/assess', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  async submitCheckin(req: any): Promise<any> {
    return request<any>('/api/checkin', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  async getCheckinLogs(name?: string): Promise<any[]> {
    const ep = name ? `/api/logs/${encodeURIComponent(name)}` : '/api/logs';
    return request<any[]>(ep, { method: 'GET' });
  },

  async getMlStatus(): Promise<any> {
    try {
      return await request<any>('/api/ml/status', { method: 'GET' }, 2000);
    } catch {
      // If /api/ml/status is not yet mounted, query /api/health
      return request<any>('/api/health', { method: 'GET' }, 2000);
    }
  },

  // ---------------------------------------------------------------------------
  // SOLARIS Research ML Client Methods (solaris_ml package)
  // ---------------------------------------------------------------------------

  async getResearchStatus(): Promise<ResearchStatusResult> {
    return request<ResearchStatusResult>('/api/ml/status', { method: 'GET' });
  },

  async getResearchRegistry(): Promise<ResearchRegistryResult> {
    return request<ResearchRegistryResult>('/api/ml/registry', { method: 'GET' });
  },

  async analyzeCardiovascular(
    payload: CardiovascularAnalysisPayload
  ): Promise<CardiovascularAnalysisResult> {
    return request<CardiovascularAnalysisResult>('/api/ml/cardiovascular/analyze', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getSleepAnalytics(astronautId: string = 'vance'): Promise<SleepAnalyticsResult> {
    return request<SleepAnalyticsResult>(
      `/api/ml/sleep/analytics?astronaut_id=${encodeURIComponent(astronautId)}`,
      { method: 'GET' }
    );
  },

  async getImmuneAnalytics(astronautId: string = 'vance'): Promise<ImmuneAnalyticsResult> {
    return request<ImmuneAnalyticsResult>(
      `/api/ml/immune/analytics?astronaut_id=${encodeURIComponent(astronautId)}`,
      { method: 'GET' }
    );
  },

  async getMetabolicAnalytics(astronautId: string = 'vance'): Promise<MetabolicAnalyticsResult> {
    return request<MetabolicAnalyticsResult>(
      `/api/ml/metabolic/analytics?astronaut_id=${encodeURIComponent(astronautId)}`,
      { method: 'GET' }
    );
  },

  async getRadiationSummary(astronautId: string = 'vance'): Promise<RadiationSummaryResult> {
    return request<RadiationSummaryResult>(
      `/api/ml/radiation/summary?astronaut_id=${encodeURIComponent(astronautId)}`,
      { method: 'GET' }
    );
  },

  async postRadiationSummary(
    payload: RadiationSummaryPayload
  ): Promise<RadiationSummaryResult> {
    return request<RadiationSummaryResult>('/api/ml/radiation/summary', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getOcularObservations(
    astronautId: string = 'vance',
    currentOnsdMm?: number,
    baselineOnsdMm?: number
  ): Promise<OcularBoneResult> {
    const params = new URLSearchParams({ astronaut_id: astronautId });
    if (currentOnsdMm !== undefined) params.set('current_onsd_mm', String(currentOnsdMm));
    if (baselineOnsdMm !== undefined) params.set('baseline_onsd_mm', String(baselineOnsdMm));
    return request<OcularBoneResult>(`/api/ml/ocular/observations?${params.toString()}`, {
      method: 'GET',
    });
  },

  async getBoneObservations(
    astronautId: string = 'vance',
    bmdTScore?: number
  ): Promise<OcularBoneResult> {
    const params = new URLSearchParams({ astronaut_id: astronautId });
    if (bmdTScore !== undefined) params.set('bmd_t_score', String(bmdTScore));
    return request<OcularBoneResult>(`/api/ml/bone/observations?${params.toString()}`, {
      method: 'GET',
    });
  },

  async getAstronautInsights(astronautId: string): Promise<AstronautInsightsResult> {
    return request<AstronautInsightsResult>(
      `/api/ml/astronaut/${encodeURIComponent(astronautId)}/insights`,
      { method: 'GET' }
    );
  },

  async getRecords(subject_id?: string, limit?: number): Promise<HealthRecord[]> {
    const params = new URLSearchParams();
    if (subject_id) params.set('subject_id', subject_id);
    if (limit) params.set('limit', String(limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request<HealthRecord[]>(`/api/records${qs}`, { method: 'GET' });
  },

  async postRecord(
    record: Omit<HealthRecord, 'id' | 'synced' | 'synced_at'>
  ): Promise<HealthRecord> {
    return request<HealthRecord>('/api/records', {
      method: 'POST',
      body: JSON.stringify(record),
    });
  },

  async getFindings(subject_id?: string): Promise<Finding[]> {
    const qs = subject_id ? `?subject_id=${encodeURIComponent(subject_id)}` : '';
    return request<Finding[]>(`/api/findings${qs}`, { method: 'GET' });
  },

  async updateFinding(id: string, updates: Partial<Finding>): Promise<Finding> {
    return request<Finding>(`/api/findings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async getTasks(): Promise<MissionTask[]> {
    return request<MissionTask[]>('/api/tasks', { method: 'GET' });
  },

  async getLinkState(): Promise<{ state: LinkState; pendingCount: number; lastSync: string }> {
    return request<{ state: LinkState; pendingCount: number; lastSync: string }>('/api/link-state', {
      method: 'GET',
    });
  },

  async setLinkState(state: LinkState): Promise<void> {
    await request<void>('/api/link-state', {
      method: 'POST',
      body: JSON.stringify({ state }),
    });
  },

  async drainSyncQueue(): Promise<number> {
    const res = await request<{ syncedCount: number }>('/api/sync/drain', { method: 'POST' });
    return res.syncedCount ?? 0;
  },

  async setEnvironment(env: MissionEnvironment): Promise<void> {
    await request<void>('/api/environment', {
      method: 'POST',
      body: JSON.stringify({ environment: env }),
    });
  },

  async getEnvironment(): Promise<MissionEnvironment> {
    const res = await request<{ environment: MissionEnvironment }>('/api/environment', {
      method: 'GET',
    });
    return res.environment;
  },

  async injectFault(
    faultType: 'fever' | 'bad_sleep' | 'raised_bp' | 'missed_checkin' | 'link_down',
    subjectId?: string
  ): Promise<void> {
    await request<void>('/api/simulator/inject-fault', {
      method: 'POST',
      body: JSON.stringify({ faultType, subjectId }),
    });
  },

  async resetDemo(): Promise<void> {
    await request<void>('/api/reset', { method: 'POST' });
  },
};
