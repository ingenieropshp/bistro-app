import { useState, useEffect } from 'react'; 
import { RegistrationForm } from './components/RegistrationForm';
import { useLocation } from './hooks/useLocation';
import { doc, onSnapshot } from "firebase/firestore";
import { db } from './services/firebaseConfig'; 
import './App.css';

function App() {
  const [hasNotified, setHasNotified] = useState(false);

  // 1. ESTADO DE CONFIGURACIÓN (Inicia en null para recibir datos reales de Admin)
  const [bistroLoc, setBistroLoc] = useState(null);

  useEffect(() => {
    const docRef = doc(db, "configuracion", "ubicacion");
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log("Datos sincronizados desde Admin Panel:", data);
        setBistroLoc(data); 
      } else {
        console.warn("No se encontró configuración en el Panel Admin");
      }
    }, (error) => {
      console.error("Error de conexión con Firebase:", error);
    });

    return () => unsubscribe(); 
  }, []);

  const distancia = useLocation(bistroLoc?.lat, bistroLoc?.lon);

  const abrirMapa = () => {
    if (!bistroLoc) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${bistroLoc.lat},${bistroLoc.lon}`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    if (bistroLoc && distancia !== null && distancia <= bistroLoc.radioAviso && !hasNotified) {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("¡Ya casi llegas! 🥂", {
          body: `Estás a menos de ${bistroLoc.radioAviso}m de Bistro. ¡Pasa por tu sorpresa!`,
          icon: "/favicon.ico"
        });
      } else if ("Notification" in window && Notification.permission !== "denied") {
        Notification.requestPermission();
      }
      setHasNotified(true);
    } 
    if (distancia > (bistroLoc?.radioAviso + 100 || 200)) setHasNotified(false);
  }, [distancia, hasNotified, bistroLoc]);

  return (
    <div className="main-wrapper">
      <header className="animate-fade-in" style={{ textAlign: 'center', marginBottom: '3rem', marginTop: '2rem' }}>
        <h1 className="bistro-title" style={{ fontSize: '3rem', fontWeight: '900', letterSpacing: '-0.05em' }}>
         101 BISTRO<span style={{ color: 'var(--accent)' }}>.</span>
        </h1>
      </header>

      {distancia !== null && bistroLoc ? (
        <div 
          className={`proximity-badge ${distancia <= bistroLoc.radioAviso ? 'near' : ''} animate-fade-in`}
          onClick={abrirMapa}
          style={{ cursor: 'pointer', userSelect: 'none', marginBottom: '2rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center' }}>
            <span style={{ fontSize: '1.5rem' }}>
              {distancia <= bistroLoc.radioAviso ? '✨' : '📍'}
            </span>
            <div style={{ textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.1em' }}>
                {distancia <= bistroLoc.radioAviso ? '¡HAS LLEGADO!' : 'ESTÁS A (TOCA PARA VER)'}
              </p>
              
              <p style={{ margin: 0, fontWeight: '900', color: 'var(--text-h)', fontSize: '1.2rem' }}>
                {distancia >= 1000 
                  ? `${(distancia / 1000).toFixed(1)} km` 
                  : `${Math.round(distancia)} metros`
                }
              </p>
            </div>
          </div>
          {distancia <= bistroLoc.radioAviso && (
            <div className="gift-label animate-pulse" style={{ marginTop: '0.5rem', fontSize: '11px', fontWeight: '800', color: 'var(--accent)' }}>
              🎁 RECLAMA TU CORTESÍA EN BARRA
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.5, fontSize: '12px' }}>
          Sincronizando ubicación...
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