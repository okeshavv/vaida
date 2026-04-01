import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, AlertTriangle, Shield, TrendingUp, MapPin, Bell, Loader2, BarChart2, RefreshCw } from 'lucide-react';
import { getEpiClusters, publishEpiAlert, getEpiDashboard } from '../api/client';
import type { EpiCluster } from '../types';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';

const alertColors = {
  low:      { bg: 'bg-urgency-green-bg', text: 'text-urgency-green',  border: 'border-urgency-green-border', dot: 'bg-urgency-green',  bar: 'bg-emerald-500' },
  moderate: { bg: 'bg-urgency-amber-bg', text: 'text-urgency-amber',  border: 'border-urgency-amber-border', dot: 'bg-urgency-amber',  bar: 'bg-amber-400' },
  high:     { bg: 'bg-urgency-red-bg',   text: 'text-urgency-red',    border: 'border-urgency-red-border',   dot: 'bg-urgency-red',    bar: 'bg-red-500' },
  critical: { bg: 'bg-red-100',          text: 'text-red-700',        border: 'border-red-500',              dot: 'bg-red-600',        bar: 'bg-red-700' },
};

export default function EpiDashboard() {
  const { t } = useTranslation();
  const { role } = useApp();
  const navigate = useNavigate();

  const [clusters, setClusters] = useState<EpiCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [timeseries, setTimeseries] = useState<{ date: string; count: number }[]>([]);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      getEpiClusters().then(setClusters),
      getEpiDashboard().then(d => {
        if (Array.isArray(d?.timeseries)) setTimeseries(d.timeseries);
      }),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const totalCases   = clusters.reduce((s, c) => s + c.patient_count, 0);
  const criticalCount = clusters.filter(c => c.alert_level === 'critical' || c.alert_level === 'high').length;

  const handlePublishAlert = async (cluster: EpiCluster) => {
    if (publishing) return;
    setPublishing(cluster.id);
    try {
      const result = await publishEpiAlert({ cluster_id: cluster.id });
      toast.success(`Alert published · TX: ${String(result.alert_tx_hash).slice(0, 14)}…`);
    } catch {
      toast.error('Failed to publish alert');
    } finally {
      setPublishing(null);
    }
  };

  const maxCount = Math.max(...clusters.map(c => c.patient_count), 1);

  return (
    <div className="min-h-screen bg-vaida-bg pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-vaida-bg2">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-bold text-lg">{t('epi.title')}</h1>
        <button onClick={fetchData} disabled={loading} className="p-2 rounded-xl hover:bg-vaida-bg2 transition-colors">
          <RefreshCw size={18} className={`text-vaida-text-muted ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="px-5 space-y-5">
        <p className="text-sm text-vaida-text-muted">{t('epi.subtitle')}</p>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: TrendingUp, value: clusters.length, label: t('epi.activeClusters'), color: 'text-vaida-teal' },
            { icon: MapPin,     value: totalCases,      label: t('epi.cases'),           color: 'text-urgency-amber' },
            { icon: AlertTriangle, value: criticalCount, label: 'High / Critical',       color: 'text-urgency-red' },
          ].map(({ icon: Icon, value, label, color }, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="bg-white rounded-2xl p-4 text-center border border-vaida-bg2"
            >
              <Icon size={20} className={`mx-auto ${color} mb-1`} />
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-[10px] text-vaida-text-hint leading-tight mt-0.5">{label}</div>
            </motion.div>
          ))}
        </div>

        {/* District Heatmap */}
        <div className="bg-white rounded-2xl border border-vaida-bg2 overflow-hidden">
          <div className="p-4 border-b border-vaida-bg2 flex items-center justify-between">
            <h3 className="text-sm font-bold">District Heatmap — Rajasthan</h3>
            <span className="text-[10px] text-vaida-text-hint">Live · AI cluster detection</span>
          </div>
          <div className="relative h-64 bg-gradient-to-br from-vaida-teal-light/20 to-vaida-bg p-4">
            <svg viewBox="0 0 400 250" className="w-full h-full">
              <path d="M80,30 L200,20 L320,40 L350,120 L300,200 L180,230 L100,180 L60,100 Z"
                fill="#F1EFE8" stroke="#D6D3CA" strokeWidth="1.5" />
              {clusters.map((cluster, i) => {
                const x = 80 + (cluster.lng - 73) * 40;
                const y = 20 + (27 - cluster.lat) * 60;
                const radius = Math.max(10, cluster.patient_count * 0.9);
                const color = cluster.alert_level === 'critical' ? '#DC2626'
                  : cluster.alert_level === 'high'     ? '#E24B4A'
                  : cluster.alert_level === 'moderate' ? '#BA7517'
                  : '#639922';
                return (
                  <g key={cluster.id}>
                    <motion.circle cx={x} cy={y} r={radius} fill={color} fillOpacity="0.2"
                      initial={{ r: 0 }} animate={{ r: radius }} transition={{ delay: 0.5 + i * 0.1, type: 'spring' }} />
                    <motion.circle cx={x} cy={y} r={radius * 0.45} fill={color} fillOpacity="0.8"
                      initial={{ r: 0 }} animate={{ r: radius * 0.45 }} transition={{ delay: 0.6 + i * 0.1, type: 'spring' }} />
                    <text x={x} y={y - radius - 4} textAnchor="middle" fontSize="9" fill="#5F5E5A">{cluster.district}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Case Trend Bars (from /epi/dashboard) */}
        {timeseries.length > 0 && (
          <div className="bg-white rounded-2xl border border-vaida-bg2 p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 size={15} className="text-vaida-teal" />
              <h3 className="text-sm font-bold">Case Trend</h3>
            </div>
            <div className="flex items-end gap-1 h-16">
              {timeseries.slice(-14).map((d, i) => {
                const maxTs = Math.max(...timeseries.map(x => x.count), 1);
                const h = Math.round((d.count / maxTs) * 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <motion.div
                      className="w-full bg-vaida-teal rounded-sm"
                      style={{ height: `${h}%`, originY: 1 }}
                      initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                      transition={{ delay: i * 0.03 }}
                    />
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-vaida-text-hint mt-1">Last 14 days</p>
          </div>
        )}

        {/* Cluster List with case bars + publish alert */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-vaida-text">Active Clusters</h2>
            {loading && <Loader2 size={14} className="animate-spin text-vaida-text-hint" />}
          </div>

          <AnimatePresence>
            {loading && clusters.length === 0 ? (
              [1, 2, 3].map(i => <div key={i} className="shimmer-bg h-24 rounded-2xl" />)
            ) : (
              clusters
                .sort((a, b) => ({ critical: 0, high: 1, moderate: 2, low: 3 }[a.alert_level] - { critical: 0, high: 1, moderate: 2, low: 3 }[b.alert_level]))
                .map((cluster, i) => {
                  const colors = alertColors[cluster.alert_level];
                  const barWidth = Math.round((cluster.patient_count / maxCount) * 100);
                  const isPublishing = publishing === cluster.id;

                  return (
                    <motion.div
                      key={cluster.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.07 }}
                      className={`bg-white rounded-2xl p-4 border-l-4 border border-vaida-bg2 ${colors.border}`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                          <h4 className="font-bold text-sm">{cluster.district}</h4>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${colors.bg} ${colors.text}`}>
                          {cluster.alert_level}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-vaida-text-muted mb-2">
                        <span className="font-medium">{cluster.patient_count} {t('epi.cases')}</span>
                        <span>·</span>
                        <span className="truncate">{cluster.symptom_cluster.join(', ')}</span>
                      </div>

                      {/* Case volume bar */}
                      <div className="h-1.5 bg-vaida-bg2 rounded-full mb-3">
                        <motion.div
                          className={`h-1.5 rounded-full ${colors.bar}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${barWidth}%` }}
                          transition={{ delay: 0.3 + i * 0.07, duration: 0.5 }}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[10px] text-vaida-teal">
                          <Shield size={10} />
                          <span>{t('epi.blockchain')}</span>
                        </div>

                        {/* Publish alert — ASHA and doctor roles only */}
                        {(role === 'asha' || role === 'doctor') && (
                          <button
                            onClick={() => handlePublishAlert(cluster)}
                            disabled={!!publishing}
                            className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all ${
                              cluster.alert_level === 'critical' || cluster.alert_level === 'high'
                                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                            } disabled:opacity-50`}
                          >
                            {isPublishing
                              ? <Loader2 size={11} className="animate-spin" />
                              : <Bell size={11} />
                            }
                            {isPublishing ? 'Publishing…' : 'Publish Alert'}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
