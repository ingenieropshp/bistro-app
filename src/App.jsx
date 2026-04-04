import { useState, useEffect, useMemo } from 'react'; 
import { RegistrationForm } from './components/RegistrationForm';
import { SuccessCard } from './components/SuccessCard'; 
import { UserDashboard } from './components/UserDashboard'; 
import { useLocation } from './hooks/useLocation';

// IMPORTACIONES ACTUALIZADAS PARA SUPABASE
import { supabase } from './services/supabaseClient'; 
import './App.css';

function App() {
  // --- PARÁMETROS Y CONFIGURACIÓN ---
  const params = useMemo(() => new URLSearchParams(window.location.search), []);

  const restauranteID = useMemo(() => {
    const rRaw = params.get('r');
    if (rRaw) {
      return decodeURIComponent(rRaw).trim();
    }
    return '101 Bistro';
  }, [params]);

  // --- ESTADOS DE USUARIO ---
  const [clienteId, setClienteId] = useState(() => {
    const registros = JSON.parse(localStorage.getItem("bistro_multisede") || "{}");
    return registros[restauranteID] || null;
  });
  
  const [nombreCliente, setNombreCliente] = useState(""); 
  const [isRegisteredNow, setIsRegisteredNow] = useState(false); 
  const [isVerifyingUser, setIsVerifyingUser] = useState(true); // Nuevo: Para evitar bucles de carga

  // --- SOLUCIÓN: VERIFICACIÓN DE EXISTENCIA DEL USUARIO ---
  useEffect(() => {
    const verificarUsuarioEnDB = async () => {
      if (!clienteId) {
        setIsVerifyingUser(false);
        return;
      }

      const { data, error } = await supabase
        .from('clientes')
        .select('id')
        .eq('id', clienteId)
        .maybeSingle();

      // Si el usuario fue eliminado en el Admin, limpiamos el rastro local
      if (error || !data) {
        console.warn("Usuario no encontrado en DB, limpiando sesión local...");
        const registros = JSON.parse(localStorage.getItem("bistro_multisede") || "{}");
        delete registros[restauranteID];
        localStorage.setItem("bistro_multisede", JSON.stringify(registros));
        setClienteId(null);
      }
      setIsVerifyingUser(false);
    };

    verificarUsuarioEnDB();
  }, [clienteId, restauranteID]);

  // --- NUEVO: EFECTO PARA CAMBIO DE SEDE DINÁMICO ---
  useEffect(() => {
    const registros = JSON.parse(localStorage.getItem("bistro_multisede") || "{}");
    const idEnEstaSede = registros[restauranteID] || null;
    if (idEnEstaSede !== clienteId) {
      setClienteId(idEnEstaSede);
    }
  }, [restauranteID, clienteId]);

  // --- OTROS ESTADOS ---
  const [referidoPor, setReferidoPor] = useState("");
  const [bistroLoc, setBistroLoc] = useState(null);

  useEffect(() => {
    const ref = params.get('ref');
    if (ref) setReferidoPor(ref);
  }, [params]);

  // --- CARGA DE DATOS Y SUSCRIPCIÓN CORREGIDA ---
  useEffect(() => {
    if (!restauranteID) return;

    // 1. Carga inicial de datos
    const loadData = async () => {
      const { data, error } = await supabase
        .from('configuracion')
        .select('*')
        .ilike('nombre', restauranteID) 
        .maybeSingle();

      if (data) {
        setBistroLoc(data);
      }
    };

    loadData();

    // 2. Suscripción Realtime (Filtro corregido para usar el nombre de la sede)
    const channel = supabase
      .channel(`public:configuracion:sede:${restauranteID}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'configuracion'
          // Quitamos el filtro inline si da problemas y filtramos en el callback
        },
        (payload) => {
          // Verificamos que el cambio pertenezca a esta sede
          if (payload.new.nombre?.toLowerCase() === restauranteID.toLowerCase()) {
            console.log("📍 Ubicación actualizada por Admin:", payload.new);
            setBistroLoc(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restauranteID]);

  // Lógica de ubicación
  const { distance: distancia, error: geoError } = useLocation(
    bistroLoc?.lat ?? null, 
    bistroLoc?.lon ?? null
  );

  const handleSuccess = (nuevoId, nombre) => {
    const registros = JSON.parse(localStorage.getItem("bistro_multisede") || "{}");
    registros[restauranteID] = nuevoId;
    
    localStorage.setItem("bistro_multisede", JSON.stringify(registros));
    setClienteId(nuevoId);
    setNombreCliente(nombre);
    setIsRegisteredNow(true); 
  };

  const config = useMemo(() => ({
    radioAviso: Number(bistroLoc?.radio_aviso) || 800,
    mensaje: bistroLoc?.mensaje_promo || 'CORTESÍA DISPONIBLE',
    nombreBistro: bistroLoc?.nombre || restauranteID 
  }), [bistroLoc, restauranteID]);

  // --- RENDERIZADO ---

  // Si estamos conectando a la sede o verificando si el usuario aún existe
  if (!bistroLoc || isVerifyingUser) {
    return (
      <div className="main-wrapper" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="loader-spinner"></div>
        <div style={{ textAlign: 'center', opacity: 0.6, marginTop: '1rem' }}>
          ⌛ Sincronizando con {restauranteID}...
        </div>
      </div>
    );
  }

  if (isRegisteredNow) {
    return (
      <SuccessCard 
        restauranteId={restauranteID} 
        nombreRestaurante={config.nombreBistro} 
        nombreCliente={nombreCliente}
        onClose={() => setIsRegisteredNow(false)} 
      />
    );
  }

  const esCerca = typeof distancia === 'number' && distancia <= config.radioAviso;

  return (
    <div className="main-wrapper">
      <header style={{ textAlign: 'center', marginBottom: '2rem', marginTop: '2rem' }}>
        <h1 className="bistro-title" style={{ fontSize: '3.5rem', fontWeight: '900' }}>
            {config.nombreBistro}<span style={{ color: 'var(--accent)' }}>.</span>
        </h1>
        {referidoPor && <p style={{ opacity: 0.7 }}>Invitado por: <strong>{referidoPor}</strong></p>}
      </header>

      {geoError && <div className="error-alert">⚠️ {geoError}</div>}

      {/* Badge de Proximidad */}
      {typeof distancia === 'number' ? (
        <div className={`proximity-badge ${esCerca ? 'near' : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center' }}>
            <span style={{ fontSize: '1.5rem' }}>{esCerca ? '✨' : '📍'}</span>
            <div style={{ textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: '9px', fontWeight: 900 }}>{esCerca ? '¡BIENVENIDO!' : 'ESTÁS A'}</p>
              <p style={{ margin: 0, fontWeight: '900', fontSize: '1.2rem' }}>
                {distancia >= 1000 ? `${(distancia / 1000).toFixed(1)} km` : `${Math.round(distancia)} metros`}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="gps-loader">Buscando ubicación...</div>
      )}

      <main className="animate-fade-in" style={{ marginTop: '2rem' }}>
        {clienteId ? (
          <UserDashboard 
            restauranteId={bistroLoc.id} 
            clienteId={clienteId} 
            distancia={distancia}
            esCerca={esCerca}
            nombreRestaurante={config.nombreBistro}
          />
        ) : (
          <RegistrationForm 
            restaurantId={bistroLoc.id} 
            referidoPor={referidoPor} 
            onSuccess={(id, nombre) => handleSuccess(id, nombre)} 
          />
        )}
      </main>
      
      <footer className="version-footer" style={{ marginTop: '4rem', opacity: 0.4, textAlign: 'center', fontSize: '10px' }}>
        BISTRO CONNECT v2.6 - {config.nombreBistro}
      </footer>
    </div>
  );
}

export default App;