import React, { Component, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { Loading, Freight } from './types';
import { 
  Truck, 
  User as UserIcon, 
  Weight, 
  FileText, 
  CheckCircle2, 
  LogOut,
  Plus,
  Trash2,
  Check,
  X,
  LayoutDashboard,
  BarChart2,
  Package,
  ClipboardList,
  ChevronRight,
  TrendingUp,
  Users,
  Activity,
  ArrowRight,
  Download,
  Moon,
  Sun
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  Funnel,
  FunnelChart,
  LabelList
} from 'recharts';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<any, any> {
  constructor(props: any) {
    super(props);
    (this as any).state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    const { hasError, error } = (this as any).state;
    if (hasError) {
      return (
        <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-4">
            <h1 className="text-2xl font-bold text-red-500">Ops! Algo deu errado.</h1>
            <p className="text-zinc-500">Ocorreu um erro inesperado no sistema.</p>
            <div className="bg-white border border-zinc-200 p-4 rounded-xl text-left overflow-auto max-h-60">
              <code className="text-xs text-red-500">{error?.message}</code>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-colors"
            >
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}

function MainApp() {
  const [loading, setLoading] = useState(true);
  const [loadings, setLoadings] = useState<Loading[]>([]);
  const [freights, setFreights] = useState<Freight[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'freights' | 'loadings' | 'reports'>('dashboard');
  
  // Freight Form State
  const [freightDesc, setFreightDesc] = useState('');
  const [freightProduct, setFreightProduct] = useState('');
  const [freightOrigin, setFreightOrigin] = useState('');
  const [freightDestination, setFreightDestination] = useState('');
  const [freightTotalWeight, setFreightTotalWeight] = useState('');
  const [isSubmittingFreight, setIsSubmittingFreight] = useState(false);

  // Loading Form State
  const [selectedFreightId, setSelectedFreightId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [plate, setPlate] = useState('');
  const [weight, setWeight] = useState('');
  const [isSubmittingLoading, setIsSubmittingLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingType, setDeletingType] = useState<'loading' | 'freight' | null>(null);
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDriverName, setEditDriverName] = useState('');
  const [editPlate, setEditPlate] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    // Auth listener removed as login is no longer required
    setLoading(false);
  }, []);

  useEffect(() => {
    // Fetching data without requiring a user object
    console.log("Setting up snapshots...");
    const unsubLoadings = onSnapshot(query(collection(db, 'loadings'), orderBy('date', 'desc')), (snapshot) => {
      console.log("Loadings snapshot received:", snapshot.size, "docs");
      setLoadings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loading)));
    }, (error) => {
      console.error("Loadings snapshot error:", error);
      handleFirestoreError(error, OperationType.LIST, 'loadings');
    });

    const unsubFreights = onSnapshot(query(collection(db, 'freights'), orderBy('date', 'desc')), (snapshot) => {
      console.log("Freights snapshot received:", snapshot.size, "docs");
      setFreights(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Freight)));
    }, (error) => {
      console.error("Freights snapshot error:", error);
      handleFirestoreError(error, OperationType.LIST, 'freights');
    });

    return () => {
      unsubLoadings();
      unsubFreights();
    };
  }, []);

  const handleLogin = async () => {
    // Login removed
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    // Auth removed
  };

  const handleLogout = () => {
    // Logout removed
  };

  const handleSubmitFreight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!freightDesc || !freightProduct || !freightTotalWeight || !freightOrigin || !freightDestination) return;

    setIsSubmittingFreight(true);
    const path = 'freights';
    try {
      await addDoc(collection(db, path), {
        description: freightDesc,
        product: freightProduct,
        origin: freightOrigin,
        destination: freightDestination,
        totalWeight: Number(freightTotalWeight),
        status: 'Aberto',
        date: new Date().toISOString()
      });
      setFreightDesc('');
      setFreightProduct('');
      setFreightOrigin('');
      setFreightDestination('');
      setFreightTotalWeight('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setIsSubmittingFreight(false);
    }
  };

  const handleSubmitLoading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFreightId || !driverName || !plate || !weight) return;

    setIsSubmittingLoading(true);
    const path = 'loadings';
    try {
      await addDoc(collection(db, path), {
        freightId: selectedFreightId,
        driverName,
        plate: plate.toUpperCase(),
        weight: Number(weight),
        manifestoDone: false,
        unloaded: false,
        date: new Date().toISOString()
      });
      setDriverName('');
      setPlate('');
      setWeight('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setIsSubmittingLoading(false);
    }
  };

  const toggleStatus = async (id: string, field: 'manifestoDone' | 'unloaded', value: boolean) => {
    const path = `loadings/${id}`;
    try {
      await updateDoc(doc(db, 'loadings', id), {
        [field]: !value
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteLoading = async (id: string) => {
    const path = `loadings/${id}`;
    try {
      await deleteDoc(doc(db, 'loadings', id));
      setDeletingId(null);
      setDeletingType(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const deleteFreight = async (id: string) => {
    const path = `freights/${id}`;
    try {
      await deleteDoc(doc(db, 'freights', id));
      setDeletingId(null);
      setDeletingType(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const startEditing = (loading: Loading) => {
    setEditingId(loading.id);
    setEditDriverName(loading.driverName);
    setEditPlate(loading.plate);
    setEditWeight(loading.weight.toString());
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    if (!editDriverName || !editPlate || !editWeight) return;
    try {
      await updateDoc(doc(db, 'loadings', id), {
        driverName: editDriverName,
        plate: editPlate.toUpperCase(),
        weight: Number(editWeight)
      });
      setEditingId(null);
    } catch (error) {
      console.error("Erro ao salvar edição:", error);
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    // Get all unique keys from all objects to ensure consistent columns
    const allKeys = Array.from(new Set(data.flatMap(item => Object.keys(item))));
    
    const headers = allKeys.join(',');
    const rows = data.map(item => 
      allKeys.map(key => {
        let val = item[key];
        if (val === undefined || val === null) return '""';
        if (typeof val === 'object') {
          try {
            val = JSON.stringify(val);
          } catch (e) {
            val = String(val);
          }
        }
        const str = String(val);
        // Escape double quotes by doubling them and wrap in quotes
        return `"${str.replace(/"/g, '""')}"`;
      }).join(',')
    ).join('\n');
    
    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="min-h-screen bg-zinc-50 flex items-center justify-center"><div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /></div>;

  // Summary Data
  const totalWeight = loadings.reduce((acc, curr) => acc + curr.weight, 0);
  const openFreights = freights.filter(f => f.status === 'Aberto').length;
  const pendingManifesto = loadings.filter(l => !l.manifestoDone).length;
  const totalCompleted = loadings.filter(l => l.unloaded).length;

  // Detailed Metrics
  const totalPlannedWeight = freights.reduce((acc, curr) => acc + curr.totalWeight, 0);
  const totalUnloadedWeight = loadings.filter(l => l.unloaded).reduce((acc, curr) => acc + curr.weight, 0);
  const uniqueDrivers = new Set(loadings.map(l => l.driverName)).size;
  const avgWeightPerDriver = uniqueDrivers > 0 ? totalWeight / uniqueDrivers : 0;
  
  const driverStats = loadings.reduce((acc: { name: string, weight: number, count: number }[], curr) => {
    const existing = acc.find(item => item.name === curr.driverName);
    if (existing) {
      existing.weight += curr.weight;
      existing.count += 1;
    } else {
      acc.push({ name: curr.driverName, weight: curr.weight, count: 1 });
    }
    return acc;
  }, []).sort((a, b) => b.weight - a.weight);

  const topDriver = driverStats[0];

  const driversCarregando = new Set(loadings.map(l => l.driverName)).size;
  const driversDescarregado = new Set(loadings.filter(l => l.unloaded).map(l => l.driverName)).size;

  const funnelData = [
    { value: totalPlannedWeight, name: 'Planejado', fill: '#27272a', sub: `${freights.length} Fretes` },
    { value: totalWeight, name: 'Carregado', fill: '#22c55e', sub: `${loadings.length} Viagens (${driversCarregando} Motoristas)` },
    { value: totalUnloadedWeight, name: 'Descarregado', fill: '#3b82f6', sub: `${totalCompleted} Finalizadas (${driversDescarregado} Motoristas)` },
  ];

  const driverFunnelData = driverStats.slice(0, 5).map((d, idx) => ({
    value: d.weight,
    name: d.name,
    fill: idx === 0 ? '#22c55e' : idx === 1 ? '#16a34a' : idx === 2 ? '#15803d' : idx === 3 ? '#166534' : '#14532d',
    sub: `${d.count} viagens`
  }));

  // Freight Performance Data
  const freightPerformance = freights.map(f => {
    const loadedWeight = loadings
      .filter(l => l.freightId === f.id)
      .reduce((acc, curr) => acc + curr.weight, 0);
    return { name: f.description, weight: loadedWeight };
  }).filter(item => item.weight > 0).sort((a, b) => b.weight - a.weight);

  const freightFunnelData = freightPerformance.slice(0, 5).map((f, idx) => ({
    value: f.weight,
    name: f.name,
    fill: idx === 0 ? '#3b82f6' : idx === 1 ? '#2563eb' : idx === 2 ? '#1d4ed8' : idx === 3 ? '#1e40af' : '#1e3a8a',
    sub: `${(f.weight / totalWeight * 100).toFixed(1)}% do total`
  }));

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-zinc-950 text-zinc-400' : 'bg-zinc-100 text-zinc-600'} font-sans flex flex-col md:flex-row transition-colors duration-300`}>
      {/* Sidebar */}
      <aside className={`w-full md:w-64 ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} border-r p-6 space-y-8 md:sticky md:top-0 md:h-screen overflow-y-auto z-50 transition-colors`}>
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20">
              <Package className="w-6 h-6 text-white" />
            </div>
            <h1 className={`font-black tracking-tighter uppercase text-xl leading-none ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Controle<br/><span className="text-green-500">Fretes</span></h1>
          </div>
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-xl transition-all ${darkMode ? 'bg-zinc-800 text-yellow-500 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        <nav className="space-y-2">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} darkMode={darkMode} />
          <SidebarItem icon={ClipboardList} label="Novo Frete" active={activeTab === 'freights'} onClick={() => setActiveTab('freights')} darkMode={darkMode} />
          <SidebarItem icon={Plus} label="Cadastrar Motorista" active={activeTab === 'loadings'} onClick={() => setActiveTab('loadings')} darkMode={darkMode} />
          <SidebarItem icon={FileText} label="Relatórios" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} darkMode={darkMode} />
        </nav>

        <div className="pt-10 border-t border-zinc-100">
          <p className="px-4 py-3 text-[10px] text-zinc-400 uppercase font-bold tracking-widest text-center">
            Sistema Aberto
          </p>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 space-y-10 overflow-y-auto">
        {activeTab === 'dashboard' && (
          <>
            {/* Summary */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryCard label="Peso Total" value={`${totalWeight.toLocaleString()} kg`} color="text-green-600" darkMode={darkMode} />
              <SummaryCard label="Fretes Abertos" value={openFreights.toString()} color="text-blue-600" darkMode={darkMode} />
              <SummaryCard label="Manifesto Pendente" value={pendingManifesto.toString()} color="text-orange-600" darkMode={darkMode} />
              <SummaryCard label="Finalizados" value={totalCompleted.toString()} color={darkMode ? 'text-white' : 'text-zinc-900'} darkMode={darkMode} />
            </section>

            {/* Performance Dashboard */}
            {(freightPerformance.length > 0 || loadings.length > 0) && (
              <section className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} border rounded-3xl p-8 shadow-sm transition-colors`}>
                <div className="flex flex-col lg:flex-row gap-12">
                  {/* Funnel Section */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-8">
                      <h2 className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-bold flex items-center gap-2`}>
                        <Activity className="w-5 h-5 text-green-500" /> Fluxo de Operação (Funil)
                      </h2>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${darkMode ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
                          <span className={`text-[10px] ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} uppercase font-bold`}>Planejado</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className={`text-[10px] ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} uppercase font-bold`}>Carregado</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className={`text-[10px] ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} uppercase font-bold`}>Descarregado</span>
                        </div>
                      </div>
                    </div>

                    <div className="h-[400px] w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <FunnelChart>
                          <Tooltip 
                            contentStyle={{ backgroundColor: darkMode ? '#18181b' : '#ffffff', border: `1px solid ${darkMode ? '#27272a' : '#e5e7eb'}`, borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ color: darkMode ? '#ffffff' : '#111827', fontWeight: 'bold' }}
                            formatter={(value: number, name: string, props: any) => [
                              `${value.toLocaleString()} kg`, 
                              `${props.payload.name} (${props.payload.sub})`
                            ]}
                          />
                          <Funnel
                            data={funnelData.map(d => ({ ...d, fill: d.name === 'Planejado' && darkMode ? '#27272a' : d.fill }))}
                            dataKey="value"
                            isAnimationActive
                          >
                            {funnelData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.name === 'Planejado' && darkMode ? '#27272a' : entry.fill} />
                            ))}
                            <LabelList 
                              position="center" 
                              fill="#ffffff" 
                              stroke="none" 
                              dataKey="name" 
                              style={{ fontWeight: 'bold', fontSize: '14px' }}
                            />
                            <LabelList 
                              position="right" 
                              fill={darkMode ? '#52525b' : '#94a3b8'} 
                              stroke="none" 
                              dataKey="sub" 
                              style={{ fontSize: '10px', fontWeight: 'bold' }}
                            />
                          </Funnel>
                        </FunnelChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Driver Funnel */}
                    <div className="mt-12">
                      <h2 className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-bold mb-8 flex items-center gap-2`}>
                        <Users className="w-5 h-5 text-blue-500" /> Top 5 Motoristas (Funil de Volume)
                      </h2>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <FunnelChart>
                            <Tooltip 
                              contentStyle={{ backgroundColor: darkMode ? '#18181b' : '#ffffff', border: `1px solid ${darkMode ? '#27272a' : '#e5e7eb'}`, borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                              itemStyle={{ color: darkMode ? '#ffffff' : '#111827', fontWeight: 'bold' }}
                              formatter={(value: number, name: string, props: any) => [
                                `${value.toLocaleString()} kg`, 
                                `${props.payload.name} (${props.payload.sub})`
                              ]}
                            />
                            <Funnel
                              data={driverFunnelData}
                              dataKey="value"
                            >
                              {driverFunnelData.map((entry, index) => (
                                <Cell key={`cell-driver-${index}`} fill={entry.fill} />
                              ))}
                              <LabelList 
                                position="center" 
                                fill="#ffffff" 
                                stroke="none" 
                                dataKey="name" 
                                style={{ fontSize: '11px', fontWeight: 'bold' }}
                              />
                            </Funnel>
                          </FunnelChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Freight Funnel */}
                    <div className="mt-12">
                      <h2 className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-bold mb-8 flex items-center gap-2`}>
                        <Package className="w-5 h-5 text-purple-500" /> Top 5 Fretes (Funil de Volume)
                      </h2>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <FunnelChart>
                            <Tooltip 
                              contentStyle={{ backgroundColor: darkMode ? '#18181b' : '#ffffff', border: `1px solid ${darkMode ? '#27272a' : '#e5e7eb'}`, borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                              itemStyle={{ color: darkMode ? '#ffffff' : '#111827', fontWeight: 'bold' }}
                              formatter={(value: number, name: string, props: any) => [
                                `${value.toLocaleString()} kg`, 
                                `${props.payload.name} (${props.payload.sub})`
                              ]}
                            />
                            <Funnel
                              data={freightFunnelData}
                              dataKey="value"
                            >
                              {freightFunnelData.map((entry, index) => (
                                <Cell key={`cell-freight-${index}`} fill={entry.fill} />
                              ))}
                              <LabelList 
                                position="center" 
                                fill="#ffffff" 
                                stroke="none" 
                                dataKey="name" 
                                style={{ fontSize: '11px', fontWeight: 'bold' }}
                              />
                            </Funnel>
                          </FunnelChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Metrics Sidebar */}
                  <div className="lg:w-96 space-y-6">
                    <h2 className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-bold mb-6 flex items-center gap-2`}>
                      <TrendingUp className="w-5 h-5 text-blue-500" /> Inteligência de Dados
                    </h2>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className={`${darkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'} p-4 rounded-2xl border shadow-sm transition-colors`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Users className={`w-3 h-3 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`} />
                          <span className={`text-[9px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Motoristas</span>
                        </div>
                        <div className={`text-xl font-black ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{uniqueDrivers}</div>
                      </div>
                      <div className={`${darkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'} p-4 rounded-2xl border shadow-sm transition-colors`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Truck className={`w-3 h-3 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`} />
                          <span className={`text-[9px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Viagens</span>
                        </div>
                        <div className={`text-xl font-black ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{loadings.length}</div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className={`${darkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'} p-4 rounded-2xl border shadow-sm transition-colors`}>
                        <div className="flex items-center gap-3 mb-2">
                          <Weight className={`w-4 h-4 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`} />
                          <span className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Média por Caminhão</span>
                        </div>
                        <div className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{avgWeightPerDriver.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg</div>
                        <div className={`text-[10px] ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} mt-1`}>Eficiência média de carregamento</div>
                      </div>

                      {topDriver && (
                        <div className={`${darkMode ? 'bg-green-500/10 border-green-500/20' : 'bg-green-500/5 border-green-500/10'} p-4 rounded-2xl border transition-colors`}>
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-1.5 bg-green-500/20 rounded-lg">
                              <UserIcon className="w-4 h-4 text-green-500" />
                            </div>
                            <span className="text-[10px] uppercase font-bold text-green-600">Melhor Desempenho</span>
                          </div>
                          <div className={`text-lg font-black ${darkMode ? 'text-white' : 'text-zinc-900'} truncate`}>{topDriver.name}</div>
                          <div className={`flex justify-between items-center mt-2 pt-2 border-t ${darkMode ? 'border-green-500/20' : 'border-green-500/10'}`}>
                            <div className="text-center">
                              <div className={`text-[9px] ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} uppercase`}>Viagens</div>
                              <div className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{topDriver.count}</div>
                            </div>
                            <div className="text-center">
                              <div className={`text-[9px] ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} uppercase`}>Total</div>
                              <div className="text-sm font-bold text-green-600">{topDriver.weight.toLocaleString()} kg</div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className={`${darkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'} p-4 rounded-2xl border shadow-sm transition-colors`}>
                        <div className="flex items-center gap-3 mb-2">
                          <BarChart2 className={`w-4 h-4 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`} />
                          <span className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Taxa de Conclusão</span>
                        </div>
                        <div className="flex items-end gap-2">
                          <div className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-zinc-900'}`}>
                            {totalPlannedWeight > 0 ? ((totalWeight / totalPlannedWeight) * 100).toFixed(1) : 0}%
                          </div>
                          <div className={`text-[10px] ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} mb-1.5`}>do planejado</div>
                        </div>
                        <div className={`w-full h-1.5 ${darkMode ? 'bg-zinc-700' : 'bg-zinc-100'} rounded-full mt-3 overflow-hidden`}>
                          <div 
                            className="h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]" 
                            style={{ width: `${totalPlannedWeight > 0 ? (totalWeight / totalPlannedWeight) * 100 : 0}%` }}
                          />
                        </div>
                      </div>

                      <div className={`pt-4 border-t ${darkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
                        <div className="flex justify-between items-center mb-4">
                          <span className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Ranking de Motoristas</span>
                          <span className={`text-[9px] ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Top 5</span>
                        </div>
                        <div className="space-y-3">
                          {driverStats.slice(0, 5).map((d, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded ${darkMode ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-100 text-zinc-400'} flex items-center justify-center text-[10px] font-bold`}>
                                {idx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`text-[11px] font-bold ${darkMode ? 'text-zinc-300' : 'text-zinc-600'} truncate`}>{d.name}</div>
                                <div className={`w-full h-1 ${darkMode ? 'bg-zinc-800' : 'bg-zinc-100'} rounded-full mt-1`}>
                                  <div 
                                    className={`h-full ${darkMode ? 'bg-zinc-600' : 'bg-zinc-300'}`} 
                                    style={{ width: `${(d.weight / (topDriver?.weight || 1)) * 100}%` }}
                                  />
                                </div>
                              </div>
                              <div className={`text-[10px] font-black ${darkMode ? 'text-white' : 'text-zinc-900'} whitespace-nowrap`}>
                                {d.weight.toLocaleString()} kg
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        {activeTab === 'freights' && (
          <>
            {/* Freight Registration */}
            <section className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} border rounded-3xl p-8 shadow-sm transition-colors`}>
              <h2 className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-bold mb-6 flex items-center gap-2`}>
                <ClipboardList className="w-5 h-5 text-blue-500" /> Novo Frete
              </h2>
              <form onSubmit={handleSubmitFreight} className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Descrição</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Soja - Fazenda Sol"
                    value={freightDesc}
                    onChange={(e) => setFreightDesc(e.target.value)}
                    className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} border rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all`}
                  />
                </div>
                <div className="space-y-2">
                  <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Produto</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Soja"
                    value={freightProduct}
                    onChange={(e) => setFreightProduct(e.target.value)}
                    className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} border rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all`}
                  />
                </div>
                <div className="space-y-2">
                  <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Origem</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Sorriso-MT"
                    value={freightOrigin}
                    onChange={(e) => setFreightOrigin(e.target.value)}
                    className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} border rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all`}
                  />
                </div>
                <div className="space-y-2">
                  <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Destino</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Santos-SP"
                    value={freightDestination}
                    onChange={(e) => setFreightDestination(e.target.value)}
                    className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} border rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all`}
                  />
                </div>
                <div className="space-y-2">
                  <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Peso Total (kg)</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    value={freightTotalWeight}
                    onChange={(e) => setFreightTotalWeight(e.target.value)}
                    className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} border rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all`}
                  />
                </div>
                <div className="md:col-span-6 flex justify-end">
                  <button 
                    disabled={isSubmittingFreight}
                    className="w-full md:w-auto px-12 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-900/20"
                  >
                    {isSubmittingFreight ? 'Salvando...' : 'Criar Frete'}
                  </button>
                </div>
              </form>
            </section>

            {/* Freights List */}
            <section className="space-y-4">
              <h2 className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-bold flex items-center gap-2 px-2`}>
                <TrendingUp className="w-5 h-5 text-blue-500" /> Fretes em Andamento
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {freights.map((f) => {
                  const relatedLoadings = loadings.filter(l => l.freightId === f.id);
                  const loadedWeight = relatedLoadings.reduce((acc, curr) => acc + curr.weight, 0);
                  const progress = Math.min((loadedWeight / f.totalWeight) * 100, 100);

                  return (
                    <div key={f.id} className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} border rounded-3xl p-6 space-y-4 shadow-sm transition-colors`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-bold`}>{f.description}</h3>
                          <p className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{f.product} • {f.totalWeight.toLocaleString()} kg total</p>
                          <div className={`flex items-center gap-2 mt-1 text-[10px] ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            <span className={`${darkMode ? 'bg-zinc-800' : 'bg-zinc-100'} px-1.5 py-0.5 rounded`}>{f.origin}</span>
                            <ChevronRight className="w-3 h-3" />
                            <span className={`${darkMode ? 'bg-zinc-800' : 'bg-zinc-100'} px-1.5 py-0.5 rounded`}>{f.destination}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setDeletingId(f.id);
                            setDeletingType('freight');
                          }}
                          className={`${darkMode ? 'text-zinc-700 hover:text-red-500' : 'text-zinc-300 hover:text-red-500'} transition-colors`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                          <span className={`${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Progresso</span>
                          <span className="text-blue-600">{loadedWeight.toLocaleString()} / {f.totalWeight.toLocaleString()} kg</span>
                        </div>
                        <div className={`h-2 ${darkMode ? 'bg-zinc-800' : 'bg-zinc-100'} rounded-full overflow-hidden`}>
                          <div 
                            className="h-full bg-blue-500 transition-all duration-500" 
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <div className={`flex items-center gap-2 text-[10px] ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        <Truck className="w-3 h-3" />
                        <span>{relatedLoadings.length} motoristas vinculados</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {activeTab === 'loadings' && (
          <>
            {/* Loading Registration */}
            <section className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} border rounded-3xl p-8 shadow-sm transition-colors`}>
              <h2 className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-bold mb-6 flex items-center gap-2`}>
                <Plus className="w-5 h-5 text-green-500" /> Cadastrar Motorista
              </h2>
              <form onSubmit={handleSubmitLoading} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Selecionar Frete</label>
                  <select 
                    value={selectedFreightId}
                    onChange={(e) => setSelectedFreightId(e.target.value)}
                    className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-green-500/50 outline-none transition-all appearance-none`}
                  >
                    <option value="">Selecione...</option>
                    {freights.filter(f => f.status === 'Aberto').map(f => (
                      <option key={f.id} value={f.id}>{f.description}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Motorista</label>
                  <div className="relative">
                    <UserIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-zinc-600' : 'text-zinc-300'}`} />
                    <input 
                      type="text" 
                      placeholder="Nome"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-green-500/50 outline-none transition-all`}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Placa</label>
                  <div className="relative">
                    <Truck className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-zinc-600' : 'text-zinc-300'}`} />
                    <input 
                      type="text" 
                      placeholder="ABC-1234"
                      value={plate}
                      onChange={(e) => setPlate(e.target.value)}
                      className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-green-500/50 outline-none transition-all`}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Peso (kg)</label>
                  <div className="relative">
                    <Weight className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-zinc-600' : 'text-zinc-300'}`} />
                    <input 
                      type="number" 
                      placeholder="0"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-green-500/50 outline-none transition-all`}
                    />
                  </div>
                </div>
                <div className="flex items-end">
                  <button 
                    disabled={isSubmittingLoading}
                    className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-green-900/20"
                  >
                    {isSubmittingLoading ? 'Salvando...' : 'Cadastrar'}
                  </button>
                </div>
              </form>
            </section>

            {/* List Section */}
            <section className="space-y-4">
              <h2 className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-bold flex items-center gap-2 px-2`}>
                <LayoutDashboard className="w-5 h-5 text-green-500" /> Motoristas Cadastrados
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {loadings.map((loading) => {
                  const freight = freights.find(f => f.id === loading.freightId);
                  return (
                    <div key={loading.id} className={`${darkMode ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-200 hover:border-zinc-300'} border rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 group transition-all shadow-sm`}>
                      {editingId === loading.id ? (
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                          <input 
                            type="text" 
                            value={editDriverName}
                            onChange={(e) => setEditDriverName(e.target.value)}
                            className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} rounded-xl py-2 px-4 text-sm focus:ring-2 focus:ring-green-500/50 outline-none`}
                            placeholder="Motorista"
                          />
                          <input 
                            type="text" 
                            value={editPlate}
                            onChange={(e) => setEditPlate(e.target.value)}
                            className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} rounded-xl py-2 px-4 text-sm focus:ring-2 focus:ring-green-500/50 outline-none`}
                            placeholder="Placa"
                          />
                          <input 
                            type="number" 
                            value={editWeight}
                            onChange={(e) => setEditWeight(e.target.value)}
                            className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} rounded-xl py-2 px-4 text-sm focus:ring-2 focus:ring-green-500/50 outline-none`}
                            placeholder="Peso"
                          />
                          <div className="md:col-span-3 flex justify-end gap-2">
                            <button onClick={cancelEditing} className={`px-4 py-2 text-xs font-bold ${darkMode ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-zinc-900'} transition-colors`}>Cancelar</button>
                            <button onClick={() => saveEdit(loading.id)} className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-500 transition-colors">Salvar Alterações</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-6 w-full md:w-auto">
                            <div className={`w-12 h-12 ${darkMode ? 'bg-zinc-800' : 'bg-zinc-50'} rounded-xl flex items-center justify-center text-green-500`}>
                              <Truck className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-bold`}>{loading.driverName}</h3>
                                {freight && (
                                  <span className={`text-[10px] ${darkMode ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-blue-500/10 text-blue-600 border-blue-500/20'} px-2 py-0.5 rounded border`}>
                                    {freight.description}
                                  </span>
                                )}
                              </div>
                              <div className={`flex items-center gap-3 text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} mt-1`}>
                                <span className={`${darkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600'} px-2 py-0.5 rounded font-mono`}>{loading.plate}</span>
                                <span>•</span>
                                <span>{loading.weight.toLocaleString()} kg</span>
                                <span>•</span>
                                <span>{format(parseISO(loading.date), 'dd/MM HH:mm')}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                            <div className="flex items-center gap-2">
                              <StatusButton 
                                active={loading.manifestoDone} 
                                label="Manifesto" 
                                onClick={() => toggleStatus(loading.id, 'manifestoDone', loading.manifestoDone)}
                                darkMode={darkMode}
                              />
                              <StatusButton 
                                active={loading.unloaded} 
                                label="Descarregado" 
                                onClick={() => toggleStatus(loading.id, 'unloaded', loading.unloaded)}
                                darkMode={darkMode}
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => startEditing(loading)}
                                className={`${darkMode ? 'text-zinc-700 hover:text-blue-500' : 'text-zinc-300 hover:text-blue-500'} p-2 transition-colors`}
                                title="Editar"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  setDeletingId(loading.id);
                                  setDeletingType('loading');
                                }}
                                className={`${darkMode ? 'text-zinc-700 hover:text-red-500' : 'text-zinc-300 hover:text-red-500'} p-2 transition-colors`}
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
                {loadings.length === 0 && (
                  <div className={`text-center py-20 border-2 border-dashed ${darkMode ? 'border-zinc-800' : 'border-zinc-100'} rounded-3xl`}>
                    <p className={`${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>Nenhum motorista cadastrado.</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {activeTab === 'reports' && (
          <section className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} border rounded-3xl p-8 space-y-6 shadow-sm transition-colors`}>
            <h2 className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-bold flex items-center gap-2`}>
              <Download className="w-5 h-5 text-green-500" /> Exportar Relatórios
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => exportToCSV(freights, 'relatorio_fretes')}
                className={`flex items-center justify-between p-6 ${darkMode ? 'bg-zinc-800 border-zinc-700 hover:border-blue-500/50' : 'bg-white border-zinc-200 hover:border-blue-500/50'} rounded-2xl transition-all group shadow-sm`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 ${darkMode ? 'bg-blue-500/20' : 'bg-blue-500/10'} rounded-xl text-blue-500`}>
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <div className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-bold`}>Relatório de Fretes</div>
                    <div className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Lista completa de fretes e progresso</div>
                  </div>
                </div>
                <Download className={`w-5 h-5 ${darkMode ? 'text-zinc-700' : 'text-zinc-300'} group-hover:text-blue-500 transition-colors`} />
              </button>

              <button 
                onClick={() => exportToCSV(loadings, 'relatorio_carregamentos')}
                className={`flex items-center justify-between p-6 ${darkMode ? 'bg-zinc-800 border-zinc-700 hover:border-green-500/50' : 'bg-white border-zinc-200 hover:border-green-500/50'} rounded-2xl transition-all group shadow-sm`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 ${darkMode ? 'bg-green-500/20' : 'bg-green-500/10'} rounded-xl text-green-500`}>
                    <Truck className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <div className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-bold`}>Relatório de Carregamentos</div>
                    <div className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Histórico de viagens e motoristas</div>
                  </div>
                </div>
                <Download className={`w-5 h-5 ${darkMode ? 'text-zinc-700' : 'text-zinc-300'} group-hover:text-green-500 transition-colors`} />
              </button>
            </div>
          </section>
        )}

        {/* Performance Dashboard removed from here and moved to dashboard tab */}
      </main>

      {/* Modal de Confirmação de Exclusão */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} border p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl transition-colors`}>
            <div className="flex items-center gap-4 text-red-500">
              <div className="p-3 bg-red-500/10 rounded-2xl">
                <Trash2 size={24} />
              </div>
              <h3 className="text-xl font-bold">Confirmar Exclusão</h3>
            </div>
            
            <p className={`${darkMode ? 'text-zinc-400' : 'text-zinc-500'} leading-relaxed`}>
              {deletingType === 'freight' 
                ? "Tem certeza que deseja excluir este frete? Todos os carregamentos vinculados perderão a referência."
                : "Tem certeza que deseja excluir este registro de carregamento?"}
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setDeletingId(null);
                  setDeletingType(null);
                }}
                className={`flex-1 px-6 py-3 ${darkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'} font-bold rounded-2xl transition-all`}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (deletingType === 'freight') {
                    deleteFreight(deletingId);
                  } else {
                    deleteLoading(deletingId);
                  }
                }}
                className="flex-1 px-6 py-3 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color, darkMode }: { label: string, value: string, color: string, darkMode: boolean }) {
  return (
    <div className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} border p-6 rounded-3xl shadow-sm transition-colors`}>
      <span className={`text-[10px] uppercase tracking-widest font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} block mb-2`}>{label}</span>
      <div className={`text-xl font-black ${color}`}>{value}</div>
    </div>
  );
}

function StatusButton({ active, label, onClick, darkMode }: { active: boolean, label: string, onClick: () => void, darkMode: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
        active 
          ? 'bg-green-500/10 border-green-500/30 text-green-600' 
          : darkMode 
            ? 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600'
            : 'bg-zinc-50 border-zinc-200 text-zinc-400 hover:border-zinc-300'
      }`}
    >
      {active ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      {label}
    </button>
  );
}

function SidebarItem({ icon: Icon, label, active, onClick, darkMode }: { icon: any, label: string, active: boolean, onClick: () => void, darkMode: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
        active 
          ? 'bg-green-500 text-white font-bold shadow-lg shadow-green-500/20' 
          : darkMode
            ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-sm">{label}</span>
    </button>
  );
}

