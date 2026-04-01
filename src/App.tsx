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
        <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-4">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Activity className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900">Ops! Algo deu errado.</h1>
            <p className="text-zinc-500">Ocorreu um erro inesperado no sistema.</p>
            <div className="bg-white border border-zinc-200 p-4 rounded-xl text-left overflow-auto max-h-60 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-zinc-400 mb-2">Detalhes do Erro</p>
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
                className="w-full px-6 py-3 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-900/20"
              >
                Recarregar Aplicativo
              </button>
              <button 
                onClick={() => (this as any).setState({ hasError: false, error: null })}
                className="w-full px-6 py-3 bg-white text-zinc-900 font-bold rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors"
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
            approved: true
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
    if (!user || !userProfile) {
      setBranches([]);
      setAllUsers([]);
      return;
    }

    const fetchInitialData = async () => {
      try {
        if (userProfile.role === 'master') {
          const branchesQuery = query(collection(db, 'branches'), orderBy('name'));
          const branchesSnap = await getDocs(branchesQuery);
          setBranches(branchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch)));

          const usersQuery = query(collection(db, 'users'), orderBy('name'));
          const usersSnap = await getDocs(usersQuery);
          setAllUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile)));
        } else if (userProfile.branchId) {
          const branchDoc = await getDoc(doc(db, 'branches', userProfile.branchId));
          if (branchDoc.exists()) {
            setBranches([{ id: branchDoc.id, ...branchDoc.data() } as Branch]);
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'initial_data');
      }
    };

    fetchInitialData();

    // Set up subscriptions
    const branchesUnsub = onSnapshot(collection(db, 'branches'), () => fetchInitialData(), (err) => handleFirestoreError(err, OperationType.LIST, 'branches'));
    const usersUnsub = onSnapshot(collection(db, 'users'), () => fetchInitialData(), (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

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
        approved: true
      });
      setNewUserEmail('');
      setNewUserName('');
      setNewUserBranchId('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const handleRequestAccess = async (branchId: string) => {
    if (!user || !branchId) return;
    setRequestError(null);
    const path = `users/${user.uid}`;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid,
        email: user.email?.toLowerCase(),
        name: user.displayName || 'Usuário',
        role: 'user',
        branchId: branchId,
        approved: true
      }, { merge: true });
      fetchUserProfile(user.uid, user.email!, user.displayName || 'Usuário');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
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
          approved: false
        };
        await setDoc(userDocRef, newUserProfile);
        
        alert("Cadastro realizado! Aguarde a aprovação do administrador.");
        setAuthMode('login');
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
      alert("Você não pode excluir seu próprio usuário master!");
      return;
    }
    if (!window.confirm("Tem certeza que deseja excluir este usuário?")) return;
    const path = `users/${userId}`;
    try {
      await deleteDoc(doc(db, 'users', userId));
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

  if (loading) return <div className="min-h-screen bg-zinc-50 flex items-center justify-center"><div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /></div>;

  if (!user) {
    if (showLanding) {
      return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-neon selection:text-black">
          {/* Header */}
          <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-zinc-900">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-neon rounded-xl flex items-center justify-center shadow-lg shadow-neon/40">
                  <Truck className="text-black w-6 h-6" />
                </div>
                <span className="text-xl font-bold tracking-tight text-white">Controle de Frete</span>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => { setShowLanding(false); setAuthMode('login'); }}
                  className="text-sm font-bold text-zinc-500 hover:text-neon transition-colors"
                >
                  Entrar
                </button>
                <button 
                  onClick={() => { setShowLanding(false); setAuthMode('signup'); }}
                  className="px-6 py-2.5 bg-neon text-black text-sm font-bold rounded-xl hover:bg-neon/90 transition-all shadow-lg shadow-neon/20"
                >
                  Criar Conta
                </button>
              </div>
            </div>
          </nav>

          {/* Hero Section */}
          <section className="pt-40 pb-20 px-6">
            <div className="max-w-5xl mx-auto text-center space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-neon/10 text-neon rounded-full text-xs font-bold uppercase tracking-wider border border-neon/20">
                <Activity className="w-4 h-4" />
                Gestão Logística Inteligente
              </div>
              <h1 className="text-6xl md:text-8xl font-black font-display tracking-tighter leading-[0.85] text-white">
                A solução definitiva para seu <span className="text-neon">controle de frete.</span>
              </h1>
              <p className="text-xl text-zinc-500 max-w-2xl mx-auto leading-relaxed font-sans">
                Gerencie múltiplas filiais, acompanhe carregamentos em tempo real e tenha controle financeiro total em uma única plataforma intuitiva.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <button 
                  onClick={() => { setShowLanding(false); setAuthMode('signup'); }}
                  className="w-full sm:w-auto px-10 py-5 bg-neon text-black font-bold rounded-2xl hover:bg-neon/90 transition-all shadow-2xl shadow-neon/40 flex items-center justify-center gap-3 group"
                >
                  Começar Agora Gratuitamente
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button 
                  onClick={() => { setShowLanding(false); setAuthMode('login'); }}
                  className="w-full sm:w-auto px-10 py-5 bg-zinc-900 text-white font-bold rounded-2xl border border-zinc-800 hover:bg-zinc-800 transition-all"
                >
                  Ver Demonstração
                </button>
              </div>
              
              {/* Mock Dashboard Preview - Inspired by the provided image */}
              <div className="pt-16">
                <div className="relative mx-auto max-w-5xl bg-[#1a1a1a] rounded-[2rem] p-6 shadow-2xl shadow-neon/10 overflow-hidden border border-zinc-800/50">
                  <div className="bg-[#121212] rounded-2xl aspect-video flex items-center justify-center relative overflow-hidden border border-zinc-800/30">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neon via-transparent to-transparent"></div>
                    
                    <div className="grid grid-cols-12 gap-4 p-8 w-full h-full">
                      {/* Left Sidebar Mock */}
                      <div className="col-span-8 bg-[#1a1a1a]/50 rounded-2xl border border-zinc-800/50 p-8 space-y-6">
                        <div className="h-4 w-1/3 bg-zinc-800 rounded-full"></div>
                        <div className="space-y-3">
                          <div className="h-2 w-full bg-zinc-800/50 rounded-full"></div>
                          <div className="h-2 w-full bg-zinc-800/50 rounded-full"></div>
                          <div className="h-2 w-2/3 bg-zinc-800/50 rounded-full"></div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 pt-8">
                          <div className="h-24 bg-zinc-800/30 rounded-xl border border-zinc-800/20"></div>
                          <div className="h-24 bg-zinc-800/30 rounded-xl border border-zinc-800/20"></div>
                          <div className="h-24 bg-zinc-800/30 rounded-xl border border-zinc-800/20"></div>
                        </div>
                      </div>
                      
                      {/* Right Sidebar Mock */}
                      <div className="col-span-4 space-y-4">
                        <div className="h-40 bg-[#1a1a1a]/50 rounded-2xl border border-zinc-800/50 p-6 flex flex-col items-center justify-center relative overflow-hidden">
                          <div className="h-3 w-1/2 bg-zinc-800 rounded-full mb-6"></div>
                          {/* Neon Circle from image */}
                          <div className="relative">
                            <div className="absolute inset-0 bg-neon/20 blur-xl rounded-full"></div>
                            <div className="w-20 h-20 bg-neon/10 rounded-full border-4 border-neon/30 flex items-center justify-center relative z-10">
                              <div className="w-10 h-10 bg-neon rounded-full shadow-[0_0_20px_rgba(0,255,0,0.6)]"></div>
                            </div>
                          </div>
                        </div>
                        <div className="h-40 bg-[#1a1a1a]/50 rounded-2xl border border-zinc-800/50 p-6">
                          <div className="h-3 w-1/2 bg-zinc-800 rounded-full mb-6"></div>
                          <div className="space-y-3">
                            <div className="h-2 w-full bg-zinc-800/50 rounded-full"></div>
                            <div className="h-2 w-full bg-zinc-800/50 rounded-full"></div>
                            <div className="h-2 w-3/4 bg-zinc-800/50 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Benefits Section */}
          <section className="py-32 bg-zinc-950 px-6 relative overflow-hidden">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-neon/5 blur-[120px] rounded-full" />
            <div className="max-w-7xl mx-auto space-y-20 relative z-10">
              <div className="text-center space-y-4">
                <h2 className="text-4xl md:text-5xl font-black font-display tracking-tight text-white">Por que escolher o <span className="text-neon">Controle de Frete?</span></h2>
                <p className="text-zinc-500 max-w-2xl mx-auto text-lg">Desenvolvido para simplificar a complexidade da logística moderna com tecnologia de ponta.</p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  { icon: <Users className="w-6 h-6" />, title: "Multi-Filial", desc: "Gerencie diversas unidades da sua empresa em um único painel centralizado." },
                  { icon: <TrendingUp className="w-6 h-6" />, title: "Financeiro", desc: "Controle total de faturamento, pagamentos a motoristas e lucro líquido." },
                  { icon: <Activity className="w-6 h-6" />, title: "Tempo Real", desc: "Acompanhe o status de cada frete e carregamento instantaneamente." },
                  { icon: <FileText className="w-6 h-6" />, title: "Relatórios", desc: "Exporte relatórios detalhados em PDF para análise e prestação de contas." }
                ].map((benefit, i) => (
                  <div key={i} className="bg-black/40 backdrop-blur-sm p-10 rounded-[2.5rem] border border-zinc-900 shadow-sm hover:border-neon/30 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-neon/5 blur-2xl rounded-full -mr-12 -mt-12 group-hover:bg-neon/10 transition-colors" />
                    <div className="w-14 h-14 bg-zinc-900 text-neon rounded-2xl flex items-center justify-center mb-8 group-hover:bg-neon group-hover:text-black transition-all duration-500 transform group-hover:rotate-6">
                      {benefit.icon}
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3 font-display">{benefit.title}</h3>
                    <p className="text-zinc-500 text-sm leading-relaxed font-sans">{benefit.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-24 px-6 bg-black">
            <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <h2 className="text-5xl font-black tracking-tight leading-none text-white">Tudo o que você precisa para <span className="text-neon">escalar sua operação.</span></h2>
                <div className="space-y-6">
                  {[
                    "Cadastro simplificado de fretes e carregamentos",
                    "Gestão de motoristas e frotas por filial",
                    "Cálculo automático de valores e margens",
                    "Sistema de aprovação de novos usuários",
                    "Painel administrativo master para controle total",
                    "Interface moderna e responsiva (Mobile & Desktop)"
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-6 h-6 bg-neon/10 text-neon rounded-full flex items-center justify-center flex-shrink-0 border border-neon/20">
                        <Check className="w-4 h-4" />
                      </div>
                      <span className="text-zinc-400 font-medium">{feature}</span>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => { setShowLanding(false); setAuthMode('signup'); }}
                  className="px-8 py-4 bg-neon text-black font-bold rounded-2xl hover:bg-neon/90 transition-all shadow-lg shadow-neon/20"
                >
                  Experimentar Agora
                </button>
              </div>
              <div className="relative">
                <div className="aspect-square bg-zinc-900 rounded-[4rem] overflow-hidden relative border border-zinc-800">
                  <img 
                    src="https://picsum.photos/seed/logistics-dark/800/800" 
                    alt="Logística" 
                    className="w-full h-full object-cover opacity-40 grayscale"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-neon/20 to-transparent"></div>
                  <div className="absolute bottom-8 left-8 right-8 bg-zinc-900/90 backdrop-blur p-8 rounded-3xl border border-zinc-800 shadow-2xl">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-neon rounded-2xl flex items-center justify-center text-black shadow-lg shadow-neon/30">
                        <TrendingUp className="w-7 h-7" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Crescimento Mensal</p>
                        <p className="text-3xl font-black text-white">+42.5%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-24 px-6 bg-black">
            <div className="max-w-5xl mx-auto bg-zinc-900 rounded-[3rem] p-12 md:p-20 text-center space-y-8 relative overflow-hidden border border-zinc-800">
              <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-neon via-transparent to-transparent"></div>
              <h2 className="text-4xl md:text-5xl font-black text-white leading-tight relative z-10">
                Pronto para transformar sua logística?
              </h2>
              <p className="text-zinc-400 text-lg max-w-xl mx-auto relative z-10">
                Junte-se a centenas de empresas que já otimizaram seus processos com o Controle de Frete.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
                <button 
                  onClick={() => { setShowLanding(false); setAuthMode('signup'); }}
                  className="w-full sm:w-auto px-10 py-5 bg-neon text-black font-bold rounded-2xl hover:bg-neon/90 transition-all shadow-xl shadow-neon/30"
                >
                  Criar Minha Conta Grátis
                </button>
                <button 
                  onClick={() => { setShowLanding(false); setAuthMode('login'); }}
                  className="w-full sm:w-auto px-10 py-5 bg-zinc-800 text-white font-bold rounded-2xl hover:bg-zinc-700 transition-all"
                >
                  Falar com Consultor
                </button>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="py-12 border-t border-zinc-900 px-6 bg-black">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-neon rounded-lg flex items-center justify-center">
                  <Truck className="text-black w-5 h-5" />
                </div>
                <span className="font-bold text-white">Controle de Frete</span>
              </div>
              <p className="text-zinc-600 text-sm">© 2026 Controle de Frete. Todos os direitos reservados.</p>
              <div className="flex items-center gap-6">
                <a href="#" className="text-sm font-bold text-zinc-500 hover:text-neon transition-colors">Termos</a>
                <a href="#" className="text-sm font-bold text-zinc-500 hover:text-neon transition-colors">Privacidade</a>
                <a href="#" className="text-sm font-bold text-zinc-500 hover:text-neon transition-colors">Suporte</a>
              </div>
            </div>
          </footer>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 selection:bg-neon selection:text-black font-sans">
        <div className="max-w-md w-full bg-zinc-950 rounded-[3rem] shadow-2xl p-12 space-y-10 border border-zinc-900 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-neon shadow-[0_0_15px_rgba(0,255,0,0.5)]"></div>
          
          <button 
            onClick={() => setShowLanding(true)}
            className="absolute top-10 left-10 text-zinc-600 hover:text-neon transition-colors p-2 bg-zinc-900 rounded-xl"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
          </button>

          <div className="text-center space-y-3">
            <div className="w-20 h-20 bg-neon rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-neon/40 transform rotate-3">
              <Truck className="text-black w-10 h-10" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Controle de Frete</h1>
            <p className="text-zinc-500 font-medium">{authMode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta neon'}</p>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-5">
            {authMode === 'signup' && (
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-zinc-600 tracking-[0.2em] ml-1">Nome Completo</label>
                <input 
                  type="text"
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-neon focus:ring-4 focus:ring-neon/10 transition-all"
                  placeholder="Seu nome"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-zinc-600 tracking-[0.2em] ml-1">E-mail Corporativo</label>
              <input 
                type="email"
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-neon focus:ring-4 focus:ring-neon/10 transition-all"
                placeholder="seu@email.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-zinc-600 tracking-[0.2em] ml-1">Senha Segura</label>
              <input 
                type="password"
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-neon focus:ring-4 focus:ring-neon/10 transition-all"
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="w-full py-5 bg-neon text-black font-black uppercase tracking-widest rounded-2xl hover:bg-neon/90 transition-all shadow-xl shadow-neon/20 active:scale-[0.98]"
            >
              {authMode === 'login' ? 'Entrar no Sistema' : 'Finalizar Cadastro'}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-900"></span>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
              <span className="bg-zinc-950 px-4 text-zinc-600">Acesso Rápido</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleLogin}
              className="py-4 bg-zinc-900 border border-zinc-800 text-white font-bold rounded-2xl hover:border-neon/50 transition-all flex items-center justify-center gap-3 group"
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5 grayscale group-hover:grayscale-0 transition-all" alt="Google" />
              Google
            </button>
            <button
              onClick={handleGithubLogin}
              className="py-4 bg-zinc-900 border border-zinc-800 text-white font-bold rounded-2xl hover:border-neon/50 transition-all flex items-center justify-center gap-3 group"
            >
              <Users className="w-5 h-5 text-zinc-500 group-hover:text-neon transition-all" />
              GitHub
            </button>
          </div>

          <div className="text-center">
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              className="text-xs font-black uppercase tracking-widest text-zinc-600 hover:text-neon transition-colors"
            >
              {authMode === 'login' ? 'Solicitar Acesso' : 'Já possuo conta'}
            </button>
          </div>

          {loginError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold text-center">
              {loginError}
            </div>
          )}
          
          <div className="text-center pt-4">
            <p className="text-[10px] text-zinc-700 uppercase tracking-[0.3em] font-black">Logística de Alta Performance</p>
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
    { value: totalPlannedWeight, name: 'Planejado', fill: '#1a1a1a', sub: `${dashboardFreights.length} Fretes` },
    { value: totalWeight, name: 'Carregado', fill: '#00FF00', sub: `${dashboardLoadings.length} Viagens (${driversCarregando} Motoristas)` },
    { value: totalUnloadedWeight, name: 'Descarregado', fill: '#008800', sub: `${totalCompleted} Finalizadas (${driversDescarregado} Motoristas)` },
  ];

  const driverFunnelData = driverStats.slice(0, 5).map((d, idx) => ({
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
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-900 flex flex-col transition-all duration-500 relative z-40 md:sticky md:top-0 md:h-screen overflow-y-auto">
        <div className="p-8 flex flex-col items-center">
          <div className="w-12 h-12 bg-zinc-900 dark:bg-white rounded-xl flex items-center justify-center shadow-lg">
            <Truck className="w-6 h-6 text-white dark:text-zinc-900" />
          </div>
          <div className="mt-4 text-center">
            <h1 className="text-zinc-900 dark:text-white font-bold text-lg tracking-tight">
              Logística<span className="text-brand-500">Pro</span>
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 mt-1">
              Freight Control
            </p>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 mt-2">
          <SidebarItem 
            active={activeTab === 'dashboard'} 
            icon={LayoutDashboard} 
            label="Dashboard" 
            onClick={() => setActiveTab('dashboard')}
          />
          <SidebarItem 
            active={activeTab === 'faturamento'} 
            icon={DollarSign} 
            label="Faturamento" 
            onClick={() => setActiveTab('faturamento')}
          />
          <SidebarItem 
            active={activeTab === 'freights'} 
            icon={ClipboardList} 
            label="Fretes" 
            onClick={() => setActiveTab('freights')}
          />
          <SidebarItem 
            active={activeTab === 'loadings'} 
            icon={Truck} 
            label="Motoristas" 
            onClick={() => setActiveTab('loadings')}
          />
          <SidebarItem 
            active={activeTab === 'employees'} 
            icon={Users} 
            label="Funcionários" 
            onClick={() => setActiveTab('employees')}
          />
          <SidebarItem 
            active={activeTab === 'reports'} 
            icon={FileText} 
            label="Relatórios" 
            onClick={() => setActiveTab('reports')}
          />
          {(userProfile?.role === 'admin' || userProfile?.role === 'master') && (
            <SidebarItem 
              active={activeTab === 'management'} 
              icon={Activity} 
              label="Gerenciamento" 
              onClick={() => setActiveTab('management')}
            />
          )}
        </nav>

        <div className="p-4 mt-auto">
          <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-zinc-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{userProfile?.name}</p>
                <p className="text-[10px] text-zinc-400 uppercase font-bold">{userProfile?.role}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-zinc-50 dark:bg-zinc-950">
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
            <div className="mb-8 flex flex-wrap items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center gap-2 text-zinc-500">
                <Filter className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Filial Ativa:</span>
              </div>
              <select 
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-zinc-900/5 outline-none transition-all"
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
                        <span className="text-[10px] font-bold text-neon uppercase tracking-widest">Ativa</span>
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
                  className="flex items-center gap-3 p-4 glass-card rounded-2xl hover:border-brand-500/50 transition-all group"
                >
                  <div className="w-10 h-10 bg-brand-50 dark:bg-brand-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">Novo Frete</p>
                    <p className="text-[10px] text-zinc-400 font-medium">Cadastrar carga</p>
                  </div>
                </button>
                <button 
                  onClick={() => setActiveTab('loadings')}
                  className="flex items-center gap-3 p-4 glass-card rounded-2xl hover:border-brand-500/50 transition-all group"
                >
                  <div className="w-10 h-10 bg-brand-50 dark:bg-brand-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Truck className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">Carregamento</p>
                    <p className="text-[10px] text-zinc-400 font-medium">Vincular motorista</p>
                  </div>
                </button>
                <button 
                  onClick={() => setActiveTab('reports')}
                  className="flex items-center gap-3 p-4 glass-card rounded-2xl hover:border-brand-500/50 transition-all group"
                >
                  <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">Relatórios</p>
                    <p className="text-[10px] text-zinc-400 font-medium">Exportar dados</p>
                  </div>
                </button>
                <button 
                  onClick={() => setActiveTab('faturamento')}
                  className="flex items-center gap-3 p-4 glass-card rounded-2xl hover:border-brand-500/50 transition-all group"
                >
                  <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <DollarSign className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">Faturamento</p>
                    <p className="text-[10px] text-zinc-400 font-medium">Financeiro</p>
                  </div>
                </button>
              </div>

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
                    className={`text-xs ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-600'} border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-neon/50`}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={`text-[9px] uppercase font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} ml-1`}>Data Fim</label>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <SummaryCard 
                  label="Peso Total" 
                  value={`${totalWeight.toLocaleString()} kg`} 
                  icon={Weight}
                  trend="+12%"
                  color="zinc"
                />
                <SummaryCard 
                  label="Fretes Abertos" 
                  value={openFreights.toString()} 
                  icon={ClipboardList}
                  color="brand"
                />
                <SummaryCard 
                  label="Manifestos Pendentes" 
                  value={pendingManifesto.toString()} 
                  icon={FileText}
                  color="red"
                />
                <SummaryCard 
                  label="Viagens Finalizadas" 
                  value={totalCompleted.toString()} 
                  icon={CheckCircle2}
                  color="green"
                />
              </div>

              {/* Financial Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SummaryCard 
                  label="Receita Bruta" 
                  value={`R$ ${dashboardTotalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                  icon={TrendingUp}
                  color="green"
                  className="!p-8"
                />
                <SummaryCard 
                  label="Pago Motoristas" 
                  value={`R$ ${dashboardTotalDriverPayout.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                  icon={TrendingUp}
                  color="red"
                  className="!p-8"
                />
                <SummaryCard 
                  label="Lucro Líquido" 
                  value={`R$ ${dashboardNetProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                  icon={DollarSign}
                  color="brand"
                  trend={`${dashboardProfitMargin.toFixed(1)}%`}
                  className="!p-8"
                />
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="glass-card p-8 rounded-3xl">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <Activity className="w-5 h-5 text-brand-500" /> Fluxo de Operação
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
                      <BarChart2 className="w-5 h-5 text-brand-500" /> Volume por Motorista
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
                    <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Peso Total (kg)</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={freightTotalWeight}
                      onChange={(e) => setFreightTotalWeight(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Valor Empresa (ton)</label>
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
                      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/20 w-64"
                    />
                  </div>
                  <select 
                    value={freightFilterStatus}
                    onChange={(e) => setFreightFilterStatus(e.target.value as any)}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/20"
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
    green: "text-green-600 dark:text-green-400 bg-green-500/10 glow-green",
    red: "text-red-600 dark:text-red-400 bg-red-500/10 glow-red",
    blue: "text-blue-600 dark:text-blue-400 bg-blue-500/10 glow-blue",
    zinc: "text-zinc-600 dark:text-zinc-400 bg-zinc-500/10 glow-zinc",
    brand: "text-brand-600 dark:text-brand-400 bg-brand-500/10 glow-green",
  };

  const iconColorMap = {
    green: "text-green-500",
    red: "text-red-500",
    blue: "text-blue-500",
    zinc: "text-zinc-500",
    brand: "text-brand-500",
  };

  return (
    <div className={`glass-card p-6 rounded-3xl flex flex-col gap-4 transition-all hover:translate-y-[-2px] ${className}`}>
      <div className="flex items-center justify-between">
        {Icon && (
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorMap[color]}`}>
            <Icon className={`w-6 h-6 ${iconColorMap[color]}`} />
          </div>
        )}
        {trend && (
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${trend.startsWith('+') ? 'bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400'}`}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.1em]">{label}</p>
        <p className="text-2xl font-bold mt-1 tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const getStyles = () => {
    switch (status) {
      case 'Aberto': return 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400';
      case 'Finalizado': return 'bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400';
      case 'Cancelado': return 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400';
      case 'Manifesto': return 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400';
      case 'Descarregado': return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400';
      default: return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-500/10 dark:text-zinc-400';
    }
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStyles()}`}>
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
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
        active 
          ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-900/10 dark:bg-white dark:text-zinc-900 dark:shadow-white/5' 
          : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900'
      }`}
    >
      <Icon className={`w-5 h-5 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
      <span className="font-medium text-sm tracking-tight">{label}</span>
      {active && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
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
    <header className="sticky top-0 z-30 flex items-center justify-between px-8 py-4 glass-card border-b-0 rounded-none">
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative w-full group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" />
          <input 
            type="text" 
            placeholder="Pesquisar fretes, motoristas, placas..." 
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-100 dark:bg-zinc-900 border-none rounded-xl text-sm focus:ring-2 focus:ring-zinc-900/5 dark:focus:ring-white/5 outline-none transition-all"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4 ml-8">
        <button 
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-colors"
          title={darkMode ? "Modo Claro" : "Modo Escuro"}
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        
        <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800 mx-2" />
        
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-zinc-900 dark:text-white leading-none">{userProfile?.name}</p>
            <p className="text-[10px] uppercase font-bold text-zinc-400 mt-1 tracking-wider">{userProfile?.role}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
            title="Sair do Sistema"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

