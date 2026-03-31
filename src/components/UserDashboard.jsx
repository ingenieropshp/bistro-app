import { useState, useEffect } from 'react';
import { db } from '../services/firebaseConfig';
// Se agregaron collection y addDoc a los imports
import { doc, getDoc, updateDoc, increment, serverTimestamp, collection, addDoc } from "firebase/firestore";
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

export const UserDashboard = ({ restauranteId, clienteId, nombreRestaurante }) => {
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
        } else {
          console.warn("Cliente no encontrado en Firebase. Limpiando datos obsoletos...");
          const registros = JSON.parse(localStorage.getItem("bistro_multisede") || "{}");
          delete registros[restauranteId];
          localStorage.setItem("bistro_multisede", JSON.stringify(registros));
          window.location.reload();
        }
      } catch (error) {
        console.error("Error al cargar perfil:", error);
        alert("Error de conexión. Por favor, recarga la página.");
      }
    };
    fetchCliente();
  }, [clienteId, restauranteId]);

  const obtenerDiasRestantes = () => {
    if (!cliente || !cliente.fechaCumplimiento) return null;
    const fechaInicio = cliente.fechaCumplimiento.toDate();
    const fechaVencimiento = new Date(fechaInicio);
    fechaVencimiento.setDate(fechaInicio.getDate() + 30); 
    const hoy = new Date();
    const diferencia = fechaVencimiento - hoy;
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
  };

  const diasRestantes = obtenerDiasRestantes();

  const enviarRecordatorioWhatsApp = () => {
    const mensaje = 
      `*¡FELICIDADES!* 🎉\n\n` +
      `Has completado tus 20 puntos en *${nombreRestaurante}*.\n\n` +
      `🎫 *CUPÓN DE PREMIO*\n` +
      `Código: ${clienteId.substring(0, 5).toUpperCase()}\n\n` +
      `⚠️ *No olvides presentar este mensaje* al mesero para reclamar tu beneficio.\n\n` +
      `Tienes ${diasRestantes} días a partir de hoy. ¡Te esperamos! 🍕`;

    const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

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

        // --- REGISTRO PARA EL DUEÑO (MÉTRICAS) ---
        try {
          await addDoc(collection(db, "metricas_proximidad"), {
            cliente: cliente?.nombre || "Anónimo",
            restaurante: nombreRestaurante,
            restauranteId: restauranteId,
            distancia: Math.round(distMetros),
            dentroDelRango800: distMetros <= 800,
            esExitoTotal: distMetros <= radioAviso,
            fecha: serverTimestamp()
          });
        } catch (err) {
          console.error("Error al guardar métricas:", err);
        }
        // ------------------------------------------

        if (distMetros <= radioAviso) {
          setEsCerca(true);
          setMostrarPin(true);
        } else {
          alert(`📍 Estás fuera del rango permitido. Distancia actual: ${distMetros.toFixed(0)}m.`);
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
        alert("🎉 ¡FELICIDADES! Has llegado a 20 puntos.");
      } else {
        alert("✅ ¡Puntos sumados correctamente!");
      }
      
      setMostrarPin(false);
      setPinIngresado("");
      setEsCerca(false);
    } catch (error) {
      console.error("Error en validación:", error);
    }
    setProcesando(false);
  };

  const compartirInvitacion = async () => {
    const shareData = {
      title: `¡Únete a ${nombreRestaurante}!`,
      text: `¡Hola! Me registré en ${nombreRestaurante}. Usa mi enlace para que ambos recibamos beneficios:`,
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
      
      <p className="subtitle">Ahora eres embajador de <strong>{nombreRestaurante}</strong>.</p>

      {cliente.reclamoPendiente && (
        <div className="coupon-card-container animate-bounce-slow">
          <div className="coupon-card">
            <div className="coupon-left">
              <span className="coupon-brand">{nombreRestaurante}</span>
              <div className="coupon-main-content">
                <h3>¡VALE POR 1 PREMIO!</h3>
                <p>Presenta este código en caja</p>
              </div>
              <div className="coupon-footer">
                <span>{diasRestantes > 0 ? `Vence en: ${diasRestantes} días` : "⚠️ CUPÓN VENCIDO"}</span>
              </div>
            </div>
            <div className="coupon-right">
              <div className="coupon-id">
                {clienteId.substring(0, 5).toUpperCase()}
              </div>
            </div>
            <div className="punch-hole-top"></div>
            <div className="punch-hole-bottom"></div>
          </div>
          
          <button 
            onClick={enviarRecordatorioWhatsApp}
            className="btn-whatsapp-remind"
          >
            📩 Guardar cupón en WhatsApp
          </button>
        </div>
      )}

      <div className="points-card">
        <span className="points-label">TUS PUNTOS ACTUALES</span>
        <span className="points-value">{cliente.puntos || 0}</span>
      </div>

      <div className="actions-stack">
        {!mostrarPin ? (
          <button onClick={validarUbicacion} disabled={procesando} className="btn-primary">
            {procesando ? "VALIDANDO UBICACIÓN..." : "📍 CONFIRMAR LLEGADA (+2)"}
          </button>
        ) : (
          <div className="pin-container animate-fade-in bg-white p-6 rounded-2xl shadow-inner border-2 border-indigo-100 mt-4">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3 text-center">Validación de Consumo</p>
            <input
              type="tel" pattern="[0-9]*" maxLength="4"
              value={pinIngresado}
              onChange={(e) => setPinIngresado(e.target.value.replace(/\D/g, ""))}
              placeholder="0000"
              className="w-full text-center text-4xl font-black tracking-[1rem] py-3 border-b-4 border-indigo-500 focus:outline-none bg-transparent mb-6"
            />
            <div className="flex gap-3">
              <button onClick={() => {setMostrarPin(false); setPinIngresado("");}} className="flex-1 py-3 text-gray-400 font-semibold">Cancelar</button>
              <button onClick={manejarConfirmacionFinal} disabled={pinIngresado.length < 4 || procesando} className="flex-[2] py-3 bg-green-500 text-white rounded-xl font-bold shadow-lg disabled:opacity-50">
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