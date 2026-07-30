import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import {
  Map, TrendingUp, AlertTriangle, Users, Activity,
  LogOut, RefreshCcw, ArrowUpRight, ShieldCheck,
  BarChart2, Heart, Thermometer, Baby
} from 'lucide-react';

function MetricCard({ title, value, change, icon: Icon, color, alert }) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-6 ${alert ? 'border-red-200' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon size={20} />
        </div>
        {alert && (
          <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-1 rounded-full flex items-center gap-1">
            <AlertTriangle size={10} />
            Alert
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-800">{value ?? '—'}</p>
      <p className="text-sm font-semibold text-gray-600 mt-1">{title}</p>
      {change !== undefined && (
        <p className={`text-xs mt-1 font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% vs last month
        </p>
      )}
    </div>
  );
}

const DISEASE_DATA = []; // replaced by real API call below

export default function PHODashboard() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState('surveillance');

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['phoStats'],
    queryFn: () => api.get('/pho/stats').then(r => r.data),
    refetchInterval: 120000,
    retry: 1,
  });

  const { data: diseaseData = [] } = useQuery({
    queryKey: ['phoDiseases'],
    queryFn: () => api.get('/pho/disease-surveillance').then(r => r.data),
    refetchInterval: 120000,
    retry: 1,
  });

  const { data: ashaPerformance = [] } = useQuery({
    queryKey: ['phoAshaPerf'],
    queryFn: () => api.get('/pho/asha-performance').then(r => r.data),
    retry: 1,
  });

  const { data: healthAlerts = [] } = useQuery({
    queryKey: ['phoAlerts'],
    queryFn: () => api.get('/pho/alerts').then(r => r.data),
    refetchInterval: 60000,
    retry: 1,
  });




  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const tabs = [
    { id: 'surveillance', label: 'Disease Surveillance' },
    { id: 'asha', label: 'ASHA Performance' },
    { id: 'maternal', label: 'Maternal & Child' },
    { id: 'alerts', label: 'Alerts' },
  ];

  return (
    <div className="min-h-screen bg-[#F7F3EE] w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <header className="pt-safe bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#2C8C68] p-2 rounded-xl">
              <Map size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">Ayu Disha PHO</h1>
              <p className="text-xs text-gray-400">Public Health Officer Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => refetch()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
            >
              <RefreshCcw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-500 hover:text-red-700 font-semibold text-sm"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800">Public Health Overview</h2>
          <p className="text-gray-500 mt-1">District-level health surveillance and community health metrics</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
          <MetricCard
            title="Population Covered"
            value={isLoading ? '...' : stats?.total_population_covered?.toLocaleString()}
            icon={Users}
            color="bg-blue-100 text-blue-600"
            change={2}
          />
          <MetricCard
            title="ASHA Workers Active"
            value={isLoading ? '...' : stats?.active_asha_workers}
            icon={ShieldCheck}
            color="bg-green-100 text-green-600"
          />
          <MetricCard
            title="High-Risk Households"
            value={isLoading ? '...' : stats?.high_risk_households}
            icon={AlertTriangle}
            color="bg-red-100 text-red-600"
            alert={stats?.high_risk_households > 30}
            change={15}
          />
          <MetricCard
            title="Disease Alerts"
            value={isLoading ? '...' : stats?.disease_alerts}
            icon={Activity}
            color="bg-amber-100 text-amber-600"
            alert={stats?.disease_alerts > 0}
          />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-[#2C8C68] text-[#2C8C68]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'surveillance' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-800">Disease Incidence — Current Month</h3>
                <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">Tamil Nadu</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Disease</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Cases</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">District</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(diseaseData.length > 0 ? diseaseData : []).map((d, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-800">{d.name}</td>
                        <td className="px-6 py-4">
                          <span className={`font-bold ${d.cases > 100 ? 'text-red-600' : d.cases > 20 ? 'text-amber-600' : 'text-green-600'}`}>
                            {d.cases}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{d.district}</td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                            d.trend === 'up' ? 'bg-red-100 text-red-600' :
                            d.trend === 'down' ? 'bg-green-100 text-green-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {d.trend === 'up' ? '↑ Rising' : d.trend === 'down' ? '↓ Falling' : '→ Stable'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingUp size={18} className="text-[#2C8C68]" />
                  Immunization Coverage
                </h4>
                <p className="text-sm text-gray-400 text-center py-8">
                  Immunization module not yet available — data will appear here once connected.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <ArrowUpRight size={18} className="text-[#1B6CA8]" />
                  Referral Summary
                </h4>
                <div className="space-y-4">
                  {[
                    { label: 'Total This Month', value: stats?.referrals_this_month, color: 'text-blue-600' },
                    { label: 'Urgent / Pending', value: stats?.disease_alerts,       color: 'text-red-600' },
                    { label: 'High-Risk Households', value: stats?.high_risk_households, color: 'text-amber-600' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-600">{item.label}</span>
                      <span className={`text-lg font-bold ${item.color}`}>{item.value ?? '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'asha' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">ASHA Worker Performance</h3>
              <p className="text-sm text-gray-500 mt-1">Monthly activity metrics by worker</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Worker</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Village</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Households</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Visits</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Referrals</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {ashaPerformance.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No ASHA workers found</td></tr>
                  ) : ashaPerformance.map((worker, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-800">{worker.name}</td>
                      <td className="px-6 py-4 text-gray-500">{worker.village || '—'}</td>
                      <td className="px-6 py-4 text-gray-700">{worker.households}</td>
                      <td className="px-6 py-4 text-gray-700">{worker.visits}</td>
                      <td className="px-6 py-4 text-gray-700">{worker.referrals}</td>
                      <td className="px-6 py-4">
                        <span className={`font-bold text-sm ${worker.score >= 90 ? 'text-green-600' : worker.score >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                          {worker.score}/100
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'maternal' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <Heart size={48} className="text-pink-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-600">Maternal &amp; Child Health</h3>
            <p className="text-gray-400 text-sm mt-2">
              {stats?.maternal_health_cases !== undefined
                ? `${stats.maternal_health_cases} maternal-related visits recorded this month.`
                : 'Loading...'}
            </p>
            <p className="text-xs text-gray-300 mt-4">Full maternal health module coming in next release</p>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="space-y-4">
            {healthAlerts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                <AlertTriangle size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-semibold">No active health alerts</p>
                <p className="text-gray-400 text-sm mt-1">All households and referrals are under control</p>
              </div>
            ) : healthAlerts.map((alert, i) => (
              <div key={i} className={`bg-white rounded-2xl border shadow-sm p-6 ${
                alert.severity === 'high' ? 'border-red-200' : 'border-amber-200'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${alert.severity === 'high' ? 'bg-red-100' : 'bg-amber-100'}`}>
                      <AlertTriangle size={18} className={alert.severity === 'high' ? 'text-red-600' : 'text-amber-600'} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800">{alert.title}</h4>
                      <span className="text-xs text-gray-400">{alert.district} · {alert.time}</span>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    alert.severity === 'high' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {alert.severity === 'high' ? 'HIGH' : 'MEDIUM'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{alert.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
