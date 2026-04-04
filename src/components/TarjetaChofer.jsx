import { Edit2, Trash2, MapPin, Truck, FileText, Calendar } from 'lucide-react';
import { memo } from 'react';

const TarjetaChoferComponent = ({ 
  chofer, 
  onEdit, 
  onConfirmDelete,
  tema = 'dark' 
}) => {
  const isDark = tema === 'dark';
  const colors = {
    cardBg: isDark 
      ? 'rgba(30, 41, 59, 0.8)' 
      : '#ffffff',
    cardBgHover: isDark 
      ? 'rgba(30, 41, 59, 0.95)' 
      : 'rgba(255, 255, 255, 0.98)',
    border: isDark 
      ? 'rgba(71, 85, 105, 0.3)' 
      : 'rgba(226, 232, 240, 0.6)',
    textPrimary: isDark ? '#f1f5f9' : '#1e293b',
    textData: isDark ? '#e2e8f0' : '#334155',
    textLabel: isDark ? '#64748b' : '#94a3b8',
    badge: '#3b82f6',
    badgeBg: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
    shadowCard: isDark 
      ? '0 8px 32px rgba(0, 0, 0, 0.3)' 
      : '0 4px 12px rgba(0, 0, 0, 0.08)',
    shadowHover: isDark
      ? '0 20px 40px rgba(59, 130, 246, 0.2)'
      : '0 12px 24px rgba(59, 130, 246, 0.15)',
  };

  // Función para formatear fecha DD/MM/YYYY
  const formatearFecha = (fecha) => {
    if (!fecha) return 'N/A';
    try {
      const date = new Date(fecha);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return fecha;
    }
  };

  // Colores para zonas
  const getZoneColor = (zona) => {
    const zoneColors = {
      'Oeste': { bg: '#3b82f6', text: '#ffffff', light: 'rgba(59, 130, 246, 0.15)' },      // Azul
      'Sur': { bg: '#8b5cf6', text: '#ffffff', light: 'rgba(139, 92, 246, 0.15)' },        // Violeta
      'Norte': { bg: '#ec4899', text: '#ffffff', light: 'rgba(236, 72, 153, 0.15)' },      // Rosa
      'CABA': { bg: '#10b981', text: '#ffffff', light: 'rgba(16, 185, 129, 0.15)' },       // Verde
    };
    return zoneColors[zona] || { bg: '#6b7280', text: '#ffffff', light: 'rgba(107, 114, 128, 0.15)' };
  };

  // Colores para condición
  const getCondicionColor = (condicion) => {
    switch (condicion) {
      case 'Titular':
        return '#3b82f6'; // Azul
      case 'Semititular':
        return '#f59e0b'; // Ámbar
      case 'Suplente':
        return '#6b7280'; // Gris
      default:
        return colors.badge;
    }
  };

  return (
    <div
      style={{
        backgroundColor: colors.cardBg,
        border: `1px solid ${colors.border}`,
        borderRadius: '16px',
        padding: '20px',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: colors.shadowCard,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = colors.cardBgHover;
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = colors.shadowHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = colors.cardBg;
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = colors.shadowCard;
      }}
    >
      {/* CABECERA: Nombre + Acciones */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: '16px', 
          fontWeight: '700', 
          color: colors.textPrimary,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
        }}>
          {chofer.nombre}
        </h3>
        
        {/* Botones Editar y Eliminar */}
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit(chofer);
            }}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              border: 'none',
              color: getZoneColor(chofer.zona).bg,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = getZoneColor(chofer.zona).light;
              e.target.style.color = getZoneColor(chofer.zona).bg;
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = getZoneColor(chofer.zona).bg;
            }}
            title="Editar"
          >
            <Edit2 size={16} strokeWidth={2} />
          </button>
          
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onConfirmDelete(chofer);
            }}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
              e.target.style.color = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#ef4444';
            }}
            title="Eliminar"
          >
            <Trash2 size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* CUERPO: Grid de información - 2 columnas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* ZONA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={14} strokeWidth={2} color={getZoneColor(chofer.zona).bg} />
            <p style={{ 
              margin: 0, 
              fontSize: '10px', 
              fontWeight: '700', 
              color: colors.textLabel, 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px' 
            }}>
              Zona
            </p>
          </div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: getZoneColor(chofer.zona).light,
              color: getZoneColor(chofer.zona).bg,
              padding: '6px 10px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '700',
              border: `1px solid ${getZoneColor(chofer.zona).bg}`,
              width: 'fit-content',
            }}
          >
            {chofer.zona || 'N/A'}
          </span>
        </div>

        {/* VEHÍCULO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Truck size={14} strokeWidth={2} color={colors.badge} />
            <p style={{ 
              margin: 0, 
              fontSize: '10px', 
              fontWeight: '700', 
              color: colors.textLabel, 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px' 
            }}>
              Vehículo
            </p>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: colors.textData, fontWeight: '600' }}>
            {chofer.vehiculo || 'N/A'}
          </p>
        </div>

        {/* DNI */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={14} strokeWidth={2} color={colors.badge} />
            <p style={{ 
              margin: 0, 
              fontSize: '10px', 
              fontWeight: '700', 
              color: colors.textLabel, 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px' 
            }}>
              DNI
            </p>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: colors.textData, fontWeight: '600' }}>
            {chofer.dni || 'N/A'}
          </p>
        </div>

        {/* CONDICIÓN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div 
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                backgroundColor: getCondicionColor(chofer.condicion),
              }}
            />
            <p style={{ 
              margin: 0, 
              fontSize: '10px', 
              fontWeight: '700', 
              color: colors.textLabel, 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px' 
            }}>
              Condición
            </p>
          </div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: `${getCondicionColor(chofer.condicion)}15`,
              color: getCondicionColor(chofer.condicion),
              padding: '6px 10px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '700',
              border: `1px solid ${getCondicionColor(chofer.condicion)}`,
              width: 'fit-content',
            }}
          >
            {chofer.condicion || 'N/A'}
          </span>
        </div>
      </div>

      {/* DIVIDER */}
      <div style={{ height: '1px', backgroundColor: colors.border, margin: '12px 0' }} />

      {/* PIE: Dirección y Fecha - Small text, subtle */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* DIRECCIÓN */}
        {chofer.direccion && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
            <MapPin size={12} strokeWidth={2} color={colors.textLabel} style={{ flexShrink: 0, marginTop: '2px' }} />
            <p style={{ 
              margin: 0, 
              fontSize: '11px', 
              color: colors.textLabel, 
              lineHeight: '1.4',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}>
              {chofer.direccion}
            </p>
          </div>
        )}
        
        {/* FECHA INGRESO */}
        {chofer.fecha_ingreso && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <Calendar size={12} strokeWidth={2} color={colors.textLabel} style={{ flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: '11px', color: colors.textLabel }}>
              {formatearFecha(chofer.fecha_ingreso)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export const TarjetaChofer = memo(TarjetaChoferComponent);
