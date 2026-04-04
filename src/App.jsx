import { useState, useEffect, useCallback, useMemo, createContext } from 'react';
import { supabase } from './supabase';
import './index.css';
import { Truck, Package, Plus, MapPin, TrendingUp, AlertCircle, CheckCircle, Grid3x3 } from 'lucide-react';

// 🔗 ESTO ES LO QUE TE FALTA PARA CONECTAR TODO:
import { useChoferes } from './hooks/useChoferes';
import { useColectas } from './hooks/useColectas';
import { useValidaciones, Formateo } from './hooks/useValidaciones';
import { ModalAgregar } from './components/ModalAgregar';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ModalAgregarChofer } from './components/ModalAgregarChofer';
import { ModalConfirmarEliminar } from './components/ModalConfirmarEliminar';
import { TarjetaChofer } from './components/TarjetaChofer';

// ────────────────────────────────────────────────────────────────────────
// CONTEXTO GLOBAL
// ────────────────────────────────────────────────────────────────────────
export const AppContext = createContext();

function App() {
  // ─── ESTADO ───────────────────────────────────────────────
  const [choferes, setChoferes] = useState([]);
  const [colectas, setColectas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('recorridos');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [toasts, setToasts] = useState([]);
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);

  // ─── APLICAR TEMA AL CARGAR ────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.className = `theme-${theme}`;
  }, [theme]);

  // ─── SINCRONIZAR CON SUPABASE ─────────────────────────
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        
        // Cargar Choferes
        const { data: choferesData } = await supabase
          .from('Choferes')
          .select('*')
          .order('nombre', { ascending: true });
        
        setChoferes(choferesData || []);

        // Cargar Colectas
        const { data: colectasData } = await supabase
          .from('Recorridos')
          .select('*')
          .order('localidad', { ascending: true });
        
        setColectas(colectasData || []);

        console.log('✓ Datos cargados desde Supabase');
      } catch (err) {
        console.error('Error cargando datos:', err);
        mostrarToast('Error cargando datos', 'error');
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();

    // Suscribirse a cambios en tiempo real
    const subscription = supabase
      .channel('public:Choferes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'Choferes' },
        (payload) => {
          console.log('🔄 Cambio en Choferes:', payload);
          if (payload.eventType === 'INSERT') {
            setChoferes(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setChoferes(prev => 
              prev.map(c => c.id === payload.new.id ? payload.new : c)
            );
          } else if (payload.eventType === 'DELETE') {
            setChoferes(prev => prev.filter(c => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // ─── FUNCIONES AUXILIARES ─────────────────────────────
  const mostrarToast = (mensaje, tipo = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, mensaje, tipo }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    document.body.className = `theme-${newTheme}`;
  };

  const guardarChofer = async (choferData) => {
    try {
      if (choferData.id) {
        // Actualizar
        const { error } = await supabase
          .from('Choferes')
          .update(choferData)
          .eq('id', choferData.id);
        
        if (error) throw error;
        mostrarToast('✓ Chofer actualizado', 'success');
      } else {
        // Crear
        const { data, error } = await supabase
          .from('Choferes')
          .insert([choferData])
          .select();
        
        if (error) throw error;
        setChoferes(prev => [data[0], ...prev]);
        mostrarToast('✓ Chofer registrado', 'success');
      }
    } catch (err) {
      console.error('Error:', err);
      mostrarToast('✗ Error al guardar', 'error');
    }
  };

  const eliminarChofer = async (id) => {
    if (!window.confirm('¿Eliminar este chofer?')) return;
    
    try {
      const { error } = await supabase
        .from('Choferes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setChoferes(prev => prev.filter(c => c.id !== id));
      mostrarToast('✓ Chofer eliminado', 'success');
    } catch (err) {
      console.error('Error:', err);
      mostrarToast('✗ Error al eliminar', 'error');
    }
  };

  const guardarColecta = async (colectaData) => {
    try {
      if (colectaData.id) {
        const { error } = await supabase
          .from('Recorridos')
          .update(colectaData)
          .eq('id', colectaData.id);
        
        if (error) throw error;
        mostrarToast('✓ Colecta actualizada', 'success');
      } else {
        const { data, error } = await supabase
          .from('Recorridos')
          .insert([colectaData])
          .select();
        
        if (error) throw error;
        setColectas(prev => [data[0], ...prev]);
        mostrarToast('✓ Colecta registrada', 'success');
      }
    } catch (err) {
      console.error('Error:', err);
      mostrarToast('✗ Error al guardar', 'error');
    }
  };

  // ─── CONTEXTO GLOBAL ───────────────────────────────────
  const contextValue = {
    choferes,
    setChoferes,
    colectas,
    setColectas,
    clientes,
    setClientes,
    loading,
    currentPage,
    setCurrentPage,
    theme,
    toggleTheme,
    guardarChofer,
    eliminarChofer,
    guardarColecta,
    mostrarToast,
  };

  // ─── RENDER ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="splash-screen">
        <div className="spinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <AppContext.Provider value={contextValue}>
      <div className={`app theme-${theme}`}>
        {/* HEADER FIJO - NO SE MUEVE */}
        <Header 
          onBrandClick={() => setCurrentPage('recorridos')}
          onMobileMenuClick={() => setIsSidebarMobileOpen(true)}
        />
        
        {/* CONTENEDOR SIDEBAR + MAIN - Debajo del header */}
        <div className="app-body">
          <Sidebar 
            currentPage={currentPage} 
            setCurrentPage={setCurrentPage} 
            theme={theme}
            toggleTheme={toggleTheme}
            isMobileOpen={isSidebarMobileOpen}
            setIsMobileOpen={setIsSidebarMobileOpen}
          />
          
          <main className="main-content">
            {currentPage === 'recorridos' && <PantallaRecorridos />}
            {currentPage === 'choferes' && <PantallaChoferes />}
            {currentPage === 'clientes' && <PantallaClientes />}
          </main>
        </div>

        {/* Toast Container */}
        <div className="toast-container">
          {toasts.map(toast => (
            <Toast key={toast.id} mensaje={toast.mensaje} tipo={toast.tipo} />
          ))}
        </div>
      </div>
    </AppContext.Provider>
  );
}

// ════════════════════════════════════════════════════════════════
// COMPONENTES
// ════════════════════════════════════════════════════════════════

function PantallaRecorridos() {
  const { colectas, setColectas, loading, mostrarToast, theme, choferes } = useContext(AppContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedZona, setSelectedZona] = useState(null);

  // FUNCIÓN PARA OBTENER NOMBRE DEL CHOFER POR ID
  const obtenerNombreChofer = (idChofer) => {
    if (!idChofer) return '—';
    const chofer = choferes.find(c => c.id === idChofer);
    return chofer ? chofer.nombre : 'No encontrado';
  };

  // COLORES SEGÚN TEMA
  const colors = {
    backgroundColor: theme === 'light' ? '#f8fafc' : '#020617',
    cardBg: theme === 'light' ? '#ffffff' : '#1e293b',
    headerBg: theme === 'light' ? '#f1f5f9' : '#0f172a',
    textPrimary: theme === 'light' ? '#1e293b' : '#f8fafc',
    textSecondary: theme === 'light' ? '#64748b' : '#cbd5e1',
    border: theme === 'light' ? '#e2e8f0' : '#334155',
    borderLight: theme === 'light' ? '#cbd5e1' : '#475569',
    rowAlt: theme === 'light' ? '#f9fafb' : '#141e2e',
    rowHover: theme === 'light' ? '#f0f4f8' : '#263447',
    inputBg: theme === 'light' ? '#f8fafc' : '#0f172a',
    inputFocusBg: theme === 'light' ? '#ffffff' : '#1a2540'
  };

  // 1. ABRIR MODAL PARA AGREGAR FILA
  const abrirModal = (nombreZona) => {
    setSelectedZona(nombreZona);
    setIsModalOpen(true);
  };

  // 2. CONFIRMAR Y GUARDAR LA NUEVA LOCALIDAD
  const confirmarAgregarLocalidad = async (localidad) => {
    if (!selectedZona || !localidad) return;

    try {
      // ✅ LIMPIEZA: Solo enviar campos que SEGURO existen en la tabla
      const nuevaRuta = {
        localidad: localidad.trim(),
        zona: selectedZona,
        idChofer: 0,
        pqteDia: 0,
        porFuera: 0,
        entregados: 0
      };

      console.log('📤 Intentando insertar nueva ruta:', nuevaRuta);

      // ✅ CONFIRMACIÓN REAL: Esperar respuesta de Supabase antes de actualizar estado
      const { data, error, status } = await supabase
        .from('Recorridos')
        .insert([nuevaRuta])
        .select();

      // ✅ MANEJO DE ERRORES: Si Supabase rebota, mostrar error específico
      if (error) {
        const mensajeError = error.message || 'Error desconocido';
        const detalles = error.details ? `\n${error.details}` : '';
        const hint = error.hint ? `\n${error.hint}` : '';
        
        console.error('❌ Error detallado en Supabase:', {
          mensaje: mensajeError,
          codigo: error.code,
          detalles: error.details,
          hint: error.hint,
          payload: nuevaRuta
        });
        
        // Mostrar el error exacto de Supabase
        mostrarToast(`❌ ${mensajeError}${detalles}`, 'error');
        throw error;
      }

      // ✅ SOLO actualizar state si Supabase devolvió datos exitosamente
      if (data && data[0]) {
        console.log('✅ Inserción exitosa (status: ' + status + '):', data);
        setColectas(prev => [...prev, data[0]]);
        mostrarToast(`✅ ${localidad} agregada correctamente a ${selectedZona}`, 'success');
        setIsModalOpen(false);
        setSelectedZona(null);
      }
    } catch (err) {
      console.error('💥 Error completo:', err);
      // El error ya fue mostrado arriba, pero si llegamos aquí por otra razón:
      mostrarToast(`❌ Error: ${err.message || 'No se pudo agregar la localidad'}`, 'error');
    }
  };

  // 3. FUNCIÓN PARA GUARDAR CAMBIOS AUTOMÁTICAMENTE
  const guardarCambioBD = async (id, campo, valor) => {
    const num = parseInt(valor) || 0;
    setColectas(prev => prev.map(item => 
      item.id === id ? { ...item, [campo]: num } : item
    ));

    const { error } = await supabase
      .from('Recorridos')
      .update({ [campo]: num })
      .eq('id', id);

    if (error) console.error("Error al sincronizar:", error.message);
  };

  // FUNCIÓN PARA OBTENER COLOR DE PORCENTAJE
  const getPercentageColor = (pct) => {
    const num = parseFloat(pct);
    if (num === 100) return '#10b981'; // Verde esmeralda
    if (num >= 80) return '#06b6d4'; // Cyan
    if (num >= 50) return '#f59e0b'; // Amber
    return '#64748b'; // Slate gris
  };

  // FUNCIÓN PARA OBTENER COLOR DE ZONA (Oscuros y desaturados)
  const getZoneColor = (zona) => {
    const colors = {
      'ZONA OESTE': '#3b82f6',    // Azul desaturado
      'ZONA SUR': '#8b5cf6',      // Púrpura oscuro
      'ZONA NORTE': '#ec4899',    // Rosa desaturado
      'CABA': '#06b6d4'           // Cyan/Turquesa
    };
    return colors[zona] || '#64748b';
  };

  const ZONAS = ['ZONA OESTE', 'ZONA SUR', 'ZONA NORTE', 'CABA'];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', color: colors.textSecondary, backgroundColor: colors.backgroundColor }}>
        <div>⏳ Cargando rutas...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: colors.backgroundColor, minHeight: '100vh' }}>
      {/* HEADER */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <Grid3x3 size={28} color={theme === 'light' ? '#3b82f6' : '#64b5f6'} strokeWidth={2} />
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: colors.textPrimary }}>
            Gestión de Rutas y Paquetes
          </h1>
        </div>
      </div>

      {/* ZONAS */}
      <div style={{ display: 'grid', gap: '24px' }}>
        {ZONAS.map(zona => {
          const datosZona = colectas.filter(c => c.zona === zona);
          const zoneColor = getZoneColor(zona);

          return (
            <div 
              key={zona}
              style={{
                backgroundColor: colors.cardBg,
                borderRadius: '12px',
                boxShadow: theme === 'light' ? '0 1px 3px rgba(0,0,0,0.08)' : '0 4px 12px rgba(0, 0, 0, 0.3)',
                overflow: 'hidden',
                border: `1px solid ${colors.border}`,
                transition: 'all 0.2s ease'
              }}
            >
              {/* HEADER DE ZONA */}
              <div 
                style={{
                  background: theme === 'light' 
                    ? `linear-gradient(135deg, ${zoneColor}15 0%, ${zoneColor}08 100%)`
                    : `linear-gradient(135deg, ${zoneColor}40 0%, ${zoneColor}20 100%)`,
                  borderBottom: `2px solid ${zoneColor}`,
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <MapPin size={20} color={zoneColor} strokeWidth={2} />
                  <h3 style={{ margin: 0, color: colors.textPrimary, fontSize: '16px', fontWeight: '600' }}>
                    {zona}
                  </h3>
                  <span style={{
                    backgroundColor: `${zoneColor}${theme === 'light' ? '15' : '30'}`,
                    color: colors.textSecondary,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    border: `1px solid ${theme === 'light' ? `${zoneColor}30` : `${zoneColor}60`}`
                  }}>
                    {datosZona.length} rutas
                  </span>
                </div>
                <button 
                  onClick={() => abrirModal(zona)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: `${zoneColor}20`,
                    color: colors.textPrimary,
                    border: `1px solid ${colors.borderLight}`,
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = `${zoneColor}40`;
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = `${zoneColor}20`;
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  <Plus size={16} strokeWidth={2.5} />
                  Añadir
                </button>
              </div>

              {/* TABLA */}
              <div style={{ overflow: 'hidden' }}>
                {datosZona.length > 0 ? (
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '14px'
                  }}>
                    <thead>
                      <tr style={{
                        backgroundColor: colors.headerBg,
                        borderBottom: `1px solid ${colors.border}`
                      }}>
                        <th style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          color: colors.textSecondary,
                          fontWeight: '600',
                          fontSize: '12px',
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MapPin size={14} color={zoneColor} />
                            Localidad
                          </div>
                        </th>
                        <th style={{
                          padding: '12px 16px',
                          textAlign: 'center',
                          color: colors.textSecondary,
                          fontWeight: '600',
                          fontSize: '12px',
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase'
                        }}>
                          ID
                        </th>
                        <th style={{
                          padding: '12px 16px',
                          textAlign: 'center',
                          color: '#cbd5e1',
                          fontWeight: '600',
                          fontSize: '12px',
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                            <Truck size={14} color={zoneColor} />
                            Nombre
                          </div>
                        </th>
                        <th style={{
                          padding: '12px 16px',
                          textAlign: 'center',
                          color: '#cbd5e1',
                          fontWeight: '600',
                          fontSize: '12px',
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                            <Package size={14} color={zoneColor} />
                            Pqte Día
                          </div>
                        </th>
                        <th style={{
                          padding: '12px 16px',
                          textAlign: 'center',
                          color: '#cbd5e1',
                          fontWeight: '600',
                          fontSize: '12px',
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase'
                        }}>
                          Por Fuera
                        </th>
                        <th style={{
                          padding: '12px 16px',
                          textAlign: 'center',
                          color: '#cbd5e1',
                          fontWeight: '600',
                          fontSize: '12px',
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase'
                        }}>
                          Entregados
                        </th>
                        <th style={{
                          padding: '12px 16px',
                          textAlign: 'center',
                          color: '#cbd5e1',
                          fontWeight: '600',
                          fontSize: '12px',
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                            <TrendingUp size={14} color={zoneColor} />
                            % Día
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {datosZona.map((item, idx) => {
                        const total = (item.pqteDia || 0) + (item.porFuera || 0);
                        const porcentaje = total > 0 
                          ? parseFloat(((item.entregados / total) * 100).toFixed(1))
                          : 0;
                        const porcentajeStr = porcentaje + '%';

                        return (
                          <tr
                            key={item.id}
                            style={{
                              borderBottom: `1px solid ${colors.border}`,
                              backgroundColor: idx % 2 === 0 ? colors.cardBg : colors.rowAlt,
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = colors.rowHover;
                              e.currentTarget.style.boxShadow = `inset 0 0 8px ${theme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(100, 181, 246, 0.08)'}`;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = idx % 2 === 0 ? colors.cardBg : colors.rowAlt;
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <td style={{ padding: '12px 16px', fontWeight: '500', color: colors.textPrimary }}>
                              {item.localidad}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <input
                                type="number"
                                value={item.idChofer || ''}
                                onChange={(e) => guardarCambioBD(item.id, 'idChofer', e.target.value)}
                                style={{
                                  width: '50px',
                                  padding: '6px 8px',
                                  border: `1px solid ${colors.borderLight}`,
                                  borderRadius: '6px',
                                  backgroundColor: colors.inputBg,
                                  color: colors.textPrimary,
                                  fontSize: '13px',
                                  fontWeight: '500',
                                  outline: 'none',
                                  textAlign: 'center',
                                  transition: 'all 0.2s ease'
                                }}
                                onFocus={(e) => {
                                  e.target.style.borderColor = zoneColor;
                                  e.target.style.backgroundColor = colors.inputFocusBg;
                                  e.target.style.boxShadow = `0 0 0 3px ${zoneColor}20`;
                                }}
                                onBlur={(e) => {
                                  e.target.style.borderColor = colors.borderLight;
                                  e.target.style.backgroundColor = colors.inputBg;
                                  e.target.style.boxShadow = 'none';
                                }}
                              />
                            </td>
                            <td style={{ 
                              padding: '12px 16px', 
                              textAlign: 'center',
                              fontWeight: '500',
                              color: colors.textSecondary
                            }}>
                              {obtenerNombreChofer(item.idChofer)}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <input
                                type="number"
                                value={item.pqteDia || ''}
                                onChange={(e) => guardarCambioBD(item.id, 'pqteDia', e.target.value)}
                                style={{
                                  width: '60px',
                                  padding: '6px 8px',
                                  border: `1px solid ${colors.borderLight}`,
                                  borderRadius: '6px',
                                  backgroundColor: colors.inputBg,
                                  color: colors.textPrimary,
                                  fontSize: '13px',
                                  fontWeight: '500',
                                  outline: 'none',
                                  textAlign: 'center',
                                  transition: 'all 0.2s ease'
                                }}
                                onFocus={(e) => {
                                  e.target.style.borderColor = zoneColor;
                                  e.target.style.backgroundColor = colors.inputFocusBg;
                                  e.target.style.boxShadow = `0 0 0 3px ${zoneColor}20`;
                                }}
                                onBlur={(e) => {
                                  e.target.style.borderColor = colors.borderLight;
                                  e.target.style.backgroundColor = colors.inputBg;
                                  e.target.style.boxShadow = 'none';
                                }}
                              />
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <input
                                type="number"
                                value={item.porFuera || ''}
                                onChange={(e) => guardarCambioBD(item.id, 'porFuera', e.target.value)}
                                style={{
                                  width: '60px',
                                  padding: '6px 8px',
                                  border: `1px solid ${colors.borderLight}`,
                                  borderRadius: '6px',
                                  backgroundColor: colors.inputBg,
                                  color: colors.textPrimary,
                                  fontSize: '13px',
                                  fontWeight: '500',
                                  outline: 'none',
                                  textAlign: 'center',
                                  transition: 'all 0.2s ease'
                                }}
                                onFocus={(e) => {
                                  e.target.style.borderColor = zoneColor;
                                  e.target.style.backgroundColor = colors.inputFocusBg;
                                  e.target.style.boxShadow = `0 0 0 3px ${zoneColor}20`;
                                }}
                                onBlur={(e) => {
                                  e.target.style.borderColor = colors.borderLight;
                                  e.target.style.backgroundColor = colors.inputBg;
                                  e.target.style.boxShadow = 'none';
                                }}
                              />
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <input
                                type="number"
                                value={item.entregados || ''}
                                onChange={(e) => guardarCambioBD(item.id, 'entregados', e.target.value)}
                                style={{
                                  width: '60px',
                                  padding: '6px 8px',
                                  border: `1px solid ${colors.borderLight}`,
                                  borderRadius: '6px',
                                  backgroundColor: colors.inputBg,
                                  color: colors.textPrimary,
                                  fontSize: '13px',
                                  fontWeight: '500',
                                  outline: 'none',
                                  textAlign: 'center',
                                  transition: 'all 0.2s ease'
                                }}
                                onFocus={(e) => {
                                  e.target.style.borderColor = zoneColor;
                                  e.target.style.backgroundColor = colors.inputFocusBg;
                                  e.target.style.boxShadow = `0 0 0 3px ${zoneColor}20`;
                                }}
                                onBlur={(e) => {
                                  e.target.style.borderColor = colors.borderLight;
                                  e.target.style.backgroundColor = colors.inputBg;
                                  e.target.style.boxShadow = 'none';
                                }}
                              />
                            </td>
                            <td style={{
                              padding: '12px 16px',
                              textAlign: 'center',
                              fontWeight: '700',
                              color: getPercentageColor(porcentajeStr),
                              fontSize: '14px'
                            }}>
                              {porcentajeStr}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  /* EMPTY STATE */
                  <div style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    backgroundColor: colors.rowAlt
                  }}>
                    <AlertCircle size={40} color={colors.textSecondary} style={{ margin: '0 auto 12px' }} strokeWidth={1.5} />
                    <p style={{ margin: '0 0 4px 0', color: colors.textSecondary, fontSize: '15px', fontWeight: '500' }}>
                      No hay rutas cargadas para esta zona
                    </p>
                    <p style={{ margin: '0 0 16px 0', color: colors.textSecondary, fontSize: '13px', opacity: '0.7' }}>
                      Crea tu primera ruta haciendo clic en el botón "Añadir" arriba
                    </p>
                    <button
                      onClick={() => abrirModal(zona)}
                      style={{
                        backgroundColor: zoneColor,
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        opacity: '0.8'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.opacity = '1';
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = `0 4px 12px ${zoneColor}40`;
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.opacity = '0.8';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      + Nueva ruta
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL PARA AGREGAR LOCALIDAD */}
      <ModalAgregar 
        isOpen={isModalOpen}
        zona={selectedZona}
        onClose={() => setIsModalOpen(false)}
        onConfirm={confirmarAgregarLocalidad}
      />
    </div>
  );
}

function PantallaChoferes() {
  const { choferes, mostrarToast, theme } = useContext(AppContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [choferEditando, setChoferEditando] = useState(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [choferAEliminar, setChoferAEliminar] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [loading, setLoading] = useState(false);

  const colors = {
    backgroundColor: theme === 'light' ? '#f8fafc' : '#020617',
    textPrimary: theme === 'light' ? '#1e293b' : '#f8fafc',
    textSecondary: theme === 'light' ? '#64748b' : '#cbd5e1',
    border: theme === 'light' ? '#e2e8f0' : '#334155',
    buttonBg: '#3b82f6',
    buttonHover: '#2563eb',
  };

  const choferesFiltrados = useMemo(() => {
    return choferes.filter(chofer => {
      const matchBusqueda = chofer.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           chofer.tel.includes(searchTerm) ||
                           chofer.choferIdAt.includes(searchTerm);
      const matchEstado = filtroEstado === 'Todos' || chofer.estado === filtroEstado;
      return matchBusqueda && matchEstado;
    });
  }, [choferes, searchTerm, filtroEstado]);

  const handleGuardarChofer = useCallback(async (formData) => {
    setLoading(true);
    try {
      if (choferEditando) {
        const { error } = await supabase
          .from('Choferes')
          .update(formData)
          .eq('id', choferEditando.id);
        if (error) throw error;
        mostrarToast('✅ Chofer actualizado correctamente', 'success');
      } else {
        const { error } = await supabase
          .from('Choferes')
          .insert([formData]);
        if (error) throw error;
        mostrarToast('✅ Chofer agregado correctamente', 'success');
      }
      setIsModalOpen(false);
      setChoferEditando(null);
    } catch (err) {
      console.error('Error:', err);
      mostrarToast(`❌ Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [choferEditando, mostrarToast]);

  const handleEliminarChofer = useCallback(async (id) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('Choferes')
        .delete()
        .eq('id', id);
      if (error) throw error;
      mostrarToast('✅ Chofer eliminado correctamente', 'success');
    } catch (err) {
      console.error('Error:', err);
      mostrarToast(`❌ Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
      setIsConfirmDeleteOpen(false);
      setChoferAEliminar(null);
    }
  }, [mostrarToast]);

  const handleConfirmDelete = useCallback((chofer) => {
    setChoferAEliminar(chofer);
    setIsConfirmDeleteOpen(true);
  }, []);

  const handleConfirmDeleteConfirm = useCallback(() => {
    if (choferAEliminar) {
      handleEliminarChofer(choferAEliminar.id);
    }
  }, [choferAEliminar, handleEliminarChofer]);

  const handleConfirmDeleteCancel = useCallback(() => {
    setIsConfirmDeleteOpen(false);
    setChoferAEliminar(null);
  }, []);

  const handleAbrirModalNuevo = useCallback(() => {
    setChoferEditando(null);
    setIsModalOpen(true);
  }, []);

  const handleEditarChofer = useCallback((chofer) => {
    setChoferEditando(chofer);
    setIsModalOpen(true);
  }, []);

  const handleCerrarModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => {
      setChoferEditando(null);
    }, 300);
  }, []);

  return (
    <div style={{ padding: '24px', backgroundColor: colors.backgroundColor, minHeight: '100vh' }}>
      <ModalAgregarChofer
        isOpen={isModalOpen}
        onClose={handleCerrarModal}
        onConfirm={handleGuardarChofer}
        choferEditar={choferEditando}
        tema={theme}
      />

      <ModalConfirmarEliminar
        isOpen={isConfirmDeleteOpen}
        nombre={choferAEliminar?.nombre || 'este chofer'}
        onConfirm={handleConfirmDeleteConfirm}
        onCancel={handleConfirmDeleteCancel}
        tema={theme}
      />

      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: colors.textPrimary, display: 'flex', alignItems: 'center', gap: '10px' }}>
              👤 Gestión de Choferes
            </h1>
            <p style={{ margin: '4px 0 0 0', color: colors.textSecondary, fontSize: '14px' }}>
              Total: {choferes.length} choferes registrados
            </p>
          </div>
          <button
            onClick={handleAbrirModalNuevo}
            disabled={loading}
            style={{ padding: '10px 20px', backgroundColor: colors.buttonBg, color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease', opacity: loading ? 0.6 : 1 }}
            onMouseEnter={(e) => { if (!loading) { e.target.style.backgroundColor = colors.buttonHover; e.target.style.transform = 'translateY(-2px)'; } }}
            onMouseLeave={(e) => { e.target.style.backgroundColor = colors.buttonBg; e.target.style.transform = 'translateY(0)'; }}
          >
            <Plus size={18} strokeWidth={2.5} />
            Agregar Chofer
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, minWidth: '200px', padding: '10px 12px', backgroundColor: theme === 'light' ? '#ffffff' : '#1e293b', border: `1.5px solid ${colors.border}`, borderRadius: '8px', fontSize: '14px', color: colors.textPrimary, outline: 'none', transition: 'all 0.2s ease' }}
            onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
            onBlur={(e) => { e.target.style.borderColor = colors.border; e.target.style.boxShadow = 'none'; }}
          />

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            style={{ padding: '10px 12px', backgroundColor: theme === 'light' ? '#ffffff' : '#1e293b', border: `1.5px solid ${colors.border}`, borderRadius: '8px', fontSize: '14px', color: colors.textPrimary, outline: 'none', cursor: 'pointer', transition: 'all 0.2s ease' }}
            onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; }}
            onBlur={(e) => { e.target.style.borderColor = colors.border; }}
          >
            <option value="Todos">Todos los estados</option>
            <option value="Activo">✅ Activo</option>
            <option value="Franco">📅 Franco</option>
            <option value="Inactivo">❌ Inactivo</option>
          </select>
        </div>
      </div>

      {choferesFiltrados.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {choferesFiltrados.map(chofer => (
            <TarjetaChofer
              key={chofer.id}
              chofer={chofer}
              onEdit={handleEditarChofer}
              onConfirmDelete={handleConfirmDelete}
              tema={theme}
            />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: colors.textSecondary }}>
          <AlertCircle size={48} strokeWidth={1.5} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <p style={{ fontSize: '16px', fontWeight: '500' }}>
            {searchTerm || filtroEstado !== 'Todos' ? 'No se encontraron choferes con los filtros aplicados' : 'No hay choferes registrados aún'}
          </p>
          {(searchTerm || filtroEstado !== 'Todos') && (
            <button
              onClick={() => { setSearchTerm(''); setFiltroEstado('Todos'); }}
              style={{ marginTop: '16px', padding: '8px 16px', backgroundColor: colors.buttonBg, color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease' }}
              onMouseEnter={(e) => { e.target.style.backgroundColor = colors.buttonHover; }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = colors.buttonBg; }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PantallaClientes() {
  const { theme } = useContext(AppContext);
  const colors = {
    backgroundColor: theme === 'light' ? '#f8fafc' : '#020617',
    textPrimary: theme === 'light' ? '#1e293b' : '#f8fafc',
    textSecondary: theme === 'light' ? '#64748b' : '#cbd5e1',
  };

  return (
    <div style={{ padding: '24px', backgroundColor: colors.backgroundColor, textAlign: 'center', minHeight: '100vh' }}>
      <h2 style={{ color: colors.textPrimary }}>🏢 Clientes</h2>
      <p style={{ color: colors.textSecondary }}>Próximamente...</p>
    </div>
  );
}

function Toast({ mensaje, tipo }) {
  return (
    <div className={`toast toast-${tipo}`}>
      {mensaje}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════

import { useContext } from 'react';

export default App;
