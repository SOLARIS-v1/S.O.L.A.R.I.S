import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SOLARIS_METRICS, type MetricDef } from '../data/solarisCatalog';
import { MeasureWizard } from '../components/measure/MeasureWizard';
import { useAstra } from '../context/AstraContext';
import { useAstraStore } from '../api/mockClient';
import {
  Activity,
  Heart,
  Eye,
  Zap,
  Moon,
  Droplet,
  Scale,
  Utensils,
  Smile,
  ShieldAlert,
  Search,
  Filter,
  Flame,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

export const MeasurePage: React.FC = () => {
  const { metricId } = useParams<{ metricId?: string }>();
  const navigate = useNavigate();
  const { activeCrew } = useAstra();
  const { environment } = useAstraStore();

  const [activeMetric, setActiveMetric] = useState<MetricDef | null>(() => {
    if (metricId) {
      return SOLARIS_METRICS.find((m) => m.id === metricId) || null;
    }
    return null;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'ALL PROTOCOLS' },
    { id: 'Heart & circulation', label: 'CARDIOVASCULAR' },
    { id: 'Brain & senses', label: 'NEURO & SENSES' },
    { id: 'Musculoskeletal & energy', label: 'MUSCULOSKELETAL' },
    { id: 'Systemic & fluids', label: 'SYSTEMIC & FLUIDS' },
  ];

  const filteredMetrics = SOLARIS_METRICS.filter((m) => {
    const matchesSearch =
      m.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.body_region.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Helper to get current display value from activeCrew
  const getCurrentValue = (m: MetricDef) => {
    if (!activeCrew) return '—';
    if (m.id === 'hr') return `${activeCrew.vitals.heartRate} bpm`;
    if (m.id === 'bp') return '120/78 mmHg';
    if (m.id === 'spo2') return `${activeCrew.vitals.spo2}%`;
    if (m.id === 'resp') return `${activeCrew.vitals.respRate} br/m`;
    if (m.id === 'temp') return `${activeCrew.vitals.coreTemp} °C`;
    if (m.id === 'glucose') return '94 mg/dL';
    if (m.id === 'hydration') return '2.6 L';
    if (m.id === 'mass') return '78.2 kg';
    if (m.id === 'nutrition') return '92% target';
    if (m.id === 'sleep') return `${activeCrew.vitals.sleepHours ?? 7.2} hrs`;
    if (m.id === 'mood') return 'Nominal (4/5)';
    if (m.id === 'reaction') return '228 ms';
    if (m.id === 'exercise') return '55 min done';
    if (m.id === 'vision') return '0 distortion';
    if (m.id === 'symptoms') return '0 red-flags';
    return '—';
  };

  const getMetricIcon = (id: string) => {
    switch (id) {
      case 'hr':
      case 'bp':
        return <Heart className="w-4 h-4 text-rose-500" />;
      case 'spo2':
      case 'resp':
        return <Activity className="w-4 h-4 text-emerald-500" />;
      case 'vision':
        return <Eye className="w-4 h-4 text-indigo-500" />;
      case 'reaction':
        return <Zap className="w-4 h-4 text-amber-500" />;
      case 'sleep':
        return <Moon className="w-4 h-4 text-purple-500" />;
      case 'hydration':
        return <Droplet className="w-4 h-4 text-cyan-500" />;
      case 'mass':
        return <Scale className="w-4 h-4 text-slate-500" />;
      case 'nutrition':
      case 'glucose':
        return <Utensils className="w-4 h-4 text-orange-500" />;
      case 'mood':
        return <Smile className="w-4 h-4 text-emerald-500" />;
      case 'exercise':
        return <Flame className="w-4 h-4 text-orange-600" />;
      case 'symptoms':
        return <ShieldAlert className="w-4 h-4 text-rose-600" />;
      default:
        return <Activity className="w-4 h-4 text-indigo-500" />;
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F4F7FC] text-[#0F172A] pt-6 pb-16 px-4 lg:px-8 max-w-7xl mx-auto flex flex-col gap-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono tracking-widest font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200/60">
              SOLARIS CLINICAL INSTRUMENTATION
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-[10.5px] font-mono text-slate-500 font-semibold">15 BIOMEDICAL DOMAINS</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Measurement & Diagnostics Centre
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            NASA spaceflight physiological assessment protocols, sensory evaluations, and cognitive reaction telemetry.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search metric, protocol, or organ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 shadow-2xs transition-all"
          />
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 shrink-0" />
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold transition-all shrink-0 border shadow-2xs ${
              selectedCategory === cat.id
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'text-slate-600 border-slate-200/90 hover:border-slate-300 hover:text-slate-900 bg-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 15-Category Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMetrics.map((metric) => {
          const val = getCurrentValue(metric);
          return (
            <div
              key={metric.id}
              className="group p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4 shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                      {getMetricIcon(metric.id)}
                    </div>
                    <div>
                      <span className="text-[10px] font-mono tracking-wider font-bold text-slate-400 uppercase block">
                        {metric.category}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {metric.label}
                      </h3>
                    </div>
                  </div>
                  <span className="text-[9.5px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 uppercase border border-slate-200/60">
                    {metric.body_region}
                  </span>
                </div>

                {/* Current Telemetry Display */}
                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-between font-mono">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    CURRENT READING
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {val}
                  </span>
                </div>

                <p className="text-xs text-slate-500 line-clamp-2 mt-3 leading-relaxed">
                  {metric.why_matters.purpose}
                </p>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">
                  {metric.prepare.duration} protocol
                </span>
                <button
                  onClick={() => setActiveMetric(metric)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold text-xs transition-colors border border-indigo-200/60 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600"
                >
                  <span>Launch Protocol</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Measurement Protocol Wizard Modal */}
      {activeMetric && (
        <MeasureWizard
          metric={activeMetric}
          onClose={() => {
            setActiveMetric(null);
            if (metricId) navigate('/measure');
          }}
          onSaved={() => {
            // Updated
          }}
        />
      )}
    </div>
  );
};

export default MeasurePage;
