import React, { Component, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import { Loading, Freight, Employee, Branch, UserProfile } from './types';
import { 
  Truck, 
  Calendar,
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
  Sun,
  Eye,
  DollarSign,
  Filter,
  Search
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
  LabelList,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-6 bg-white p-8 rounded-3xl shadow-xl border border-zinc-200">
          <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Activity size={32} />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Configuração Necessária</h1>
          <p className="text-zinc-600">
            As chaves do Supabase não foram encontradas. Por favor, configure as variáveis de ambiente no menu <strong>Settings</strong> do AI Studio:
          </p>
          <div className="bg-zinc-50 p-4 rounded-xl text-left space-y-2 border border-zinc-200">
            <p className="text-xs font-mono text-zinc-500">VITE_SUPABASE_URL</p>
            <p className="text-xs font-mono text-zinc-500">VITE_SUPABASE_ANON_KEY</p>
          </div>
          <p className="text-sm text-zinc-500 italic">
            Após configurar as chaves, o aplicativo será reiniciado automaticamente.
          </p>
        </div>
      </div>
    );
  }

  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadings, setLoadings] = useState<Loading[]>([]);
  const [freights, setFreights] = useState<Freight[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'freights' | 'loadings' | 'employees' | 'reports' | 'faturamento' | 'management'>('dashboard');
  
  // Management State
  const [newBranchName, setNewBranchName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const [newUserBranchId, setNewUserBranchId] = useState('');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [freightDesc, setFreightDesc] = useState('');
  const [freightProduct, setFreightProduct] = useState('');
  const [freightOrigin, setFreightOrigin] = useState('');
  const [freightDestination, setFreightDestination] = useState('');
  const [freightTotalWeight, setFreightTotalWeight] = useState('');
  const [freightValorFrete, setFreightValorFrete] = useState('');
  const [freightValorRecebido, setFreightValorRecebido] = useState('');
  const [freightValorPagoMotorista, setFreightValorPagoMotorista] = useState('');
  const [freightObservations, setFreightObservations] = useState('');
  const [isSubmittingFreight, setIsSubmittingFreight] = useState(false);

  // Loading Form State
  const [selectedFreightId, setSelectedFreightId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [plate, setPlate] = useState('');
  const [weight, setWeight] = useState('');
  const [loadingDate, setLoadingDate] = useState(new Date().toISOString().split('T')[0]);
  const [manifestoDate, setManifestoDate] = useState('');
  const [unloadedDate, setUnloadedDate] = useState('');
  const [orderGiverId, setOrderGiverId] = useState('');
  const [driverUnitPrice, setDriverUnitPrice] = useState('');
  const [driverValue, setDriverValue] = useState('');
  const [loadingObservations, setLoadingObservations] = useState('');
  const [isSubmittingLoading, setIsSubmittingLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingType, setDeletingType] = useState<'loading' | 'freight' | null>(null);
  const [transferringLoadingId, setTransferringLoadingId] = useState<string | null>(null);
  const [transferNewFreightId, setTransferNewFreightId] = useState<string>('');
  const [viewingFreightId, setViewingFreightId] = useState<string | null>(null);
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDriverName, setEditDriverName] = useState('');
  const [editPlate, setEditPlate] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editLoadingDate, setEditLoadingDate] = useState('');
  const [editManifestoDate, setEditManifestoDate] = useState('');
  const [editUnloadedDate, setEditUnloadedDate] = useState('');
  const [editObservations, setEditObservations] = useState('');
  const [editOrderGiverId, setEditOrderGiverId] = useState('');
  const [editDriverUnitPrice, setEditDriverUnitPrice] = useState('');
  const [editDriverValue, setEditDriverValue] = useState('');
  
  // Freight Edit State
  const [editingFreightId, setEditingFreightId] = useState<string | null>(null);
  const [editFreightDesc, setEditFreightDesc] = useState('');
  const [editFreightProduct, setEditFreightProduct] = useState('');
  const [editFreightOrigin, setEditFreightOrigin] = useState('');
  const [editFreightDestination, setEditFreightDestination] = useState('');
  const [editFreightTotalWeight, setEditFreightTotalWeight] = useState('');
  const [editFreightValorFrete, setEditFreightValorFrete] = useState('');
  const [editFreightValorRecebido, setEditFreightValorRecebido] = useState('');
  const [editFreightValorPagoMotorista, setEditFreightValorPagoMotorista] = useState('');
  const [editFreightObservations, setEditFreightObservations] = useState('');
  const [editFreightStatus, setEditFreightStatus] = useState<'Aberto' | 'Finalizado'>('Aberto');

  // Employee Form State
  const [employeeName, setEmployeeName] = useState('');
  const [employeeRole, setEmployeeRole] = useState('');
  const [isSubmittingEmployee, setIsSubmittingEmployee] = useState(false);

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  
  // Update unit price when freight changes
  useEffect(() => {
    if (selectedFreightId) {
      const freight = freights.find(f => f.id === selectedFreightId);
      if (freight) {
        setDriverUnitPrice(freight.valorPagoMotorista?.toString() || '0');
      }
    }
  }, [selectedFreightId, freights]);

  // Recalculate total value when weight or unit price changes
  useEffect(() => {
    if (weight && driverUnitPrice) {
      const calculatedValue = (Number(weight) / 1000) * Number(driverUnitPrice);
      setDriverValue(calculatedValue.toFixed(2));
    } else if (!weight) {
      setDriverValue('');
    }
  }, [weight, driverUnitPrice]);

  // Recalculate edit total value
  useEffect(() => {
    if (editWeight && editDriverUnitPrice) {
      const calculatedValue = (Number(editWeight) / 1000) * Number(editDriverUnitPrice);
      setEditDriverValue(calculatedValue.toFixed(2));
    }
  }, [editWeight, editDriverUnitPrice]);

  // Filter States
  const [freightFilterStatus, setFreightFilterStatus] = useState<'Todos' | 'Aberto' | 'Finalizado'>('Todos');
  const [freightFilterDate, setFreightFilterDate] = useState('');
  
  const [loadingFilterDriver, setLoadingFilterDriver] = useState('');
  const [loadingFilterPlate, setLoadingFilterPlate] = useState('');
  const [loadingFilterDate, setLoadingFilterDate] = useState('');
  const [loadingFilterManifestDate, setLoadingFilterManifestDate] = useState('');
  const [loadingFilterUnloadDate, setLoadingFilterUnloadDate] = useState('');
  const [loadingFilterFreightId, setLoadingFilterFreightId] = useState('');
  const [loadingFilterStatus, setLoadingFilterStatus] = useState<'Todos' | 'Manifesto' | 'Descarregado' | 'Pendente'>('Todos');
  const [billingFilterFreightId, setBillingFilterFreightId] = useState('');
  const [billingFilterStartDate, setBillingFilterStartDate] = useState('');
  const [billingFilterEndDate, setBillingFilterEndDate] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [dashboardFilterStartDate, setDashboardFilterStartDate] = useState('');
  const [dashboardFilterEndDate, setDashboardFilterEndDate] = useState('');
  const [requestBranchId, setRequestBranchId] = useState('');
  const [requestError, setRequestError] = useState<string | null>(null);
  const [reportFilterStartDate, setReportFilterStartDate] = useState('');
  const [reportFilterEndDate, setReportFilterEndDate] = useState('');
  const [freightSearch, setFreightSearch] = useState('');

  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id, session.user.email!, session.user.user_metadata.full_name);
      } else {
        setLoading(false);
      }
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id, session.user.email!, session.user.user_metadata.full_name);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (uid: string, email: string, name: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', uid)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching user profile:", error);
        setLoading(false);
        return;
      }

      if (data) {
        const profile = data as UserProfile;
        setUserProfile(profile);
        if (profile.role !== 'master' && profile.branchId) {
          setSelectedBranchId(profile.branchId);
        }
      } else {
        if (email === 'joliveira2752@gmail.com') {
          const masterProfile: UserProfile = {
            id: uid,
            email: email,
            role: 'master',
            name: name || 'Master Admin',
            approved: true
          };
          await supabase.from('users').upsert(masterProfile);
          setUserProfile(masterProfile);
        }
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !userProfile) {
      setBranches([]);
      setAllUsers([]);
      return;
    }

    const fetchInitialData = async () => {
      if (userProfile.role === 'master') {
        const { data: bData } = await supabase.from('branches').select('*').order('name');
        setBranches(bData || []);
        const { data: uData } = await supabase.from('users').select('*').order('name');
        setAllUsers(uData || []);
      } else if (userProfile.branchId) {
        const { data } = await supabase.from('branches').select('*').eq('id', userProfile.branchId).single();
        if (data) setBranches([data]);
      }
    };

    fetchInitialData();

    // Set up subscriptions
    const branchesSub = supabase.channel('branches-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'branches' }, () => fetchInitialData())
      .subscribe();

    const usersSub = supabase.channel('users-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchInitialData())
      .subscribe();

    return () => {
      branchesSub.unsubscribe();
      usersSub.unsubscribe();
    };
  }, [user, userProfile]);

  useEffect(() => {
    if (!userProfile) return;
    
    const fetchData = async () => {
      let lQuery = supabase.from('loadings').select('*').order('date', { ascending: false });
      let fQuery = supabase.from('freights').select('*').order('date', { ascending: false });
      let eQuery = supabase.from('employees').select('*').order('name', { ascending: true });

      if (selectedBranchId) {
        lQuery = lQuery.eq('branchId', selectedBranchId);
        fQuery = fQuery.eq('branchId', selectedBranchId);
        eQuery = eQuery.eq('branchId', selectedBranchId);
      }

      const [lRes, fRes, eRes] = await Promise.all([lQuery, fQuery, eQuery]);
      setLoadings(lRes.data || []);
      setFreights(fRes.data || []);
      setEmployees(eRes.data || []);
    };

    fetchData();

    const loadingsSub = supabase.channel('loadings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loadings' }, () => fetchData())
      .subscribe();

    const freightsSub = supabase.channel('freights-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'freights' }, () => fetchData())
      .subscribe();

    const employeesSub = supabase.channel('employees-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => fetchData())
      .subscribe();

    return () => {
      loadingsSub.unsubscribe();
      freightsSub.unsubscribe();
      employeesSub.unsubscribe();
    };
  }, [userProfile, selectedBranchId]);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName || userProfile?.role !== 'master') return;
    const { error } = await supabase.from('branches').insert({
      name: newBranchName,
      active: true
    });
    if (!error) setNewBranchName('');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserName || !newUserBranchId || userProfile?.role !== 'master') return;
    const { error } = await supabase.from('users').insert({
      email: newUserEmail.toLowerCase(),
      name: newUserName,
      role: newUserRole,
      branchId: newUserBranchId,
      approved: true
    });
    if (!error) {
      setNewUserEmail('');
      setNewUserName('');
      setNewUserBranchId('');
    }
  };

  const handleRequestAccess = async (branchId: string) => {
    if (!user || !branchId) return;
    setRequestError(null);
    const { error } = await supabase.from('users').upsert({
      id: user.id,
      email: user.email?.toLowerCase(),
      name: user.user_metadata.full_name || 'Usuário',
      role: 'user',
      branchId: branchId,
      approved: true
    });
    if (error) {
      console.error("Erro ao criar perfil:", error);
      setRequestError("Erro ao entrar no sistema. Por favor, tente novamente.");
    } else {
      fetchUserProfile(user.id, user.email!, user.user_metadata.full_name);
    }
  };

  const handleApproveUser = async (userId: string) => {
    if (userProfile?.role !== 'master') return;
    await supabase.from('users').update({ approved: true }).eq('id', userId);
  };

  const handleRejectUser = async (userId: string) => {
    if (userProfile?.role !== 'master') return;
    await supabase.from('users').delete().eq('id', userId);
  };

  const handleSubmitEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) {
      alert("Selecione uma filial primeiro!");
      return;
    }
    if (!employeeName || !employeeRole) return;
    setIsSubmittingEmployee(true);
    const { error } = await supabase.from('employees').insert({
      name: employeeName,
      role: employeeRole,
      active: true,
      branchId: selectedBranchId
    });
    if (!error) {
      setEmployeeName('');
      setEmployeeRole('');
    }
    setIsSubmittingEmployee(false);
  };

  const deleteEmployee = async (id: string) => {
    await supabase.from('employees').delete().eq('id', id);
  };

  const handleLogin = async () => {
    setLoginError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) setLoginError(error.message);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    
    if (authMode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });
      if (error) setLoginError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
      });
      if (error) {
        setLoginError(error.message);
      } else {
        alert("Cadastro realizado! Verifique seu e-mail se necessário ou tente entrar.");
        setAuthMode('login');
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserProfile(null);
  };

  const handleSubmitFreight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) {
      alert("Selecione uma filial primeiro!");
      return;
    }
    if (!freightDesc || !freightProduct || !freightTotalWeight || !freightOrigin || !freightDestination) return;

    setIsSubmittingFreight(true);
    const { error } = await supabase.from('freights').insert({
      branchId: selectedBranchId,
      description: freightDesc,
      product: freightProduct,
      origin: freightOrigin,
      destination: freightDestination,
      totalWeight: Number(freightTotalWeight),
      valorFrete: Number(freightValorFrete) || 0,
      valorRecebido: Number(freightValorRecebido) || 0,
      valorPagoMotorista: Number(freightValorPagoMotorista) || 0,
      status: 'Aberto',
      date: new Date().toISOString(),
      observations: freightObservations
    });
    if (!error) {
      setFreightDesc('');
      setFreightProduct('');
      setFreightOrigin('');
      setFreightDestination('');
      setFreightTotalWeight('');
      setFreightValorFrete('');
      setFreightValorRecebido('');
      setFreightValorPagoMotorista('');
      setFreightObservations('');
    }
    setIsSubmittingFreight(false);
  };

  const handleSubmitLoading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) {
      alert("Selecione uma filial primeiro!");
      return;
    }
    if (!selectedFreightId || !driverName || !plate || !weight) return;

    setIsSubmittingLoading(true);
    const orderGiver = employees.find(emp => emp.id === orderGiverId);
    const { error } = await supabase.from('loadings').insert({
      branchId: selectedBranchId,
      freightId: selectedFreightId,
      driverName,
      plate: plate.toUpperCase(),
      weight: Number(weight),
      manifestoDone: false,
      unloaded: false,
      date: loadingDate,
      manifestoDate: manifestoDate || null,
      unloadedDate: unloadedDate || null,
      observations: loadingObservations,
      orderGiverId: orderGiverId || null,
      orderGiverName: orderGiver?.name || null,
      driverUnitPrice: Number(driverUnitPrice) || 0,
      driverValue: Number(driverValue) || 0
    });
    if (!error) {
      setDriverName('');
      setPlate('');
      setWeight('');
      setLoadingDate(new Date().toISOString().split('T')[0]);
      setManifestoDate('');
      setUnloadedDate('');
      setLoadingObservations('');
      setOrderGiverId('');
      setDriverUnitPrice('');
      setDriverValue('');
    }
    setIsSubmittingLoading(false);
  };

  const toggleStatus = async (id: string, field: 'manifestoDone' | 'unloaded', value: boolean) => {
    const now = new Date().toISOString().split('T')[0];
    const updates: any = { [field]: !value };
    if (field === 'manifestoDone' && !value) {
      updates.manifestoDate = now;
    } else if (field === 'unloaded' && !value) {
      updates.unloadedDate = now;
    }
    await supabase.from('loadings').update(updates).eq('id', id);
  };

  const handleDeleteUser = async (userId: string) => {
    if (userProfile?.role !== 'master') return;
    if (userId === user?.id) {
      alert("Você não pode excluir seu próprio usuário master!");
      return;
    }
    if (!window.confirm("Tem certeza que deseja excluir este usuário?")) return;
    await supabase.from('users').delete().eq('id', userId);
  };

  const handleTransferLoading = async (loadingId: string, newFreightId: string) => {
    const freight = freights.find(f => f.id === newFreightId);
    if (!freight) return;

    await supabase.from('loadings').update({
      freightId: newFreightId,
      branchId: freight.branchId
    }).eq('id', loadingId);
  };

  const deleteLoading = async (id: string) => {
    await supabase.from('loadings').delete().eq('id', id);
    setDeletingId(null);
    setDeletingType(null);
  };

  const deleteFreight = async (id: string) => {
    await supabase.from('freights').delete().eq('id', id);
    setDeletingId(null);
    setDeletingType(null);
  };

  const startEditing = (loading: Loading) => {
    setEditingId(loading.id);
    setEditDriverName(loading.driverName);
    setEditPlate(loading.plate);
    setEditWeight(loading.weight.toString());
    setEditLoadingDate(loading.date);
    setEditManifestoDate(loading.manifestoDate || '');
    setEditUnloadedDate(loading.unloadedDate || '');
    setEditObservations(loading.observations || '');
    setEditOrderGiverId(loading.orderGiverId || '');
    setEditDriverUnitPrice(loading.driverUnitPrice?.toString() || '');
    setEditDriverValue(loading.driverValue?.toString() || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    if (!editDriverName || !editPlate || !editWeight) return;
    const orderGiver = employees.find(emp => emp.id === editOrderGiverId);
    const { error } = await supabase.from('loadings').update({
      driverName: editDriverName,
      plate: editPlate.toUpperCase(),
      weight: Number(editWeight),
      date: editLoadingDate,
      manifestoDate: editManifestoDate || null,
      unloadedDate: editUnloadedDate || null,
      observations: editObservations,
      orderGiverId: editOrderGiverId || null,
      orderGiverName: orderGiver?.name || null,
      driverUnitPrice: Number(editDriverUnitPrice) || 0,
      driverValue: Number(editDriverValue) || 0
    }).eq('id', id);
    if (!error) setEditingId(null);
  };

  const startEditingFreight = (freight: Freight) => {
    setEditingFreightId(freight.id);
    setEditFreightDesc(freight.description);
    setEditFreightProduct(freight.product);
    setEditFreightOrigin(freight.origin);
    setEditFreightDestination(freight.destination);
    setEditFreightTotalWeight(freight.totalWeight.toString());
    setEditFreightValorFrete(freight.valorFrete?.toString() || '');
    setEditFreightValorRecebido(freight.valorRecebido?.toString() || '');
    setEditFreightValorPagoMotorista(freight.valorPagoMotorista?.toString() || '');
    setEditFreightObservations(freight.observations || '');
    setEditFreightStatus(freight.status);
  };

  const cancelEditingFreight = () => {
    setEditingFreightId(null);
  };

  const saveEditFreight = async (id: string) => {
    if (!editFreightDesc || !editFreightProduct || !editFreightTotalWeight || !editFreightOrigin || !editFreightDestination) return;
    const { error } = await supabase.from('freights').update({
      description: editFreightDesc,
      product: editFreightProduct,
      origin: editFreightOrigin,
      destination: editFreightDestination,
      totalWeight: Number(editFreightTotalWeight),
      valorFrete: Number(editFreightValorFrete) || 0,
      valorRecebido: Number(editFreightValorRecebido) || 0,
      valorPagoMotorista: Number(editFreightValorPagoMotorista) || 0,
      observations: editFreightObservations,
      status: editFreightStatus
    }).eq('id', id);
    if (!error) setEditingFreightId(null);
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

  const exportFreightsToPDF = () => {
    const doc = new jsPDF();
    doc.text('Relatório de Fretes Financeiro', 14, 15);
    
    const filteredFreightsForReport = freights.filter(f => {
      const matchesStartDate = !reportFilterStartDate || f.date >= reportFilterStartDate;
      const matchesEndDate = !reportFilterEndDate || f.date <= reportFilterEndDate;
      return matchesStartDate && matchesEndDate;
    });

    const tableData = filteredFreightsForReport.map(f => {
      const freightLoadings = loadings.filter(l => l.freightId === f.id);
      const totalLoadedWeight = freightLoadings.reduce((acc, curr) => acc + curr.weight, 0);
      const revenue = freightLoadings.reduce((acc, curr) => acc + ((curr.weight / 1000) * (f.valorFrete || 0)), 0);
      const payout = freightLoadings.reduce((acc, curr) => acc + (curr.driverValue || (curr.weight / 1000) * (f.valorPagoMotorista || 0)), 0);
      const profit = revenue - payout;
      
      return [
        f.description,
        `${totalLoadedWeight.toLocaleString()} kg`,
        `R$ ${revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${payout.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        f.status
      ];
    });

    autoTable(doc, {
      head: [['Descrição', 'Peso Carregado', 'Vlr Empresa', 'Vlr Motorista', 'Lucro', 'Status']],
      body: tableData,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save('relatorio_fretes_financeiro.pdf');
  };

  const exportLoadingsToPDF = () => {
    const doc = new jsPDF();
    doc.text('Relatório de Motoristas Detalhado', 14, 15);
    
    const filteredLoadingsForReport = loadings.filter(l => {
      const matchesStartDate = !reportFilterStartDate || l.date >= reportFilterStartDate;
      const matchesEndDate = !reportFilterEndDate || l.date <= reportFilterEndDate;
      return matchesStartDate && matchesEndDate;
    });

    const tableData = filteredLoadingsForReport.map(l => {
      const freight = freights.find(f => f.id === l.freightId);
      const revenue = (l.weight / 1000) * (freight?.valorFrete || 0);
      const payout = l.driverValue || (l.weight / 1000) * (freight?.valorPagoMotorista || 0);
      const profit = revenue - payout;

      return [
        l.driverName,
        l.plate,
        `${l.weight.toLocaleString()} kg`,
        `R$ ${revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${payout.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        format(parseISO(l.date), 'dd/MM/yyyy')
      ];
    });

    autoTable(doc, {
      head: [['Motorista', 'Placa', 'Peso', 'Vlr Empresa', 'Vlr Motorista', 'Lucro', 'Data']],
      body: tableData,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94] }
    });

    doc.save('relatorio_motoristas_detalhado.pdf');
  };

  const exportBillingToPDF = () => {
    const doc = new jsPDF();
    doc.text('Relatório de Faturamento', 14, 15);
    
    const data = [
      ['Total Recebido (Empresa)', `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
      ['Total Pago (Motoristas)', `R$ ${totalDriverPayout.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
      ['Lucro Líquido', `R$ ${netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
      ['Margem de Lucro', `${profitMargin.toFixed(1)}%`]
    ];

    autoTable(doc, {
      head: [['Métrica', 'Valor']],
      body: data,
      startY: 20,
    });

    doc.save('relatorio_faturamento.pdf');
  };

  if (loading) return <div className="min-h-screen bg-zinc-50 flex items-center justify-center"><div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /></div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 space-y-8 border border-zinc-100">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-200">
              <Truck className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-zinc-900">Logística Multi-Filial</h1>
            <p className="text-zinc-500">{authMode === 'login' ? 'Entre na sua conta' : 'Crie sua conta'}</p>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">E-mail</label>
              <input 
                type="email"
                required
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500/50"
                placeholder="seu@email.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Senha</label>
              <input 
                type="password"
                required
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500/50"
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="w-full py-4 bg-zinc-900 text-white font-bold rounded-2xl hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
            >
              {authMode === 'login' ? 'Entrar' : 'Cadastrar'}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-100"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-zinc-400 font-bold">Ou</span>
            </div>
          </div>

          <button
            onClick={handleLogin}
            className="w-full py-4 border-2 border-zinc-100 text-zinc-900 font-bold rounded-2xl hover:bg-zinc-50 transition-all flex items-center justify-center gap-3"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Entrar com Google
          </button>

          <div className="text-center">
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              className="text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              {authMode === 'login' ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre'}
            </button>
          </div>

          {loginError && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium text-center">
              {loginError}
            </div>
          )}
          
          <div className="text-center">
            <p className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">Sistema de Gestão de Transportes</p>
          </div>
        </div>
      </div>
    );
  }

  if (user && !userProfile) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto">
            <Package className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-zinc-900">Bem-vindo!</h2>
            <p className="text-zinc-500">Para começar, selecione a filial onde você trabalha.</p>
          </div>
          
          <div className="space-y-4">
            <div className="text-left">
              <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Sua Filial</label>
              <select 
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500/50"
                value={requestBranchId}
                onChange={(e) => {
                  setRequestBranchId(e.target.value);
                  setRequestError(null);
                }}
              >
                <option value="">Selecione uma filial...</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {requestError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-xs text-red-600 font-medium">{requestError}</p>
              </div>
            )}

            <button 
              onClick={() => handleRequestAccess(requestBranchId)}
              disabled={!requestBranchId}
              className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-900/20"
            >
              Entrar no Sistema
            </button>
          </div>
          
          <div className="pt-4 border-t border-zinc-100 flex flex-col gap-3">
            <p className="text-[10px] text-zinc-400">E-mail logado: <span className="font-bold">{user.email}</span></p>
            <button onClick={handleLogout} className="text-zinc-500 hover:text-zinc-900 font-bold text-sm">Sair e tentar outro e-mail</button>
          </div>
        </div>
      </div>
    );
  }

  const dashboardLoadings = loadings.filter(l => {
    // If no date filter, show all
    if (!dashboardFilterStartDate && !dashboardFilterEndDate) return true;
    
    const dateToCompare = l.manifestoDate || l.date; // Fallback to loading date if not manifested
    const matchesStartDate = !dashboardFilterStartDate || dateToCompare >= dashboardFilterStartDate;
    const matchesEndDate = !dashboardFilterEndDate || dateToCompare <= dashboardFilterEndDate;
    return matchesStartDate && matchesEndDate;
  });

  const pendingManifesto = loadings.filter(l => {
    const matchesStartDate = !dashboardFilterStartDate || l.date >= dashboardFilterStartDate;
    const matchesEndDate = !dashboardFilterEndDate || l.date <= dashboardFilterEndDate;
    return matchesStartDate && matchesEndDate && !l.manifestoDone;
  }).length;

  const dashboardFreights = freights.filter(f => {
    const matchesDate = (!dashboardFilterStartDate || f.date >= dashboardFilterStartDate) &&
                        (!dashboardFilterEndDate || f.date <= dashboardFilterEndDate);
    
    const hasManifestedLoadings = loadings.some(l => 
      l.freightId === f.id && 
      l.manifestoDate && 
      (!dashboardFilterStartDate || l.manifestoDate >= dashboardFilterStartDate) &&
      (!dashboardFilterEndDate || l.manifestoDate <= dashboardFilterEndDate)
    );

    return matchesDate || hasManifestedLoadings;
  });

  const totalWeight = dashboardLoadings.reduce((acc, curr) => acc + curr.weight, 0);
  const openFreights = dashboardFreights.filter(f => f.status === 'Aberto').length;
  const totalCompleted = dashboardLoadings.filter(l => l.unloaded).length;

  // Billing Metrics (Filtered for the Billing Dashboard)
  const billingLoadings = loadings.filter(l => {
    const matchesFreight = !billingFilterFreightId || l.freightId === billingFilterFreightId;
    const dateToCompare = l.manifestoDate || l.date;
    const matchesStartDate = !billingFilterStartDate || dateToCompare >= billingFilterStartDate;
    const matchesEndDate = !billingFilterEndDate || dateToCompare <= billingFilterEndDate;
    return matchesFreight && matchesStartDate && matchesEndDate;
  });

  const totalRevenue = billingLoadings.reduce((acc, curr) => {
    const freight = freights.find(f => f.id === curr.freightId);
    const unitPrice = freight?.valorFrete || 0;
    return acc + ((curr.weight / 1000) * unitPrice);
  }, 0);

  const totalDriverPayout = billingLoadings.reduce((acc, curr) => {
    if (curr.driverValue !== undefined) return acc + curr.driverValue;
    const freight = freights.find(f => f.id === curr.freightId);
    const unitPrice = freight?.valorPagoMotorista || 0;
    return acc + ((curr.weight / 1000) * unitPrice);
  }, 0);

  const netProfit = totalRevenue - totalDriverPayout;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Dashboard Billing Metrics (Filtered for the Main Dashboard)
  const dashboardBillingLoadings = loadings.filter(l => {
    if (!dashboardFilterStartDate && !dashboardFilterEndDate) return true;
    const dateToCompare = l.manifestoDate || l.date;
    const matchesStartDate = !dashboardFilterStartDate || dateToCompare >= dashboardFilterStartDate;
    const matchesEndDate = !dashboardFilterEndDate || dateToCompare <= dashboardFilterEndDate;
    return matchesStartDate && matchesEndDate;
  });

  const dashboardTotalRevenue = dashboardBillingLoadings.reduce((acc, curr) => {
    const freight = freights.find(f => f.id === curr.freightId);
    const unitPrice = freight?.valorFrete || 0;
    return acc + ((curr.weight / 1000) * unitPrice);
  }, 0);

  const dashboardTotalDriverPayout = dashboardBillingLoadings.reduce((acc, curr) => {
    if (curr.driverValue !== undefined) return acc + curr.driverValue;
    const freight = freights.find(f => f.id === curr.freightId);
    const unitPrice = freight?.valorPagoMotorista || 0;
    return acc + ((curr.weight / 1000) * unitPrice);
  }, 0);

  const dashboardNetProfit = dashboardTotalRevenue - dashboardTotalDriverPayout;
  const dashboardProfitMargin = dashboardTotalRevenue > 0 ? (dashboardNetProfit / dashboardTotalRevenue) * 100 : 0;

  // Detailed Metrics
  const totalPlannedWeight = dashboardFreights.reduce((acc, curr) => acc + curr.totalWeight, 0);
  const totalUnloadedWeight = dashboardLoadings.filter(l => l.unloaded).reduce((acc, curr) => acc + curr.weight, 0);
  const uniqueDrivers = new Set(dashboardLoadings.map(l => l.driverName)).size;
  const avgWeightPerDriver = uniqueDrivers > 0 ? totalWeight / uniqueDrivers : 0;
  
  const driverStats = dashboardLoadings.reduce((acc: { name: string, weight: number, count: number }[], curr) => {
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

  const driversCarregando = new Set(dashboardLoadings.map(l => l.driverName)).size;
  const driversDescarregado = new Set(dashboardLoadings.filter(l => l.unloaded).map(l => l.driverName)).size;

  const funnelData = [
    { value: totalPlannedWeight, name: 'Planejado', fill: '#27272a', sub: `${dashboardFreights.length} Fretes` },
    { value: totalWeight, name: 'Carregado', fill: '#22c55e', sub: `${dashboardLoadings.length} Viagens (${driversCarregando} Motoristas)` },
    { value: totalUnloadedWeight, name: 'Descarregado', fill: '#3b82f6', sub: `${totalCompleted} Finalizadas (${driversDescarregado} Motoristas)` },
  ];

  const driverFunnelData = driverStats.slice(0, 5).map((d, idx) => ({
    value: d.weight,
    name: d.name,
    fill: idx === 0 ? '#22c55e' : idx === 1 ? '#16a34a' : idx === 2 ? '#15803d' : idx === 3 ? '#166534' : '#14532d',
    sub: totalWeight > 0 ? `${(d.weight / totalWeight * 100).toFixed(1)}% do total` : '0% do total'
  }));

  // Freight Performance Data
  const freightPerformance = freights.map(f => {
    const loadedWeight = dashboardLoadings
      .filter(l => l.freightId === f.id)
      .reduce((acc, curr) => acc + curr.weight, 0);
    return { name: f.description, weight: loadedWeight };
  }).filter(item => item.weight > 0).sort((a, b) => b.weight - a.weight);

  const freightFunnelData = freightPerformance.slice(0, 5).map((f, idx) => ({
    value: f.weight,
    name: f.name,
    fill: idx === 0 ? '#3b82f6' : idx === 1 ? '#2563eb' : idx === 2 ? '#1d4ed8' : idx === 3 ? '#1e40af' : '#1e3a8a',
    sub: totalWeight > 0 ? `${(f.weight / totalWeight * 100).toFixed(1)}% do total` : '0% do total'
  }));

  const filteredFreights = freights.filter(f => {
    const matchesStatus = freightFilterStatus === 'Todos' || f.status === freightFilterStatus;
    const matchesDate = !freightFilterDate || f.date.startsWith(freightFilterDate);
    const matchesSearch = !freightSearch || 
      f.description.toLowerCase().includes(freightSearch.toLowerCase()) || 
      f.product.toLowerCase().includes(freightSearch.toLowerCase()) ||
      f.origin.toLowerCase().includes(freightSearch.toLowerCase()) ||
      f.destination.toLowerCase().includes(freightSearch.toLowerCase());
    
    return matchesStatus && matchesDate && matchesSearch;
  });

  const filteredLoadings = loadings.filter(l => {
    const matchesDriver = !loadingFilterDriver || l.driverName.toLowerCase().includes(loadingFilterDriver.toLowerCase());
    const matchesPlate = !loadingFilterPlate || l.plate.toLowerCase().includes(loadingFilterPlate.toLowerCase());
    const matchesDate = !loadingFilterDate || l.date.startsWith(loadingFilterDate);
    const matchesManifestDate = !loadingFilterManifestDate || (l.manifestoDate && l.manifestoDate.startsWith(loadingFilterManifestDate));
    const matchesUnloadDate = !loadingFilterUnloadDate || (l.unloadedDate && l.unloadedDate.startsWith(loadingFilterUnloadDate));
    const matchesFreight = !loadingFilterFreightId || l.freightId === loadingFilterFreightId;
    let matchesStatus = true;
    if (loadingFilterStatus === 'Manifesto') matchesStatus = l.manifestoDone;
    else if (loadingFilterStatus === 'Descarregado') matchesStatus = l.unloaded;
    else if (loadingFilterStatus === 'Pendente') matchesStatus = !l.manifestoDone || !l.unloaded;
    
    return matchesDriver && matchesPlate && matchesDate && matchesManifestDate && matchesUnloadDate && matchesStatus && matchesFreight;
  });

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
          <SidebarItem icon={DollarSign} label="Faturamento" active={activeTab === 'faturamento'} onClick={() => setActiveTab('faturamento')} darkMode={darkMode} />
          <SidebarItem icon={ClipboardList} label="Novo Frete" active={activeTab === 'freights'} onClick={() => setActiveTab('freights')} darkMode={darkMode} />
          <SidebarItem icon={Truck} label="Motorista" active={activeTab === 'loadings'} onClick={() => setActiveTab('loadings')} darkMode={darkMode} />
          <SidebarItem icon={Users} label="Funcionários" active={activeTab === 'employees'} onClick={() => setActiveTab('employees')} darkMode={darkMode} />
          <SidebarItem icon={FileText} label="Relatórios" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} darkMode={darkMode} />
          {userProfile?.role === 'master' && (
            <SidebarItem icon={Activity} label="Gerenciamento" active={activeTab === 'management'} onClick={() => setActiveTab('management')} darkMode={darkMode} />
          )}
        </nav>

        <div className="pt-10 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex flex-col items-center gap-4">
            <div className="text-center">
              <p className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{userProfile?.name}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{userProfile?.role}</p>
            </div>
            <button 
              onClick={handleLogout}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${darkMode ? 'bg-zinc-800 text-red-400 hover:bg-zinc-700' : 'bg-zinc-100 text-red-500 hover:bg-zinc-200'}`}
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 space-y-10 overflow-y-auto">
        {userProfile?.role === 'master' && (
          <div className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} border p-4 rounded-2xl flex items-center justify-between shadow-sm mb-6`}>
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-green-500" />
              <span className={`text-sm font-bold ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>Visualizando Filial:</span>
              <select 
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className={`text-sm font-bold outline-none bg-transparent ${darkMode ? 'text-white' : 'text-zinc-900'}`}
              >
                <option value="">Todas as Filiais</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Modo Master Admin
            </div>
          </div>
        )}

        {activeTab === 'management' && userProfile?.role === 'master' && (
          <div className="space-y-10">
            <h2 className={`${darkMode ? 'text-white' : 'text-zinc-900'} text-2xl font-black flex items-center gap-3`}>
              <Activity className="w-8 h-8 text-green-500" /> Gerenciamento do Sistema
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Branch Management */}
              <div className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} border p-8 rounded-3xl shadow-sm space-y-6`}>
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-zinc-900'} flex items-center gap-2`}>
                  <Package className="w-5 h-5 text-green-500" /> Cadastrar Nova Filial
                </h3>
                <form onSubmit={handleCreateBranch} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Nome da Filial</label>
                    <input 
                      type="text"
                      value={newBranchName}
                      onChange={(e) => setNewBranchName(e.target.value)}
                      placeholder="Ex: Filial São Paulo"
                      className={`w-full text-sm ${darkMode ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'} border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500/50`}
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 transition-all shadow-lg shadow-green-900/20 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Criar Filial
                  </button>
                </form>

                <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
                  <h4 className={`text-xs font-bold uppercase tracking-widest ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} mb-4`}>Filiais Ativas</h4>
                  <div className="space-y-2">
                    {branches.map(b => (
                      <div key={b.id} className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-zinc-950' : 'bg-zinc-50'}`}>
                        <span className={`text-sm font-medium ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>{b.name}</span>
                        <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Ativa</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* User Management */}
              <div className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} border p-8 rounded-3xl shadow-sm space-y-6`}>
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-zinc-900'} flex items-center gap-2`}>
                  <Users className="w-5 h-5 text-blue-500" /> Cadastrar Novo Usuário
                </h3>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Nome Completo</label>
                      <input 
                        type="text"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="Nome do usuário"
                        className={`w-full text-sm ${darkMode ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'} border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/50`}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>E-mail</label>
                      <input 
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                        className={`w-full text-sm ${darkMode ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'} border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/50`}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Função</label>
                      <select 
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'user')}
                        className={`w-full text-sm ${darkMode ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'} border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/50`}
                      >
                        <option value="user">Usuário Comum</option>
                        <option value="admin">Administrador de Filial</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Filial</label>
                      <select 
                        value={newUserBranchId}
                        onChange={(e) => setNewUserBranchId(e.target.value)}
                        className={`w-full text-sm ${darkMode ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'} border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/50`}
                      >
                        <option value="">Selecione uma filial</option>
                        {branches.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Criar Usuário
                  </button>
                </form>

                <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-6">
                  <div>
                    <h4 className={`text-xs font-bold uppercase tracking-widest ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} mb-4`}>Usuários Cadastrados</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {allUsers.map(u => (
                        <div key={u.id} className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-zinc-950' : 'bg-zinc-50'}`}>
                          <div>
                            <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{u.name}</p>
                            <p className="text-[10px] text-zinc-500">{u.email}</p>
                          </div>
                          <div className="text-right flex items-center gap-3">
                            <div>
                              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{u.role}</p>
                              <p className="text-[9px] text-zinc-400">{branches.find(b => b.id === u.branchId)?.name || 'Master'}</p>
                            </div>
                            {u.role !== 'master' && (
                              <button 
                                onClick={() => handleDeleteUser(u.id)}
                                className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                                title="Excluir Usuário"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'faturamento' && (
          <div className="space-y-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <h2 className={`${darkMode ? 'text-white' : 'text-zinc-900'} text-2xl font-black flex items-center gap-3`}>
                <DollarSign className="w-8 h-8 text-green-500" /> Dashboard de Faturamento
              </h2>
              <button 
                onClick={exportBillingToPDF}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-500 transition-all shadow-lg shadow-green-900/20"
              >
                <Download className="w-4 h-4" /> Exportar PDF
              </button>
            </div>

            <div className={`${darkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'} border p-5 rounded-3xl flex flex-wrap items-end gap-4 shadow-sm`}>
              <div className="flex items-center gap-2 mr-2 mb-8">
                <Filter className="w-4 h-4 text-zinc-400" />
                <span className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Filtros de Faturamento</span>
              </div>
              
              <div className="flex flex-col gap-1.5 flex-1 min-w-[240px]">
                <label className={`text-[9px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Pedido (Frete)</label>
                <div className="relative">
                  <Package className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`} />
                  <select 
                    value={billingFilterFreightId}
                    onChange={(e) => setBillingFilterFreightId(e.target.value)}
                    className={`w-full text-xs ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-600'} border rounded-xl pl-9 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500/50 appearance-none`}
                  >
                    <option value="">Todos os Pedidos</option>
                    {freights.map(f => (
                      <option key={f.id} value={f.id}>{f.description} - {f.product}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={`text-[9px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Data Início</label>
                <input 
                  type="date"
                  value={billingFilterStartDate}
                  onChange={(e) => setBillingFilterStartDate(e.target.value)}
                  className={`text-xs ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-600'} border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500/50`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={`text-[9px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Data Fim</label>
                <input 
                  type="date"
                  value={billingFilterEndDate}
                  onChange={(e) => setBillingFilterEndDate(e.target.value)}
                  className={`text-xs ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-600'} border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500/50`}
                />
              </div>

              {(billingFilterFreightId || billingFilterStartDate || billingFilterEndDate) && (
                <button 
                  onClick={() => {
                    setBillingFilterFreightId('');
                    setBillingFilterStartDate('');
                    setBillingFilterEndDate('');
                  }}
                  className={`mb-1 p-2.5 rounded-xl ${darkMode ? 'bg-zinc-800 text-zinc-400 hover:text-white' : 'bg-white text-zinc-400 hover:text-zinc-900'} border ${darkMode ? 'border-zinc-700' : 'border-zinc-200'} transition-colors`}
                  title="Limpar Filtros"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} p-6 rounded-3xl border shadow-sm`}>
                <span className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} block mb-2`}>Total Recebido</span>
                <div className="text-2xl font-black text-green-600">R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
              <div className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} p-6 rounded-3xl border shadow-sm`}>
                <span className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} block mb-2`}>Total Pago</span>
                <div className="text-2xl font-black text-red-500">R$ {totalDriverPayout.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
              <div className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} p-6 rounded-3xl border shadow-sm`}>
                <span className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} block mb-2`}>Lucro Líquido</span>
                <div className="text-2xl font-black text-blue-600">R$ {netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
              <div className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} p-6 rounded-3xl border shadow-sm`}>
                <span className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} block mb-2`}>Margem</span>
                <div className={`text-2xl font-black ${profitMargin > 0 ? 'text-emerald-500' : 'text-red-500'}`}>{profitMargin.toFixed(1)}%</div>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} p-8 rounded-3xl border shadow-sm`}>
                <h3 className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-bold mb-6`}>Distribuição Financeira</h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Lucro', value: Math.max(0, netProfit) },
                          { name: 'Pagamento Motoristas', value: totalDriverPayout }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill="#3b82f6" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: darkMode ? '#18181b' : '#ffffff', border: `1px solid ${darkMode ? '#27272a' : '#e5e7eb'}`, borderRadius: '12px' }}
                        itemStyle={{ color: darkMode ? '#ffffff' : '#111827' }}
                        formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                      />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} p-8 rounded-3xl border shadow-sm`}>
                <h3 className={`${darkMode ? 'text-white' : 'text-black'} font-black mb-6`}>Top 5 Fretes por Receita</h3>
                <div className="space-y-4">
                  {freights
                    .filter(f => !billingFilterFreightId || f.id === billingFilterFreightId)
                    .map(f => {
                      const fLoadings = billingLoadings.filter(l => l.freightId === f.id);
                      const rev = fLoadings.reduce((acc, curr) => acc + ((curr.weight / 1000) * (f.valorFrete || 0)), 0);
                      return { ...f, rev };
                    })
                    .filter(f => f.rev > 0)
                    .sort((a, b) => b.rev - a.rev)
                    .slice(0, 5)
                    .map((f, idx) => (
                      <div key={f.id} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-xs">
                            #{idx + 1}
                          </div>
                          <div>
                            <div className={`text-sm font-black ${darkMode ? 'text-white' : 'text-black'}`}>{f.description}</div>
                            <div className={`text-[10px] font-bold ${darkMode ? 'text-zinc-400' : 'text-black'}`}>{f.product}</div>
                          </div>
                        </div>
                        <div className={`text-sm font-black ${darkMode ? 'text-green-500' : 'text-black'}`}>
                          R$ {f.rev.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    ))}
                  {freights.filter(f => !billingFilterFreightId || f.id === billingFilterFreightId).length === 0 && (
                    <div className="text-center py-10">
                      <p className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Nenhum dado para exibir.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <section className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} p-8 rounded-3xl border shadow-sm`}>
              <h3 className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-bold mb-6 flex items-center gap-2`}>
                <ClipboardList className="w-5 h-5 text-orange-500" /> Resumo Financeiro por Pedido (Frete)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500 border-zinc-800' : 'text-zinc-400 border-zinc-100'} border-b`}>
                      <th className="pb-4">Pedido / Frete</th>
                      <th className="pb-4">Peso Total</th>
                      <th className="pb-4">Receita Total</th>
                      <th className="pb-4">Pago Motoristas</th>
                      <th className="pb-4">Lucro Líquido</th>
                      <th className="pb-4">Margem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {freights
                      .filter(f => !billingFilterFreightId || f.id === billingFilterFreightId)
                      .map(f => {
                        const fLoadings = billingLoadings.filter(l => l.freightId === f.id);
                        const totalWeight = fLoadings.reduce((acc, curr) => acc + curr.weight, 0);
                        const revenue = fLoadings.reduce((acc, curr) => acc + ((curr.weight / 1000) * (f.valorFrete || 0)), 0);
                        const payout = fLoadings.reduce((acc, curr) => {
                          if (curr.driverValue !== undefined) return acc + curr.driverValue;
                          return acc + ((curr.weight / 1000) * (f.valorPagoMotorista || 0));
                        }, 0);
                        const profit = revenue - payout;
                        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

                        if (fLoadings.length === 0 && billingFilterStartDate && billingFilterEndDate) return null;
                        if (fLoadings.length === 0 && (billingFilterStartDate || billingFilterEndDate)) return null;

                        return (
                          <tr key={f.id} className={`${darkMode ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'} transition-colors`}>
                            <td className="py-4">
                              <div className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{f.description}</div>
                              <div className="text-[10px] text-zinc-500">{f.product} - {f.origin} para {f.destination}</div>
                            </td>
                            <td className={`py-4 text-sm ${darkMode ? 'text-zinc-300' : 'text-zinc-600'}`}>{totalWeight.toLocaleString()} kg</td>
                            <td className="py-4 text-sm font-bold text-blue-500">R$ {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="py-4 text-sm font-bold text-orange-500">R$ {payout.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className={`py-4 text-sm font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>R$ {profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className={`py-4 text-sm font-black ${margin >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{margin.toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} p-8 rounded-3xl border shadow-sm`}>
              <h3 className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-bold mb-6 flex items-center gap-2`}>
                <Truck className="w-5 h-5 text-blue-500" /> Detalhamento por Motorista
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500 border-zinc-800' : 'text-zinc-400 border-zinc-100'} border-b`}>
                      <th className="pb-4">Motorista</th>
                      <th className="pb-4">Peso</th>
                      <th className="pb-4">Receita (Empresa)</th>
                      <th className="pb-4">Pago (Motorista)</th>
                      <th className="pb-4">Lucro</th>
                      <th className="pb-4">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {billingLoadings.sort((a, b) => {
                      const dateA = a.manifestoDate || a.date || '0000-00-00';
                      const dateB = b.manifestoDate || b.date || '0000-00-00';
                      return dateB.localeCompare(dateA);
                    }).map(l => {
                      const freight = freights.find(f => f.id === l.freightId);
                      const rev = (l.weight / 1000) * (freight?.valorFrete || 0);
                      const pay = (l.weight / 1000) * (freight?.valorPagoMotorista || 0);
                      const prof = rev - pay;
                      return (
                        <tr key={l.id} className={`text-sm ${darkMode ? 'text-zinc-300' : 'text-zinc-600'}`}>
                          <td className="py-4">
                            <div className="font-bold text-zinc-900 dark:text-white">{l.driverName}</div>
                            <div className="text-[10px] text-zinc-500">{freight?.description}</div>
                          </td>
                          <td className="py-4 font-mono">{l.weight.toLocaleString()} kg</td>
                          <td className="py-4 text-blue-500 font-bold">R$ {rev.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="py-4 text-orange-500 font-bold">R$ {pay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="py-4 text-green-600 font-black">R$ {prof.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="py-4 text-xs">{l.manifestoDate ? format(parseISO(l.manifestoDate), 'dd/MM/yyyy') : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-10">
            {/* Dashboard Filters */}
            <div className={`flex flex-wrap items-end gap-4 p-6 ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} border rounded-3xl shadow-sm transition-colors`}>
              <div className="flex items-center gap-2 mb-1">
                <Filter className="w-4 h-4 text-zinc-400" />
                <span className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Filtros Gerais</span>
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className={`text-[9px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Data Início</label>
                <input 
                  type="date"
                  value={dashboardFilterStartDate}
                  onChange={(e) => setDashboardFilterStartDate(e.target.value)}
                  className={`text-xs ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-600'} border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/50`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={`text-[9px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Data Fim</label>
                <input 
                  type="date"
                  value={dashboardFilterEndDate}
                  onChange={(e) => setDashboardFilterEndDate(e.target.value)}
                  className={`text-xs ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-600'} border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/50`}
                />
              </div>

              {(dashboardFilterStartDate || dashboardFilterEndDate) && (
                <button 
                  onClick={() => {
                    setDashboardFilterStartDate('');
                    setDashboardFilterEndDate('');
                  }}
                  className={`mb-1 p-2.5 rounded-xl ${darkMode ? 'bg-zinc-800 text-zinc-400 hover:text-white' : 'bg-white text-zinc-400 hover:text-zinc-900'} border ${darkMode ? 'border-zinc-700' : 'border-zinc-200'} transition-colors`}
                  title="Limpar Filtros"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Summary */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryCard label="Peso Total" value={`${totalWeight.toLocaleString()} kg`} color="text-green-600" darkMode={darkMode} />
              <SummaryCard label="Fretes Abertos" value={openFreights.toString()} color="text-blue-600" darkMode={darkMode} />
              <SummaryCard label="Manifesto Pendente" value={pendingManifesto.toString()} color="text-orange-600" darkMode={darkMode} />
              <SummaryCard label="Finalizados" value={totalCompleted.toString()} color={darkMode ? 'text-white' : 'text-zinc-900'} darkMode={darkMode} />
            </section>

            {userProfile?.role === 'master' && !selectedBranchId && (
              <section className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} border rounded-3xl p-8 shadow-sm transition-colors`}>
                <h3 className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-bold mb-6 flex items-center gap-2`}>
                  <Package className="w-5 h-5 text-green-500" /> Resumo por Filial
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {branches.map(branch => {
                    const branchLoadings = dashboardLoadings.filter(l => l.branchId === branch.id);
                    const branchWeight = branchLoadings.reduce((acc, curr) => acc + curr.weight, 0);
                    const branchRevenue = branchLoadings.reduce((acc, curr) => {
                      const freight = freights.find(f => f.id === curr.freightId);
                      return acc + ((curr.weight / 1000) * (freight?.valorFrete || 0));
                    }, 0);
                    
                    return (
                      <div key={branch.id} className={`${darkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-100'} border p-5 rounded-2xl transition-colors`}>
                        <div className="flex justify-between items-start mb-4">
                          <h4 className={`font-black ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{branch.name}</h4>
                          <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Ativa</span>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Peso Total</span>
                            <span className={`text-xs font-bold ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>{branchWeight.toLocaleString()} kg</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Receita</span>
                            <span className="text-xs font-bold text-blue-500">R$ {branchRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Viagens</span>
                            <span className={`text-xs font-bold ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>{branchLoadings.length}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Faturamento */}
            <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <SummaryCard label="Total Recebido (Empresa)" value={`R$ ${dashboardTotalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} color="text-green-600" darkMode={darkMode} />
              <SummaryCard label="Total Pago (Motoristas)" value={`R$ ${dashboardTotalDriverPayout.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} color="text-red-500" darkMode={darkMode} />
              <SummaryCard label="Lucro Líquido" value={`R$ ${dashboardNetProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} color="text-blue-600" darkMode={darkMode} />
              <SummaryCard label="Margem de Lucro" value={`${dashboardProfitMargin.toFixed(1)}%`} color={dashboardProfitMargin > 0 ? "text-emerald-500" : "text-red-500"} darkMode={darkMode} />
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
                        <div className={`text-xl font-black ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{dashboardLoadings.length}</div>
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
          </div>
        )}

        {activeTab === 'freights' && (
          <>
            {/* Freight Registration */}
            {(userProfile?.role === 'admin' || userProfile?.role === 'master') && (
              <section className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} border rounded-3xl p-8 shadow-sm transition-colors mb-10`}>
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
                  <div className="space-y-2">
                    <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Valor Unitário Empresa (R$/ton)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00"
                      value={freightValorFrete}
                      onChange={(e) => setFreightValorFrete(e.target.value)}
                      className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} border rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all`}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Valor Unitário Motorista (R$/ton)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00"
                      value={freightValorPagoMotorista}
                      onChange={(e) => setFreightValorPagoMotorista(e.target.value)}
                      className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} border rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all`}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Total Estimado (R$)</label>
                    <div className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-500' : 'bg-zinc-50 border-zinc-200 text-zinc-400'} border rounded-xl py-3 px-4 text-sm`}>
                      R$ {((Number(freightTotalWeight) / 1000) * Number(freightValorFrete) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="md:col-span-6 space-y-2">
                    <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Observações</label>
                    <textarea 
                      placeholder="Notas adicionais sobre o frete..."
                      value={freightObservations}
                      onChange={(e) => setFreightObservations(e.target.value)}
                      rows={2}
                      className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} border rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all resize-none`}
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
            )}

            {/* Freights List */}
            <section className="space-y-6">
              <div className={`${darkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'} border p-5 rounded-3xl flex flex-wrap items-end gap-4 shadow-sm`}>
                <div className="flex items-center gap-2 mr-2 mb-8">
                  <Filter className="w-4 h-4 text-zinc-400" />
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Filtros de Frete</span>
                </div>

                <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                  <label className={`text-[9px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Buscar</label>
                  <div className="relative">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`} />
                    <input 
                      type="text"
                      placeholder="Descrição, produto, origem..."
                      value={freightSearch}
                      onChange={(e) => setFreightSearch(e.target.value)}
                      className={`w-full text-xs ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-600'} border rounded-xl pl-9 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/50`}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 min-w-[140px]">
                  <label className={`text-[9px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Status</label>
                  <select 
                    value={freightFilterStatus}
                    onChange={(e) => setFreightFilterStatus(e.target.value as any)}
                    className={`w-full text-xs ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-600'} border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none`}
                  >
                    <option value="Todos">Todos Status</option>
                    <option value="Aberto">Aberto</option>
                    <option value="Finalizado">Finalizado</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={`text-[9px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Data do Frete</label>
                  <input 
                    type="date"
                    value={freightFilterDate}
                    onChange={(e) => setFreightFilterDate(e.target.value)}
                    className={`text-xs ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-600'} border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/50`}
                  />
                </div>

                {(freightFilterStatus !== 'Todos' || freightFilterDate || freightSearch) && (
                  <button 
                    onClick={() => {
                      setFreightFilterStatus('Todos');
                      setFreightFilterDate('');
                      setFreightSearch('');
                    }}
                    className={`mb-1 p-2.5 rounded-xl ${darkMode ? 'bg-zinc-800 text-zinc-400 hover:text-white' : 'bg-white text-zinc-400 hover:text-zinc-900'} border ${darkMode ? 'border-zinc-700' : 'border-zinc-200'} transition-colors`}
                    title="Limpar Filtros"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between px-2">
                <h2 className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-bold flex items-center gap-2`}>
                  <TrendingUp className="w-5 h-5 text-blue-500" /> Fretes em Andamento
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredFreights.map((f) => {
                  const relatedLoadings = loadings.filter(l => l.freightId === f.id);
                  const loadedWeight = relatedLoadings.reduce((acc, curr) => acc + curr.weight, 0);
                  const progress = Math.min((loadedWeight / f.totalWeight) * 100, 100);

                  return (
                    <div 
                      key={f.id} 
                      onClick={() => setViewingFreightId(f.id)}
                      className={`${darkMode ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-200 hover:border-zinc-300'} border rounded-3xl p-6 space-y-4 shadow-sm transition-all cursor-pointer group`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-bold`}>{f.description}</h3>
                            <Eye className={`w-3 h-3 ${darkMode ? 'text-zinc-700 group-hover:text-blue-500' : 'text-zinc-300 group-hover:text-blue-500'} transition-colors`} />
                          </div>
                          <p className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{f.product} • {f.totalWeight.toLocaleString()} kg total</p>
                          <div className={`flex items-center gap-2 mt-1 text-[10px] ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            <span className={`${darkMode ? 'bg-zinc-800' : 'bg-zinc-100'} px-1.5 py-0.5 rounded`}>{f.origin}</span>
                            <ChevronRight className="w-3 h-3" />
                            <span className={`${darkMode ? 'bg-zinc-800' : 'bg-zinc-100'} px-1.5 py-0.5 rounded`}>{f.destination}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {(userProfile?.role === 'admin' || userProfile?.role === 'master') && (
                            <>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditingFreight(f);
                                }}
                                className={`${darkMode ? 'text-zinc-700 hover:text-blue-500' : 'text-zinc-300 hover:text-blue-500'} transition-colors p-1`}
                                title="Editar Frete"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingId(f.id);
                                  setDeletingType('freight');
                                }}
                                className={`${darkMode ? 'text-zinc-700 hover:text-red-500' : 'text-zinc-300 hover:text-red-500'} transition-colors p-1`}
                                title="Excluir Frete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
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

                      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
                        <div className="flex items-center gap-4">
                          <div>
                            <span className={`text-[9px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} block mb-0.5`}>Faturamento</span>
                            <div className="text-xs font-bold text-green-600">R$ {((loadedWeight / 1000) * (f.valorFrete || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                          </div>
                          <div>
                            <span className={`text-[9px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} block mb-0.5`}>Lucro</span>
                            <div className={`text-xs font-bold ${((loadedWeight / 1000) * ((f.valorFrete || 0) - (f.valorPagoMotorista || 0))) >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                              R$ {((loadedWeight / 1000) * ((f.valorFrete || 0) - (f.valorPagoMotorista || 0))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                        <div className={`text-[10px] px-2 py-1 rounded-lg font-bold ${f.status === 'Aberto' ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'}`}>
                          {f.status}
                        </div>
                      </div>

                      <div className={`flex items-center justify-between text-[10px] ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        <div className="flex items-center gap-2">
                          <Truck className="w-3 h-3" />
                          <span>{relatedLoadings.length} motoristas vinculados</span>
                        </div>
                        {f.observations && (
                          <div className="flex items-center gap-1 text-blue-500">
                            <FileText className="w-3 h-3" />
                            <span>Obs</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredFreights.length === 0 && (
                  <div className={`text-center py-20 border-2 border-dashed ${darkMode ? 'border-zinc-800' : 'border-zinc-100'} rounded-3xl col-span-full`}>
                    <p className={`${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>Nenhum frete encontrado com os filtros atuais.</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {activeTab === 'loadings' && (
          <>
            {/* Loading Registration */}
            {(userProfile?.role === 'admin' || userProfile?.role === 'master') && (
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
                  <div className="space-y-2">
                    <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Quem deu a ordem</label>
                    <div className="relative">
                      <UserIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-zinc-600' : 'text-zinc-300'} z-10`} />
                      <select 
                        value={orderGiverId}
                        onChange={(e) => setOrderGiverId(e.target.value)}
                        className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-green-500/50 outline-none transition-all appearance-none`}
                      >
                        <option value="">Selecione...</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Vlr Unit. Motorista (R$/ton)</label>
                    <div className="relative">
                      <DollarSign className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-zinc-600' : 'text-zinc-300'}`} />
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        value={driverUnitPrice}
                        onChange={(e) => setDriverUnitPrice(e.target.value)}
                        className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-green-500/50 outline-none transition-all`}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Valor Total (R$)</label>
                    <div className="relative">
                      <DollarSign className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-zinc-600' : 'text-zinc-300'}`} />
                      <input 
                        type="number" 
                        placeholder="0.00"
                        value={driverValue}
                        onChange={(e) => setDriverValue(e.target.value)}
                        className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-green-500/50 outline-none transition-all`}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Data Carregamento</label>
                    <div className="relative">
                      <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-zinc-600' : 'text-zinc-300'}`} />
                      <input 
                        type="date" 
                        value={loadingDate}
                        onChange={(e) => setLoadingDate(e.target.value)}
                        className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-green-500/50 outline-none transition-all`}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Data Manifesto</label>
                    <div className="relative">
                      <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-zinc-600' : 'text-zinc-300'}`} />
                      <input 
                        type="date" 
                        value={manifestoDate}
                        onChange={(e) => setManifestoDate(e.target.value)}
                        className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-green-500/50 outline-none transition-all`}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Data Descarregamento</label>
                    <div className="relative">
                      <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-zinc-600' : 'text-zinc-300'}`} />
                      <input 
                        type="date" 
                        value={unloadedDate}
                        onChange={(e) => setUnloadedDate(e.target.value)}
                        className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-green-500/50 outline-none transition-all`}
                      />
                    </div>
                  </div>
                  <div className="md:col-span-1 space-y-2">
                    <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Observações</label>
                    <textarea 
                      placeholder="Notas sobre o motorista..."
                      value={loadingObservations}
                      onChange={(e) => setLoadingObservations(e.target.value)}
                      rows={1}
                      className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} border rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-green-500/50 outline-none transition-all resize-none`}
                    />
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
            )}

            {/* List Section */}
            <section className="space-y-6">
              <div className={`${darkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'} border p-5 rounded-3xl flex flex-wrap items-end gap-4 shadow-sm`}>
                <div className="flex items-center gap-2 mr-2 mb-8">
                  <Filter className="w-4 h-4 text-zinc-400" />
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Filtros de Motorista</span>
                </div>

                <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
                  <label className={`text-[9px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Frete</label>
                  <select 
                    value={loadingFilterFreightId}
                    onChange={(e) => setLoadingFilterFreightId(e.target.value)}
                    className={`w-full text-xs ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-600'} border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500/50 appearance-none`}
                  >
                    <option value="">Todos Fretes</option>
                    {freights.map(f => (
                      <option key={f.id} value={f.id}>{f.description}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
                  <label className={`text-[9px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Motorista</label>
                  <div className="relative">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`} />
                    <input 
                      type="text"
                      placeholder="Nome do motorista..."
                      value={loadingFilterDriver}
                      onChange={(e) => setLoadingFilterDriver(e.target.value)}
                      className={`w-full text-xs ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-600'} border rounded-xl pl-9 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500/50`}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 w-32">
                  <label className={`text-[9px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Placa</label>
                  <input 
                    type="text"
                    placeholder="ABC-1234"
                    value={loadingFilterPlate}
                    onChange={(e) => setLoadingFilterPlate(e.target.value)}
                    className={`text-xs ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-600'} border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500/50`}
                  />
                </div>

                <div className="flex flex-col gap-1.5 min-w-[140px]">
                  <label className={`text-[9px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Status</label>
                  <select 
                    value={loadingFilterStatus}
                    onChange={(e) => setLoadingFilterStatus(e.target.value as any)}
                    className={`w-full text-xs ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-600'} border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500/50 appearance-none`}
                  >
                    <option value="Todos">Todos Status</option>
                    <option value="Manifesto">Manifesto Pronto</option>
                    <option value="Descarregado">Descarregado</option>
                    <option value="Pendente">Pendente</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={`text-[9px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Data Carregamento</label>
                  <input 
                    type="date"
                    value={loadingFilterDate}
                    onChange={(e) => setLoadingFilterDate(e.target.value)}
                    className={`text-xs ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-600'} border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500/50`}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={`text-[9px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Data Manifesto</label>
                  <input 
                    type="date"
                    value={loadingFilterManifestDate}
                    onChange={(e) => setLoadingFilterManifestDate(e.target.value)}
                    className={`text-xs ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-600'} border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500/50`}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={`text-[9px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Data Descarregamento</label>
                  <input 
                    type="date"
                    value={loadingFilterUnloadDate}
                    onChange={(e) => setLoadingFilterUnloadDate(e.target.value)}
                    className={`text-xs ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-600'} border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500/50`}
                  />
                </div>

                {(loadingFilterDriver || loadingFilterPlate || loadingFilterStatus !== 'Todos' || loadingFilterDate || loadingFilterManifestDate || loadingFilterUnloadDate || loadingFilterFreightId) && (
                  <button 
                    onClick={() => {
                      setLoadingFilterDriver('');
                      setLoadingFilterPlate('');
                      setLoadingFilterStatus('Todos');
                      setLoadingFilterDate('');
                      setLoadingFilterManifestDate('');
                      setLoadingFilterUnloadDate('');
                      setLoadingFilterFreightId('');
                    }}
                    className={`mb-1 p-2.5 rounded-xl ${darkMode ? 'bg-zinc-800 text-zinc-400 hover:text-white' : 'bg-white text-zinc-400 hover:text-zinc-900'} border ${darkMode ? 'border-zinc-700' : 'border-zinc-200'} transition-colors`}
                    title="Limpar Filtros"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
                <h2 className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-bold flex items-center gap-2`}>
                  <LayoutDashboard className="w-5 h-5 text-green-500" /> Motoristas Cadastrados
                </h2>
                
                <div className="flex flex-wrap items-center gap-3">
                  <div className={`px-3 py-1.5 rounded-xl border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} flex items-center gap-2 shadow-sm`}>
                    <span className={`text-[9px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Total Pago:</span>
                    <span className="text-xs font-black text-orange-500">
                      R$ {filteredLoadings.reduce((acc, curr) => {
                        if (curr.driverValue !== undefined) return acc + curr.driverValue;
                        const freight = freights.find(f => f.id === curr.freightId);
                        return acc + ((curr.weight / 1000) * (freight?.valorPagoMotorista || 0));
                      }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className={`px-3 py-1.5 rounded-xl border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} flex items-center gap-2 shadow-sm`}>
                    <span className={`text-[9px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Peso Total:</span>
                    <span className={`text-xs font-black ${darkMode ? 'text-white' : 'text-zinc-900'}`}>
                      {filteredLoadings.reduce((acc, curr) => acc + curr.weight, 0).toLocaleString()} kg
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {filteredLoadings.map((loading) => {
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
                          <select 
                            value={editOrderGiverId}
                            onChange={(e) => setEditOrderGiverId(e.target.value)}
                            className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} rounded-xl py-2 px-4 text-sm focus:ring-2 focus:ring-green-500/50 outline-none`}
                          >
                            <option value="">Quem deu a ordem...</option>
                            {employees.map(emp => (
                              <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                          </select>
                          <input 
                            type="number" 
                            step="0.01"
                            value={editDriverUnitPrice}
                            onChange={(e) => setEditDriverUnitPrice(e.target.value)}
                            className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} rounded-xl py-2 px-4 text-sm focus:ring-2 focus:ring-green-500/50 outline-none`}
                            placeholder="Vlr Unit. (R$/ton)"
                          />
                          <input 
                            type="number" 
                            value={editDriverValue}
                            onChange={(e) => setEditDriverValue(e.target.value)}
                            className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} rounded-xl py-2 px-4 text-sm focus:ring-2 focus:ring-green-500/50 outline-none`}
                            placeholder="Valor Total (R$)"
                          />
                          <div className="space-y-1">
                            <label className={`text-[9px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Data Carregamento</label>
                            <input 
                              type="date" 
                              value={editLoadingDate}
                              onChange={(e) => setEditLoadingDate(e.target.value)}
                              className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} rounded-xl py-2 px-4 text-sm focus:ring-2 focus:ring-green-500/50 outline-none`}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className={`text-[9px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Data Manifesto</label>
                            <input 
                              type="date" 
                              value={editManifestoDate}
                              onChange={(e) => setEditManifestoDate(e.target.value)}
                              className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} rounded-xl py-2 px-4 text-sm focus:ring-2 focus:ring-green-500/50 outline-none`}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className={`text-[9px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Data Descarregamento</label>
                            <input 
                              type="date" 
                              value={editUnloadedDate}
                              onChange={(e) => setEditUnloadedDate(e.target.value)}
                              className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} rounded-xl py-2 px-4 text-sm focus:ring-2 focus:ring-green-500/50 outline-none`}
                            />
                          </div>
                          <textarea 
                            value={editObservations}
                            onChange={(e) => setEditObservations(e.target.value)}
                            className={`w-full md:col-span-3 ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} rounded-xl py-2 px-4 text-sm focus:ring-2 focus:ring-green-500/50 outline-none resize-none`}
                            placeholder="Observações..."
                            rows={2}
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
                              <div className={`flex flex-wrap items-center gap-3 text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} mt-1`}>
                                <span className={`${darkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600'} px-2 py-0.5 rounded font-mono`}>{loading.plate}</span>
                                <span>•</span>
                                <span>{loading.weight.toLocaleString()} kg</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Carregado: {loading.date ? format(parseISO(loading.date), 'dd/MM/yy') : '-'}
                                </span>
                                {loading.manifestoDate && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <FileText className="w-3 h-3" />
                                      Manifesto: {format(parseISO(loading.manifestoDate), 'dd/MM/yy')}
                                    </span>
                                  </>
                                )}
                                {loading.unloadedDate && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <Truck className="w-3 h-3" />
                                      Desc.: {format(parseISO(loading.unloadedDate), 'dd/MM/yy')}
                                    </span>
                                  </>
                                )}
                              </div>
                              <div className={`flex items-center gap-3 text-[10px] ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} mt-1`}>
                                {loading.orderGiverName && (
                                  <span className="flex items-center gap-1">
                                    <UserIcon className="w-3 h-3" /> Ordem: {loading.orderGiverName}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                                <div className={`flex flex-col p-2 rounded-xl ${darkMode ? 'bg-zinc-800/50' : 'bg-zinc-50'} border ${darkMode ? 'border-zinc-700/50' : 'border-zinc-100'}`}>
                                  <span className={`text-[8px] uppercase font-bold ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>Receita Empresa</span>
                                  <span className="text-[10px] font-bold text-blue-500">
                                    R$ {((loading.weight / 1000) * (freight?.valorFrete || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div className={`flex flex-col p-2 rounded-xl ${darkMode ? 'bg-orange-500/5' : 'bg-orange-50/50'} border ${darkMode ? 'border-orange-500/20' : 'border-orange-100'} shadow-sm shadow-orange-500/5`}>
                                  <span className={`text-[8px] uppercase font-bold text-orange-600`}>Total Pago Motorista</span>
                                  <span className="text-[11px] font-black text-orange-600">
                                    R$ {loading.driverValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || ((loading.weight / 1000) * (freight?.valorPagoMotorista || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    <span className="text-[8px] ml-1 font-normal opacity-70">
                                      (R$ {(loading.driverUnitPrice || freight?.valorPagoMotorista || 0).toFixed(2)}/t)
                                    </span>
                                  </span>
                                </div>
                                <div className={`flex flex-col p-2 rounded-xl ${darkMode ? 'bg-green-500/5' : 'bg-green-50/50'} border ${darkMode ? 'border-green-500/20' : 'border-green-100'}`}>
                                  <span className={`text-[8px] uppercase font-bold text-green-600`}>Lucro Líquido</span>
                                  <span className="text-[10px] font-black text-green-600">
                                    R$ {((loading.weight / 1000) * ((freight?.valorFrete || 0) - (freight?.valorPagoMotorista || 0))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>
                              {loading.observations && (
                                <p className={`text-[10px] italic mt-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} max-w-md truncate`}>
                                  "{loading.observations}"
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                            <div className="flex items-center gap-2">
                              <StatusButton 
                                active={loading.manifestoDone} 
                                label="Manifesto" 
                                onClick={() => (userProfile?.role === 'admin' || userProfile?.role === 'master') && toggleStatus(loading.id, 'manifestoDone', loading.manifestoDone)}
                                darkMode={darkMode}
                                disabled={userProfile?.role === 'user'}
                              />
                              <StatusButton 
                                active={loading.unloaded} 
                                label="Descarregado" 
                                onClick={() => (userProfile?.role === 'admin' || userProfile?.role === 'master') && toggleStatus(loading.id, 'unloaded', loading.unloaded)}
                                darkMode={darkMode}
                                disabled={userProfile?.role === 'user'}
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              {(userProfile?.role === 'admin' || userProfile?.role === 'master') && (
                                <>
                                  <button 
                                    onClick={() => {
                                      setTransferringLoadingId(loading.id);
                                      setTransferNewFreightId('');
                                    }}
                                    className={`${darkMode ? 'text-zinc-700 hover:text-blue-500' : 'text-zinc-300 hover:text-blue-500'} p-2 transition-colors`}
                                    title="Transferir para outro frete"
                                  >
                                    <ArrowRight className="w-4 h-4" />
                                  </button>
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
                                </>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
                {filteredLoadings.length === 0 && (
                  <div className={`text-center py-20 border-2 border-dashed ${darkMode ? 'border-zinc-800' : 'border-zinc-100'} rounded-3xl`}>
                    <p className={`${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>Nenhum motorista encontrado com os filtros atuais.</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {activeTab === 'employees' && (
          <div className="space-y-10">
            {(userProfile?.role === 'admin' || userProfile?.role === 'master') && (
              <section className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} border rounded-3xl p-8 shadow-sm transition-colors`}>
                <h2 className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-bold mb-6 flex items-center gap-2`}>
                  <Users className="w-5 h-5 text-blue-500" /> Cadastrar Funcionário
                </h2>
                <form onSubmit={handleSubmitEmployee} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Nome</label>
                    <input 
                      type="text" 
                      placeholder="Nome completo"
                      value={employeeName}
                      onChange={(e) => setEmployeeName(e.target.value)}
                      className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} border rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all`}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Cargo/Função</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Expedição, Administrativo"
                      value={employeeRole}
                      onChange={(e) => setEmployeeRole(e.target.value)}
                      className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} border rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all`}
                    />
                  </div>
                  <div className="flex items-end">
                    <button 
                      disabled={isSubmittingEmployee}
                      className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-900/20"
                    >
                      {isSubmittingEmployee ? 'Salvando...' : 'Cadastrar'}
                    </button>
                  </div>
                </form>
              </section>
            )}

            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h2 className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-bold`}>Funcionários Ativos</h2>
                <div className="relative w-64">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`} />
                  <input 
                    type="text"
                    placeholder="Buscar funcionário..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    className={`w-full text-xs ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-600'} border rounded-xl pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50`}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {employees
                  .filter(emp => emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) || emp.role.toLowerCase().includes(employeeSearch.toLowerCase()))
                  .map(emp => (
                  <div key={emp.id} className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} border p-6 rounded-3xl flex items-center justify-between shadow-sm transition-colors`}>
                    <div>
                      <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{emp.name}</h3>
                      <p className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{emp.role}</p>
                    </div>
                    {(userProfile?.role === 'admin' || userProfile?.role === 'master') && (
                      <button 
                        onClick={() => deleteEmployee(emp.id)}
                        className={`${darkMode ? 'text-zinc-700 hover:text-red-500' : 'text-zinc-300 hover:text-red-500'} transition-colors`}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
                {employees.length === 0 && (
                  <div className={`text-center py-20 border-2 border-dashed ${darkMode ? 'border-zinc-800' : 'border-zinc-100'} rounded-3xl col-span-full`}>
                    <p className={`${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>Nenhum funcionário cadastrado.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-10">
            {/* Report Filters */}
            <div className={`flex flex-wrap items-end gap-4 p-6 ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} border rounded-3xl shadow-sm transition-colors`}>
              <div className="flex items-center gap-2 mb-1">
                <Filter className="w-4 h-4 text-zinc-400" />
                <span className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Filtros de Relatório</span>
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className={`text-[9px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Data Início</label>
                <input 
                  type="date"
                  value={reportFilterStartDate}
                  onChange={(e) => setReportFilterStartDate(e.target.value)}
                  className={`text-xs ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-600'} border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500/50`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={`text-[9px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Data Fim</label>
                <input 
                  type="date"
                  value={reportFilterEndDate}
                  onChange={(e) => setReportFilterEndDate(e.target.value)}
                  className={`text-xs ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-600'} border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500/50`}
                />
              </div>

              {(reportFilterStartDate || reportFilterEndDate) && (
                <button 
                  onClick={() => {
                    setReportFilterStartDate('');
                    setReportFilterEndDate('');
                  }}
                  className={`mb-1 p-2.5 rounded-xl ${darkMode ? 'bg-zinc-800 text-zinc-400 hover:text-white' : 'bg-white text-zinc-400 hover:text-zinc-900'} border ${darkMode ? 'border-zinc-700' : 'border-zinc-200'} transition-colors`}
                  title="Limpar Filtros"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <section className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} border rounded-3xl p-8 space-y-6 shadow-sm transition-colors`}>
            <h2 className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-bold flex items-center gap-2`}>
              <Download className="w-5 h-5 text-green-500" /> Exportar Relatórios
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className={`text-sm font-bold ${darkMode ? 'text-zinc-400' : 'text-zinc-500'} ml-2`}>Exportar CSV</h3>
                <div className="grid grid-cols-1 gap-4">
                  <button 
                    onClick={() => exportToCSV(freights.filter(f => {
                      const matchesStartDate = !reportFilterStartDate || f.date >= reportFilterStartDate;
                      const matchesEndDate = !reportFilterEndDate || f.date <= reportFilterEndDate;
                      return matchesStartDate && matchesEndDate;
                    }), 'relatorio_fretes')}
                    className={`flex items-center justify-between p-6 ${darkMode ? 'bg-zinc-800 border-zinc-700 hover:border-blue-500/50' : 'bg-white border-zinc-200 hover:border-blue-500/50'} rounded-2xl transition-all group shadow-sm`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 ${darkMode ? 'bg-blue-500/20' : 'bg-blue-500/10'} rounded-xl text-blue-500`}>
                        <ClipboardList className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <div className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-bold`}>Fretes (CSV)</div>
                        <div className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Lista completa em formato CSV</div>
                      </div>
                    </div>
                    <Download className={`w-5 h-5 ${darkMode ? 'text-zinc-700' : 'text-zinc-300'} group-hover:text-blue-500 transition-colors`} />
                  </button>

                  <button 
                    onClick={() => exportToCSV(loadings.filter(l => {
                      const matchesStartDate = !reportFilterStartDate || l.date >= reportFilterStartDate;
                      const matchesEndDate = !reportFilterEndDate || l.date <= reportFilterEndDate;
                      return matchesStartDate && matchesEndDate;
                    }), 'relatorio_carregamentos')}
                    className={`flex items-center justify-between p-6 ${darkMode ? 'bg-zinc-800 border-zinc-700 hover:border-green-500/50' : 'bg-white border-zinc-200 hover:border-green-500/50'} rounded-2xl transition-all group shadow-sm`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 ${darkMode ? 'bg-green-500/20' : 'bg-green-500/10'} rounded-xl text-green-500`}>
                        <Truck className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <div className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-bold`}>Carregamentos (CSV)</div>
                        <div className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Histórico em formato CSV</div>
                      </div>
                    </div>
                    <Download className={`w-5 h-5 ${darkMode ? 'text-zinc-700' : 'text-zinc-300'} group-hover:text-green-500 transition-colors`} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className={`text-sm font-bold ${darkMode ? 'text-zinc-400' : 'text-zinc-500'} ml-2`}>Exportar PDF (Relatórios Oficiais)</h3>
                <div className="grid grid-cols-1 gap-4">
                  <button 
                    onClick={exportFreightsToPDF}
                    className={`flex items-center justify-between p-6 ${darkMode ? 'bg-zinc-800 border-zinc-700 hover:border-red-500/50' : 'bg-white border-zinc-200 hover:border-red-500/50'} rounded-2xl transition-all group shadow-sm`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 ${darkMode ? 'bg-red-500/20' : 'bg-red-500/10'} rounded-xl text-red-500`}>
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <div className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-bold`}>Fretes (PDF)</div>
                        <div className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Relatório formatado para impressão</div>
                      </div>
                    </div>
                    <Download className={`w-5 h-5 ${darkMode ? 'text-zinc-700' : 'text-zinc-300'} group-hover:text-red-500 transition-colors`} />
                  </button>

                  <button 
                    onClick={exportLoadingsToPDF}
                    className={`flex items-center justify-between p-6 ${darkMode ? 'bg-zinc-800 border-zinc-700 hover:border-orange-500/50' : 'bg-white border-zinc-200 hover:border-orange-500/50'} rounded-2xl transition-all group shadow-sm`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 ${darkMode ? 'bg-orange-500/20' : 'bg-orange-500/10'} rounded-xl text-orange-500`}>
                        <Truck className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <div className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-bold`}>Carregamentos (PDF)</div>
                        <div className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Relatório detalhado de viagens</div>
                      </div>
                    </div>
                    <Download className={`w-5 h-5 ${darkMode ? 'text-zinc-700' : 'text-zinc-300'} group-hover:text-orange-500 transition-colors`} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>

        {/* Modal de Detalhes do Frete */}
        {viewingFreightId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
            <div className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} border p-8 rounded-3xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col space-y-6 shadow-2xl transition-colors`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-blue-500">
                  <div className="p-3 bg-blue-500/10 rounded-2xl">
                    <ClipboardList size={24} />
                  </div>
                  <div>
                    <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Detalhes do Frete</h3>
                    <p className={`text-sm ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      {freights.find(f => f.id === viewingFreightId)?.description}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setViewingFreightId(null)}
                  className={`p-2 rounded-xl ${darkMode ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-zinc-100 text-zinc-400'} transition-colors`}
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`${darkMode ? 'bg-zinc-800/50' : 'bg-zinc-50'} p-4 rounded-2xl`}>
                    <span className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} block mb-1`}>Produto</span>
                    <div className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-medium`}>
                      {freights.find(f => f.id === viewingFreightId)?.product}
                    </div>
                  </div>
                  <div className={`${darkMode ? 'bg-zinc-800/50' : 'bg-zinc-50'} p-4 rounded-2xl`}>
                    <span className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} block mb-1`}>Origem / Destino</span>
                    <div className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-medium`}>
                      {freights.find(f => f.id === viewingFreightId)?.origin} → {freights.find(f => f.id === viewingFreightId)?.destination}
                    </div>
                  </div>
                  <div className={`${darkMode ? 'bg-zinc-800/50' : 'bg-zinc-50'} p-4 rounded-2xl`}>
                    <span className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} block mb-1`}>Peso Total</span>
                    <div className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-medium`}>
                      {freights.find(f => f.id === viewingFreightId)?.totalWeight.toLocaleString()} kg
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className={`${darkMode ? 'bg-zinc-800/50' : 'bg-zinc-50'} p-4 rounded-2xl`}>
                    <span className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} block mb-1`}>Unitário Empresa</span>
                    <div className="text-blue-600 font-bold">
                      R$ {freights.find(f => f.id === viewingFreightId)?.valorFrete?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} /ton
                    </div>
                  </div>
                  <div className={`${darkMode ? 'bg-zinc-800/50' : 'bg-zinc-50'} p-4 rounded-2xl`}>
                    <span className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} block mb-1`}>Faturamento (Calc)</span>
                    <div className="text-green-600 font-bold">
                      R$ {((loadings.filter(l => l.freightId === viewingFreightId).reduce((acc, curr) => acc + curr.weight, 0) / 1000) * (freights.find(f => f.id === viewingFreightId)?.valorFrete || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className={`${darkMode ? 'bg-zinc-800/50' : 'bg-zinc-50'} p-4 rounded-2xl`}>
                    <span className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} block mb-1`}>Unitário Motorista</span>
                    <div className="text-orange-600 font-bold">
                      R$ {freights.find(f => f.id === viewingFreightId)?.valorPagoMotorista?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} /ton
                    </div>
                  </div>
                  <div className={`${darkMode ? 'bg-zinc-800/50' : 'bg-zinc-50'} p-4 rounded-2xl`}>
                    <span className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} block mb-1`}>Lucro Real</span>
                    <div className={`font-bold ${((loadings.filter(l => l.freightId === viewingFreightId).reduce((acc, curr) => acc + curr.weight, 0) / 1000) * ((freights.find(f => f.id === viewingFreightId)?.valorFrete || 0) - (freights.find(f => f.id === viewingFreightId)?.valorPagoMotorista || 0))) >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                      R$ {((loadings.filter(l => l.freightId === viewingFreightId).reduce((acc, curr) => acc + curr.weight, 0) / 1000) * ((freights.find(f => f.id === viewingFreightId)?.valorFrete || 0) - (freights.find(f => f.id === viewingFreightId)?.valorPagoMotorista || 0))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {freights.find(f => f.id === viewingFreightId)?.observations && (
                  <div className={`${darkMode ? 'bg-blue-500/5 border-blue-500/10' : 'bg-blue-50 border-blue-100'} border p-4 rounded-2xl`}>
                    <span className={`text-[10px] uppercase font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'} block mb-1`}>Observações do Frete</span>
                    <p className={`text-sm ${darkMode ? 'text-zinc-300' : 'text-zinc-700'} whitespace-pre-wrap`}>
                      {freights.find(f => f.id === viewingFreightId)?.observations}
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-bold flex items-center gap-2`}>
                    <Truck className="w-4 h-4 text-green-500" /> Motoristas Vinculados
                  </h4>
                  
                  <div className="space-y-3">
                    {loadings.filter(l => l.freightId === viewingFreightId).length > 0 ? (
                      loadings.filter(l => l.freightId === viewingFreightId).map(loading => (
                        <div key={loading.id} className={`${darkMode ? 'bg-zinc-800/30 border-zinc-800' : 'bg-white border-zinc-100'} border rounded-2xl p-4 flex items-center justify-between`}>
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 ${darkMode ? 'bg-zinc-800' : 'bg-zinc-50'} rounded-xl flex items-center justify-center text-green-500`}>
                              <UserIcon className="w-5 h-5" />
                            </div>
                              <div>
                                <div className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-bold text-sm`}>{loading.driverName}</div>
                                <div className={`text-[10px] ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} font-mono`}>
                                  {loading.plate} • {loading.weight.toLocaleString()} kg • {format(parseISO(loading.date), 'dd/MM HH:mm')}
                                </div>
                                <div className={`flex items-center gap-3 text-[10px] ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} mt-1`}>
                                  {loading.orderGiverName && (
                                    <span className="flex items-center gap-1">
                                      <UserIcon className="w-3 h-3" /> Ordem: {loading.orderGiverName}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                                  <div className="flex flex-col">
                                    <span className={`text-[8px] uppercase font-bold ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>Receita</span>
                                    <span className="text-[10px] font-bold text-blue-500">
                                      R$ {((loading.weight / 1000) * (freights.find(f => f.id === viewingFreightId)?.valorFrete || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className={`text-[8px] uppercase font-bold ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>Pago</span>
                                    <span className="text-[10px] font-bold text-orange-500">
                                      R$ {((loading.weight / 1000) * (freights.find(f => f.id === viewingFreightId)?.valorPagoMotorista || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className={`text-[8px] uppercase font-bold ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>Lucro</span>
                                    <span className="text-[10px] font-black text-green-600">
                                      R$ {((loading.weight / 1000) * ((freights.find(f => f.id === viewingFreightId)?.valorFrete || 0) - (freights.find(f => f.id === viewingFreightId)?.valorPagoMotorista || 0))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                </div>
                                {loading.observations && (
                                  <p className={`text-[10px] italic mt-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                    Obs: {loading.observations}
                                  </p>
                                )}
                              </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`text-[10px] px-2 py-1 rounded-lg font-bold ${loading.manifestoDone ? 'bg-green-500/10 text-green-500' : 'bg-zinc-500/10 text-zinc-500'}`}>
                              Manifesto
                            </div>
                            <div className={`text-[10px] px-2 py-1 rounded-lg font-bold ${loading.unloaded ? 'bg-green-500/10 text-green-500' : 'bg-zinc-500/10 text-zinc-500'}`}>
                              Descarregado
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className={`text-center py-8 border-2 border-dashed ${darkMode ? 'border-zinc-800' : 'border-zinc-100'} rounded-2xl`}>
                        <p className={`text-sm ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>Nenhum motorista vinculado a este frete.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800/50">
                <button
                  onClick={() => setViewingFreightId(null)}
                  className={`w-full px-6 py-3 ${darkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'} font-bold rounded-2xl transition-all`}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Edição de Frete */}
        {editingFreightId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
            <div className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} border p-8 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col space-y-6 shadow-2xl transition-colors`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-blue-500">
                  <div className="p-3 bg-blue-500/10 rounded-2xl">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Editar Frete</h3>
                    <p className={`text-sm ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Atualize as informações do frete</p>
                  </div>
                </div>
                <button 
                  onClick={cancelEditingFreight}
                  className={`p-2 rounded-xl ${darkMode ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-zinc-100 text-zinc-400'} transition-colors`}
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Descrição</label>
                    <input 
                      type="text" 
                      value={editFreightDesc}
                      onChange={(e) => setEditFreightDesc(e.target.value)}
                      className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} border rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none`}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Produto</label>
                    <input 
                      type="text" 
                      value={editFreightProduct}
                      onChange={(e) => setEditFreightProduct(e.target.value)}
                      className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} border rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none`}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Origem</label>
                    <input 
                      type="text" 
                      value={editFreightOrigin}
                      onChange={(e) => setEditFreightOrigin(e.target.value)}
                      className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} border rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none`}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Destino</label>
                    <input 
                      type="text" 
                      value={editFreightDestination}
                      onChange={(e) => setEditFreightDestination(e.target.value)}
                      className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} border rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none`}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Peso Total (kg)</label>
                    <input 
                      type="number" 
                      value={editFreightTotalWeight}
                      onChange={(e) => setEditFreightTotalWeight(e.target.value)}
                      className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} border rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none`}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Status</label>
                    <select 
                      value={editFreightStatus}
                      onChange={(e) => setEditFreightStatus(e.target.value as any)}
                      className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} border rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none`}
                    >
                      <option value="Aberto">Aberto</option>
                      <option value="Finalizado">Finalizado</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Valor Unitário Empresa (R$/ton)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={editFreightValorFrete}
                      onChange={(e) => setEditFreightValorFrete(e.target.value)}
                      className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} border rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none`}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Valor Unitário Motorista (R$/ton)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={editFreightValorPagoMotorista}
                      onChange={(e) => setEditFreightValorPagoMotorista(e.target.value)}
                      className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} border rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none`}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Total Estimado (R$)</label>
                    <div className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-500' : 'bg-zinc-50 border-zinc-200 text-zinc-400'} border rounded-xl py-3 px-4 text-sm`}>
                      R$ {((Number(editFreightTotalWeight) / 1000) * Number(editFreightValorFrete) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Observações</label>
                  <textarea 
                    value={editFreightObservations}
                    onChange={(e) => setEditFreightObservations(e.target.value)}
                    rows={3}
                    className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} border rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none resize-none`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800/50">
                <button 
                  onClick={cancelEditingFreight}
                  className={`px-6 py-3 rounded-xl font-bold ${darkMode ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-zinc-900'} transition-colors`}
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => saveEditFreight(editingFreightId!)}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20"
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Modal de Transferência de Carregamento */}
      {transferringLoadingId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} border p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl transition-colors`}>
            <div className="flex items-center gap-4 text-blue-500">
              <div className="p-3 bg-blue-500/10 rounded-2xl">
                <ArrowRight size={24} />
              </div>
              <h3 className="text-xl font-bold">Transferir Carregamento</h3>
            </div>
            
            <div className="space-y-4">
              <p className={`${darkMode ? 'text-zinc-400' : 'text-zinc-500'} text-sm`}>
                Selecione o novo frete para o qual deseja transferir este carregamento.
              </p>
              
              <div className="space-y-2">
                <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Novo Frete</label>
                <select 
                  value={transferNewFreightId}
                  onChange={(e) => setTransferNewFreightId(e.target.value)}
                  className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} border rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/50`}
                >
                  <option value="">Selecione um frete...</option>
                  {freights.filter(f => f.status === 'Aberto').map(f => (
                    <option key={f.id} value={f.id}>{f.description} - {f.product}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setTransferringLoadingId(null);
                  setTransferNewFreightId('');
                }}
                className={`flex-1 px-6 py-3 ${darkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'} font-bold rounded-2xl transition-all`}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (transferNewFreightId) {
                    handleTransferLoading(transferringLoadingId, transferNewFreightId);
                    setTransferringLoadingId(null);
                    setTransferNewFreightId('');
                  }
                }}
                className="flex-1 px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                disabled={!transferNewFreightId}
              >
                Transferir
              </button>
            </div>
          </div>
        </div>
      )}

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
                ? "Tem certeza que deseja excluir este frete? Todos os registros de motoristas vinculados perderão a referência."
                : "Tem certeza que deseja excluir este registro de motorista?"}
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

function StatusButton({ active, label, onClick, darkMode, disabled }: { active: boolean, label: string, onClick: () => void, darkMode: boolean, disabled?: boolean }) {
  const content = (
    <>
      {active ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      {label}
    </>
  );

  const className = `flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
    active 
      ? 'bg-green-500/10 border-green-500/30 text-green-600' 
      : darkMode 
        ? 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600'
        : 'bg-zinc-50 border-zinc-200 text-zinc-400 hover:border-zinc-300'
  } ${disabled ? 'cursor-default opacity-80' : 'hover:scale-105 active:scale-95 cursor-pointer'}`;

  if (disabled) {
    return (
      <div className={className}>
        {content}
      </div>
    );
  }

  return (
    <button 
      onClick={onClick}
      className={className}
    >
      {content}
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

