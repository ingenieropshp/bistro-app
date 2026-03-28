import { useState, useEffect } from 'react';

export const useLocation = (targetLat, targetLon) => {
  const [distance, setDistance] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 1. CLÁUSULA DE GUARDA MEJORADA:
    // Evita procesar si los valores son nulos, indefinidos, strings vacíos o "NaN"
    const tLat = parseFloat(targetLat);
    const tLon = parseFloat(targetLon);

    if (isNaN(tLat) || isNaN(tLon)) {
      console.warn("useLocation: Coordenadas de destino no válidas o cargando...");
      setDistance(null);
      return;
    }

    if (!navigator.geolocation) {
      setError("Geolocalización no soportada");
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    };

    const watchId = navigator.geolocation.watchPosition(
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
        setError(err.message);
        console.warn(`Error GPS (${err.code}): ${err.message}`);
      },
      options
    );

    return () => navigator.geolocation.clearWatch(watchId);
    
  }, [targetLat, targetLon]);

  // Retornamos tanto la distancia como el error para mejor diagnóstico
  return { distance, error }; 
};