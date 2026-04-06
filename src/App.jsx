import { useState, useEffect, useCallback, useMemo, createContext, useRef, useContext } from 'react';
import { supabase } from './supabase';
import './index.css';
import { Truck, Package, Plus, MapPin, Map, TrendingUp, AlertCircle, CheckCircle, Grid3x3, Trash2, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// 🔗 ESTO ES LO QUE TE FALTA PARA CONECTAR TODO:
import { useChoferes } from './hooks/useChoferes';
import { useColectas } from './hooks/useColectas';
import { useValidaciones, Formateo } from './hooks/useValidaciones';
import { ModalAgregar } from './components/ModalAgregar';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ModalAgregarChofer } from './components/ModalAgregarChofer';
import { ModalConfirmarEliminar } from './components/ModalConfirmarEliminar';
import { ModalAgregarCliente } from './components/ModalAgregarCliente';
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
    document.documentElement.classList.toggle('dark', theme === 'dark');
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

        // Cargar Colectas — el orden lo dicta Supabase (columna `orden`)
        const { data: colectasData } = await supabase
          .from('Recorridos')
          .select('*')
          .order('orden', { ascending: true });

        setColectas(colectasData || []);

        // Cargar Clientes
        const { data: clientesData } = await supabase
          .from('Clientes')
          .select('id, cliente, chofer, horario, direccion, tipo_dia, Choferes(celular)')
          .order('cliente', { ascending: true });
        
        setClientes(clientesData || []);
        console.log('Clientes cargados:', clientesData);
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
    // Apply synchronously before React re-render for instant visual switch
    document.documentElement.setAttribute('data-theme', newTheme);
    document.body.className = `theme-${newTheme}`;
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
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

  const handleEliminarCliente = async (clienteId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este cliente?')) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('Clientes')
        .delete()
        .eq('id', clienteId);

      if (error) throw error;

      setClientes(prev => prev.filter(c => c.id !== clienteId));
      mostrarToast('✅ Cliente eliminado correctamente', 'success');
    } catch (err) {
      console.error('Error al eliminar cliente:', err);
      mostrarToast(`❌ Error al eliminar cliente: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarClienteConfirm = async () => {
    if (!itemAEliminar) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('Clientes')
        .delete()
        .eq('id', itemAEliminar.id);

      if (error) throw error;

      setClientes(prev => prev.filter(c => c.id !== itemAEliminar.id));
      mostrarToast('✅ Cliente eliminado correctamente', 'success');
    } catch (err) {
      console.error('Error al eliminar cliente:', err);
      mostrarToast(`❌ Error al eliminar cliente: ${err.message}`, 'error');
    } finally {
      setLoading(false);
      setIsConfirmDeleteOpen(false);
      setItemAEliminar(null);
    }
  };

  const handleEliminarClienteCancel = () => {
    setIsConfirmDeleteOpen(false);
    setItemAEliminar(null);
  };

  const handleOpenConfirmDeleteModal = (cliente) => {
    setItemAEliminar(cliente);
    setIsConfirmDeleteOpen(true);
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
    handleEliminarCliente,
    handleEliminarClienteConfirm,
    handleEliminarClienteCancel,
    handleOpenConfirmDeleteModal,
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
            {currentPage === 'maps' && <PantallaMaps />}
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

  // DND SENSORS
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event, zona) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setColectas(prev => {
      const zonasItems = prev.filter(c => c.zona === zona);
      const otherItems = prev.filter(c => c.zona !== zona);
      const oldIndex = zonasItems.findIndex(c => c.id === active.id);
      const newIndex = zonasItems.findIndex(c => c.id === over.id);
      const reordered = arrayMove(zonasItems, oldIndex, newIndex);
      return [...otherItems, ...reordered];
    });
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

  // 4. FUNCIÓN PARA GUARDAR LOCALIDAD EDITADA INLINE
  const guardarLocalidad = async (id, nuevoValor) => {
    if (!nuevoValor || !nuevoValor.trim()) return;
    const valorLimpio = nuevoValor.trim().toUpperCase();
    setColectas(prev => prev.map(item =>
      item.id === id ? { ...item, localidad: valorLimpio } : item
    ));
    const { error } = await supabase
      .from('Recorridos')
      .update({ localidad: valorLimpio })
      .eq('id', id);
    if (error) console.error('Error al actualizar localidad:', error.message);
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
                        <th style={{ padding: '12px 8px 12px 12px', width: '32px' }}></th>
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
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => handleDragEnd(e, zona)}
                    >
                    <SortableContext
                      items={datosZona.map(i => i.id)}
                      strategy={verticalListSortingStrategy}
                    >
                    <tbody>
                      {datosZona.map((item, idx) => {
                        const total = (item.pqteDia || 0) + (item.porFuera || 0);
                        const porcentaje = total > 0 
                          ? parseFloat(((item.entregados / total) * 100).toFixed(1))
                          : 0;
                        const porcentajeStr = porcentaje + '%';

                        return (
                          <SortableFilaLocalidad
                            key={item.id}
                            item={item}
                            idx={idx}
                            colors={colors}
                            zoneColor={zoneColor}
                            theme={theme}
                            guardarCambioBD={guardarCambioBD}
                            guardarLocalidad={guardarLocalidad}
                            obtenerNombreChofer={obtenerNombreChofer}
                            getPercentageColor={getPercentageColor}
                            porcentajeStr={porcentajeStr}
                          />
                        );
                      })}
                    </tbody>
                    </SortableContext>
                    </DndContext>
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
  const [filtroZona, setFiltroZona] = useState('Todas');
  const [ordenId, setOrdenId] = useState('asc'); // 'asc' = menor a mayor, 'desc' = mayor a menor
  const [loading, setLoading] = useState(false);

  const choferesFiltrados = useMemo(() => {
    const filtrados = choferes.filter(chofer => {
      const matchBusqueda = (chofer.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (chofer.tel || '').includes(searchTerm) ||
                           (chofer.celular || '').includes(searchTerm) ||
                           (chofer.choferIdAt || '').includes(searchTerm);
      const matchZona = filtroZona === 'Todas' || (chofer.zona && chofer.zona.includes(filtroZona));
      return matchBusqueda && matchZona;
    });
    // Ordenar por ID según selección
    return [...filtrados].sort((a, b) =>
      ordenId === 'asc' ? a.id - b.id : b.id - a.id
    );
  }, [choferes, searchTerm, filtroZona, ordenId]);

  const handleGuardarChofer = useCallback(async (formData) => {
    setLoading(true);
    try {
      if (choferEditando) {
        const { error } = await supabase
          .from('Choferes')
          .update(formData)
          .eq('id', choferEditando.id)
          .select();
        if (error) throw error;
        mostrarToast('✅ Chofer actualizado correctamente', 'success');
      } else {
        const { error } = await supabase
          .from('Choferes')
          .insert([formData])
          .select();
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
    <div className="w-full min-h-screen" style={{ background: 'var(--bg-page)', color: 'var(--text-2)' }}>
      {/* Modales renderizados en la raíz para funcionar como fixed overlay */}
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

      {/* Contenido principal */}
      <div className="p-6">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
                👤 Gestión de Choferes
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
                Total: {choferes.length} choferes registrados
              </p>
            </div>
            <button
              onClick={handleAbrirModalNuevo}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-150 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Plus size={18} strokeWidth={2.5} />
              Agregar Chofer
            </button>
          </div>

          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="theme-input flex-1 min-w-[200px] px-3 py-2.5 rounded-lg text-sm outline-none"
            />
            <select
              value={filtroZona}
              onChange={(e) => setFiltroZona(e.target.value)}
              className="theme-input px-3 py-2.5 rounded-lg text-sm cursor-pointer outline-none"
            >
              <option value="Todas">Todas las zonas</option>
              <option value="OESTE">OESTE</option>
              <option value="SUR">SUR</option>
              <option value="NORTE">NORTE</option>
              <option value="CABA">CABA</option>
            </select>
            <button
              onClick={() => setOrdenId(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="theme-input flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm cursor-pointer outline-none font-semibold transition-all duration-150 hover:opacity-80 whitespace-nowrap"
              title={ordenId === 'asc' ? 'Ordenado: ID menor → mayor. Clic para invertir' : 'Ordenado: ID mayor → menor. Clic para invertir'}
            >
              {ordenId === 'asc' ? '↑ ID' : '↓ ID'}
            </button>
          </div>
        </div>

        {choferesFiltrados.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
          <div className="text-center py-16 px-5" style={{ color: 'var(--text-3)' }}>
            <AlertCircle size={48} strokeWidth={1.5} className="mx-auto mb-4 opacity-50" />
            <p className="text-base font-medium">
              {searchTerm || filtroZona !== 'Todas' ? 'No se encontraron choferes con los filtros aplicados' : 'No hay choferes registrados aún'}
            </p>
            {(searchTerm || filtroZona !== 'Todas') && (
              <button
                onClick={() => { setSearchTerm(''); setFiltroZona('Todas'); }}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all duration-150"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PantallaClientes() {

  const { clientes, setClientes, mostrarToast, choferes } = useContext(AppContext);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tabActiva, setTabActiva] = useState('SEMANA'); // 'SEMANA' o 'SÁBADOS'
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [itemAEliminar, setItemAEliminar] = useState(null);

  // Limpiar/refiltrar clientes al cambiar de pestaña
  useEffect(() => {
    // Forzar refiltrado limpiando algún estado si fuera necesario (aquí solo log)
    console.log('Pestaña activa:', tabActiva);
  }, [tabActiva]);

  // Tabs config
  const tabs = [
    { label: 'LUNES A VIERNES', value: 'SEMANA' },
    { label: 'SÁBADOS', value: 'SÁBADOS' }
  ];

  // Ordenamiento inteligente por horario
  function parseHorario(horario) {
    if (!horario) return null;
    // Extrae HH:MM
    const match = horario.match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;
    const [_, h, m] = match;
    return parseInt(h, 10) * 60 + parseInt(m, 10);
  }

  function ordenarPorHorario(arr) {
    return [...arr].sort((a, b) => {
      const ha = parseHorario(a.horario);
      const hb = parseHorario(b.horario);
      if (ha === null && hb === null) return 0;
      if (ha === null) return 1;
      if (hb === null) return -1;
      return ha - hb;
    });
  }

  // Filtro ultra-flexible para tipo_dia
  const clientesFiltrados = useMemo(() => {
    return ordenarPorHorario(
      clientes.filter(c => {
        const tipo = (c.tipo_dia?.trim().toUpperCase() || 'SEMANA');
        if (tabActiva === 'SÁBADOS') {
          // Mostrar solo los que sean SÁBADOS (sin importar espacios/caso)
          return tipo === 'SÁBADOS';
        } else if (tabActiva === 'SEMANA') {
          // Mostrar los que sean SEMANA, null o string vacío
          return tipo === 'SEMANA' || tipo === '' || c.tipo_dia == null;
        }
        return false;
      })
    );
  }, [clientes, tabActiva]);

  const handleGuardarCliente = async (formData) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('Clientes')
        .insert([formData])
        .select('id, cliente, chofer, horario, direccion, Choferes(celular)');
      
      if (error) throw error;
      
      setClientes(prev => [data[0], ...prev]);
      setIsModalOpen(false);
      mostrarToast('✅ Cliente agregado correctamente', 'success');
    } catch (err) {
      console.error('Error:', err);
      mostrarToast(`❌ Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeChofer = async (clienteId, nuevoChofer) => {
    try {
      const { data, error } = await supabase
        .from('Clientes')
        .update({ chofer: nuevoChofer })
        .eq('id', clienteId)
        .select('id, cliente, chofer, horario, direccion, Choferes(celular)');
      
      if (error) throw error;
      
      setClientes(prev => 
        prev.map(c => c.id === clienteId ? data[0] : c)
      );
      mostrarToast('✅ Chofer actualizado', 'success');
    } catch (err) {
      console.error('Error:', err);
      mostrarToast(`❌ Error al actualizar: ${err.message}`, 'error');
    }
  };


  const handleEliminarClienteConfirm = async () => {
    if (!itemAEliminar) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('Clientes')
        .delete()
        .eq('id', itemAEliminar.id);

      if (error) throw error;

      setClientes(prev => prev.filter(c => c.id !== itemAEliminar.id));
      mostrarToast('✅ Cliente eliminado correctamente', 'success');
    } catch (err) {
      console.error('Error al eliminar cliente:', err);
      mostrarToast(`❌ Error al eliminar cliente: ${err.message}`, 'error');
    } finally {
      setLoading(false);
      setIsConfirmDeleteOpen(false);
      setItemAEliminar(null);
    }
  };

  const handleEliminarClienteCancel = () => {
    setIsConfirmDeleteOpen(false);
    setItemAEliminar(null);
  };

  const handleOpenConfirmDeleteModal = (cliente) => {
    setItemAEliminar(cliente);
    setIsConfirmDeleteOpen(true);
  };

  return (
    <div className="w-full min-h-screen p-6" style={{ background: 'var(--bg-page)', color: 'var(--text-2)' }}>
      {/* MODALES */}
      <ModalAgregarCliente
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleGuardarCliente}
        choferes={choferes}
        tabActiva={tabActiva}
      />

      <ModalConfirmarEliminar
        isOpen={isConfirmDeleteOpen}
        nombre={itemAEliminar?.cliente || 'este cliente'}
        onConfirm={handleEliminarClienteConfirm}
        onCancel={handleEliminarClienteCancel}
      />

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text-1)' }}>🏢 Gestión de Clientes</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-lg font-semibold text-sm transition-all duration-150 hover:bg-blue-600 active:scale-95"
        >
          <Plus size={18} />
          Agregar Cliente
        </button>
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-4">
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setTabActiva(tab.value)}
            className="px-4 py-2 rounded-t-lg font-semibold text-sm transition-all duration-100 border-b-2 focus:outline-none"
            style={tabActiva === tab.value
              ? { background: 'var(--bg-raised)', borderColor: 'var(--brand-blue)', color: 'var(--brand-blue)' }
              : { background: 'var(--bg-hover)', borderColor: 'transparent', color: 'var(--text-3)' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TABLA */}
      <div className="rounded-xl border overflow-hidden shadow-sm" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto">
          {clientesFiltrados.length > 0 ? (
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>CLIENTE</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>CHOFER</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>CELULAR</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>HORARIO</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>DIRECCIÓN</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.map((cliente, idx) => (
                  <tr
                    key={cliente.id || idx}
                    className="clientes-row"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td className="px-6 py-4 text-sm font-medium" style={{ color: 'var(--text-1)' }}>{cliente.cliente || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm">
                      <select
                        value={cliente.chofer || ''}
                        onChange={(e) => handleChangeChofer(cliente.id, e.target.value)}
                        className="theme-input px-2.5 py-1.5 rounded text-sm cursor-pointer outline-none"
                      >
                        <option value="">Seleccionar chofer...</option>
                        {choferes.map(chofer => (
                          <option key={chofer.id || chofer.nombre} value={chofer.nombre}>
                            {chofer.nombre}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-2)' }}>{cliente.Choferes?.celular || 'Sin celular'}</td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-2)' }}>{cliente.horario || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm max-w-xs truncate" style={{ color: 'var(--text-3)' }}>{cliente.direccion || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-center">
                      <button
                        onClick={() => { setItemAEliminar(cliente); setIsConfirmDeleteOpen(true); }}
                        className="text-red-500 hover:text-red-400 transition-colors duration-150"
                        title="Eliminar cliente"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-16 px-6" style={{ color: 'var(--text-3)' }}>
              <Package size={48} className="mb-4 opacity-40" />
              <p className="text-lg font-medium mb-1" style={{ color: 'var(--text-1)' }}>No hay clientes registrados aún</p>
              <p className="text-sm mb-6">Agrega tu primer cliente para comenzar</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-lg font-semibold text-sm transition-all duration-150 hover:bg-blue-600 active:scale-95"
              >
                <Plus size={18} />
                Agregar Cliente
              </button>
            </div>
          )}
        </div>
      </div>
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


// ════════════════════════════════════════════════════════════════
// COMPONENTE: Celda de Localidad con Inline Editing
// ════════════════════════════════════════════════════════════════
function CeldaLocalidadEditable({ item, colors, zoneColor, onSave }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(item.localidad);
  const inputRef = useRef(null);

  useEffect(() => {
    setValor(item.localidad);
  }, [item.localidad]);

  const confirmar = () => {
    setEditando(false);
    const limpio = valor.trim();
    if (limpio && limpio !== item.localidad) {
      onSave(limpio);
    } else {
      setValor(item.localidad);
    }
  };

  if (editando) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={valor}
        autoFocus
        onChange={(e) => setValor(e.target.value.toUpperCase())}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.target.blur(); }
          if (e.key === 'Escape') { setValor(item.localidad); setEditando(false); }
        }}
        style={{
          width: '100%',
          padding: '4px 8px',
          borderRadius: '6px',
          border: `2px solid ${zoneColor}`,
          backgroundColor: colors.inputFocusBg,
          color: colors.textPrimary,
          fontSize: '13px',
          fontWeight: '600',
          outline: 'none',
          boxShadow: `0 0 0 3px ${zoneColor}25`,
          transition: 'all 0.2s ease',
        }}
      />
    );
  }

  return (
    <span
      onClick={() => setEditando(true)}
      title="Clic para editar la localidad"
      style={{
        cursor: 'text',
        color: colors.textPrimary,
        fontWeight: '500',
        borderBottom: `1px dashed ${zoneColor}80`,
        paddingBottom: '1px',
        transition: 'all 0.15s ease',
        display: 'inline-block',
      }}
      onMouseEnter={(e) => {
        e.target.style.borderBottomColor = zoneColor;
        e.target.style.color = zoneColor;
      }}
      onMouseLeave={(e) => {
        e.target.style.borderBottomColor = `${zoneColor}80`;
        e.target.style.color = colors.textPrimary;
      }}
    >
      {item.localidad}
    </span>
  );
}

