import { useState, useEffect } from 'react';

export const useLocation = (targetLat, targetLon) => {
  const [distance, setDistance] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocalización no soportada");
      return;
    }

    // Configuración para máxima precisión
    const options = {
      enableHighAccuracy: true, // Usa GPS si está disponible
      timeout: 15000,           // 15 segundos de espera
      maximumAge: 0             // No usar datos viejos
    };

    // Usamos watchPosition para rastrear el movimiento en tiempo real
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        
        // --- FÓRMULA DE HAVERSINE ---
        const R = 6371000; // Radio de la Tierra en metros
        
        const dLat = (targetLat - latitude) * Math.PI / 180;
        const dLon = (targetLon - longitude) * Math.PI / 180;
        
        const lat1Rad = latitude * Math.PI / 180;
        const lat2Rad = targetLat * Math.PI / 180;

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1Rad) * Math.cos(lat2Rad) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
                  
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = Math.round(R * c);

        setDistance(d);
        setError(null); // Limpiar errores si obtenemos posición
      },
      (err) => {
        setError(err.message);
        console.warn(`Error GPS (${err.code}): ${err.message}`);
      },
      options
    );

    // Limpieza al desmontar el componente
    return () => navigator.geolocation.clearWatch(watchId);
  }, [targetLat, targetLon]);

  // Retornamos la distancia y el error por si quieres mostrar un mensaje
  return distance; 
};