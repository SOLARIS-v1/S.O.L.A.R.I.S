import type { MetricDef } from './solarisCatalog';

export type Status = 'ok' | 'watch' | 'act';

export interface SymptomDef {
  id: string;
  label: string;
  organ: string;
  red_flag: boolean;
}

export const STATUS_LABEL: Record<Status, string> = { ok: 'Nominal', watch: 'Caution', act: 'Critical' };
export const STATUS_RANK: Record<Status, number> = { ok: 0, watch: 1, act: 2 };

export function worst(statuses: Status[]): Status {
  return statuses.reduce<Status>((a, b) => (STATUS_RANK[b] > STATUS_RANK[a] ? b : a), 'ok');
}

export function fmt(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '–';
  return value.toFixed(decimals);
}

export function fmtMetric(m: MetricDef, value: number | null | undefined, value2?: number | null): string {
  if (value === null || value === undefined) return '–';
  if (m.id === 'bp' && value2 !== null && value2 !== undefined) return `${Math.round(value)}/${Math.round(value2)}`;
  if (m.id === 'vision') return m.input.labels?.[Math.round(value)] ?? String(value);
  return value.toFixed(m.decimals);
}

export function unitFor(m: MetricDef): string {
  return m.id === 'vision' || m.id === 'symptoms' ? '' : m.unit;
}

export function duration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 1) return '< 1 s';
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ${String(s % 60).padStart(2, '0')} s`;
  const h = Math.floor(m / 60);
  return `${h} h ${String(m % 60).padStart(2, '0')} min`;
}

export function clockTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function ageLabel(ageDays: number | null | undefined, time?: string): string {
  if (ageDays === null || ageDays === undefined) return 'No reading yet';
  if (ageDays === 0) return time ? `Today ${time}` : 'Today';
  if (ageDays === 1) return time ? `Yesterday ${time}` : 'Yesterday';
  return `${ageDays} days ago`;
}

export function greeting(time: string): string {
  const h = Number(time.split(':')[0]);
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function signed(v: number, decimals = 0): string {
  const s = v.toFixed(decimals);
  return v > 0 ? `+${s}` : s.replace('-', '−');
}

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${hh}:${mm} UTC`;
}

export function symptomsText(items: string[] | undefined, defs: SymptomDef[], max = 2): string {
  if (!items || items.length === 0) return 'None reported';
  const names = items.map((id) => defs.find((d) => d.id === id)?.label ?? id.replaceAll('_', ' '));
  return names.length <= max ? names.join(', ') : `${names.slice(0, max).join(', ')} +${names.length - max}`;
}
