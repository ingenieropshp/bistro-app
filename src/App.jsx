import { useState, useEffect, useMemo } from 'react'; 
import { RegistrationForm } from './components/RegistrationForm';
import { SuccessCard } from './components/SuccessCard'; 
import { UserDashboard } from './components/UserDashboard'; 
import { useLocation } from './hooks/useLocation';
// IMPORTACIONES ACTUALIZADAS PARA LA QUERY
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from './services/firebaseConfig'; 
import './App.css';

function App() {
  // --- PARÁMETROS Y CONFIGURACIÓN ---
  const params = useMemo(() => new URLSearchParams(window.location.search), []);

  // Decodificación y limpieza del ID del restaurante
  const restauranteID = useMemo(() => {
    const rRaw = params.get('r');
    if (rRaw) {
      return decodeURIComponent(rRaw).trim();
    }
    return '101 Bistro';
  }, [params]);

  // --- ESTADOS DE USUARIO (Persistencia Multisede) ---
  const [clienteId, setClienteId] = useState(() => {
    const registros = JSON.parse(localStorage.getItem("bistro_multisede") || "{}");
    return registros[restauranteID] || null;
  });
  
  const [nombreCliente, setNombreCliente] = useState(""); 
  const [isRegisteredNow, setIsRegisteredNow] = useState(false); 

  // --- OTROS ESTADOS ---
  const [referidoPor, setReferidoPor] = useState("");
  const [bistroLoc, setBistroLoc] = useState(null);

  // Captura de referido
  useEffect(() => {
    const ref = params.get('ref');
    if (ref) setReferidoPor(ref);
  }, [params]);

  // --- CAMBIO APLICADO: Carga de datos del restaurante mediante QUERY por nombre ---
  useEffect(() => {
    if (!restauranteID) return;

    // En lugar de buscar por ID de documento, buscamos por el campo 'nombre'
    const q = query(collection(db, "restaurantes"), where("nombre", "==", restauranteID));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      try {
        if (!querySnapshot.empty) {
          // Tomamos el primer resultado que coincida
          const docSnap = querySnapshot.docs[0];
          const data = docSnap.data();
          if (data && typeof data.lat === 'number' && typeof data.lon === 'number') {
            setBistroLoc(data);
          }
        } else {
          console.warn(`No se encontró configuración para: "${restauranteID}"`);
        }
      } catch (err) {
        console.error("Error en Firebase:", err);
      }
    });
    return () => unsubscribe(); 
  }, [restauranteID]);

  // Lógica de ubicación
  const { distance: distancia, error: geoError } = useLocation(
    bistroLoc?.lat ?? null, 
    bistroLoc?.lon ?? null
  );

  // Lógica de éxito al registrarse
  const handleSuccess = (nuevoId, nombre) => {
    const registros = JSON.parse(localStorage.getItem("bistro_multisede") || "{}");
    registros[restauranteID] = nuevoId;
    
    localStorage.setItem("bistro_multisede", JSON.stringify(registros));
    localStorage.setItem("clienteId", nuevoId); 
    
    setClienteId(nuevoId);
    setNombreCliente(nombre);
    setIsRegisteredNow(true); 
  };

  // Configuración de textos
  const config = useMemo(() => ({
    radioAviso: Number(bistroLoc?.radioAviso) || 800,
    mensaje: bistroLoc?.mensajePromo || 'CORTESÍA DISPONIBLE',
    nombreBistro: bistroLoc?.nombre || restauranteID 
  }), [bistroLoc, restauranteID]);

  // --- RENDERIZADO CONDICIONAL ---

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

      {/* Indicador de Distancia */}
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
          />
        ) : (
          <RegistrationForm 
            restaurantId={restauranteID} 
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