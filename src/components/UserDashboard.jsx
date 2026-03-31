import { useState, useEffect } from 'react';
import { db } from '../services/firebaseConfig';
import { doc, getDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import './UserDashboard.css'; 

const calcularDistancia = (lat1, lon1, lat2, lon2) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

export const UserDashboard = ({ restauranteId, clienteId }) => {
  const [cliente, setCliente] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [esCerca, setEsCerca] = useState(false);
  const [mostrarPin, setMostrarPin] = useState(false);
  const [pinIngresado, setPinIngresado] = useState("");

  useEffect(() => {
    const fetchCliente = async () => {
      if (!clienteId) return;
      try {
        const snap = await getDoc(doc(db, "clientes", clienteId));
        if (snap.exists()) {
          setCliente(snap.data());
        }
      } catch (error) {
        console.error("Error al cargar perfil:", error);
      }
    };
    fetchCliente();
  }, [clienteId]);

  // --- LÓGICA DE DÍAS RESTANTES ---
  const obtenerDiasRestantes = () => {
    if (!cliente || !cliente.fechaCumplimiento) return null;
    
    const fechaInicio = cliente.fechaCumplimiento.toDate();
    const fechaVencimiento = new Date(fechaInicio);
    fechaVencimiento.setDate(fechaInicio.getDate() + 30); 
    
    const hoy = new Date();
    const diferencia = fechaVencimiento - hoy;
    const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24));
    
    return dias;
  };

  const diasRestantes = obtenerDiasRestantes();

  const validarUbicacion = async () => {
    if (procesando) return;
    setProcesando(true);

    try {
      const restSnap = await getDoc(doc(db, "restaurantes", restauranteId));
      if (!restSnap.exists()) {
        alert("Error: No se encontró la ubicación del restaurante.");
        setProcesando(false);
        return;
      }

      const { lat, lon, radioAviso = 100 } = restSnap.data();

      navigator.geolocation.getCurrentPosition(async (pos) => {
        const distMetros = calcularDistancia(pos.coords.latitude, pos.coords.longitude, lat, lon) * 1000;

        if (distMetros <= radioAviso) {
          setEsCerca(true);
          setMostrarPin(true);
        } else {
          alert(`📍 Estás fuera del rango (${distMetros.toFixed(0)}m). Debes estar en el restaurante.`);
        }
        setProcesando(false);
      }, (error) => {
        alert("Por favor activa el GPS para confirmar tu llegada.");
        setProcesando(false);
      }, { enableHighAccuracy: true });

    } catch (e) {
      console.error(e);
      setProcesando(false);
    }
  };

  const manejarConfirmacionFinal = async () => {
    setProcesando(true);

    const hoy = new Date();
    const dia = String(hoy.getDate()).padStart(2, '0'); 
    const mes = String(hoy.getMonth() + 1).padStart(2, '0'); 
    const pinEsperado = dia + mes; 

    try {
      if (pinIngresado !== pinEsperado) {
        alert(`❌ PIN incorrecto. Solicita el código de hoy (${dia}/${mes}) al mesero.`);
        setProcesando(false);
        return;
      }

      const clienteRef = doc(db, "clientes", clienteId);
      const nuevosPuntos = (cliente.puntos || 0) + 2;

      const updates = {
        puntos: increment(2),
        ultimaVisita: serverTimestamp(),
      };

      if (nuevosPuntos >= 20) {
        updates.reclamoPendiente = true;
        updates.fechaCumplimiento = serverTimestamp();
      }

      await updateDoc(clienteRef, updates);

      setCliente(prev => ({ 
        ...prev, 
        puntos: nuevosPuntos,
        reclamoPendiente: nuevosPuntos >= 20 ? true : prev.reclamoPendiente,
        fechaCumplimiento: nuevosPuntos >= 20 ? hoy : prev.fechaCumplimiento
      }));
      
      if (nuevosPuntos >= 20) {
        alert("🎉 ¡FELICIDADES! Has llegado a 20 puntos. Tienes 30 días para reclamar tu premio.");
      } else {
        alert("✅ ¡Puntos sumados correctamente!");
      }
      
      setMostrarPin(false);
      setPinIngresado("");
      setEsCerca(false);

    } catch (error) {
      console.error("Error en validación:", error);
      alert("Hubo un error al conectar con el servidor.");
    }
    setProcesando(false);
  };

  const compartirInvitacion = async () => {
    const shareData = {
      title: `¡Únete a 101 Bistro!`,
      text: `¡Hola! Me registré en 101 Bistro. Usa mi enlace para que ambos recibamos beneficios:`,
      url: `${window.location.origin}/?r=${restauranteId}&ref=${encodeURIComponent(cliente?.nombre || 'Amigo')}`
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else window.open(`https://wa.me/?text=${encodeURIComponent(shareData.text + " " + shareData.url)}`, '_blank');
    } catch (err) { console.log(err); }
  };

  if (!cliente) return <div className="loading-container">Sincronizando...</div>;

  return (
    <div className="dashboard-container animate-fade-in">
      <span className="gift-icon">🎁</span>

      <h2 className="welcome-title">
        ¡LISTO, {cliente.nombre?.toUpperCase()}!
      </h2>
      
      <p className="subtitle">Ahora eres embajador de <strong>101 Bistro</strong>.</p>

      {/* ALERTA DE PREMIO PENDIENTE */}
      {cliente.reclamoPendiente && (
        <div className="bg-red-100 p-4 rounded-xl border-2 border-red-500 my-4 text-center animate-bounce">
          <p className="text-red-700 font-bold">¡TIENES UN PREMIO PENDIENTE!</p>
          <p className="text-red-600 text-sm">
            {diasRestantes > 0 
              ? `Vence en ${diasRestantes} días. ¡No lo pierdas!` 
              : "⚠️ TU BONO HA VENCIDO"}
          </p>
        </div>
      )}

      <div className="points-card">
        <span className="points-label">TUS PUNTOS ACTUALES</span>
        <span className="points-value">{cliente.puntos || 0}</span>
      </div>

      <div className="actions-stack">
        {!mostrarPin ? (
          <button 
            onClick={validarUbicacion}
            disabled={procesando}
            className="btn-primary"
          >
            {procesando ? "VALIDANDO UBICACIÓN..." : "📍 CONFIRMAR LLEGADA (+2)"}
          </button>
        ) : (
          <div className="pin-container animate-fade-in bg-white p-6 rounded-2xl shadow-inner border-2 border-indigo-100 mt-4">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3 text-center">
              Validación de Consumo
            </p>
            
            <input
              type="tel"
              pattern="[0-9]*"
              maxLength="4"
              value={pinIngresado}
              onChange={(e) => setPinIngresado(e.target.value.replace(/\D/g, ""))}
              placeholder="0000"
              className="w-full text-center text-4xl font-black tracking-[1rem] py-3 border-b-4 border-indigo-500 focus:outline-none bg-transparent mb-6"
            />

            <div className="flex gap-3">
              <button 
                onClick={() => {setMostrarPin(false); setPinIngresado("");}}
                className="flex-1 py-3 text-gray-400 font-semibold"
              >
                Cancelar
              </button>
              <button 
                onClick={manejarConfirmacionFinal}
                disabled={pinIngresado.length < 4 || procesando}
                className="flex-[2] py-3 bg-green-500 text-white rounded-xl font-bold shadow-lg disabled:opacity-50"
              >
                {procesando ? "VERIFICANDO..." : "CONFIRMAR"}
              </button>
            </div>
          </div>
        )}

        <button 
          onClick={compartirInvitacion}
          className="btn-share"
          style={{ marginTop: mostrarPin ? '1.5rem' : '0' }}
        >
          📢 INVITAR UN AMIGO
        </button>
      </div>

      <p className="footer-text">
        Cada vez que nos visites, confirma tu llegada para ganar premios.
      </p>
    </div>
  );
};