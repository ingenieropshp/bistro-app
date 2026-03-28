import { useState, useEffect } from 'react';

export const useLocation = (targetLat, targetLon) => {
  const [distance, setDistance] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 1. CLÁUSULA DE GUARDA: No ejecutar si no hay coordenadas de destino (evita NaN)
    if (targetLat === undefined || targetLat === null || targetLon === undefined || targetLon === null) {
      return;
    }

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
        
        // Convertimos a números por seguridad (en caso de que Firebase envíe strings)
        const tLat = Number(targetLat);
        const tLon = Number(targetLon);
        
        const dLat = (tLat - latitude) * Math.PI / 180;
        const dLon = (tLon - longitude) * Math.PI / 180;
        
        const lat1Rad = latitude * Math.PI / 180;
        const lat2Rad = tLat * Math.PI / 180;

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1Rad) * Math.cos(lat2Rad) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
                  
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = Math.round(R * c);

        // Solo actualizamos si el número es válido
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

    // Limpieza al desmontar el componente
    return () => navigator.geolocation.clearWatch(watchId);
    
    // El efecto se reinicia si las coordenadas de destino cambian en el Admin
  }, [targetLat, targetLon]);

  // Retornamos la distancia (puedes retornar { distance, error } si quieres mostrar errores en UI)
  return distance; 
};