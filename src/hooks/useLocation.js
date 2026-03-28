import { useState, useEffect } from 'react';

export const useLocation = (targetLat, targetLon) => {
  const [distance, setDistance] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 1. CLÁUSULA DE GUARDA: 
    // Convertimos a número para asegurar que la matemática no falle.
    const tLat = parseFloat(targetLat);
    const tLon = parseFloat(targetLon);

    // Si los datos de Firebase aún no llegan o son inválidos, salimos.
    if (isNaN(tLat) || isNaN(tLon)) {
      setDistance(null);
      return;
    }

    if (!navigator.geolocation) {
      setError("Geolocalización no soportada en este navegador");
      return;
    }

    const options = {
      enableHighAccuracy: true, // Usa GPS real si está disponible
      timeout: 15000,           // Espera 15 seg antes de dar error
      maximumAge: 0             // No usar caché de ubicación vieja
    };

    let watchId = null;

    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          
          // --- FÓRMULA DE HAVERSINE ---
          const R = 6371000; // Radio de la Tierra en metros
          
          const dLat = (tLat - latitude) * Math.PI / 180;
          const dLon = (tLon - longitude) * Math.PI / 180;
          
          const lat1Rad = latitude * Math.PI / 180;
          const lat2Rad = tLat * Math.PI / 180;

          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                    
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const d = Math.round(R * c);

          if (!isNaN(d)) {
            setDistance(d);
            setError(null);
          }
        },
        (err) => {
          // Si el usuario deniega el permiso, lo notificamos a App.jsx
          setError(err.message);
          console.warn(`Error GPS (${err.code}): ${err.message}`);
        },
        options
      );
    } catch (e) {
      setError("Error al iniciar el seguimiento de ubicación");
    }

    // LIMPIEZA: Apaga el GPS cuando el componente se destruye o cambian las coordenadas
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
    
  }, [targetLat, targetLon]); // Se reinicia si cambias la ubicación en el Admin Panel

  return { distance, error }; 
};