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

  // --- OTROS ESTADOS ---
  const [referidoPor, setReferidoPor] = useState("");
  const [bistroLoc, setBistroLoc] = useState(null);

  useEffect(() => {
    const ref = params.get('ref');
    if (ref) setReferidoPor(ref);
  }, [params]);

  // --- CARGA DE DATOS Y SUSCRIPCIÓN (VERSION OPTIMIZADA) ---
  useEffect(() => {
    if (!restauranteID) return;

    // 1. Configuración del canal de Realtime
    const channel = supabase
      .channel(`public:restaurantes:${restauranteID}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'restaurantes', 
          filter: `nombre=eq.${restauranteID}` 
        },
        (payload) => {
          console.log("Cambio detectado en Realtime:", payload.new);
          setBistroLoc(payload.new);
        }
      )
      .subscribe();

    // 2. Función de carga inicial separada
    const loadData = async () => {
      const { data, error } = await supabase
        .from('restaurantes')
        .select('*')
        .eq('nombre', restauranteID)
        .maybeSingle();

      if (error) {
        console.error("Error cargando restaurante:", error);
      } else if (data) {
        setBistroLoc(data);
      }
    };

    loadData();

    // 3. Limpieza garantizada al desmontar el componente
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
    localStorage.setItem("clienteId", nuevoId); 
    
    setClienteId(nuevoId);
    setNombreCliente(nombre);
    setIsRegisteredNow(true); 
  };

  const config = useMemo(() => ({
    radioAviso: Number(bistroLoc?.radio_aviso) || 800,
    mensaje: bistroLoc?.mensaje_promo || 'CORTESÍA DISPONIBLE',
    nombreBistro: bistroLoc?.nombre || restauranteID 
  }), [bistroLoc, restauranteID]);

  if (!bistroLoc) {
    return (
      <div className="main-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center', opacity: 0.6 }}>
          ⌛ Conectando con {restauranteID}...
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
            restauranteId={restauranteID} 
            clienteId={clienteId} 
            distancia={distancia}
            esCerca={esCerca}
            nombreRestaurante={config.nombreBistro}
          />
        ) : (
          <RegistrationForm 
            /* CAMBIO CLAVE: Enviamos el UUID que cargamos de la DB para evitar error de sintaxis */
            restaurantId={bistroLoc.id} 
            referidoPor={referidoPor} 
            onSuccess={(id, nombre) => handleSuccess(id, nombre)} 
          />
        )}
      </main>
      
      <footer className="version-footer" style={{ marginTop: '4rem', opacity: 0.4, textAlign: 'center', fontSize: '10px' }}>
        BISTRO CONNECT v2.5 - {config.nombreBistro}
      </footer>
    </div>
  );
}

export default App;