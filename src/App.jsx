import { useState, useEffect } from 'react'; 
import { RegistrationForm } from './components/RegistrationForm';
import { useLocation } from './hooks/useLocation';
import { doc, onSnapshot } from "firebase/firestore";
import { db } from './services/firebaseConfig'; 
import './App.css';

function App() {
  const [hasNotified, setHasNotified] = useState(false);
  const [bistroLoc, setBistroLoc] = useState(null);

  // 1. Sincronización en Tiempo Real con Firebase (con Cleanup optimizado)
  useEffect(() => {
    const docRef = doc(db, "configuracion", "ubicacion");
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      try {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && typeof data.lat === 'number' && typeof data.lon === 'number') {
            setBistroLoc(data);
          }
        }
      } catch (err) {
        console.debug("Error procesando datos de Firebase:", err);
      }
    }, (error) => {
      console.error("❌ Error Firebase:", error);
    });

    return () => unsubscribe(); 
  }, []);

  // 2. Hook de localización
  const { distance: distancia, error: geoError } = useLocation(
    bistroLoc?.lat ?? null, 
    bistroLoc?.lon ?? null
  );

  // 3. Ajuste: Pedir permiso de notificación de forma proactiva y segura
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

  // 4. Lógica de Notificación Push Geolocalizada
  useEffect(() => {
    if (bistroLoc && typeof distancia === 'number') {
      const radioAviso = Number(bistroLoc.radioAviso) || 800;

      if (distancia <= radioAviso && !hasNotified) {
        if ("Notification" in window && Notification.permission === "granted") {
          try {
            new Notification("¡Ya casi llegas! 🥂", {
              body: `Estás a menos de ${radioAviso}m de 101 Bistro.`,
              icon: "https://res.cloudinary.com/dq5vhizl1/image/upload/v1773969689/cuuchedwncrpkkushoci.jpg"
            });
            setHasNotified(true);
          } catch (e) {
            console.warn("Error enviando notificación:", e);
          }
        }
      } 
      
      // Resetear si se aleja (Margen de 100m para evitar rebotes de señal)
      if (distancia > (radioAviso + 100)) {
          setHasNotified(false);
      }
    }
  }, [distancia, hasNotified, bistroLoc]);

  const abrirMapa = () => {
    if (!bistroLoc?.lat) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${bistroLoc.lat},${bistroLoc.lon}`;
    window.open(url, '_blank');
  };

  // --- RENDERIZADO DE CARGA ---
  if (!bistroLoc) {
    return (
      <div className="main-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center', opacity: 0.6, fontSize: '14px' }}>
          <div className="loading-spinner" style={{ marginBottom: '1rem' }}>⌛</div>
          Estableciendo conexión con 101 Bistro...
        </div>
      </div>
    );
  }

  const esCerca = typeof distancia === 'number' && distancia <= (bistroLoc.radioAviso || 800);

  return (
    <div className="main-wrapper">
      <header className="animate-fade-in" style={{ textAlign: 'center', marginBottom: '3rem', marginTop: '2rem' }}>
        <h1 className="bistro-title" style={{ fontSize: '3.5rem', fontWeight: '900', letterSpacing: '-0.05em' }}>
           101 BISTRO<span style={{ color: 'var(--accent)' }}>.</span>
        </h1>
      </header>

      {/* Alerta de Error de GPS */}
      {geoError && (
        <div className="error-alert" style={{ 
          background: 'rgba(255, 68, 68, 0.1)', color: '#ff4444', padding: '12px', 
          borderRadius: '8px', textAlign: 'center', fontSize: '11px', marginBottom: '1.5rem', border: '1px solid #ff4444' 
        }}>
          ⚠️ {geoError.includes("denied") ? "Activa el GPS para recibir tu regalo al llegar" : geoError}
        </div>
      )}

      {/* UI de Proximidad */}
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
            <div className="gift-label animate-pulse" style={{ marginTop: '0.8rem', fontSize: '12px', fontWeight: '800', color: 'var(--accent)' }}>
              🎁 {bistroLoc.mensajePromo || 'CORTESÍA DISPONIBLE'}
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.5, fontSize: '12px' }}>
           Esperando señal de GPS...
        </div>
      )}

      <main className="animate-fade-in">
        <RegistrationForm />
      </main>
      
      <footer style={{ marginTop: '4rem', opacity: 0.2, fontSize: '8px', letterSpacing: '0.5em', fontWeight: '900', textAlign: 'center', paddingBottom: '2rem' }}>
        BISTRO CONNECT v2.1
      </footer>
    </div>
  );
}

export default App;