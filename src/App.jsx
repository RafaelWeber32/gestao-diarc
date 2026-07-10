import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Settings, 
  PlusCircle, 
  Calendar, 
  AlertCircle, 
  CheckCircle,
  Briefcase,
  Layers,
  Activity,
  Trash2,
  Filter,
  Edit
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, updateDoc, deleteDoc, onSnapshot, collection } from 'firebase/firestore';

// ==========================================
// CONFIGURAÇÃO DO FIREBASE
// O código agora entende automaticamente se está no ambiente 
// de testes ou no seu computador/Vercel.
// ==========================================
let firebaseConfig = {};
if (typeof __firebase_config !== 'undefined') {
  firebaseConfig = JSON.parse(__firebase_config);
} else {
  // SE VOCÊ ESTÁ NO VS CODE, COLE SEU CÓDIGO DENTRO DESTA CHAVE ABAIXO:
  firebaseConfig = {
    // COLE AQUI
    apiKey: "AIzaSyDx5TvI_LoSv-2PCe_Fzpyc_HfktNMROjo",
  authDomain: "gerenciamento-operacional.firebaseapp.com",
  projectId: "gerenciamento-operacional",
  storageBucket: "gerenciamento-operacional.firebasestorage.app",
  messagingSenderId: "209364835579",
  appId: "1:209364835579:web:c8cd83406e324d5925645e",
  measurementId: "G-S6F5XPSQSD"
  };
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseApp = Object.keys(firebaseConfig).length > 0 ? initializeApp(firebaseConfig) : null;
const auth = firebaseApp ? getAuth(firebaseApp) : null;
const db = firebaseApp ? getFirestore(firebaseApp) : null;

const App = () => {
  // --- FIREBASE STATE ---
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null); // Novo estado para capturar o erro

  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [obras, setObras] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [statusList, setStatusList] = useState([]);
  const [demandas, setDemandas] = useState([]);

  // --- FORMS STATE ---
  const [editingDemandaId, setEditingDemandaId] = useState(null);
  const [editingObraId, setEditingObraId] = useState(null);
  const [newDemanda, setNewDemanda] = useState({ title: '', obraId: '', disciplinaId: '', statusId: '', dueDate: '', notes: '' });
  const [newObra, setNewObra] = useState({ name: '', scope: '', status: 'Em Andamento' });
  const [newDisciplina, setNewDisciplina] = useState('');
  const [newStatus, setNewStatus] = useState({ name: '', color: 'bg-slate-200 text-slate-800' });
  const [filterObra, setFilterObra] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // --- FIREBASE EFFECTS ---
  useEffect(() => {
    if (!auth) {
      setAuthError("Chaves do Firebase não configuradas.");
      return;
    }
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
        setAuthError(error.message); // Salva o erro para mostrar na tela
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setAuthError(null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const userId = user.uid;
    const getCol = (name) => collection(db, 'artifacts', appId, 'users', userId, name);

    const unsubObras = onSnapshot(getCol('obras'), (snap) => setObras(snap.docs.map(d => d.data())), console.error);
    
    const unsubDisciplinas = onSnapshot(getCol('disciplinas'), (snap) => {
      if (snap.empty) {
        const defaults = [
          { id: '1', name: 'Hidráulica' }, { id: '2', name: 'Elétrica' },
          { id: '3', name: 'Logística/Frete' }, { id: '4', name: 'Montagem' },
          { id: '5', name: 'Projetos/BIM' }
        ];
        defaults.forEach(d => setDoc(doc(db, 'artifacts', appId, 'users', userId, 'disciplinas', d.id), d));
      } else {
        setDisciplinas(snap.docs.map(d => d.data()));
      }
    }, console.error);

    const unsubStatus = onSnapshot(getCol('statusList'), (snap) => {
      if (snap.empty) {
        const defaults = [
          { id: '1', name: 'Não Iniciado', color: 'bg-slate-200 text-slate-800' },
          { id: '2', name: 'Em Cotação', color: 'bg-blue-100 text-blue-800' },
          { id: '3', name: 'Em Andamento', color: 'bg-amber-100 text-amber-800' },
          { id: '4', name: 'Aguardando Aprovação', color: 'bg-purple-100 text-purple-800' },
          { id: '5', name: 'Concluído', color: 'bg-emerald-100 text-emerald-800' },
        ];
        defaults.forEach(d => setDoc(doc(db, 'artifacts', appId, 'users', userId, 'statusList', d.id), d));
      } else {
        setStatusList(snap.docs.map(d => d.data()));
      }
    }, console.error);

    const unsubDemandas = onSnapshot(getCol('demandas'), (snap) => setDemandas(snap.docs.map(d => d.data())), console.error);

    return () => { unsubObras(); unsubDisciplinas(); unsubStatus(); unsubDemandas(); };
  }, [user]);

  // --- HANDLERS ---
  const handleAddDemanda = async (e) => {
    e.preventDefault();
    if (!newDemanda.title || !newDemanda.obraId) return;
    if (!user) {
      alert("Aguarde a conexão com o banco de dados antes de salvar.");
      return;
    }
    
    try {
      if (editingDemandaId) {
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'demandas', editingDemandaId.toString());
        await updateDoc(docRef, newDemanda);
        setEditingDemandaId(null);
      } else {
        const newId = Date.now().toString();
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'demandas', newId);
        await setDoc(docRef, { ...newDemanda, id: newId });
      }
      
      setNewDemanda({ title: '', obraId: '', disciplinaId: '', statusId: '', dueDate: '', notes: '' });
      setActiveTab('demandas');
    } catch (error) {
      console.error("Erro ao salvar demanda", error);
      alert("Erro ao salvar: " + error.message);
    }
  };

  const handleEditClick = (demanda) => {
    setNewDemanda({
      title: demanda.title || '',
      obraId: demanda.obraId || '',
      disciplinaId: demanda.disciplinaId || '',
      statusId: demanda.statusId || '',
      dueDate: demanda.dueDate || '',
      notes: demanda.notes || ''
    });
    setEditingDemandaId(demanda.id);
    setActiveTab('nova_demanda');
  };

  const handleCancelForm = () => {
    setNewDemanda({ title: '', obraId: '', disciplinaId: '', statusId: '', dueDate: '', notes: '' });
    setEditingDemandaId(null);
    setActiveTab('demandas');
  };

  const handleDeleteDemanda = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'demandas', id.toString()));
    } catch (error) {
      console.error("Erro ao deletar", error);
    }
  };

  const handleAddObra = async (e) => {
    e.preventDefault();
    if (!newObra.name) return;
    if (!user) {
      alert("Aguarde a conexão com o banco de dados antes de salvar.");
      return;
    }
    try {
      if (editingObraId) {
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'obras', editingObraId.toString());
        await updateDoc(docRef, newObra);
        setEditingObraId(null);
      } else {
        const newId = Date.now().toString();
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'obras', newId), { ...newObra, id: newId });
      }
      setNewObra({ name: '', scope: '', status: 'Em Andamento' });
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditObraClick = (obra) => {
    setNewObra({
      name: obra.name || '',
      scope: obra.scope || '',
      status: obra.status || 'Em Andamento'
    });
    setEditingObraId(obra.id);
  };

  const handleCancelEditObra = () => {
    setNewObra({ name: '', scope: '', status: 'Em Andamento' });
    setEditingObraId(null);
  };

  const handleAddDisciplina = async (e) => {
    e.preventDefault();
    if (!newDisciplina) return;
    if (!user) {
      alert("Aguarde a conexão com o banco de dados antes de salvar.");
      return;
    }
    try {
      const newId = Date.now().toString();
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'disciplinas', newId), { id: newId, name: newDisciplina });
      setNewDisciplina('');
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddStatus = async (e) => {
    e.preventDefault();
    if (!newStatus.name) return;
    if (!user) {
      alert("Aguarde a conexão com o banco de dados antes de salvar.");
      return;
    }
    try {
      const newId = Date.now().toString();
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'statusList', newId), { ...newStatus, id: newId });
      setNewStatus({ name: '', color: 'bg-slate-200 text-slate-800' });
    } catch (error) {
      console.error(error);
    }
  };

  // --- DERIVED DATA ---
  const demandasOrdenadas = useMemo(() => {
    return [...demandas].sort((a, b) => {
      const dateA = a.dueDate ? new Date(a.dueDate) : new Date('2100-01-01');
      const dateB = b.dueDate ? new Date(b.dueDate) : new Date('2100-01-01');
      return dateA - dateB;
    });
  }, [demandas]);

  const demandasFiltradas = useMemo(() => {
    return demandasOrdenadas.filter(d => {
      const matchObra = filterObra ? String(d.obraId) === String(filterObra) : true;
      const matchStatus = filterStatus ? String(d.statusId) === String(filterStatus) : true;
      return matchObra && matchStatus;
    });
  }, [demandasOrdenadas, filterObra, filterStatus]);

  const getObraName = (id) => obras.find(o => String(o.id) === String(id))?.name || 'Não definida';
  const getDisciplinaName = (id) => disciplinas.find(d => String(d.id) === String(id))?.name || 'Não definida';
  const getStatus = (id) => statusList.find(s => String(s.id) === String(id)) || statusList[0] || { name: 'Desconhecido', color: 'bg-slate-200 text-slate-800' };

  const getObraStatusStyle = (status) => {
    switch(status) {
      case 'Planejamento': return 'bg-purple-100 text-purple-800';
      case 'Em Andamento': return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'Paralisada': return 'bg-red-100 text-red-700';
      case 'Concluída': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  // --- DASHBOARD CALCULATIONS ---
  const pendentes = demandas.filter(d => getStatus(d.statusId).name !== 'Concluído');
  const concluidas = demandas.filter(d => getStatus(d.statusId).name === 'Concluído');
  const lembretes = [...pendentes]
    .filter(d => d.dueDate)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5); 

  const obrasComDemandas = obras.map(obra => {
    return {
      ...obra,
      demandasPendentes: pendentes.filter(d => String(d.obraId) === String(obra.id)).sort((a,b) => {
        const dateA = a.dueDate ? new Date(a.dueDate) : new Date('2100-01-01');
        const dateB = b.dueDate ? new Date(b.dueDate) : new Date('2100-01-01');
        return dateA - dateB;
      })
    };
  });

  // ==========================================
  // MAIN RENDER
  // ==========================================
  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex-col shadow-xl hidden md:flex">
        <div className="p-6">
          <h1 className="text-white text-xl font-bold tracking-wider">DIARC <span className="text-blue-500">Gestão</span></h1>
          <p className="text-xs text-slate-400 mt-1">Coordenação Operacional</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <LayoutDashboard size={20} /> Início
          </button>
          <button 
            onClick={() => setActiveTab('demandas')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'demandas' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <ClipboardList size={20} /> Demandas
          </button>
          <button 
            onClick={() => {
              setNewDemanda({ title: '', obraId: '', disciplinaId: '', statusId: '', dueDate: '', notes: '' });
              setEditingDemandaId(null);
              setActiveTab('nova_demanda');
            }} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'nova_demanda' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <PlusCircle size={20} /> Lançar Demanda
          </button>
        </nav>

        <div className="p-4">
          <button 
            onClick={() => setActiveTab('cadastros')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'cadastros' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <Settings size={20} /> Cadastros
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 flex items-center justify-between px-4 z-50">
        <h1 className="text-white font-bold">DIARC Gestão</h1>
        <div className="flex gap-4">
          <button onClick={() => setActiveTab('dashboard')} className={`text-slate-300 ${activeTab === 'dashboard' ? 'text-blue-400' : ''}`}><LayoutDashboard size={24} /></button>
          <button onClick={() => setActiveTab('demandas')} className={`text-slate-300 ${activeTab === 'demandas' ? 'text-blue-400' : ''}`}><ClipboardList size={24} /></button>
          <button onClick={() => {
              setNewDemanda({ title: '', obraId: '', disciplinaId: '', statusId: '', dueDate: '', notes: '' });
              setEditingDemandaId(null);
              setActiveTab('nova_demanda');
          }} className={`text-slate-300 ${activeTab === 'nova_demanda' ? 'text-blue-400' : ''}`}><PlusCircle size={24} /></button>
          <button onClick={() => setActiveTab('cadastros')} className={`text-slate-300 ${activeTab === 'cadastros' ? 'text-blue-400' : ''}`}><Settings size={24} /></button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 pt-20 md:pt-10">
        <div className="max-w-6xl mx-auto">
          
          {/* AVISOS DE CONEXÃO E ERRO */}
          {authError && (
            <div className="mb-4 p-4 bg-red-50 text-red-800 rounded-lg border border-red-200 font-medium shadow-sm flex items-start gap-3">
              <AlertCircle className="mt-0.5 shrink-0" size={20} />
              <div>
                <p>Falha na conexão com o Banco de Dados!</p>
                <p className="text-sm font-normal mt-1 opacity-90">Erro técnico: {authError}</p>
                <p className="text-sm font-normal mt-1">Verifique se você ativou o <strong>Login Anônimo</strong> no painel Authentication do Firebase.</p>
              </div>
            </div>
          )}

          {!user && !authError && (
            <div className="mb-4 p-4 bg-blue-50 text-blue-800 rounded-lg border border-blue-200">
              Conectando à nuvem para salvar seus dados...
            </div>
          )}

          {/* ======================================= */}
          {/* TELA 1: DASHBOARD */}
          {/* ======================================= */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-bold text-slate-800">Visão Geral</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><ClipboardList size={24} /></div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Total de Demandas</p>
                    <p className="text-2xl font-bold text-slate-800">{demandas.length}</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
                  <div className="p-3 bg-amber-100 text-amber-600 rounded-lg"><Activity size={24} /></div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Pendentes / Em Andamento</p>
                    <p className="text-2xl font-bold text-slate-800">{pendentes.length}</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg"><CheckCircle size={24} /></div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Concluídas</p>
                    <p className="text-2xl font-bold text-slate-800">{concluidas.length}</p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Briefcase className="text-blue-600" size={24} />
                    Painel de Obras e Demandas
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {obrasComDemandas.map(obra => (
                    <div key={obra.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                      <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-lg text-slate-800">{obra.name}</h4>
                          {obra.scope && <p className="text-xs text-slate-500 mt-1">Escopo: {obra.scope}</p>}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getObraStatusStyle(obra.status || 'Não Definido')}`}>
                          {obra.status || 'Não Definido'}
                        </span>
                      </div>
                      
                      <div className="p-4 flex-1">
                        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Demandas Pendentes ({obra.demandasPendentes.length})</h5>
                        <div className="space-y-3">
                          {obra.demandasPendentes.length === 0 ? (
                            <p className="text-sm text-slate-400 italic">Nenhuma demanda pendente.</p>
                          ) : (
                            obra.demandasPendentes.map(demanda => {
                              const isOverdue = demanda.dueDate && new Date(demanda.dueDate + 'T00:00:00') < new Date(new Date().setHours(0,0,0,0));
                              return (
                                <div key={demanda.id} className="flex justify-between items-start p-3 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors">
                                  <div>
                                    <p className="text-sm font-medium text-slate-800">{demanda.title}</p>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      <span className="text-[10px] uppercase font-bold text-slate-500">{getDisciplinaName(demanda.disciplinaId)}</span>
                                      <span className="text-slate-300">•</span>
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getStatus(demanda.statusId).color}`}>
                                        {getStatus(demanda.statusId).name}
                                      </span>
                                    </div>
                                  </div>
                                  {demanda.dueDate && (
                                    <div className={`flex items-center gap-1 text-xs font-semibold shrink-0 ml-2 ${isOverdue ? 'text-red-500' : 'text-slate-500'}`}>
                                      {isOverdue && <AlertCircle size={12} />}
                                      {new Date(demanda.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                                    </div>
                                  )}
                                </div>
                              )
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
                    <Calendar className="text-blue-500" size={18} />
                    Próximos Prazos Gerais
                  </h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {lembretes.length === 0 ? (
                    <p className="p-4 text-sm text-center text-slate-500">Nenhum prazo cadastrado.</p>
                  ) : (
                    lembretes.map(demanda => {
                      const isOverdue = new Date(demanda.dueDate + 'T00:00:00') < new Date(new Date().setHours(0,0,0,0));
                      return (
                        <div key={demanda.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 transition-colors gap-2">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-800">{demanda.title}</h4>
                            <p className="text-xs text-slate-500">{getObraName(demanda.obraId)}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium w-fit ${getStatus(demanda.statusId).color}`}>
                              {getStatus(demanda.statusId).name}
                            </span>
                            <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-600'}`}>
                              {isOverdue && <AlertCircle size={12} />}
                              {new Date(demanda.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* TELA 2: LISTA DE DEMANDAS */}
          {/* ======================================= */}
          {activeTab === 'demandas' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-800">Lista de Demandas</h2>
                <button 
                  onClick={() => {
                    setNewDemanda({ title: '', obraId: '', disciplinaId: '', statusId: '', dueDate: '', notes: '' });
                    setEditingDemandaId(null);
                    setActiveTab('nova_demanda');
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm w-full sm:w-auto"
                >
                  <PlusCircle size={18} /> Nova Demanda
                </button>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 text-slate-600 w-full sm:w-auto">
                  <Filter size={18} /> <span className="font-medium text-sm">Filtros:</span>
                </div>
                <select 
                  className="flex-1 min-w-[150px] border border-slate-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={filterObra}
                  onChange={(e) => setFilterObra(e.target.value)}
                >
                  <option value="">Todas as Obras</option>
                  {obras.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
                <select 
                  className="flex-1 min-w-[150px] border border-slate-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="">Todos os Status</option>
                  {statusList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-4 text-sm font-semibold text-slate-600">Demanda</th>
                      <th className="p-4 text-sm font-semibold text-slate-600">Obra</th>
                      <th className="p-4 text-sm font-semibold text-slate-600">Disciplina</th>
                      <th className="p-4 text-sm font-semibold text-slate-600">Prazo</th>
                      <th className="p-4 text-sm font-semibold text-slate-600">Status</th>
                      <th className="p-4 text-sm font-semibold text-slate-600 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {demandasFiltradas.length === 0 ? (
                      <tr><td colSpan="6" className="p-8 text-center text-slate-500">Nenhuma demanda encontrada.</td></tr>
                    ) : (
                      demandasFiltradas.map(demanda => (
                        <tr key={demanda.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4">
                            <p className="font-medium text-slate-800">{demanda.title}</p>
                            {demanda.notes && <p className="text-xs text-slate-500 truncate max-w-xs mt-1" title={demanda.notes}>{demanda.notes}</p>}
                          </td>
                          <td className="p-4 text-sm text-slate-600">{getObraName(demanda.obraId)}</td>
                          <td className="p-4 text-sm text-slate-600">{getDisciplinaName(demanda.disciplinaId)}</td>
                          <td className="p-4 text-sm text-slate-600">
                            {demanda.dueDate ? new Date(demanda.dueDate + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatus(demanda.statusId).color}`}>
                              {getStatus(demanda.statusId).name}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-3">
                              <button onClick={() => handleEditClick(demanda)} className="text-slate-400 hover:text-blue-500 transition-colors" title="Editar">
                                <Edit size={18} />
                              </button>
                              <button onClick={() => handleDeleteDemanda(demanda.id)} className="text-slate-400 hover:text-red-500 transition-colors" title="Excluir">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* TELA 3: FORMULÁRIO DE NOVA DEMANDA */}
          {/* ======================================= */}
          {activeTab === 'nova_demanda' && (
            <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-slate-100">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                {editingDemandaId ? <Edit className="text-blue-600" /> : <PlusCircle className="text-blue-600" />}
                {editingDemandaId ? 'Editar Demanda' : 'Lançar Nova Demanda'}
              </h2>
              <form onSubmit={handleAddDemanda} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Título da Solicitação *</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="Ex: Cotar materiais hidráulicos"
                    className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    value={newDemanda.title}
                    onChange={e => setNewDemanda({...newDemanda, title: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Obra *</label>
                    <select 
                      required
                      className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
                      value={newDemanda.obraId}
                      onChange={e => setNewDemanda({...newDemanda, obraId: e.target.value})}
                    >
                      <option value="">Selecione a Obra...</option>
                      {obras.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Disciplina</label>
                    <select 
                      className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
                      value={newDemanda.disciplinaId}
                      onChange={e => setNewDemanda({...newDemanda, disciplinaId: e.target.value})}
                    >
                      <option value="">Selecione a Disciplina...</option>
                      {disciplinas.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status / Andamento *</label>
                    <select 
                      required
                      className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
                      value={newDemanda.statusId}
                      onChange={e => setNewDemanda({...newDemanda, statusId: e.target.value})}
                    >
                      <option value="">Selecione o Status...</option>
                      {statusList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Prazo Limite</label>
                    <input 
                      type="date" 
                      className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
                      value={newDemanda.dueDate}
                      onChange={e => setNewDemanda({...newDemanda, dueDate: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Anotações / Descrição</label>
                  <textarea 
                    rows="3"
                    placeholder="Detalhes adicionais da solicitação..."
                    className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
                    value={newDemanda.notes}
                    onChange={e => setNewDemanda({...newDemanda, notes: e.target.value})}
                  ></textarea>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                  <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors shadow-sm">
                    {editingDemandaId ? 'Salvar Alterações' : 'Salvar Demanda'}
                  </button>
                  <button type="button" onClick={handleCancelForm} className="px-6 py-3 sm:py-0 border border-slate-300 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ======================================= */}
          {/* TELA 4: CADASTROS (OBRAS E ETAPAS) */}
          {/* ======================================= */}
          {activeTab === 'cadastros' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-bold text-slate-800">Gerenciar Cadastros</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Briefcase size={20} className="text-slate-500" /> Obras
                  </h3>
                  <form onSubmit={handleAddObra} className="flex flex-col gap-3 mb-6">
                    <input required type="text" placeholder="Nome da Obra" className="border border-slate-300 p-2 rounded outline-none focus:border-blue-500 text-sm" value={newObra.name} onChange={e => setNewObra({...newObra, name: e.target.value})} />
                    <input type="text" placeholder="Escopo (Ex: Civil Completa)" className="border border-slate-300 p-2 rounded outline-none focus:border-blue-500 text-sm" value={newObra.scope} onChange={e => setNewObra({...newObra, scope: e.target.value})} />
                    <select className="border border-slate-300 p-2 rounded outline-none focus:border-blue-500 text-sm" value={newObra.status} onChange={e => setNewObra({...newObra, status: e.target.value})}>
                      <option value="Planejamento">Planejamento</option>
                      <option value="Em Andamento">Em Andamento</option>
                      <option value="Paralisada">Paralisada</option>
                      <option value="Concluída">Concluída</option>
                    </select>
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 bg-slate-800 text-white text-sm py-2 rounded hover:bg-slate-700 transition-colors">
                        {editingObraId ? 'Salvar Alterações' : 'Adicionar Obra'}
                      </button>
                      {editingObraId && (
                        <button type="button" onClick={handleCancelEditObra} className="px-4 bg-slate-200 text-slate-700 text-sm py-2 rounded hover:bg-slate-300 transition-colors">
                          Cancelar
                        </button>
                      )}
                    </div>
                  </form>
                  <ul className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-2">
                    {obras.length === 0 && <p className="text-sm text-slate-500">Nenhuma obra cadastrada.</p>}
                    {obras.map(o => (
                      <li key={o.id} className="py-3 text-sm flex flex-col gap-1 relative group">
                        <div className="flex justify-between items-start pr-8">
                          <span className="font-semibold text-slate-800">{o.name}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getObraStatusStyle(o.status || 'Não Definido')}`}>{o.status || 'Não Definido'}</span>
                        </div>
                        {o.scope && <span className="text-xs text-slate-500">Escopo: {o.scope}</span>}
                        <button 
                          onClick={() => handleEditObraClick(o)} 
                          className="absolute right-0 top-3 text-slate-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" 
                          title="Editar Obra"
                        >
                          <Edit size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Layers size={20} className="text-slate-500" /> Disciplinas
                  </h3>
                  <form onSubmit={handleAddDisciplina} className="flex gap-2 mb-6">
                    <input required type="text" placeholder="Nova Disciplina" className="flex-1 border border-slate-300 p-2 rounded outline-none focus:border-blue-500 text-sm" value={newDisciplina} onChange={e => setNewDisciplina(e.target.value)} />
                    <button type="submit" className="bg-slate-800 text-white text-sm px-4 rounded hover:bg-slate-700 transition-colors">Add</button>
                  </form>
                  <ul className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-2">
                    {disciplinas.length === 0 && <p className="text-sm text-slate-500">Nenhuma disciplina cadastrada.</p>}
                    {disciplinas.map(d => (
                      <li key={d.id} className="py-3 text-sm font-medium text-slate-800">{d.name}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-2">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Activity size={20} className="text-slate-500" /> Etapas de Status
                  </h3>
                  <form onSubmit={handleAddStatus} className="flex flex-col sm:flex-row gap-3 mb-6 items-end">
                    <div className="flex-1 w-full">
                      <label className="text-xs font-medium text-slate-500 mb-1 block">Nome do Status</label>
                      <input required type="text" placeholder="Ex: Atrasado" className="w-full border border-slate-300 p-2 rounded outline-none focus:border-blue-500 text-sm" value={newStatus.name} onChange={e => setNewStatus({...newStatus, name: e.target.value})} />
                    </div>
                    <div className="flex-1 w-full">
                      <label className="text-xs font-medium text-slate-500 mb-1 block">Cor de Identificação</label>
                      <select className="w-full border border-slate-300 p-2 rounded outline-none focus:border-blue-500 text-sm" value={newStatus.color} onChange={e => setNewStatus({...newStatus, color: e.target.value})}>
                        <option value="bg-slate-200 text-slate-800">Cinza</option>
                        <option value="bg-blue-100 text-blue-800">Azul</option>
                        <option value="bg-amber-100 text-amber-800">Amarelo/Laranja</option>
                        <option value="bg-red-100 text-red-800">Vermelho</option>
                        <option value="bg-emerald-100 text-emerald-800">Verde</option>
                        <option value="bg-purple-100 text-purple-800">Roxo</option>
                      </select>
                    </div>
                    <button type="submit" className="w-full sm:w-auto bg-slate-800 text-white text-sm px-6 py-2 rounded hover:bg-slate-700 transition-colors h-[38px]">Adicionar</button>
                  </form>
                  <div className="flex flex-wrap gap-2">
                    {statusList.map(s => (
                      <span key={s.id} className={`px-3 py-1.5 rounded-md text-sm font-medium ${s.color}`}>
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>

    </div>
  );
};

export default App;