// ════════════════════════════════════════════════════════════════
// COMPONENTE: Fila Sortable para Drag & Drop
// ════════════════════════════════════════════════════════════════
function SortableFilaLocalidad({
  item, idx, colors, zoneColor, theme,
  guardarCambioBD, guardarLocalidad,
  obtenerNombreChofer, getPercentageColor, porcentajeStr
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    borderBottom: `1px solid ${colors.border}`,
    backgroundColor: isDragging
      ? (theme === 'light' ? '#dbeafe' : '#1e3a5f')
      : (idx % 2 === 0 ? colors.cardBg : colors.rowAlt),
    boxShadow: isDragging
      ? `0 8px 24px rgba(0,0,0,0.18), 0 0 0 2px ${zoneColor}`
      : 'none',
    opacity: isDragging ? 0.95 : 1,
    zIndex: isDragging ? 999 : 'auto',
    position: 'relative',
    willChange: 'transform',
  };

  const inputStyle = {
    padding: '6px 8px',
    border: `1px solid ${colors.borderLight}`,
    borderRadius: '6px',
    backgroundColor: colors.inputBg,
    color: colors.textPrimary,
    fontSize: '13px',
    fontWeight: '500',
    outline: 'none',
    textAlign: 'center',
    transition: 'all 0.2s ease',
  };

  return (
    <tr ref={setNodeRef} style={style}>
      {/* HANDLE DE DRAG */}
      <td style={{ padding: '12px 8px 12px 12px', width: '32px' }}>
        <span
          {...attributes}
          {...listeners}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            cursor: 'grab',
            color: colors.textSecondary,
            opacity: 0.5,
            touchAction: 'none',
          }}
          title="Arrastrá para reordenar"
        >
          <GripVertical size={14} />
        </span>
      </td>

      {/* LOCALIDAD EDITABLE */}
      <td style={{ padding: '12px 16px', fontWeight: '500', color: colors.textPrimary }}>
        <CeldaLocalidadEditable
          item={item}
          colors={colors}
          zoneColor={zoneColor}
          onSave={(nuevoValor) => guardarLocalidad(item.id, nuevoValor)}
        />
      </td>

      {/* ID CHOFER */}
      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
        <input
          type="number"
          value={item.idChofer || ''}
          onChange={(e) => guardarCambioBD(item.id, 'idChofer', e.target.value)}
          style={{ ...inputStyle, width: '50px' }}
          onFocus={(e) => { e.target.style.borderColor = zoneColor; e.target.style.boxShadow = `0 0 0 3px ${zoneColor}20`; e.target.style.backgroundColor = colors.inputFocusBg; }}
          onBlur={(e) => { e.target.style.borderColor = colors.borderLight; e.target.style.boxShadow = 'none'; e.target.style.backgroundColor = colors.inputBg; }}
        />
      </td>

      {/* NOMBRE CHOFER */}
      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '500', color: colors.textSecondary }}>
        {obtenerNombreChofer(item.idChofer)}
      </td>

      {/* PQTE DÍA */}
      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
        <input
          type="number"
          value={item.pqteDia || ''}
          onChange={(e) => guardarCambioBD(item.id, 'pqteDia', e.target.value)}
          style={{ ...inputStyle, width: '60px' }}
          onFocus={(e) => { e.target.style.borderColor = zoneColor; e.target.style.boxShadow = `0 0 0 3px ${zoneColor}20`; e.target.style.backgroundColor = colors.inputFocusBg; }}
          onBlur={(e) => { e.target.style.borderColor = colors.borderLight; e.target.style.boxShadow = 'none'; e.target.style.backgroundColor = colors.inputBg; }}
        />
      </td>

      {/* POR FUERA */}
      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
        <input
          type="number"
          value={item.porFuera || ''}
          onChange={(e) => guardarCambioBD(item.id, 'porFuera', e.target.value)}
          style={{ ...inputStyle, width: '60px' }}
          onFocus={(e) => { e.target.style.borderColor = zoneColor; e.target.style.boxShadow = `0 0 0 3px ${zoneColor}20`; e.target.style.backgroundColor = colors.inputFocusBg; }}
          onBlur={(e) => { e.target.style.borderColor = colors.borderLight; e.target.style.boxShadow = 'none'; e.target.style.backgroundColor = colors.inputBg; }}
        />
      </td>

      {/* ENTREGADOS */}
      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
        <input
          type="number"
          value={item.entregados || ''}
          onChange={(e) => guardarCambioBD(item.id, 'entregados', e.target.value)}
          style={{ ...inputStyle, width: '60px' }}
          onFocus={(e) => { e.target.style.borderColor = zoneColor; e.target.style.boxShadow = `0 0 0 3px ${zoneColor}20`; e.target.style.backgroundColor = colors.inputFocusBg; }}
          onBlur={(e) => { e.target.style.borderColor = colors.borderLight; e.target.style.boxShadow = 'none'; e.target.style.backgroundColor = colors.inputBg; }}
        />
      </td>

      {/* % DÍA */}
      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '700', color: getPercentageColor(porcentajeStr), fontSize: '14px' }}>
        {porcentajeStr}
      </td>
    </tr>
  );
}

