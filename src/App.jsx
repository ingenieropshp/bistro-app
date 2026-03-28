import { useState, useEffect } from 'react'; 
import { RegistrationForm } from './components/RegistrationForm';
import { useLocation } from './hooks/useLocation';
import { doc, onSnapshot } from "firebase/firestore";
import { db } from './services/firebaseConfig'; 
import './App.css';

function App() {
  const [hasNotified, setHasNotified] = useState(false);
  const [bistroLoc, setBistroLoc] = useState(null);

  // 1. Sincronización con Firebase (Documento: 'ubicacion' en minúsculas)
  useEffect(() => {
    // Importante: Asegurar que el path coincida exactamente con Firestore
    const docRef = doc(db, "configuracion", "ubicacion");
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Solo actualizamos si tenemos datos válidos para evitar re-renders innecesarios
        if (data && typeof data.lat === 'number') {
          console.log("📍 Datos de ubicación recibidos:", data);
          setBistroLoc(data);
        }
      } else {
        console.warn("⚠️ No se encontró el documento 'configuracion/ubicacion'");
      }
    }, (error) => {
      console.error("❌ Error Firebase:", error);
    });

    return () => unsubscribe(); 
  }, []);

  // 2. Hook de localización - Desestructuración correcta
  const { distance: distancia, error: geoError } = useLocation(bistroLoc?.lat, bistroLoc?.lon);

  const abrirMapa = () => {
    if (!bistroLoc?.lat) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${bistroLoc.lat},${bistroLoc.lon}`;
    window.open(url, '_blank');
  };

  // 3. Lógica de notificaciones y proximidad
  useEffect(() => {
    // Validamos que distancia sea número y bistroLoc no sea null
    if (bistroLoc && typeof distancia === 'number') {
      const radioAviso = Number(bistroLoc.radioAviso) || 800;

      if (distancia <= radioAviso && !hasNotified) {
        if ("Notification" in window) {
          if (Notification.permission === "granted") {
            new Notification("¡Ya casi llegas! 🥂", {
              body: `Estás a menos de ${radioAviso}m de Bistro. ¡Pasa por tu sorpresa!`,
              icon: "/favicon.ico"
            });
            setHasNotified(true);
          } else if (Notification.permission !== "denied") {
            Notification.requestPermission();
          }
        }
      } 
      
      // Reset si se aleja más de 100m del radio
      if (distancia > (radioAviso + 100)) {
          setHasNotified(false);
      }
    }
  }, [distancia, hasNotified, bistroLoc]);

  return (
    <div className="main-wrapper">
      <header className="animate-fade-in" style={{ textAlign: 'center', marginBottom: '3rem', marginTop: '2rem' }}>
        <h1 className="bistro-title" style={{ fontSize: '3rem', fontWeight: '900', letterSpacing: '-0.05em' }}>
          101 BISTRO<span style={{ color: 'var(--accent)' }}>.</span>
        </h1>
      </header>

      {/* Alerta de Error de GPS */}
      {geoError && (
        <div style={{ 
          background: 'rgba(255, 68, 68, 0.1)', 
          color: '#ff4444', 
          padding: '10px', 
          borderRadius: '8px',
          textAlign: 'center', 
          fontSize: '11px', 
          marginBottom: '1.5rem',
          border: '1px solid #ff4444' 
        }}>
          ⚠️ {geoError.includes("denied") ? "Activa el GPS para disfrutar la experiencia" : geoError}
        </div>
      )}

      {/* UI de Distancia mejorada con validación de tipo */}
      {typeof distancia === 'number' && bistroLoc ? (
        <div 
          className={`proximity-badge ${distancia <= (bistroLoc.radioAviso || 800) ? 'near' : ''} animate-fade-in`}
          onClick={abrirMapa}
          style={{ cursor: 'pointer', userSelect: 'none', marginBottom: '2rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center' }}>
            <span style={{ fontSize: '1.5rem' }}>
              {distancia <= (bistroLoc.radioAviso || 800) ? '✨' : '📍'}
            </span>
            <div style={{ textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.1em' }}>
                {distancia <= (bistroLoc.radioAviso || 800) ? '¡HAS LLEGADO!' : 'ESTÁS A (TOCA PARA VER)'}
              </p>
              
              <p style={{ margin: 0, fontWeight: '900', color: 'var(--text-h)', fontSize: '1.2rem' }}>
                {distancia >= 1000 
                  ? `${(distancia / 1000).toFixed(1)} km` 
                  : `${Math.round(distancia)} metros`
                }
              </p>
            </div>
          </div>
          {distancia <= (bistroLoc.radioAviso || 800) && (
            <div className="gift-label animate-pulse" style={{ marginTop: '0.5rem', fontSize: '11px', fontWeight: '800', color: 'var(--accent)' }}>
              🎁 RECLAMA TU CORTESÍA EN BARRA
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.5, fontSize: '12px' }}>
          {!geoError ? (
            <div className="loading-spinner">Sincronizando ubicación...</div>
          ) : (
            "Esperando señal GPS..."
          )}
        </div>
      )}

      <main className="animate-fade-in">
        <RegistrationForm />
      </main>
      
      <footer style={{ marginTop: '4rem', opacity: 0.3, fontSize: '9px', letterSpacing: '0.4em', fontWeight: '900', textAlign: 'center', paddingBottom: '2rem' }}>
        BISTRO CONNECT SYSTEM
      </footer>
    </div>
  );
}

export default App;