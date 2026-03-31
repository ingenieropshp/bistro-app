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

export const SuccessCard = ({ restauranteId, nombreRestaurante, nombreCliente = "amigo", clienteId, puntosActuales = 0 }) => {
  
  // --- LÓGICA DE LLEGADA / PUNTOS CON GEOCERCA ---
  const manejarLlegada = async (id, puntos) => {
    try {
      // 1. Obtener la ubicación del restaurante desde Firestore
      const restRef = doc(db, "restaurantes", restauranteId);
      const restSnap = await getDoc(restRef);

      if (!restSnap.exists()) {
        console.error("Restaurante no encontrado");
        return;
      }

      const { lat: restLat, lon: restLon, radioAviso = 200 } = restSnap.data();

      // 2. Obtener la ubicación actual del usuario
      navigator.geolocation.getCurrentPosition(async (position) => {
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;

        // 3. Calcular distancia
        const distanciaKm = calcularDistancia(userLat, userLon, restLat, restLon);
        const distanciaMetros = distanciaKm * 1000;

        // 4. Validar si está en el rango (radioAviso en metros)
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
          alert("📍 Para sumar puntos debes estar en el establecimiento.");
        }
      }, (error) => {
        alert("❌ Necesitamos acceso a tu ubicación para validar tu visita y sumar puntos.");
        console.error(error);
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
    <div className="registration-card animate-fade-in" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
      <div style={{ fontSize: '4.5rem', marginBottom: '1rem' }}>🎁</div>
      <h2 style={{ color: 'var(--accent)', marginBottom: '0.5rem', fontSize: '1.8rem' }}>
        ¡LISTO, {nombreCliente.toUpperCase()}!
      </h2>
      <p style={{ marginBottom: '1.5rem', lineHeight: '1.6', color: '#475569' }}>
        Ahora eres embajador de <strong>{nombreRestaurante}</strong>.<br />
        Comparte tu enlace para que tus amigos también reciban beneficios.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <button 
          onClick={handleCompartir}
          className="btn-submit"
          style={{ 
            background: '#25D366', 
            color: 'white',
            marginTop: '0.5rem', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '10px',
            boxShadow: '0 4px 15px rgba(37, 211, 102, 0.3)',
            border: 'none',
            borderRadius: '8px',
            padding: '12px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>📢</span> INVITAR UN AMIGO
        </button>
        <button 
          onClick={() => window.location.reload()} 
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: '#94a3b8', 
            cursor: 'pointer',
            fontSize: '0.9rem',
            textDecoration: 'underline',
            marginTop: '0.5rem'
          }}
        >
          Finalizar y volver
        </button>
      </div>
    </div>
  );
};