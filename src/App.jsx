import { useState, useEffect } from 'react'; 
import { RegistrationForm } from './components/RegistrationForm';
import { AdminPanel } from './components/AdminPanel'; 
import { useLocation } from './hooks/useLocation';
import { doc, onSnapshot } from "firebase/firestore";
import { db } from './services/firebaseConfig'; 
import './app.css';

function App() {
  const [view, setView] = useState('client'); 
  const [hasNotified, setHasNotified] = useState(false);
  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  // 1. ESTADO DE CONFIGURACIÓN (Ahora incluye password)
  const [bistroLoc, setBistroLoc] = useState({ 
    lat: 6.2442, 
    lon: -75.5812, 
    radioAviso: 100,
    password: "2026" // Se cargará de Firebase
  });

  useEffect(() => {
    const docRef = doc(db, "configuracion", "ubicacion");
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setBistroLoc(docSnap.data());
      }
    });
    return () => unsubscribe(); 
  }, []);

  const distancia = useLocation(bistroLoc.lat, bistroLoc.lon);

  useEffect(() => {
    if (distancia !== null && distancia <= bistroLoc.radioAviso && !hasNotified) {
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
    if (distancia > 200) setHasNotified(false);
  }, [distancia, hasNotified, bistroLoc.radioAviso]);

  // --- LÓGICA DE ACCESO DINÁMICA ---
  const verificarPassword = (e) => {
    e.preventDefault();
    // Compara con el password que bajó de Firebase
    if (passwordInput === String(bistroLoc.password)) {
      setView('admin');
      setMostrarLogin(false);
      setPasswordInput("");
    } else {
      alert("Contraseña incorrecta");
    }
  };

  if (view === 'admin') {
    return (
      <div className="animate-fade-in">
        <AdminPanel alCerrar={() => setView('client')} />
      </div>
    );
  }

  return (
    <div className="main-wrapper">
      <div className="nav-container">
        <button onClick={() => setMostrarLogin(true)} className="btn-admin-access">
          <span className="icon-dot animate-pulse"></span>
          <span>Panel Admin</span>
        </button>
      </div>

      {mostrarLogin && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div className="registration-card" style={{ maxWidth: '300px', textAlign: 'center' }}>
            <h2 className="bistro-title" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Admin Access</h2>
            <form onSubmit={verificarPassword}>
              <input 
                type="password" 
                className="form-input"
                placeholder="Contraseña..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                autoFocus
                style={{ textAlign: 'center', marginBottom: '1rem' }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setMostrarLogin(false)} className="btn-submit" style={{ background: '#444' }}>Cancelar</button>
                <button type="submit" className="btn-submit">Entrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <header className="animate-fade-in" style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 className="bistro-title" style={{ fontSize: '3rem', fontWeight: '900', letterSpacing: '-0.05em' }}>
          BISTRO<span style={{ color: 'var(--accent)' }}>.</span>
        </h1>
      </header>

      {distancia !== null && (
        <div className={`proximity-badge ${distancia <= bistroLoc.radioAviso ? 'near' : ''} animate-fade-in`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center' }}>
            <span style={{ fontSize: '1.5rem' }}>
              {distancia <= bistroLoc.radioAviso ? '✨' : '📍'}
            </span>
            <div style={{ textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.1em' }}>
                {distancia <= bistroLoc.radioAviso ? '¡HAS LLEGADO!' : 'ESTÁS A'}
              </p>
              <p style={{ margin: 0, fontWeight: '900', color: 'var(--text-h)', fontSize: '1.2rem' }}>
                {distancia >= 1000 
                  ? `${(distancia / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} km` 
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
      )}

      <main className="animate-fade-in">
        <RegistrationForm />
      </main>
      
      <footer style={{ marginTop: '4rem', opacity: 0.3, fontSize: '9px', letterSpacing: '0.4em', fontWeight: '900', textAlign: 'center' }}>
        BISTRO CONNECT SYSTEM
      </footer>
    </div>
  );
}

export default App;