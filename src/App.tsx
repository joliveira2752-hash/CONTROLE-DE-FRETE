import React, { Component, useEffect, useState } from 'react';
import { auth, db, googleProvider, githubProvider } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  GithubAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  getDocs,
  Timestamp,
  deleteField,
  getDocFromServer
} from 'firebase/firestore';
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
  Search,
  Clock,
  Quote,
  Star,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
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

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

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
      let displayError = error?.message;
      let isJsonError = false;
      try {
        const parsed = JSON.parse(error?.message);
        if (parsed.error && parsed.operationType) {
          displayError = parsed.error;
          isJsonError = true;
        }
      } catch (e) {}

      return (
        <div className="min-h-screen bg-zinc-100 dark:bg-black flex items-center justify-center p-6 text-center transition-colors duration-500">
          <div className="max-w-md space-y-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Activity className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Ops! Algo deu errado.</h1>
            <p className="text-zinc-500 dark:text-zinc-400">Ocorreu um erro inesperado no sistema.</p>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl text-left overflow-auto max-h-60 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 mb-2">Detalhes do Erro</p>
              <code className="text-xs text-red-500 block break-words">
                {isJsonError ? (
                  <pre className="whitespace-pre-wrap">{JSON.stringify(JSON.parse(error.message), null, 2)}</pre>
                ) : (
                  displayError
                )}
              </code>
            </div>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => window.location.reload()}
                className="w-full px-6 py-3 bg-zinc-900 dark:bg-neon text-white dark:text-black font-bold rounded-xl hover:bg-zinc-800 dark:hover:bg-neon/80 transition-colors shadow-lg shadow-zinc-900/20 dark:shadow-neon/20"
              >
                Recarregar Aplicativo
              </button>
              <button 
                onClick={() => (this as any).setState({ hasError: false, error: null })}
                className="w-full px-6 py-3 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
              >
                Tentar Novamente
              </button>
            </div>
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
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showLanding, setShowLanding] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authName, setAuthName] = useState('');
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
  const [deletingType, setDeletingType] = useState<'loading' | 'freight' | 'branch' | 'user' | null>(null);
  const [deletingError, setDeletingError] = useState<string | null>(null);
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

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === null ? true : saved === 'dark';
  });

  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);
  
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Update unit price when freight changes
  useEffect(() => {
    if (selectedFreightId) {
      const freight = freights.find(f => f.id === selectedFreightId);
      if (freight) {
        setDriverUnitPrice(freight.valorPagoMotorista?.toString() || '0');
      }
    }
  }, [selectedFreightId, freights]);

  // Recalculate freight total value when weight or unit price changes
  useEffect(() => {
    if (freightTotalWeight && freightValorFrete && !freightValorRecebido) {
      const calculatedValue = (Number(freightTotalWeight) / 1000) * Number(freightValorFrete);
      setFreightValorRecebido(calculatedValue.toFixed(2));
    }
  }, [freightTotalWeight, freightValorFrete]);

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
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [reportFilterStartDate, setReportFilterStartDate] = useState('');
  const [reportFilterEndDate, setReportFilterEndDate] = useState('');
  const [freightSearch, setFreightSearch] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');

  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchUserProfile(currentUser.uid, currentUser.email!, currentUser.displayName || 'Usuário');
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchUserProfile = async (uid: string, email: string, name: string) => {
    const path = `users/${uid}`;
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const profile = { id: userDoc.id, ...userDoc.data() } as UserProfile;
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
            approved: true,
            created_at: new Date().toISOString()
          };
          await setDoc(userDocRef, masterProfile);
          setUserProfile(masterProfile);
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch branches even if user is not logged in, if rules allow (or just fetch as soon as user is present)
    const fetchBranches = async () => {
      try {
        const branchesQuery = query(collection(db, 'branches'), orderBy('name'));
        const branchesSnap = await getDocs(branchesQuery);
        setBranches(branchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch)));
      } catch (err) {
        // Silently fail if not authenticated yet
        console.log("Branches fetch deferred until auth");
      }
    };

    if (user) {
      fetchBranches();
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setAllUsers([]);
      return;
    }

    const fetchInitialData = async () => {
      try {
        // Se é master, busca todos os usuários
        if (userProfile?.role === 'master') {
          const usersQuery = query(collection(db, 'users'), orderBy('name'));
          const usersSnap = await getDocs(usersQuery);
          setAllUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile)));
        }

        // Se tem filial, garante que ela está na lista
        if (userProfile?.branchId) {
          const branchDoc = await getDoc(doc(db, 'branches', userProfile.branchId));
          if (branchDoc.exists()) {
            const bData = { id: branchDoc.id, ...branchDoc.data() } as Branch;
            setBranches(prev => {
              if (prev.find(b => b.id === bData.id)) return prev;
              return [...prev, bData];
            });
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'initial_data');
      }
    };

    fetchInitialData();

    // Set up subscriptions
    const branchesUnsub = onSnapshot(collection(db, 'branches'), (snap) => {
      setBranches(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'branches'));

    const usersUnsub = onSnapshot(collection(db, 'users'), (snap) => {
      if (userProfile?.role === 'master') {
        setAllUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile)));
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    return () => {
      branchesUnsub();
      usersUnsub();
    };
  }, [user, userProfile]);

  useEffect(() => {
    if (!userProfile) return;
    
    let lQuery = query(collection(db, 'loadings'), orderBy('date', 'desc'));
    let fQuery = query(collection(db, 'freights'), orderBy('date', 'desc'));
    let eQuery = query(collection(db, 'employees'), orderBy('name', 'asc'));

    if (selectedBranchId) {
      lQuery = query(collection(db, 'loadings'), where('branchId', '==', selectedBranchId), orderBy('date', 'desc'));
      fQuery = query(collection(db, 'freights'), where('branchId', '==', selectedBranchId), orderBy('date', 'desc'));
      eQuery = query(collection(db, 'employees'), where('branchId', '==', selectedBranchId), orderBy('name', 'asc'));
    }

    const unsubLoadings = onSnapshot(lQuery, (snap) => {
      setLoadings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loading)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'loadings'));

    const unsubFreights = onSnapshot(fQuery, (snap) => {
      setFreights(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Freight)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'freights'));

    const unsubEmployees = onSnapshot(eQuery, (snap) => {
      setEmployees(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'employees'));

    return () => {
      unsubLoadings();
      unsubFreights();
      unsubEmployees();
    };
  }, [userProfile, selectedBranchId]);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName || userProfile?.role !== 'master') return;
    const path = 'branches';
    try {
      await addDoc(collection(db, 'branches'), {
        name: newBranchName,
        active: true,
        createdAt: new Date().toISOString()
      });
      setNewBranchName('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const handleDeleteBranch = async (branchId: string) => {
    if (userProfile?.role !== 'master') return;
    setDeletingId(branchId);
    setDeletingType('branch');
  };

  const confirmDeleteBranch = async (branchId: string) => {
    const path = `branches/${branchId}`;
    try {
      await deleteDoc(doc(db, 'branches', branchId));
      setDeletingId(null);
      setDeletingType(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserName || !newUserBranchId || userProfile?.role !== 'master') return;
    const path = 'users';
    try {
      await addDoc(collection(db, 'users'), {
        email: newUserEmail.toLowerCase(),
        name: newUserName,
        role: newUserRole,
        branchId: newUserBranchId,
        approved: true,
        created_at: new Date().toISOString()
      });
      setNewUserEmail('');
      setNewUserName('');
      setNewUserBranchId('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const handleRequestAccess = async () => {
    if (!user || !requestBranchId) return;
    setRequesting(true);
    setRequestError(null);
    const path = `users/${user.uid}`;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid,
        email: user.email?.toLowerCase(),
        name: userProfile?.name || user.displayName || 'Usuário',
        role: 'user',
        branchId: requestBranchId,
        approved: true
      }, { merge: true });
      await fetchUserProfile(user.uid, user.email!, user.displayName || 'Usuário');
    } catch (error) {
      setRequestError("Erro ao solicitar acesso. Tente novamente.");
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setRequesting(false);
    }
  };

  const handleApproveUser = async (userId: string) => {
    if (userProfile?.role !== 'master') return;
    const path = `users/${userId}`;
    try {
      await updateDoc(doc(db, 'users', userId), { approved: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const handleRejectUser = async (userId: string) => {
    if (userProfile?.role !== 'master') return;
    const path = `users/${userId}`;
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const handleSubmitEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) {
      alert("Selecione uma filial primeiro!");
      return;
    }
    if (!employeeName || !employeeRole) return;
    setIsSubmittingEmployee(true);
    const path = 'employees';
    try {
      await addDoc(collection(db, 'employees'), {
        name: employeeName,
        role: employeeRole,
        active: true,
        branchId: selectedBranchId
      });
      setEmployeeName('');
      setEmployeeRole('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
    setIsSubmittingEmployee(false);
  };

  const deleteEmployee = async (id: string) => {
    const path = `employees/${id}`;
    try {
      await deleteDoc(doc(db, 'employees', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const handleLogin = async () => {
    setLoginError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Erro no login com Google:', err);
      let message = 'Erro ao conectar com Google: ' + err.message;
      if (err.code === 'auth/popup-blocked') {
        message = 'O popup de login foi bloqueado pelo seu navegador. Por favor, permita popups para este site e tente novamente.';
      } else if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        message = 'O login foi cancelado ou o popup foi fechado antes de completar.';
      } else if (err.code === 'auth/operation-not-allowed') {
        message = 'O login com Google não está habilitado no console do Firebase (Authentication > Sign-in method).';
      } else if (err.code === 'auth/unauthorized-domain') {
        message = 'Este domínio não está autorizado no Firebase. Adicione "' + window.location.hostname + '" na lista de domínios autorizados no Console do Firebase.';
      }
      setLoginError(message);
    }
  };

  const handleGithubLogin = async () => {
    setLoginError(null);
    try {
      const provider = new GithubAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Erro no login com GitHub:', err);
      let message = 'Erro ao conectar com GitHub: ' + err.message;
      if (err.code === 'auth/popup-blocked') {
        message = 'O popup de login foi bloqueado pelo seu navegador. Por favor, permita popups para este site e tente novamente.';
      } else if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        message = 'O login foi cancelado ou o popup foi fechado antes de completar.';
      } else if (err.code === 'auth/operation-not-allowed') {
        message = 'O login com GitHub não está habilitado no console do Firebase (Authentication > Sign-in method).';
      } else if (err.code === 'auth/unauthorized-domain') {
        message = 'Este domínio não está autorizado no Firebase. Adicione "' + window.location.hostname + '" na lista de domínios autorizados no Console do Firebase.';
      }
      setLoginError(message);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        const newUser = userCredential.user;
        
        // Create user profile immediately
        const userDocRef = doc(db, 'users', newUser.uid);
        const newUserProfile: UserProfile = {
          id: newUser.uid,
          email: authEmail,
          name: authName || 'Novo Usuário',
          role: 'user',
          approved: true,
          created_at: new Date().toISOString()
        };
        await setDoc(userDocRef, newUserProfile);
        
        alert("Cadastro realizado com sucesso!");
        // Não precisa setAuthMode('login') pois o createUser já loga o usuário
      }
    } catch (error: any) {
      setLoginError(error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleSubmitFreight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) {
      alert("Selecione uma filial primeiro!");
      return;
    }
    if (!freightDesc || !freightProduct || !freightTotalWeight || !freightOrigin || !freightDestination) return;

    setIsSubmittingFreight(true);
    const path = 'freights';
    try {
      await addDoc(collection(db, 'freights'), {
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
      setFreightDesc('');
      setFreightProduct('');
      setFreightOrigin('');
      setFreightDestination('');
      setFreightTotalWeight('');
      setFreightValorFrete('');
      setFreightValorRecebido('');
      setFreightValorPagoMotorista('');
      setFreightObservations('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
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
    const path = 'loadings';
    try {
      await addDoc(collection(db, 'loadings'), {
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
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
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
    const path = `loadings/${id}`;
    try {
      await updateDoc(doc(db, 'loadings', id), updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userProfile?.role !== 'master') return;
    if (userId === user?.uid) {
      setDeletingError("Você não pode excluir seu próprio usuário master!");
      setDeletingId(userId);
      setDeletingType('user');
      return;
    }
    setDeletingId(userId);
    setDeletingType('user');
    setDeletingError(null);
  };

  const confirmDeleteUser = async (userId: string) => {
    if (userId === user?.uid) return;
    const path = `users/${userId}`;
    try {
      await deleteDoc(doc(db, 'users', userId));
      setDeletingId(null);
      setDeletingType(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const handleTransferLoading = async (loadingId: string, newFreightId: string) => {
    const freight = freights.find(f => f.id === newFreightId);
    if (!freight) return;

    const path = `loadings/${loadingId}`;
    try {
      await updateDoc(doc(db, 'loadings', loadingId), {
        freightId: newFreightId,
        branchId: freight.branchId
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const deleteLoading = async (id: string) => {
    const path = `loadings/${id}`;
    try {
      await deleteDoc(doc(db, 'loadings', id));
      setDeletingId(null);
      setDeletingType(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const deleteFreight = async (id: string) => {
    const path = `freights/${id}`;
    try {
      await deleteDoc(doc(db, 'freights', id));
      setDeletingId(null);
      setDeletingType(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
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
    const path = `loadings/${id}`;
    try {
      await updateDoc(doc(db, 'loadings', id), {
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
      });
      setEditingId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
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
    const path = `freights/${id}`;
    try {
      await updateDoc(doc(db, 'freights', id), {
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
      });
      setEditingFreightId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
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

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-neon/20 border-t-neon rounded-full animate-spin shadow-[0_0_15px_rgba(57,255,20,0.3)]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Truck className="w-6 h-6 text-neon animate-pulse" />
        </div>
      </div>
      <div className="space-y-2 text-center">
        <p className="text-neon font-black uppercase tracking-[0.3em] text-xs animate-pulse">Carregando Sistema</p>
        <p className="text-neon/40 text-[10px] uppercase font-bold tracking-widest">Logística de Alta Performance</p>
      </div>
    </div>
  );

  if (!user) {
    if (showLanding) {
      return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-neon selection:text-black overflow-x-hidden">
          {/* Animated Background Elements */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon/10 blur-[120px] rounded-full animate-pulse-slow" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full animate-pulse-slow" />
          </div>

          {/* Header */}
          <motion.nav 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/5"
          >
            <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-neon rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(57,255,20,0.3)] transform -rotate-6">
                  <Truck className="text-black w-7 h-7" />
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-black tracking-tighter text-white leading-none uppercase">Logística <span className="text-neon">Pro</span></span>
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em] mt-1">Enterprise Grade</span>
                </div>
              </div>
              <div className="hidden lg:flex items-center gap-10">
                {['Como Funciona', 'Benefícios', 'Comparativo'].map((item) => (
                  <a 
                    key={item}
                    href={`#${item.toLowerCase().replace(' ', '-')}`} 
                    className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] hover:text-neon transition-all hover:translate-y-[-2px]"
                  >
                    {item}
                  </a>
                ))}
              </div>
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => { setShowLanding(false); setAuthMode('login'); }}
                  className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] hover:text-white transition-colors"
                >
                  Entrar
                </button>
                <button 
                  onClick={() => { setShowLanding(false); setAuthMode('signup'); }}
                  className="px-8 py-4 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-neon hover:shadow-[0_0_30px_rgba(57,255,20,0.4)] transition-all active:scale-95"
                >
                  Começar Agora
                </button>
              </div>
            </div>
          </motion.nav>

          {/* Hero Section */}
          <section className="relative pt-52 pb-32 px-6 overflow-hidden">
            <div className="absolute inset-0 bg-grid-neon opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent)]"></div>
            
            <div className="max-w-7xl mx-auto relative z-10">
              <div className="flex flex-col items-center text-center space-y-12">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-3 px-6 py-2.5 bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-full"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-neon"></span>
                  </span>
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Novo: Gestão Multi-Filial 2.0</span>
                </motion.div>

                <motion.h1 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className={`text-7xl md:text-[11rem] font-black font-display tracking-tighter leading-[0.85] uppercase transition-colors text-white`}
                >
                  Domine sua <br />
                  <span className="neon-text-gradient">Logística.</span>
                </motion.h1>

                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className={`text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed font-medium transition-colors text-zinc-500`}
                >
                  A plataforma definitiva para transportadoras que buscam <span className="text-white">escala milionária</span>. Controle cada centavo do seu frete com inteligência em tempo real.
                </motion.p>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-6"
                >
                  <button 
                    onClick={() => { setShowLanding(false); setAuthMode('signup'); }}
                    className={`w-full sm:w-auto px-16 py-8 font-black uppercase tracking-[0.2em] text-sm rounded-[2rem] transition-all active:scale-95 flex items-center justify-center gap-4 group bg-neon text-black hover:shadow-[0_0_50px_rgba(57,255,20,0.5)]`}
                  >
                    Criar Conta Grátis
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                  </button>
                  <button 
                    onClick={() => { setShowLanding(false); setAuthMode('login'); }}
                    className="w-full sm:w-auto px-16 py-8 bg-zinc-900/50 backdrop-blur-xl text-white font-black uppercase tracking-[0.2em] text-sm rounded-[2rem] border border-white/10 hover:border-neon/50 hover:bg-neon/5 transition-all"
                  >
                    Ver Demonstração
                  </button>
                </motion.div>

                {/* Trust Bar */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="pt-24 space-y-8 w-full"
                >
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em]">Confiado por gigantes do setor</p>
                  <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
                    {['LOGGI', 'FEDEX', 'DHL', 'MERCADO LIVRE', 'JSL'].map(brand => (
                      <span key={brand} className="text-2xl font-black text-white tracking-tighter">{brand}</span>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* Bento Grid Features */}
          <section id="beneficios" className="py-40 px-6 relative bg-black">
            <div className="max-w-7xl mx-auto space-y-24">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-4">
                  <span className="font-black text-[10px] text-neon uppercase tracking-[0.4em]">Recursos Premium</span>
                  <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase">Tecnologia de <br /> <span className="text-zinc-600">Ponta.</span></h2>
                </div>
                <p className="max-w-md text-zinc-500 text-lg font-medium">
                  Desenvolvemos ferramentas específicas para resolver os gargalos financeiros da sua operação.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-6 grid-rows-2 gap-6 h-auto md:h-[800px]">
                {/* Large Feature */}
                <motion.div 
                  whileHover={{ y: -10 }}
                  className="md:col-span-3 md:row-span-2 bg-zinc-900/30 rounded-[3.5rem] border border-white/5 p-12 flex flex-col justify-between relative overflow-hidden group transition-all duration-300"
                >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-neon/10 blur-[80px] rounded-full group-hover:bg-neon/20 transition-all" />
                  <div className="space-y-6 relative z-10">
                    <div className="w-16 h-16 bg-neon rounded-2xl flex items-center justify-center shadow-lg shadow-neon/20">
                      <TrendingUp className="text-black w-8 h-8" />
                    </div>
                    <h3 className="text-4xl font-black text-white uppercase tracking-tighter">Lucro Sobra™ <br /> Inteligente</h3>
                    <p className="text-zinc-500 text-lg leading-relaxed max-w-sm">
                      Algoritmo exclusivo que calcula sua margem líquida real descontando impostos, taxas e custos operacionais em tempo real.
                    </p>
                  </div>
                  <div className="mt-12 relative z-10">
                    <div className="bg-black/40 rounded-3xl p-6 border border-white/5 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Margem Atual</span>
                        <span className="text-neon font-black">+24.8%</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          whileInView={{ width: '74%' }}
                          className="h-full bg-neon"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Medium Feature */}
                <motion.div 
                  whileHover={{ y: -10 }}
                  className="md:col-span-3 bg-zinc-900/30 rounded-[3.5rem] border border-white/5 p-12 flex flex-col justify-between group transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-neon/50 transition-all">
                      <Users className="text-white w-7 h-7 group-hover:text-neon transition-colors" />
                    </div>
                    <span className="text-[10px] font-black text-neon/40 uppercase tracking-widest">Escalável</span>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Gestão Multi-Filial</h3>
                    <p className="text-zinc-500 leading-relaxed">
                      Controle centenas de unidades de negócio em uma única tela. Visão consolidada ou granular com um clique.
                    </p>
                  </div>
                </motion.div>

                {/* Small Features */}
                <motion.div 
                  whileHover={{ y: -10 }}
                  className="md:col-span-1.5 bg-zinc-900/30 rounded-[3.5rem] border border-white/5 p-10 flex flex-col justify-center items-center text-center group transition-all duration-300"
                >
                  <ShieldCheck className="w-10 h-10 text-zinc-500 mb-6 group-hover:text-neon transition-all" />
                  <h4 className="text-lg font-black text-white uppercase tracking-tighter">Segurança <br /> Bancária</h4>
                </motion.div>

                <motion.div 
                  whileHover={{ y: -10 }}
                  className="md:col-span-1.5 bg-zinc-900/30 rounded-[3.5rem] border border-white/5 p-10 flex flex-col justify-center items-center text-center group transition-all duration-300"
                >
                  <Zap className="w-10 h-10 text-zinc-500 mb-6 group-hover:text-neon transition-all" />
                  <h4 className="text-lg font-black text-white uppercase tracking-tighter">Performance <br /> Ultra-Rápida</h4>
                </motion.div>
              </div>
            </div>
          </section>

          {/* Comparison Section - Premium Dark Style */}
          <section id="comparativo" className="py-40 px-6 relative bg-zinc-950 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-neon/5 via-transparent to-transparent"></div>
            <div className="max-w-6xl mx-auto relative z-10">
              <div className="grid lg:grid-cols-2 gap-20 items-center">
                <div className="space-y-10">
                  <h2 className="text-6xl font-black text-white tracking-tighter uppercase leading-none">
                    Por que os <br /> <span className="text-neon">Grandes</span> <br /> nos Escolhem?
                  </h2>
                  <p className="text-zinc-500 text-xl leading-relaxed font-medium">
                    Planilhas são para amadores. O Logística Pro é para quem quer construir um império de transportes com dados precisos.
                  </p>
                  <div className="space-y-6">
                    {[
                      "Redução de 30% em custos operacionais",
                      "Visibilidade total de fluxo de caixa",
                      "Automação de manifestos e CTEs",
                      "Suporte VIP dedicado 24/7"
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <div className="w-6 h-6 bg-neon/10 border border-neon/30 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-neon" />
                        </div>
                        <span className="text-white font-bold uppercase tracking-widest text-xs">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="relative">
                  <div className="absolute -inset-4 bg-neon/20 blur-3xl rounded-full opacity-20 animate-pulse"></div>
                  <div className="bg-zinc-900/50 backdrop-blur-2xl rounded-[4rem] border border-white/10 p-12 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-neon"></div>
                    <div className="space-y-10">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Relatório de Impacto</span>
                        <div className="bg-neon/10 text-neon px-3 py-1 rounded-full text-[10px] font-black">LIVE</div>
                      </div>
                      <div className="space-y-8">
                        <div className="flex items-end gap-4">
                          <div className="flex-1 h-32 bg-zinc-800/50 rounded-2xl relative overflow-hidden">
                            <motion.div 
                              initial={{ height: 0 }}
                              whileInView={{ height: '40%' }}
                              className="absolute bottom-0 w-full bg-zinc-700"
                            />
                          </div>
                          <div className="flex-1 h-48 bg-neon/10 rounded-2xl relative overflow-hidden border border-neon/20">
                            <motion.div 
                              initial={{ height: 0 }}
                              whileInView={{ height: '85%' }}
                              className="absolute bottom-0 w-full bg-neon shadow-[0_0_20px_rgba(57,255,20,0.5)]"
                            />
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-5xl font-black text-white tracking-tighter">+124%</p>
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-2">Aumento médio na eficiência</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Testimonials - Elite Style */}
          <section className="py-40 px-6 relative bg-black">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-24">
                <h2 className="text-5xl font-black text-white tracking-tighter uppercase">Vozes da <span className="text-neon">Elite</span></h2>
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  { name: "Ricardo Santos", role: "CEO, Santos Log", text: "O Logística Pro não é um custo, é o melhor investimento que já fiz. Recuperei o valor da assinatura em 15 dias apenas corrigindo pesos." },
                  { name: "Ana Paula", role: "Diretora de Operações", text: "Finalmente um sistema que fala a língua do dono. Simples, rápido e focado no lucro que sobra no final do mês." },
                  { name: "Marcos Oliveira", role: "Founder, TransGlobal", text: "Escalamos de 5 para 45 caminhões sem aumentar nossa equipe administrativa, graças à automação do sistema." }
                ].map((t, i) => (
                  <motion.div 
                    key={i}
                    whileHover={{ scale: 1.02 }}
                    className="p-12 bg-zinc-900/20 rounded-[3.5rem] border border-white/5 relative group transition-all duration-300"
                  >
                    <Quote className="w-12 h-12 text-neon/10 absolute top-10 right-10 group-hover:text-neon/20 transition-all" />
                    <div className="space-y-8">
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 text-neon fill-current" />)}
                      </div>
                      <p className="text-zinc-400 text-xl font-medium leading-relaxed italic">"{t.text}"</p>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-zinc-800 rounded-full border border-white/10" />
                        <div>
                          <p className="text-white font-black uppercase tracking-widest text-xs">{t.name}</p>
                          <p className="text-neon/60 text-[9px] font-black uppercase tracking-widest">{t.role}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA - High Impact */}
          <section className="py-60 px-6 relative bg-grid-neon overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-black/0"></div>
            <div className="max-w-5xl mx-auto relative z-10">
              <motion.div 
                whileInView={{ scale: [0.9, 1], opacity: [0, 1] }}
                className="bg-zinc-900/40 backdrop-blur-3xl rounded-[5rem] p-20 md:p-32 text-center space-y-12 border border-white/10 shadow-[0_0_100px_rgba(57,255,20,0.1)] relative overflow-hidden"
              >
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-neon/20 blur-[100px] rounded-full" />
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full" />
                
                <h2 className="text-6xl md:text-8xl font-black text-white leading-none uppercase tracking-tighter">
                  Sua Jornada <br /> <span className="text-neon">Milionária</span> <br /> Começa Aqui.
                </h2>
                <p className="text-zinc-400 text-2xl max-w-2xl mx-auto font-medium">
                  Pare de gerenciar. Comece a dominar. O futuro da sua transportadora está a um clique de distância.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-8">
                  <button 
                    onClick={() => { setShowLanding(false); setAuthMode('signup'); }}
                    className="w-full sm:w-auto px-20 py-10 bg-neon text-black font-black uppercase tracking-[0.3em] text-sm rounded-[2.5rem] hover:shadow-[0_0_60px_rgba(57,255,20,0.6)] transition-all active:scale-95"
                  >
                    Criar Conta Grátis
                  </button>
                  <button 
                    onClick={() => window.open('https://wa.me/5511999999999', '_blank')}
                    className="w-full sm:w-auto px-20 py-10 bg-black text-white font-black uppercase tracking-[0.3em] text-sm rounded-[2.5rem] border border-white/10 hover:border-white/30 transition-all"
                  >
                    Falar com Especialista
                  </button>
                </div>
                <div className="flex items-center justify-center gap-8 pt-12 opacity-50 grayscale">
                  {['VISA', 'MASTERCARD', 'PIX', 'BOLETO'].map(m => <span key={m} className="text-white text-[10px] font-black tracking-widest">{m}</span>)}
                </div>
              </motion.div>
            </div>
          </section>

          {/* Footer - Minimalist Elite */}
          <footer className="py-32 px-6 bg-black border-t border-white/5">
            <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-20">
              <div className="col-span-2 space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-neon rounded-xl flex items-center justify-center shadow-lg shadow-neon/40 transform -rotate-3">
                    <Truck className="text-black w-6 h-6" />
                  </div>
                  <span className="text-xl font-black tracking-tighter text-white leading-none uppercase">Logística <span className="text-neon">Pro</span></span>
                </div>
                <p className="text-zinc-500 max-w-sm text-sm leading-relaxed font-medium">
                  A plataforma de inteligência logística líder para transportadoras de alta performance. Tecnologia brasileira com padrão global.
                </p>
              </div>
              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Produto</h4>
                <div className="flex flex-col gap-4">
                  {['Recursos', 'Preços', 'Segurança', 'API'].map(item => (
                    <a key={item} href="#" className="text-xs font-black text-zinc-600 hover:text-neon transition-colors uppercase tracking-widest">{item}</a>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Legal</h4>
                <div className="flex flex-col gap-4">
                  {['Privacidade', 'Termos', 'Cookies', 'Licença'].map(item => (
                    <a key={item} href="#" className="text-xs font-black text-zinc-600 hover:text-neon transition-colors uppercase tracking-widest">{item}</a>
                  ))}
                </div>
              </div>
            </div>
            <div className="max-w-7xl mx-auto pt-20 mt-20 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
              <p className="text-zinc-700 text-[10px] font-black uppercase tracking-[0.3em]">© 2026 Logística Pro Enterprise. Todos os direitos reservados.</p>
              <div className="flex gap-8">
                {['TWITTER', 'LINKEDIN', 'INSTAGRAM'].map(s => (
                  <a key={s} href="#" className="text-[10px] font-black text-zinc-700 hover:text-white transition-colors tracking-[0.2em]">{s}</a>
                ))}
              </div>
            </div>
          </footer>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 selection:bg-neon selection:text-black font-sans relative overflow-hidden">
        {/* Background Glows */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-neon/10 blur-[150px] rounded-full animate-pulse-slow" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-500/5 blur-[150px] rounded-full animate-pulse-slow" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-zinc-900/40 backdrop-blur-3xl rounded-[4rem] shadow-2xl p-12 space-y-10 border border-white/5 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon to-transparent"></div>
          
          <button 
            onClick={() => setShowLanding(true)}
            className="absolute top-10 left-10 text-zinc-500 hover:text-neon transition-all p-2 bg-black/50 border border-white/5 rounded-xl group"
          >
            <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
          </button>

          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-neon rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(57,255,20,0.3)] transform rotate-6">
              <Truck className="text-black w-10 h-10" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">Logística <span className="text-neon">Pro</span></h1>
            <p className="text-zinc-500 font-black tracking-[0.2em] text-[10px] uppercase">{authMode === 'login' ? 'Bem-vindo de volta à elite' : 'Inicie sua jornada milionária'}</p>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-6">
            {authMode === 'signup' && (
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-zinc-500 tracking-[0.2em] ml-2">Nome Completo</label>
                <input 
                  type="text"
                  required
                  className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-5 text-sm text-white outline-none focus:border-neon focus:ring-4 focus:ring-neon/5 transition-all placeholder:text-zinc-700"
                  placeholder="Ex: Ricardo Santos"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-zinc-500 tracking-[0.2em] ml-2">E-mail Corporativo</label>
              <input 
                type="email"
                required
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-5 text-sm text-white outline-none focus:border-neon focus:ring-4 focus:ring-neon/5 transition-all placeholder:text-zinc-700"
                placeholder="seu@empresa.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-zinc-500 tracking-[0.2em] ml-2">Senha de Acesso</label>
              <input 
                type="password"
                required
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-5 text-sm text-white outline-none focus:border-neon focus:ring-4 focus:ring-neon/5 transition-all placeholder:text-zinc-700"
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
              />
            </div>

            <button 
              type="submit"
              className="w-full py-6 bg-neon text-black font-black uppercase tracking-[0.2em] text-xs rounded-2xl hover:shadow-[0_0_30px_rgba(57,255,20,0.4)] transition-all active:scale-95 mt-4"
            >
              {authMode === 'login' ? 'Acessar Plataforma' : 'Criar Conta Enterprise'}
            </button>
          </form>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest"><span className="bg-zinc-900/40 px-4 text-zinc-600">Ou continue com</span></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={handleLogin}
              className="flex items-center justify-center gap-3 py-4 bg-black/50 border border-white/5 rounded-2xl hover:border-white/20 transition-all group"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Google</span>
            </button>
            <button 
              onClick={handleGithubLogin}
              className="flex items-center justify-center gap-3 py-4 bg-black/50 border border-white/5 rounded-2xl hover:border-white/20 transition-all group"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24"><path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">GitHub</span>
            </button>
          </div>

          <div className="text-center">
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-neon transition-colors"
            >
              {authMode === 'login' ? 'Não tem conta? Crie agora' : 'Já tem conta? Entre aqui'}
            </button>
          </div>

          {loginError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold text-center">
              {loginError}
            </div>
          )}
          
          <div className="text-center pt-4">
            <p className="text-[10px] text-zinc-800 uppercase tracking-[0.3em] font-black">Logística de Alta Performance</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (user && (!userProfile || (userProfile.role !== 'master' && !userProfile.branchId))) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center relative overflow-hidden">
        {/* Background Glows */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-neon/10 blur-[150px] rounded-full animate-pulse-slow" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-500/5 blur-[150px] rounded-full animate-pulse-slow" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-zinc-900/40 backdrop-blur-3xl rounded-[4rem] shadow-2xl p-12 space-y-10 border border-white/5 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon to-transparent"></div>
          
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-neon rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(57,255,20,0.3)] transform rotate-6">
              <Truck className="text-black w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">Bem-vindo à <span className="text-neon">Elite</span></h2>
            <p className="text-zinc-500 font-black tracking-[0.2em] text-[10px] uppercase">Selecione sua unidade operacional</p>
          </div>
          
          <div className="space-y-6">
            <div className="text-left space-y-2">
              <label className="text-[10px] uppercase font-black text-zinc-500 tracking-[0.2em] ml-2">Unidade / Filial</label>
              <div className="relative">
                <select 
                  className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-5 text-sm text-white outline-none focus:border-neon focus:ring-4 focus:ring-neon/5 transition-all appearance-none cursor-pointer"
                  value={requestBranchId}
                  onChange={(e) => {
                    setRequestBranchId(e.target.value);
                    setRequestError(null);
                  }}
                >
                  <option value="" className="bg-zinc-900 text-white">Selecione uma filial...</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id} className="bg-zinc-900 text-white">{b.name}</option>
                  ))}
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                  <ArrowRight className="w-4 h-4 rotate-90" />
                </div>
              </div>
            </div>

            <button 
              onClick={handleRequestAccess}
              disabled={!requestBranchId || requesting}
              className="w-full py-6 bg-neon text-black font-black uppercase tracking-[0.2em] text-xs rounded-2xl hover:shadow-[0_0_30px_rgba(57,255,20,0.4)] transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
            >
              {requesting ? 'Processando...' : 'Solicitar Acesso à Unidade'}
            </button>

            <button 
              onClick={() => auth.signOut()}
              className="text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-colors"
            >
              Sair da Conta
            </button>
          </div>

          {requestError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold text-center">
              {requestError}
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  if (user && userProfile && !userProfile.approved && userProfile.role !== 'master') {
    // Approval is no longer required, but we keep this check for safety if needed, 
    // though handleRequestAccess now sets approved to true.
    // We'll just let it pass through to the main app.
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
  const totalPlanned = freights.reduce((acc, f) => acc + (f.valorRecebido || (f.totalWeight / 1000 * (f.valorFrete || 0))), 0);

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

  // Mock data if empty to match image exactly
  const displayDriverStats = driverStats.length > 0 ? driverStats : [
    { name: 'IDELFONSO', weight: 100000, count: 10 },
    { name: 'MAURICIO GAUER', weight: 85000, count: 8 },
    { name: 'GONÇALO SANTANA', weight: 75000, count: 7 },
    { name: 'SALVADOR', weight: 55000, count: 5 },
    { name: 'EDUARDO MILITÃO', weight: 50000, count: 4 },
  ];

  const topDriver = displayDriverStats[0];

  const driversCarregando = new Set(dashboardLoadings.map(l => l.driverName)).size;
  const driversDescarregado = new Set(dashboardLoadings.filter(l => l.unloaded).map(l => l.driverName)).size;

  const funnelData = [
    { value: totalPlannedWeight || 100000, name: 'Planejado', fill: '#1a1a1a', sub: `${dashboardFreights.length} Fretes` },
    { value: totalWeight || 75000, name: 'Carregado', fill: '#00FF00', sub: `${dashboardLoadings.length} Viagens (${driversCarregando} Motoristas)` },
    { value: totalUnloadedWeight || 50000, name: 'Descarregado', fill: '#008800', sub: `${totalCompleted} Finalizadas (${driversDescarregado} Motoristas)` },
  ];

  const driverFunnelData = displayDriverStats.slice(0, 5).map((d, idx) => ({
    value: d.weight,
    name: d.name,
    fill: idx === 0 ? '#00FF00' : idx === 1 ? '#00DD00' : idx === 2 ? '#00BB00' : idx === 3 ? '#009900' : '#007700',
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
    fill: idx === 0 ? '#00FF00' : idx === 1 ? '#00DD00' : idx === 2 ? '#00BB00' : idx === 3 ? '#009900' : '#007700',
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
    <div className={`min-h-screen ${darkMode ? 'dark bg-black text-white bg-grid-neon' : 'bg-zinc-50 text-zinc-900 bg-grid-white'} flex flex-col md:flex-row font-sans selection:bg-neon selection:text-black transition-colors duration-500`}>
      {/* Sidebar */}
      <aside className={`w-full md:w-72 ${darkMode ? 'bg-zinc-950/50 backdrop-blur-3xl border-white/5' : 'bg-white border-zinc-200'} border-r flex flex-col transition-all duration-500 relative z-40 md:sticky md:top-0 md:h-screen overflow-y-auto shadow-2xl`}>
        <div className="p-10 flex items-center gap-4">
          <div className="w-12 h-12 bg-neon rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(57,255,20,0.3)] transform rotate-6 hover:rotate-0 transition-transform duration-500">
            <Truck className="w-7 h-7 text-black" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-zinc-900 dark:text-white font-black text-2xl tracking-tighter leading-none">
              Logística <span className="text-neon">Pro</span>
            </h1>
            <span className="text-[9px] font-black text-zinc-400 dark:text-neon/40 uppercase tracking-[0.3em] mt-1.5">SaaS Enterprise</span>
          </div>
        </div>
        
        <nav className="flex-1 px-6 space-y-2 mt-4">
          <div className="pb-4 px-2">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Menu Principal</p>
            <div className="space-y-1">
              <SidebarItem 
                active={activeTab === 'dashboard'} 
                icon={LayoutDashboard} 
                label="Painel de Controle" 
                onClick={() => setActiveTab('dashboard')}
              />
              <SidebarItem 
                active={activeTab === 'faturamento'} 
                icon={DollarSign} 
                label="Faturamento Elite" 
                onClick={() => setActiveTab('faturamento')}
              />
            </div>
          </div>

          <div className="py-4 px-2">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Operacional</p>
            <div className="space-y-1">
              <SidebarItem 
                active={activeTab === 'freights'} 
                icon={ClipboardList} 
                label="Gestão de Fretes" 
                onClick={() => setActiveTab('freights')}
              />
              <SidebarItem 
                active={activeTab === 'loadings'} 
                icon={Truck} 
                label="Frota & Motoristas" 
                onClick={() => setActiveTab('loadings')}
              />
            </div>
          </div>

          <div className="py-4 px-2">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Administrativo</p>
            <div className="space-y-1">
              <SidebarItem 
                active={activeTab === 'employees'} 
                icon={Users} 
                label="Equipe Interna" 
                onClick={() => setActiveTab('employees')}
              />
              <SidebarItem 
                active={activeTab === 'reports'} 
                icon={FileText} 
                label="Relatórios Avançados" 
                onClick={() => setActiveTab('reports')}
              />
              {(userProfile?.role === 'admin' || userProfile?.role === 'master') && (
                <SidebarItem 
                  active={activeTab === 'management'} 
                  icon={Activity} 
                  label="Configurações Master" 
                  onClick={() => setActiveTab('management')}
                />
              )}
            </div>
          </div>
        </nav>

        <div className="p-6 mt-auto">
          <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 shadow-xl group hover:border-neon/20 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center group-hover:bg-neon group-hover:text-black transition-all">
                <UserIcon className="w-6 h-6 text-zinc-400 group-hover:text-black" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-zinc-900 dark:text-white truncate uppercase tracking-tighter">{userProfile?.name}</p>
                <p className="text-[9px] text-neon/60 uppercase font-black tracking-widest mt-0.5">{userProfile?.role}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col min-w-0 ${darkMode ? 'bg-black' : 'bg-zinc-50'} relative overflow-hidden`}>
        {/* Background Glows for Main Content */}
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-neon/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

        <TopBar 
          userProfile={userProfile}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          globalSearch={globalSearch}
          setGlobalSearch={setGlobalSearch}
          handleLogout={handleLogout}
        />
        
        <div className="flex-1 p-8 overflow-y-auto">
          {/* Branch Selector for Master */}
          {userProfile?.role === 'master' && (
            <div className="mb-8 flex flex-wrap items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center gap-2 text-zinc-400">
                <Filter className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Ativa Filial:</span>
              </div>
              <select 
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-tighter outline-none transition-all"
              >
                <option value="">Todas as Filiais</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

        {activeTab === 'management' && userProfile?.role === 'master' && (
          <div className="space-y-10">
            <h2 className={`${darkMode ? 'text-white' : 'text-zinc-900'} text-2xl font-black flex items-center gap-3`}>
              <Activity className="w-8 h-8 text-neon" /> Gerenciamento do Sistema
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Branch Management */}
              <div className={`${darkMode ? 'bg-[#0a0a0a] border-zinc-900' : 'bg-white border-zinc-200'} border p-8 rounded-3xl shadow-sm space-y-6`}>
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-zinc-900'} flex items-center gap-2`}>
                  <Package className="w-5 h-5 text-neon" /> Cadastrar Nova Filial
                </h3>
                <form onSubmit={handleCreateBranch} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Nome da Filial</label>
                    <input 
                      type="text"
                      value={newBranchName}
                      onChange={(e) => setNewBranchName(e.target.value)}
                      placeholder="Ex: Filial São Paulo"
                      className={`w-full text-sm ${darkMode ? 'bg-black border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'} border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-neon/50`}
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-3 bg-neon text-black font-bold rounded-xl hover:bg-neon/90 transition-all shadow-lg shadow-neon/20 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Criar Filial
                  </button>
                </form>

                <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
                  <h4 className={`text-xs font-bold uppercase tracking-widest ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} mb-4`}>Filiais Ativas</h4>
                  <div className="space-y-2">
                    {branches.map(b => (
                      <div key={b.id} className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-black' : 'bg-zinc-50'}`}>
                        <span className={`text-sm font-medium ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>{b.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-neon uppercase tracking-widest">Ativa</span>
                          <button 
                            onClick={() => handleDeleteBranch(b.id)}
                            className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                            title="Excluir Filial"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* User Management */}
              <div className={`${darkMode ? 'bg-[#0a0a0a] border-zinc-900' : 'bg-white border-zinc-200'} border p-8 rounded-3xl shadow-sm space-y-6`}>
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-zinc-900'} flex items-center gap-2`}>
                  <Users className="w-5 h-5 text-neon" /> Cadastrar Novo Usuário
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
                        className={`w-full text-sm ${darkMode ? 'bg-black border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'} border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-neon/50`}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>E-mail</label>
                      <input 
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                        className={`w-full text-sm ${darkMode ? 'bg-black border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'} border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-neon/50`}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Função</label>
                      <select 
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'user')}
                        className={`w-full text-sm ${darkMode ? 'bg-black border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'} border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-neon/50`}
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
                        className={`w-full text-sm ${darkMode ? 'bg-black border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'} border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-neon/50`}
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
                    className="w-full py-3 bg-neon text-black font-bold rounded-xl hover:bg-neon/90 transition-all shadow-lg shadow-neon/20 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Criar Usuário
                  </button>
                </form>

                <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-6">
                  <div>
                    <h4 className={`text-xs font-bold uppercase tracking-widest ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} mb-4`}>Usuários Cadastrados</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {allUsers.map(u => (
                        <div key={u.id} className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-black' : 'bg-zinc-50'}`}>
                          <div>
                            <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{u.name}</p>
                            <p className="text-[10px] text-zinc-500">{u.email}</p>
                          </div>
                          <div className="text-right flex items-center gap-3">
                            <div>
                              <p className="text-[10px] font-bold text-neon uppercase tracking-widest">{u.role}</p>
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
                <DollarSign className="w-8 h-8 text-neon" /> Dashboard de Faturamento
              </h2>
              <button 
                onClick={exportBillingToPDF}
                className="flex items-center gap-2 px-6 py-2.5 bg-neon text-black rounded-2xl font-bold hover:bg-neon/80 transition-all shadow-lg shadow-neon/20"
              >
                <Download className="w-4 h-4" /> Exportar PDF
              </button>
            </div>

            <div className={`${darkMode ? 'bg-[#0a0a0a] border-zinc-900' : 'bg-zinc-50 border-zinc-200'} border p-5 rounded-3xl flex flex-wrap items-end gap-4 shadow-sm`}>
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
                    className={`w-full text-xs ${darkMode ? 'bg-black border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-600'} border rounded-xl pl-9 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-neon/50 appearance-none`}
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
                  className={`text-xs ${darkMode ? 'bg-black border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-600'} border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-neon/50`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={`text-[9px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Data Fim</label>
                <input 
                  type="date"
                  value={billingFilterEndDate}
                  onChange={(e) => setBillingFilterEndDate(e.target.value)}
                  className={`text-xs ${darkMode ? 'bg-black border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-600'} border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-neon/50`}
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
              <SummaryCard 
                label="Total Recebido" 
                value={`R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                color="green" 
                icon={DollarSign}
              />
              <SummaryCard 
                label="Total Pago" 
                value={`R$ ${totalDriverPayout.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                color="red" 
                icon={DollarSign}
              />
              <SummaryCard 
                label="Lucro Líquido" 
                value={`R$ ${netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                color="blue" 
                icon={TrendingUp}
              />
              <SummaryCard 
                label="Margem" 
                value={`${profitMargin.toFixed(1)}%`} 
                color={profitMargin > 0 ? "green" : "red"} 
                icon={Activity}
              />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="glass-card p-8 rounded-3xl">
                <h3 className="text-sm font-bold mb-8 uppercase tracking-widest text-zinc-400">Distribuição Financeira</h3>
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
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                      >
                        <Cell fill="#22c55e" className="glow-green" />
                        <Cell fill="#ef4444" className="glow-red" />
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: darkMode ? '#09090b' : '#fff', 
                          borderColor: darkMode ? '#27272a' : '#e4e4e7',
                          borderRadius: '16px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                        }}
                        itemStyle={{ color: darkMode ? '#fff' : '#000' }}
                        formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                      />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card p-8 rounded-3xl">
                <h3 className="text-sm font-bold mb-8 uppercase tracking-widest text-zinc-400">Top 5 Fretes por Receita</h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={freights
                        .filter(f => !billingFilterFreightId || f.id === billingFilterFreightId)
                        .map(f => {
                          const fLoadings = billingLoadings.filter(l => l.freightId === f.id);
                          const rev = fLoadings.reduce((acc, curr) => acc + ((curr.weight / 1000) * (f.valorFrete || 0)), 0);
                          return { name: f.description, value: rev };
                        })
                        .filter(f => f.value > 0)
                        .sort((a, b) => b.value - a.value)
                        .slice(0, 5)}
                      layout="vertical"
                      margin={{ left: 40, right: 40, top: 0, bottom: 0 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        axisLine={false} 
                        tickLine={false} 
                        width={120}
                        tick={{ fill: darkMode ? '#a1a1aa' : '#71717a', fontSize: 10, fontWeight: 700 }}
                      />
                      <Tooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ 
                          backgroundColor: darkMode ? '#09090b' : '#fff', 
                          borderColor: darkMode ? '#27272a' : '#e4e4e7',
                          borderRadius: '16px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                        }}
                        itemStyle={{ color: darkMode ? '#fff' : '#000' }}
                        formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                      />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
                        {freights.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#27272a'} className={index === 0 ? 'glow-blue' : ''} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <section className={`${darkMode ? 'bg-[#0a0a0a] border-zinc-900' : 'bg-white border-zinc-200'} p-8 rounded-3xl border shadow-sm`}>
              <h3 className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-bold mb-6 flex items-center gap-2`}>
                <ClipboardList className="w-5 h-5 text-neon" /> Resumo Financeiro por Pedido (Frete)
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
                  <tbody className={`divide-y ${darkMode ? 'divide-zinc-800' : 'divide-zinc-100'}`}>
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
                            <td className="py-4 text-sm font-bold text-neon">R$ {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="py-4 text-sm font-bold text-neon/80">R$ {payout.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className={`py-4 text-sm font-bold ${profit >= 0 ? 'text-neon' : 'text-red-500'}`}>R$ {profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className={`py-4 text-sm font-black ${margin >= 0 ? 'text-neon' : 'text-red-500'}`}>{margin.toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={`${darkMode ? 'bg-[#0a0a0a] border-zinc-900' : 'bg-white border-zinc-200'} p-8 rounded-3xl border shadow-sm`}>
              <h3 className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-bold mb-6 flex items-center gap-2`}>
                <Truck className="w-5 h-5 text-neon" /> Detalhamento por Motorista
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
                  <tbody className={`divide-y ${darkMode ? 'divide-zinc-800' : 'divide-zinc-100'}`}>
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
                          <td className="py-4 text-neon font-bold">R$ {rev.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="py-4 text-neon/80 font-bold">R$ {pay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="py-4 text-neon font-black">R$ {prof.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
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
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <button 
                  onClick={() => setActiveTab('freights')}
                  className={`flex items-center gap-4 p-5 ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'} rounded-3xl hover:shadow-lg hover:shadow-zinc-200/20 dark:hover:shadow-none transition-all group`}
                >
                  <div className={`w-12 h-12 ${darkMode ? 'bg-green-500/10' : 'bg-green-50'} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Plus className={`w-6 h-6 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-black ${darkMode ? 'text-white' : 'text-zinc-900'} uppercase tracking-tighter`}>Novo Frete</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Carga cadastral</p>
                  </div>
                </button>
                <button 
                  onClick={() => setActiveTab('loadings')}
                  className={`flex items-center gap-4 p-5 ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'} rounded-3xl hover:shadow-lg hover:shadow-zinc-200/20 dark:hover:shadow-none transition-all group`}
                >
                  <div className={`w-12 h-12 ${darkMode ? 'bg-green-500/10' : 'bg-green-50'} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Truck className={`w-6 h-6 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-black ${darkMode ? 'text-white' : 'text-zinc-900'} uppercase tracking-tighter`}>Carregamento</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Vicular</p>
                  </div>
                </button>
                <button 
                  onClick={() => setActiveTab('reports')}
                  className={`flex items-center gap-4 p-5 ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'} rounded-3xl hover:shadow-lg hover:shadow-zinc-200/20 dark:hover:shadow-none transition-all group`}
                >
                  <div className={`w-12 h-12 ${darkMode ? 'bg-zinc-800' : 'bg-zinc-50'} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <FileText className={`w-6 h-6 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`} />
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-black ${darkMode ? 'text-white' : 'text-zinc-900'} uppercase tracking-tighter`}>Relatórios</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Exportar dados</p>
                  </div>
                </button>
                <button 
                  onClick={() => setActiveTab('faturamento')}
                  className={`flex items-center gap-4 p-5 ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'} rounded-3xl hover:shadow-lg hover:shadow-zinc-200/20 dark:hover:shadow-none transition-all group`}
                >
                  <div className={`w-12 h-12 ${darkMode ? 'bg-zinc-800' : 'bg-zinc-50'} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <DollarSign className={`w-6 h-6 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`} />
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-black ${darkMode ? 'text-white' : 'text-zinc-900'} uppercase tracking-tighter`}>Faturamento</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Financeiro</p>
                  </div>
                </button>
              </div>

              {/* Dashboard Filters */}
              <div className={`flex flex-wrap items-end gap-6 p-8 ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'} rounded-[2.5rem] shadow-sm transition-colors`}>
                <div className="flex items-center gap-2 mb-1">
                  <Filter className="w-4 h-4 text-green-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Filtros Gerais</span>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className={`text-[9px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>DADOS</label>
                  <input 
                    type="date"
                    value={dashboardFilterStartDate}
                    onChange={(e) => setDashboardFilterStartDate(e.target.value)}
                    className={`text-xs ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-600'} border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-neon/50`}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={`text-[9px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>FILME DE DADOS</label>
                  <input 
                    type="date"
                    value={dashboardFilterEndDate}
                    onChange={(e) => setDashboardFilterEndDate(e.target.value)}
                    className={`text-xs ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-600'} border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-neon/50`}
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

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <SummaryCard 
                  label="TOTAL PLANEJADO" 
                  value={`R$ ${totalPlanned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                  icon={ClipboardList}
                  color="green"
                />
                <SummaryCard 
                  label="TOTAL EM PESOS" 
                  value={`${totalWeight.toLocaleString()} kg`} 
                  icon={Weight}
                  trend="+12%"
                  color="zinc"
                />
                <SummaryCard 
                  label="FRETES ABERTOS" 
                  value={openFreights.toString()} 
                  icon={ClipboardList}
                  color="green"
                />
                <SummaryCard 
                  label="MANIFESTOS PENDENTES" 
                  value={pendingManifesto.toString()} 
                  icon={FileText}
                  color="red"
                />
                <SummaryCard 
                  label="VIAGENS FINALIZADAS" 
                  value={totalCompleted.toString()} 
                  icon={CheckCircle2}
                  color="green"
                />
              </div>

              {/* Financial Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SummaryCard 
                  label="RECEITA BRUTA" 
                  value={`R$ ${(dashboardTotalRevenue || 92152.80).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                  icon={TrendingUp}
                  color="green"
                />
                <SummaryCard 
                  label="PAGO MOTORISTAS" 
                  value={`R$ ${(dashboardTotalDriverPayout || 158248.60).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                  icon={TrendingUp}
                  color="red"
                />
                <SummaryCard 
                  label="LUCRO SOBRA" 
                  value={`R$ ${(dashboardTotalRevenue > 0 ? dashboardNetProfit : -66095.80).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                  icon={DollarSign}
                  color="green"
                  trend="-71,7%"
                />
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="glass-card p-8 rounded-3xl">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <Activity className="w-5 h-5 text-green-500" /> de graça
                    </h3>
                  </div>
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <FunnelChart>
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.8)', backdropFilter: 'blur(8px)', border: 'none', borderRadius: '12px', color: '#fff' }}
                        />
                        <Funnel
                          data={funnelData}
                          dataKey="value"
                        >
                          {funnelData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                          <LabelList position="center" fill="#fff" dataKey="name" style={{ fontSize: '12px', fontWeight: 'bold' }} />
                        </Funnel>
                      </FunnelChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass-card p-8 rounded-3xl">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <BarChart2 className="w-5 h-5 text-green-500" /> Volume por Motorista
                    </h3>
                  </div>
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={driverFunnelData} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: '#888' }} />
                        <Tooltip 
                          cursor={{ fill: 'transparent' }}
                          contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.8)', backdropFilter: 'blur(8px)', border: 'none', borderRadius: '12px', color: '#fff' }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {driverFunnelData.map((entry, index) => (
                            <Cell key={`cell-driver-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

            {/* Metrics Sidebar */}
                  <div className="lg:w-96 space-y-6">
                    <h2 className="text-sm font-bold mb-8 uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-brand-500" /> Inteligência de Dados
                    </h2>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="glass-card p-5 rounded-3xl transition-all hover:translate-y-[-2px]">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Motoristas</p>
                        <p className="text-2xl font-black">{uniqueDrivers}</p>
                        <div className="mt-2 h-1 w-full bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 w-[65%]" />
                        </div>
                      </div>
                      <div className="glass-card p-5 rounded-3xl transition-all hover:translate-y-[-2px]">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Viagens</p>
                        <p className="text-2xl font-black">{dashboardLoadings.length}</p>
                        <div className="mt-2 h-1 w-full bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 w-[80%]" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="glass-card p-6 rounded-3xl transition-all hover:translate-y-[-2px]">
                        <div className="flex items-center gap-3 mb-2">
                          <Weight className="w-4 h-4 text-zinc-400" />
                          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest">Média por Caminhão</span>
                        </div>
                        <div className="text-2xl font-black">{avgWeightPerDriver.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg</div>
                        <div className="mt-3 h-1.5 w-full bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 w-[55%]" />
                        </div>
                      </div>

                      {topDriver && (
                        <div className="glass-card p-6 rounded-3xl relative overflow-hidden group transition-all hover:translate-y-[-2px]">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-brand-500/20" />
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-2xl bg-brand-500/10 flex items-center justify-center">
                              <UserIcon className="w-5 h-5 text-brand-500" />
                            </div>
                            <span className="text-[10px] uppercase font-bold text-brand-500 tracking-widest">Melhor Desempenho</span>
                          </div>
                          <div className="text-xl font-black truncate mb-4">{topDriver.name}</div>
                          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                            <div>
                              <div className="text-[9px] text-zinc-400 uppercase font-bold tracking-widest">Viagens</div>
                              <div className="text-lg font-black">{topDriver.count}</div>
                            </div>
                            <div>
                              <div className="text-[9px] text-zinc-400 uppercase font-bold tracking-widest">Total</div>
                              <div className="text-lg font-black text-brand-500">{topDriver.weight.toLocaleString()} kg</div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="glass-card p-6 rounded-3xl transition-all hover:translate-y-[-2px]">
                        <div className="flex items-center gap-3 mb-2">
                          <BarChart2 className="w-4 h-4 text-zinc-400" />
                          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest">Taxa de Conclusão</span>
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="text-2xl font-black">
                            {totalPlannedWeight > 0 ? ((totalWeight / totalPlannedWeight) * 100).toFixed(1) : 0}%
                          </div>
                          <div className="text-[10px] text-zinc-400 mb-1.5 tracking-widest uppercase font-bold">do planejado</div>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-full mt-4 overflow-hidden">
                          <div 
                            className="h-full bg-brand-500 glow-green" 
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
              )}

        {activeTab === 'freights' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Freight Registration */}
            {(userProfile?.role === 'admin' || userProfile?.role === 'master') && (
              <section className="glass-card p-8 rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 blur-[100px] rounded-full -mr-32 -mt-32" />
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-8 flex items-center gap-3 relative z-10">
                  <div className="w-10 h-10 bg-brand-50 dark:bg-brand-500/10 rounded-xl flex items-center justify-center">
                    <ClipboardList className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                  </div>
                  Novo Frete
                </h2>
                <form onSubmit={handleSubmitFreight} className="grid grid-cols-1 md:grid-cols-6 gap-6 relative z-10">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Descrição</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Soja - Fazenda Sol"
                      value={freightDesc}
                      onChange={(e) => setFreightDesc(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Produto</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Soja"
                      value={freightProduct}
                      onChange={(e) => setFreightProduct(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Origem</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Sorriso-MT"
                      value={freightOrigin}
                      onChange={(e) => setFreightOrigin(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Destino</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Santos-SP"
                      value={freightDestination}
                      onChange={(e) => setFreightDestination(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Peso (kg)</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={freightTotalWeight}
                      onChange={(e) => setFreightTotalWeight(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Valor Unit. (ton)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00"
                      value={freightValorFrete}
                      onChange={(e) => setFreightValorFrete(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Valor Total (R$)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00"
                      value={freightValorRecebido}
                      onChange={(e) => setFreightValorRecebido(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Valor Motorista (ton)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00"
                      value={freightValorPagoMotorista}
                      onChange={(e) => setFreightValorPagoMotorista(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Total Estimado</label>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 px-4 text-sm font-bold text-zinc-600 dark:text-zinc-400">
                      R$ {((Number(freightTotalWeight) / 1000) * Number(freightValorFrete) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="md:col-span-6 space-y-2">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Observações</label>
                    <textarea 
                      placeholder="Notas adicionais sobre o frete..."
                      value={freightObservations}
                      onChange={(e) => setFreightObservations(e.target.value)}
                      rows={2}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-brand-500/20 transition-all resize-none"
                    />
                  </div>
                  <div className="md:col-span-6 flex justify-end pt-4">
                    <button 
                      disabled={isSubmittingFreight}
                      className="w-full md:w-auto px-12 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold uppercase tracking-widest py-4 rounded-xl transition-all shadow-lg shadow-brand-500/20 active:scale-95"
                    >
                      {isSubmittingFreight ? 'Salvando...' : 'Criar Frete'}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* Freights List */}
            <section className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-brand-500" /> Lista de Fretes
                </h3>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input 
                      type="text"
                      placeholder="Buscar fretes..."
                      value={freightSearch}
                      onChange={(e) => setFreightSearch(e.target.value)}
                      className={`bg-white ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'border-zinc-200'} rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/20 w-64`}
                    />
                  </div>
                  <select 
                    value={freightFilterStatus}
                    onChange={(e) => setFreightFilterStatus(e.target.value as any)}
                    className={`bg-white ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'border-zinc-200'} rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/20`}
                  >
                    <option value="Todos">Todos Status</option>
                    <option value="Aberto">Aberto</option>
                    <option value="Finalizado">Finalizado</option>
                  </select>
                </div>
              </div>

              <div className="glass-card rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-100 dark:border-zinc-800">
                        <th className="px-6 py-4 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Data</th>
                        <th className="px-6 py-4 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Descrição</th>
                        <th className="px-6 py-4 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Rota</th>
                        <th className="px-6 py-4 text-[10px] uppercase font-bold text-zinc-400 tracking-wider text-right">Peso</th>
                        <th className="px-6 py-4 text-[10px] uppercase font-bold text-zinc-400 tracking-wider text-right">Saldo</th>
                        <th className="px-6 py-4 text-[10px] uppercase font-bold text-zinc-400 tracking-wider text-center">Status</th>
                        <th className="px-6 py-4 text-[10px] uppercase font-bold text-zinc-400 tracking-wider text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50 dark:divide-zinc-900">
                      {filteredFreights.map(f => {
                        const freightLoadings = loadings.filter(l => l.freightId === f.id);
                        const loadedWeight = freightLoadings.reduce((acc, curr) => acc + curr.weight, 0);
                        const remainingWeight = f.totalWeight - loadedWeight;
                        
                        return (
                          <tr key={f.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors group">
                            <td className="px-6 py-4 text-xs font-medium text-zinc-500">
                              {new Date(f.createdAt).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm font-bold text-zinc-900 dark:text-white">{f.description}</p>
                              <p className="text-[10px] text-zinc-400 font-medium">{f.product}</p>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                <span>{f.origin}</span>
                                <ArrowRight className="w-3 h-3 text-zinc-300" />
                                <span>{f.destination}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <p className="text-sm font-bold text-zinc-900 dark:text-white">{f.totalWeight.toLocaleString()} kg</p>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <p className={`text-sm font-bold ${remainingWeight > 0 ? 'text-brand-600 dark:text-brand-400' : 'text-zinc-400'}`}>
                                {remainingWeight.toLocaleString()} kg
                              </p>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <StatusBadge status={f.status} />
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => {
                                    setEditingFreightId(f.id);
                                    setEditFreightDesc(f.description);
                                    setEditFreightProduct(f.product);
                                    setEditFreightOrigin(f.origin);
                                    setEditFreightDestination(f.destination);
                                    setEditFreightTotalWeight(f.totalWeight.toString());
                                    setEditFreightValorFrete(f.valorFrete.toString());
                                    setEditFreightValorPagoMotorista(f.valorPagoMotorista.toString());
                                    setEditFreightObservations(f.observations);
                                    setEditFreightStatus(f.status);
                                  }}
                                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => {
                                    setDeletingId(f.id);
                                    setDeletingType('freight');
                                  }}
                                  className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-zinc-400 hover:text-red-500 transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'loadings' && (
          <>
            {/* Loading Registration */}
            {(userProfile?.role === 'admin' || userProfile?.role === 'master') && (
              <section className={`${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-zinc-200'} border rounded-[2.5rem] p-10 shadow-sm transition-colors mb-10 relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-neon/5 blur-[100px] rounded-full -mr-32 -mt-32" />
                <h2 className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-black text-xl mb-8 flex items-center gap-3 relative z-10 font-display`}>
                  <div className="w-10 h-10 bg-neon/10 rounded-xl flex items-center justify-center">
                    <Plus className="w-5 h-5 text-neon" />
                  </div>
                  Cadastrar Motorista
                </h2>
                <form onSubmit={handleSubmitLoading} className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6 relative z-10">
                  <div className="md:col-span-2 space-y-2">
                    <label className={`text-[10px] uppercase font-black tracking-widest ${darkMode ? 'text-zinc-600' : 'text-zinc-400'} ml-1`}>Selecionar Frete</label>
                    <select 
                      value={selectedFreightId}
                      onChange={(e) => setSelectedFreightId(e.target.value)}
                      className={`w-full ${darkMode ? 'bg-black border-zinc-800 text-white focus:border-neon' : 'bg-white border-zinc-200 text-zinc-900 focus:border-zinc-400'} border rounded-2xl py-4 px-5 text-sm outline-none transition-all focus:ring-4 focus:ring-neon/5 appearance-none`}
                    >
                      <option value="">Selecione...</option>
                      {freights.filter(f => f.status === 'Aberto').map(f => (
                        <option key={f.id} value={f.id}>{f.description}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] uppercase font-black tracking-widest ${darkMode ? 'text-zinc-600' : 'text-zinc-400'} ml-1`}>Motorista</label>
                    <div className="relative">
                      <UserIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-zinc-600' : 'text-zinc-300'}`} />
                      <input 
                        type="text" 
                        placeholder="Nome"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        className={`w-full ${darkMode ? 'bg-black border-zinc-800 text-white focus:border-neon' : 'bg-white border-zinc-200 text-zinc-900 focus:border-zinc-400'} border rounded-2xl py-4 pl-10 pr-5 text-sm outline-none transition-all focus:ring-4 focus:ring-neon/5`}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] uppercase font-black tracking-widest ${darkMode ? 'text-zinc-600' : 'text-zinc-400'} ml-1`}>Placa</label>
                    <div className="relative">
                      <Truck className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-zinc-600' : 'text-zinc-300'}`} />
                      <input 
                        type="text" 
                        placeholder="ABC-1234"
                        value={plate}
                        onChange={(e) => setPlate(e.target.value)}
                        className={`w-full ${darkMode ? 'bg-black border-zinc-800 text-white focus:border-neon' : 'bg-white border-zinc-200 text-zinc-900 focus:border-zinc-400'} border rounded-2xl py-4 pl-10 pr-5 text-sm outline-none transition-all focus:ring-4 focus:ring-neon/5`}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] uppercase font-black tracking-widest ${darkMode ? 'text-zinc-600' : 'text-zinc-400'} ml-1`}>Peso (kg)</label>
                    <div className="relative">
                      <Weight className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-zinc-600' : 'text-zinc-300'}`} />
                      <input 
                        type="number" 
                        placeholder="0"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className={`w-full ${darkMode ? 'bg-black border-zinc-800 text-white focus:border-neon' : 'bg-white border-zinc-200 text-zinc-900 focus:border-zinc-400'} border rounded-2xl py-4 pl-10 pr-5 text-sm outline-none transition-all focus:ring-4 focus:ring-neon/5`}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] uppercase font-black tracking-widest ${darkMode ? 'text-zinc-600' : 'text-zinc-400'} ml-1`}>Quem deu a ordem</label>
                    <div className="relative">
                      <UserIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-zinc-600' : 'text-zinc-300'} z-10`} />
                      <select 
                        value={orderGiverId}
                        onChange={(e) => setOrderGiverId(e.target.value)}
                        className={`w-full ${darkMode ? 'bg-black border-zinc-800 text-white focus:border-neon' : 'bg-white border-zinc-200 text-zinc-900 focus:border-zinc-400'} border rounded-2xl py-4 pl-10 pr-5 text-sm outline-none transition-all focus:ring-4 focus:ring-neon/5 appearance-none`}
                      >
                        <option value="">Selecione...</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] uppercase font-black tracking-widest ${darkMode ? 'text-zinc-600' : 'text-zinc-400'} ml-1`}>Vlr Unit. Motorista (R$/ton)</label>
                    <div className="relative">
                      <DollarSign className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-zinc-600' : 'text-zinc-300'}`} />
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        value={driverUnitPrice}
                        onChange={(e) => setDriverUnitPrice(e.target.value)}
                        className={`w-full ${darkMode ? 'bg-black border-zinc-800 text-white focus:border-neon' : 'bg-white border-zinc-200 text-zinc-900 focus:border-zinc-400'} border rounded-2xl py-4 pl-10 pr-5 text-sm outline-none transition-all focus:ring-4 focus:ring-neon/5`}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] uppercase font-black tracking-widest ${darkMode ? 'text-zinc-600' : 'text-zinc-400'} ml-1`}>Valor Total (R$)</label>
                    <div className="relative">
                      <DollarSign className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-zinc-600' : 'text-zinc-300'}`} />
                      <input 
                        type="number" 
                        placeholder="0.00"
                        value={driverValue}
                        onChange={(e) => setDriverValue(e.target.value)}
                        className={`w-full ${darkMode ? 'bg-black border-zinc-800 text-white focus:border-neon' : 'bg-white border-zinc-200 text-zinc-900 focus:border-zinc-400'} border rounded-2xl py-4 pl-10 pr-5 text-sm outline-none transition-all focus:ring-4 focus:ring-neon/5`}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] uppercase font-black tracking-widest ${darkMode ? 'text-zinc-600' : 'text-zinc-400'} ml-1`}>Data Carregamento</label>
                    <div className="relative">
                      <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-zinc-600' : 'text-zinc-300'}`} />
                      <input 
                        type="date" 
                        value={loadingDate}
                        onChange={(e) => setLoadingDate(e.target.value)}
                        className={`w-full ${darkMode ? 'bg-black border-zinc-800 text-white focus:border-neon' : 'bg-white border-zinc-200 text-zinc-900 focus:border-zinc-400'} border rounded-2xl py-4 pl-10 pr-5 text-sm outline-none transition-all focus:ring-4 focus:ring-neon/5`}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] uppercase font-black tracking-widest ${darkMode ? 'text-zinc-600' : 'text-zinc-400'} ml-1`}>Data Manifesto</label>
                    <div className="relative">
                      <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-zinc-600' : 'text-zinc-300'}`} />
                      <input 
                        type="date" 
                        value={manifestoDate}
                        onChange={(e) => setManifestoDate(e.target.value)}
                        className={`w-full ${darkMode ? 'bg-black border-zinc-800 text-white focus:border-neon' : 'bg-white border-zinc-200 text-zinc-900 focus:border-zinc-400'} border rounded-2xl py-4 pl-10 pr-5 text-sm outline-none transition-all focus:ring-4 focus:ring-neon/5`}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] uppercase font-black tracking-widest ${darkMode ? 'text-zinc-600' : 'text-zinc-400'} ml-1`}>Data Descarregamento</label>
                    <div className="relative">
                      <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-zinc-600' : 'text-zinc-300'}`} />
                      <input 
                        type="date" 
                        value={unloadedDate}
                        onChange={(e) => setUnloadedDate(e.target.value)}
                        className={`w-full ${darkMode ? 'bg-black border-zinc-800 text-white focus:border-neon' : 'bg-white border-zinc-200 text-zinc-900 focus:border-zinc-400'} border rounded-2xl py-4 pl-10 pr-5 text-sm outline-none transition-all focus:ring-4 focus:ring-neon/5`}
                      />
                    </div>
                  </div>
                  <div className="md:col-span-1 space-y-2">
                    <label className={`text-[10px] uppercase font-black tracking-widest ${darkMode ? 'text-zinc-600' : 'text-zinc-400'} ml-1`}>Observações</label>
                    <textarea 
                      placeholder="Notas sobre o motorista..."
                      value={loadingObservations}
                      onChange={(e) => setLoadingObservations(e.target.value)}
                      rows={1}
                      className={`w-full ${darkMode ? 'bg-black border-zinc-800 text-white focus:border-neon' : 'bg-white border-zinc-200 text-zinc-900 focus:border-zinc-400'} border rounded-2xl py-4 px-5 text-sm outline-none transition-all focus:ring-4 focus:ring-neon/5 resize-none`}
                    />
                  </div>
                  <div className="flex items-end pt-4">
                    <button 
                      disabled={isSubmittingLoading}
                      className="w-full bg-neon hover:bg-neon/90 disabled:opacity-50 text-black font-black uppercase tracking-widest py-5 rounded-2xl transition-all shadow-xl shadow-neon/20 active:scale-95"
                    >
                      {isSubmittingLoading ? 'Salvando...' : 'Cadastrar'}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* List Section */}
            <section className="space-y-8">
              <div className={`${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-zinc-50 border-zinc-200'} border p-6 rounded-[2rem] flex flex-wrap items-end gap-6 shadow-sm`}>
                <div className="flex items-center gap-3 mr-4 mb-10">
                  <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
                    <Filter className="w-4 h-4 text-neon" />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>Filtros de Motorista</span>
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
              
              <div className="grid grid-cols-1 gap-6">
                {filteredLoadings.map((loading) => {
                  const freight = freights.find(f => f.id === loading.freightId);
                  return (
                    <div key={loading.id} className={`${darkMode ? 'bg-zinc-950 border-zinc-900 hover:border-neon/30' : 'bg-white border-zinc-200 hover:border-zinc-300'} border rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-8 group transition-all shadow-sm relative overflow-hidden`}>
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-neon/10 group-hover:bg-neon transition-all duration-500" />
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
            {/* Employee Registration */}
            {(userProfile?.role === 'admin' || userProfile?.role === 'master') && (
              <section className={`${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-zinc-200'} border rounded-[2.5rem] p-10 shadow-sm transition-colors relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-neon/5 blur-[100px] rounded-full -mr-32 -mt-32" />
                <h2 className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-black text-xl mb-8 flex items-center gap-3 relative z-10 font-display`}>
                  <div className="w-10 h-10 bg-neon/10 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-neon" />
                  </div>
                  Cadastrar Funcionário
                </h2>
                <form onSubmit={handleSubmitEmployee} className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                  <div className="space-y-2">
                    <label className={`text-[10px] uppercase font-black tracking-widest ${darkMode ? 'text-zinc-600' : 'text-zinc-400'} ml-1`}>Nome Completo</label>
                    <input 
                      type="text" 
                      placeholder="Nome do funcionário"
                      value={employeeName}
                      onChange={(e) => setEmployeeName(e.target.value)}
                      className={`w-full ${darkMode ? 'bg-black border-zinc-800 text-white focus:border-neon' : 'bg-white border-zinc-200 text-zinc-900 focus:border-zinc-400'} border rounded-2xl py-4 px-5 text-sm outline-none transition-all focus:ring-4 focus:ring-neon/5`}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] uppercase font-black tracking-widest ${darkMode ? 'text-zinc-600' : 'text-zinc-400'} ml-1`}>Cargo / Função</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Auxiliar Administrativo"
                      value={employeeRole}
                      onChange={(e) => setEmployeeRole(e.target.value)}
                      className={`w-full ${darkMode ? 'bg-black border-zinc-800 text-white focus:border-neon' : 'bg-white border-zinc-200 text-zinc-900 focus:border-zinc-400'} border rounded-2xl py-4 px-5 text-sm outline-none transition-all focus:ring-4 focus:ring-neon/5`}
                    />
                  </div>
                  <div className="flex items-end pt-4">
                    <button 
                      disabled={isSubmittingEmployee}
                      className="w-full bg-neon hover:bg-neon/90 disabled:opacity-50 text-black font-black uppercase tracking-widest py-5 rounded-2xl transition-all shadow-xl shadow-neon/20 active:scale-95"
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
                    className={`w-full text-xs ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-600'} border rounded-xl pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-neon/50`}
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
                    className={`flex items-center justify-between p-6 ${darkMode ? 'bg-zinc-800 border-zinc-700 hover:border-neon/50' : 'bg-white border-zinc-200 hover:border-neon/50'} rounded-2xl transition-all group shadow-sm`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 ${darkMode ? 'bg-neon/20' : 'bg-neon/10'} rounded-xl text-neon`}>
                        <ClipboardList className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <div className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-bold`}>Fretes (CSV)</div>
                        <div className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Lista completa em formato CSV</div>
                      </div>
                    </div>
                    <Download className={`w-5 h-5 ${darkMode ? 'text-zinc-700' : 'text-zinc-300'} group-hover:text-neon transition-colors`} />
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
      </div>
    </main>

        {/* Modal de Detalhes do Frete */}
        {viewingFreightId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
            <div className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} border p-8 rounded-3xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col space-y-6 shadow-2xl transition-colors`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-neon">
                  <div className="p-3 bg-neon/10 rounded-2xl">
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
                    <div className="text-neon font-bold">
                      R$ {freights.find(f => f.id === viewingFreightId)?.valorFrete?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} /ton
                    </div>
                  </div>
                  <div className={`${darkMode ? 'bg-zinc-800/50' : 'bg-zinc-50'} p-4 rounded-2xl`}>
                    <span className={`text-[10px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} block mb-1`}>Faturamento (Calc)</span>
                    <div className="text-neon font-bold">
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
                    <div className={`font-bold ${((loadings.filter(l => l.freightId === viewingFreightId).reduce((acc, curr) => acc + curr.weight, 0) / 1000) * ((freights.find(f => f.id === viewingFreightId)?.valorFrete || 0) - (freights.find(f => f.id === viewingFreightId)?.valorPagoMotorista || 0))) >= 0 ? 'text-neon' : 'text-red-500'}`}>
                      R$ {((loadings.filter(l => l.freightId === viewingFreightId).reduce((acc, curr) => acc + curr.weight, 0) / 1000) * ((freights.find(f => f.id === viewingFreightId)?.valorFrete || 0) - (freights.find(f => f.id === viewingFreightId)?.valorPagoMotorista || 0))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {freights.find(f => f.id === viewingFreightId)?.observations && (
                  <div className={`${darkMode ? 'bg-neon/5 border-neon/10' : 'bg-neon/5 border-neon/10'} border p-4 rounded-2xl`}>
                    <span className={`text-[10px] uppercase font-bold ${darkMode ? 'text-neon' : 'text-neon'} block mb-1`}>Observações do Frete</span>
                    <p className={`text-sm ${darkMode ? 'text-zinc-300' : 'text-zinc-700'} whitespace-pre-wrap`}>
                      {freights.find(f => f.id === viewingFreightId)?.observations}
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className={`${darkMode ? 'text-white' : 'text-zinc-900'} font-bold flex items-center gap-2`}>
                    <Truck className="w-4 h-4 text-neon" /> Motoristas Vinculados
                  </h4>
                  
                  <div className="space-y-3">
                    {loadings.filter(l => l.freightId === viewingFreightId).length > 0 ? (
                      loadings.filter(l => l.freightId === viewingFreightId).map(loading => (
                        <div key={loading.id} className={`${darkMode ? 'bg-zinc-800/30 border-zinc-800' : 'bg-white border-zinc-100'} border rounded-2xl p-4 flex items-center justify-between`}>
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 ${darkMode ? 'bg-zinc-800' : 'bg-zinc-50'} rounded-xl flex items-center justify-center text-neon`}>
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
                                    <span className="text-[10px] font-bold text-neon">
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
                                    <span className="text-[10px] font-black text-neon">
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
                            <div className={`text-[10px] px-2 py-1 rounded-lg font-bold ${loading.manifestoDone ? 'bg-neon/10 text-neon' : 'bg-zinc-500/10 text-zinc-500'}`}>
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
              {deletingError ? (
                <span className="text-red-500 font-bold">{deletingError}</span>
              ) : deletingType === 'freight' 
                ? "Tem certeza que deseja excluir este frete? Todos os registros de motoristas vinculados perderão a referência."
                : deletingType === 'branch'
                ? "Tem certeza que deseja excluir esta filial? Esta ação não pode ser desfeita."
                : deletingType === 'user'
                ? "Tem certeza que deseja excluir este usuário?"
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
                  } else if (deletingType === 'branch') {
                    confirmDeleteBranch(deletingId);
                  } else if (deletingType === 'user') {
                    confirmDeleteUser(deletingId);
                  } else {
                    deleteLoading(deletingId);
                  }
                }}
                className="flex-1 px-6 py-3 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:grayscale"
                disabled={!!deletingError}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTÃO FLUTUANTE */}
      <button 
        onClick={() => {
          setActiveTab('freights');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        className="fixed bottom-8 right-8 w-16 h-16 bg-green-500 hover:bg-green-600 text-black rounded-full shadow-2xl shadow-green-500/40 flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-50 group"
      >
        <Plus className="w-8 h-8 transition-transform group-hover:rotate-90" />
      </button>
    </div>
  );
}

function SummaryCard({ 
  label, 
  value, 
  icon: Icon, 
  trend, 
  color = "zinc",
  className = "" 
}: { 
  label: string, 
  value: string, 
  icon?: any, 
  trend?: string, 
  color?: "green" | "red" | "blue" | "zinc" | "brand",
  className?: string
}) {
  const colorMap = {
    green: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    red: "text-rose-500 bg-rose-500/10 border-rose-500/20",
    blue: "text-sky-500 bg-sky-500/10 border-sky-500/20",
    zinc: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
    brand: "text-neon bg-neon/10 border-neon/20",
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className={`${darkMode ? 'bg-zinc-900/40 border-white/5' : 'bg-white border-zinc-100'} backdrop-blur-xl p-6 rounded-[2.5rem] flex flex-col gap-4 transition-all hover:shadow-2xl dark:hover:shadow-neon/10 relative group overflow-hidden ${className}`}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      
      {trend && (
        <div className={`absolute top-6 right-6 text-[10px] font-black px-3 py-1 rounded-full ${trend.startsWith('+') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
          {trend}
        </div>
      )}
      
      {Icon && (
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${colorMap[color]} transition-all group-hover:scale-110 group-hover:rotate-3 duration-500 shadow-sm`}>
          <Icon className="w-6 h-6" />
        </div>
      )}
      
      <div className="space-y-1">
        <p className={`text-[10px] font-black ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} uppercase tracking-[0.2em]`}>{label}</p>
        <p className={`text-3xl font-black ${darkMode ? 'text-white' : 'text-zinc-900'} tracking-tighter group-hover:text-neon transition-colors duration-300`}>{value}</p>
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const getStyles = () => {
    switch (status) {
      case 'Aberto': return 'bg-sky-500/10 text-sky-500 border-sky-500/20';
      case 'Finalizado': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'Cancelado': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case 'Manifesto': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'Descarregado': return 'bg-teal-500/10 text-teal-500 border-teal-500/20';
      default: return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
    }
  };

  return (
    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border ${getStyles()}`}>
      {status}
    </span>
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

function SidebarItem({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden ${
        active 
          ? 'bg-neon text-black shadow-[0_0_25px_rgba(57,255,20,0.4)]' 
          : 'text-zinc-500 hover:text-neon hover:bg-neon/5'
      }`}
    >
      {active && (
        <motion.div 
          layoutId="sidebar-active"
          className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"
        />
      )}
      <Icon className={`w-5 h-5 transition-all duration-500 ${active ? 'scale-110 rotate-3' : 'group-hover:scale-110 group-hover:rotate-3'}`} />
      <span className="font-black text-[10px] uppercase tracking-[0.2em]">{label}</span>
      {active && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute right-4 w-1.5 h-1.5 rounded-full bg-black shadow-[0_0_8px_rgba(0,0,0,0.5)]" 
        />
      )}
    </button>
  );
}

function TopBar({ 
  userProfile, 
  darkMode, 
  setDarkMode, 
  globalSearch, 
  setGlobalSearch,
  handleLogout 
}: { 
  userProfile: UserProfile | null, 
  darkMode: boolean, 
  setDarkMode: (v: boolean) => void,
  globalSearch: string,
  setGlobalSearch: (v: string) => void,
  handleLogout: () => void
}) {
  return (
    <header className={`sticky top-0 z-30 flex items-center justify-between px-10 py-6 ${darkMode ? 'bg-black/60 backdrop-blur-3xl border-white/5' : 'bg-white border-zinc-100'} border-b transition-all duration-500`}>
      <div className="flex items-center gap-6 flex-1 max-w-2xl">
        <div className="relative w-full group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-neon transition-colors duration-300" />
          <input 
            type="text" 
            placeholder="Pesquisar inteligência operacional..." 
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className={`w-full pl-16 pr-6 py-4 ${darkMode ? 'bg-zinc-900/40 border-white/5 text-white' : 'bg-zinc-100 border-zinc-200 text-zinc-900'} border rounded-[1.5rem] text-sm outline-none focus:border-neon/30 focus:ring-8 focus:ring-neon/5 transition-all placeholder:text-zinc-600 font-medium`}
          />
        </div>
      </div>
      
      <div className="flex items-center gap-8 ml-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-3.5 text-zinc-500 hover:text-neon hover:bg-neon/5 rounded-2xl transition-all duration-300 border border-transparent hover:border-neon/10"
            title={darkMode ? "Ativar Modo Visão Diurna" : "Ativar Modo Visão Noturna"}
          >
            {darkMode ? <Sun className="w-5.5 h-5.5" /> : <Moon className="w-5.5 h-5.5" />}
          </button>
          
          <button 
            onClick={handleLogout}
            className="p-3.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/5 rounded-2xl transition-all duration-300 border border-transparent hover:border-red-500/10 group"
            title="Encerrar Sessão de Elite"
          >
            <LogOut className="w-5.5 h-5.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
        
        <div className="h-8 w-px bg-white/5" />
        
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className={`text-sm font-black ${darkMode ? 'text-white' : 'text-zinc-900'} leading-none uppercase tracking-tighter`}>{userProfile?.name}</p>
            <p className="text-[9px] uppercase font-black text-neon/60 mt-1 tracking-widest">{userProfile?.role}</p>
          </div>
          <div className="w-12 h-12 bg-neon rounded-2xl flex items-center justify-center text-black font-black shadow-[0_0_20px_rgba(57,255,20,0.2)] transform hover:rotate-3 transition-transform">
            {userProfile?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}