function PantallaMaps() {
  const defaultQuery = 'Moron, Buenos Aires';
  const [searchQuery, setSearchQuery] = useState(defaultQuery);
  const [mapUrl, setMapUrl] = useState(
    () =>
      `https://maps.google.com/maps?q=${encodeURIComponent(defaultQuery)}&output=embed`
  );

  const handleBuscar = (e) => {
    e.preventDefault();
    const q = searchQuery.trim() || defaultQuery;
    setMapUrl(`https://maps.google.com/maps?q=${encodeURIComponent(q)}&output=embed`);
  };

  return (
    <div className="w-full min-h-screen p-6" style={{ background: 'var(--bg-page)', color: 'var(--text-2)' }}>
      <header className="flex items-center gap-3 mb-6">
        <Map size={32} strokeWidth={1.75} style={{ color: 'var(--brand-blue)' }} aria-hidden />
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text-1)' }}>
          Buscador de Direcciones
        </h1>
      </header>

      <form onSubmit={handleBuscar} className="flex flex-col sm:flex-row gap-3 mb-6 max-w-3xl">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Ej. Moron, Buenos Aires"
          className="theme-input flex-1 px-4 py-3 rounded-lg text-sm outline-none border transition-colors"
          style={{
            background: 'var(--bg-surface)',
            color: 'var(--text-1)',
            borderColor: 'var(--border)',
          }}
          aria-label="Buscar dirección"
        />
        <button
          type="submit"
          className="px-6 py-3 rounded-lg font-semibold text-sm text-white transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
          style={{ background: 'var(--brand-blue)' }}
        >
          Buscar
        </button>
      </form>

      <div
        className="rounded-xl border overflow-hidden shadow-sm w-full"
        style={{
          minHeight: 'min(70vh, 800px)',
          height: '70vh',
          background: 'var(--bg-surface)',
          borderColor: 'var(--border)',
        }}
      >
        <iframe
          title="Mapa de direcciones"
          src={mapUrl}
          width="100%"
          height="100%"
          style={{ border: 0, display: 'block', minHeight: '500px' }}
          frameBorder={0}
          allowFullScreen
          loading="lazy"
        />
      </div>
    </div>
  );
}

export default App;