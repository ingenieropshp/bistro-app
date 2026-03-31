import { useEffect } from 'react';
import { db } from '../services/firebaseConfig';
import { doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";

// --- FUNCIÓN DE CÁLCULO DE DISTANCIA (Haversine) ---
const calcularDistancia = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
};

export const SuccessCard = ({ 
  restauranteId, 
  nombreRestaurante, 
  nombreCliente, 
  clienteId, 
  puntosActuales = 0,
  onClose // 1. Recibimos onClose para el botón continuar
}) => {
  
  // --- LÓGICA DE LLEGADA / PUNTOS CON GEOCERCA ---
  const manejarLlegada = async (id, puntos) => {
    try {
      const restRef = doc(db, "restaurantes", restauranteId);
      const restSnap = await getDoc(restRef);

      if (!restSnap.exists()) {
        console.error("Restaurante no encontrado");
        return;
      }

      const { lat: restLat, lon: restLon, radioAviso = 200 } = restSnap.data();

      navigator.geolocation.getCurrentPosition(async (position) => {
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;

        const distanciaKm = calcularDistancia(userLat, userLon, restLat, restLon);
        const distanciaMetros = distanciaKm * 1000;

        if (distanciaMetros <= radioAviso) {
          const nuevosPuntos = puntos + 2;
          const tienePremio = nuevosPuntos >= 20;
          const clienteRef = doc(db, "clientes", id);

          await updateDoc(clienteRef, {
            puntos: nuevosPuntos,
            ultimaVisita: serverTimestamp(),
            reclamoPendiente: tienePremio 
          });

          if (nuevosPuntos >= 18 && nuevosPuntos < 20) {
            alert("¡Estás a solo una visita de tu premio! 🌟");
          } else if (tienePremio) {
            alert("¡FELICIDADES! 🎉 Tienes 20 puntos. Avisa al personal para reclamar tu premio.");
          } else {
            alert("¡Gracias por visitarnos! Sumaste 2 puntos. ✨");
          }
        } else {
          console.log("📍 Fuera de rango para sumar puntos.");
        }
      }, (error) => {
        console.warn("❌ Ubicación no disponible:", error.message);
      }, { enableHighAccuracy: true });

    } catch (err) {
      console.error("Error al actualizar puntos:", err);
    }
  };

  useEffect(() => {
    if (clienteId && restauranteId) {
      manejarLlegada(clienteId, puntosActuales);
    }
  }, [clienteId]);

  const handleCompartir = async () => {
    const nombreRef = encodeURIComponent(nombreCliente);
    const urlReferido = `${window.location.origin}/?r=${restauranteId}&ref=${nombreRef}`;
    const shareData = {
      title: `¡Regístrate en ${nombreRestaurante}!`,
      text: `¡Hola! Te invito a registrarte en ${nombreRestaurante}. Si vas de mi parte, ambos recibimos beneficios. 👇`,
      url: urlReferido,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareData.text + " " + urlReferido)}`;
        window.open(whatsappUrl, '_blank');
      }
    } catch (err) {
      console.log("Error al compartir:", err);
    }
  };

  return (
    <div className="success-card-container animate-fade-in" style={{ 
      textAlign: 'center', 
      padding: '2.5rem 1.5rem',
      borderRadius: '15px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
      backgroundColor: '#fff',
      maxWidth: '400px',
      margin: 'auto'
    }}>
      <div style={{ fontSize: '4.5rem', marginBottom: '1rem' }}>🎁</div>
      
      {/* Usamos nombreCliente como en tu primer bloque */}
      <h2 style={{ color: 'var(--accent, #3b82f6)', marginBottom: '0.5rem', fontSize: '1.8rem' }}>
        ¡LISTO, {nombreCliente?.toUpperCase()}!
      </h2>
      
      {/* 2. Referencia dinámica al restaurante */}
      <p style={{ marginBottom: '1.5rem', lineHeight: '1.6', color: '#475569' }}>
        Ahora eres embajador de <strong>{nombreRestaurante || "nuestro restaurante"}</strong>.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <button 
          onClick={handleCompartir}
          className="btn-submit"
          style={{ 
            background: '#25D366', 
            color: 'white',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '10px',
            boxShadow: '0 4px 15px rgba(37, 211, 102, 0.3)',
            border: 'none',
            borderRadius: '8px',
            padding: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>📢</span> INVITAR UN AMIGO
        </button>

        {/* Botón Continuar usando la prop onClose */}
        <button 
          onClick={onClose || (() => window.location.reload())} 
          className="btn-confirmar"
          style={{ 
            background: '#3b82f6', 
            color: 'white',
            border: 'none', 
            borderRadius: '8px',
            padding: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '0.9rem',
            marginTop: '0.5rem'
          }}
        >
          CONTINUAR
        </button>
      </div>
    </div>
  );
};

export default SuccessCard;