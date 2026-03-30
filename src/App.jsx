import { useState, useEffect, useMemo } from 'react'; 
import { RegistrationForm } from './components/RegistrationForm';
import { SuccessCard } from './components/SuccessCard'; 
import { useLocation } from './hooks/useLocation';
import { doc, onSnapshot } from "firebase/firestore";
import { db } from './services/firebaseConfig'; 
import './App.css';

function App() {
  // 1. Extraemos el ID del restaurante o usamos uno por defecto
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const restauranteID = params.get('r') || '101 Bistro'; 

  // --- NUEVO: Estado para referidos ---
  const [referidoPor, setReferidoPor] = useState("");

  const [hasNotified, setHasNotified] = useState(() => {
    return localStorage.getItem('bistro_notified') === 'true';
  });
  
  const [bistroLoc, setBistroLoc] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);

  // --- NUEVO: Captura de parámetro 'ref' ---
  useEffect(() => {
    const ref = params.get('ref'); // Capturamos el nombre del amigo desde la URL (?ref=nombre)
    if (ref) setReferidoPor(ref);
  }, [params]);

  // 2. Carga Dinámica desde Firebase basada en restauranteID
  useEffect(() => {
    const docRef = doc(db, "restaurantes", restauranteID);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      try {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && typeof data.lat === 'number' && typeof data.lon === 'number') {
            setBistroLoc(data);
          }
        } else {
          console.error("El restaurante no existe en la base de datos");
        }
      } catch (err) {
        console.debug("Error procesando datos de Firebase:", err);
      }
    }, (error) => {
      console.error("❌ Error Firebase:", error);
    });

    return () => unsubscribe(); 
  }, [restauranteID]);

  // Lógica de ubicación
  const { distance: distancia, error: geoError } = useLocation(
    bistroLoc?.lat ?? null, 
    bistroLoc?.lon ?? null
  );

  // Permisos de Notificación
  useEffect(() => {
    const initNotifications = async () => {
      if ("Notification" in window && Notification.permission === "default") {
        try {
          await Notification.requestPermission();
        } catch (e) {
          console.debug("Petición de permiso ignorada");
        }
      }
    };
    initNotifications();
  }, []);

  // Configuración de textos
  const config = useMemo(() => ({
    radioAviso: Number(bistroLoc?.radioAviso) || 800,
    mensaje: bistroLoc?.mensajePromo || 'CORTESÍA DISPONIBLE',
    nombreBistro: bistroLoc?.nombre || '101 BISTRO'
  }), [bistroLoc]);

  // Lógica de Notificaciones Push
  useEffect(() => {
    if (bistroLoc && typeof distancia === 'number') {
      if (distancia <= config.radioAviso && !hasNotified) {
        if ("Notification" in window && Notification.permission === "granted") {
          try {
            new Notification(`¡Ya casi llegas! 🥂`, {
              body: `Estás a menos de ${config.radioAviso}m de ${config.nombreBistro}.`,
              icon: "https://res.cloudinary.com/dq5vhizl1/image/upload/v1773969689/cuuchedwncrpkkushoci.jpg"
            });
            setHasNotified(true);
            localStorage.setItem('bistro_notified', 'true');
          } catch (e) {
            console.warn("Error enviando notificación:", e);
          }
        }
      } 
      if (distancia > (config.radioAviso + 100) && hasNotified) {
          setHasNotified(false);
          localStorage.removeItem('bistro_notified');
      }
    }
  }, [distancia, hasNotified, bistroLoc, config]);

  const abrirMapa = () => {
    if (!bistroLoc?.lat) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${bistroLoc.lat},${bistroLoc.lon}`;
    window.open(url, '_blank');
  };

  // Pantalla de espera
  if (!bistroLoc) {
    return (
      <div className="main-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center', opacity: 0.6, fontSize: '14px' }}>
          <div className="loading-spinner" style={{ marginBottom: '1rem' }}>⌛</div>
          Conectando con {restauranteID}...
        </div>
      </div>
    );
  }

  // Renderizado de SuccessCard
  if (isRegistered) {
    return (
      <SuccessCard 
        restauranteId={restauranteID} 
        nombreRestaurante={bistroLoc?.nombre || "nuestro local"} 
      />
    );
  }

  const esCerca = typeof distancia === 'number' && distancia <= config.radioAviso;

  return (
    <div className="main-wrapper">
      <header className="animate-fade-in" style={{ textAlign: 'center', marginBottom: '3rem', marginTop: '2rem' }}>
        <h1 className="bistro-title" style={{ fontSize: '3.5rem', fontWeight: '900', letterSpacing: '-0.05em', textTransform: 'uppercase' }}>
            {config.nombreBistro}<span style={{ color: 'var(--accent)' }}>.</span>
        </h1>
      </header>

      {geoError && (
        <div className="error-alert">
          ⚠️ {geoError.includes("denied") ? "Activa el GPS para recibir tu regalo al llegar" : geoError}
        </div>
      )}

      {typeof distancia === 'number' ? (
        <div 
          className={`proximity-badge ${esCerca ? 'near' : ''} animate-fade-in`}
          onClick={abrirMapa}
          style={{ cursor: 'pointer', marginBottom: '2rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center' }}>
            <span style={{ fontSize: '1.5rem' }}>{esCerca ? '✨' : '📍'}</span>
            <div style={{ textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', opacity: 0.5 }}>
                {esCerca ? '¡BIENVENIDO!' : 'ESTÁS A'}
              </p>
              <p style={{ margin: 0, fontWeight: '900', color: 'var(--text-h)', fontSize: '1.2rem' }}>
                {distancia >= 1000 ? `${(distancia / 1000).toFixed(1)} km` : `${Math.round(distancia)} metros`}
              </p>
            </div>
          </div>
          {esCerca && (
            <div className="gift-label animate-pulse">
              🎁 {config.mensaje}
            </div>
          )}
        </div>
      ) : (
        <div className="gps-loader">Esperando señal de GPS...</div>
      )}
      

      <main className="animate-fade-in">
        {!isRegistered ? (
          <RegistrationForm 
            restaurantId={restauranteID} 
            referidoPor={referidoPor} // --- PASAMOS EL REFERIDO AL FORMULARIO ---
            onSuccess={() => setIsRegistered(true)} 
          />
        ) : null}
      </main>
      
      <footer className="version-footer">
        BISTRO CONNECT v2.4 - {config.nombreBistro}
      </footer>
    </div>
  );
}

export default App;