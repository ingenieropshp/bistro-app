import { useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

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
  onClose 
}) => {
  
  const manejarLlegada = async (id, puntos) => {
    console.log("1. Iniciando validación para restaurante ID:", restauranteId);
    try {
      // Se mantiene la consulta a la tabla 'conexion' según tu base de datos
      const { data: restData, error: errorRest } = await supabase
        .from('conexion') 
        .select('latitud, longitud, radio_aviso')
        .eq('id', restauranteId) 
        .maybeSingle();

      if (errorRest || !restData) {
        console.error("2. Error: No se encontraron datos en la tabla 'conexion':", errorRest);
        return;
      }

      console.log("3. Datos de ubicación del restaurante obtenidos:", restData);
      const { latitud: restLat, longitud: restLon, radio_aviso = 200 } = restData;

      console.log("4. Solicitando ubicación al navegador...");
      
      navigator.geolocation.getCurrentPosition(async (position) => {
        console.log("5. Ubicación del usuario recibida con éxito.");
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;

        const distanciaKm = calcularDistancia(userLat, userLon, restLat, restLon);
        const distanciaMetros = distanciaKm * 1000;
        console.log(`6. Distancia calculada: ${distanciaMetros.toFixed(2)} metros.`);

        if (distanciaMetros <= radio_aviso) {
          const nuevosPuntos = puntos + 2;
          const tienePremio = nuevosPuntos >= 20;

          const { error: errorUpdate } = await supabase
            .from('clientes')
            .update({
              puntos: nuevosPuntos,
              ultima_visita: new Date().toISOString(),
              reclamo_pendiente: tienePremio 
            })
            .eq('id', id);

          if (errorUpdate) throw errorUpdate;

          if (nuevosPuntos >= 18 && nuevosPuntos < 20) {
            alert("¡Estás a solo una visita de tu premio! 🌟");
          } else if (tienePremio) {
            alert("¡FELICIDADES! 🎉 Tienes 20 puntos. Avisa al personal para reclamar tu premio.");
          } else {
            alert("¡Gracias por visitarnos! Sumaste 2 puntos por tu registro/visita. ✨");
          }
        } else {
          console.log("📍 Fuera de rango para sumar puntos automáticos.");
        }
      }, (error) => {
        console.warn("❌ Error de GPS (Causa):", error.message);
      }, { 
        enableHighAccuracy: true, 
        timeout: 15000,           // Espera hasta 15 segundos
        maximumAge: 60000         // Acepta una ubicación guardada de hasta 1 minuto de antigüedad
      });

    } catch (err) {
      console.error("Error general en manejarLlegada:", err);
    }
  };

  useEffect(() => {
    if (clienteId && restauranteId) {
      manejarLlegada(clienteId, puntosActuales);
    }
  }, [clienteId, restauranteId]);

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
      margin: '20px auto'
    }}>
      <div style={{ fontSize: '4.5rem', marginBottom: '1rem' }}>🎁</div>
      
      <h2 style={{ color: '#3b82f6', marginBottom: '0.5rem', fontSize: '1.8rem' }}>
        ¡LISTO, {nombreCliente?.toUpperCase()}!
      </h2>
      
      <p style={{ marginBottom: '1.5rem', lineHeight: '1.6', color: '#475569' }}>
        Ahora eres embajador de <strong>{nombreRestaurante || "nuestro restaurante"}</strong>.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <button 
          onClick={handleCompartir}
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

        <button 
          onClick={onClose || (() => window.location.reload())} 
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