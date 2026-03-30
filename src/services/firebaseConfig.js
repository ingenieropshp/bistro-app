import { initializeApp } from "firebase/app";
import { initializeFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// Configuración extraída de las variables de entorno (.env)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Inicialización de la aplicación Firebase
const app = initializeApp(firebaseConfig);

/**
 * Optimizamos la conexión de Firestore para 101 Bistro.
 * 'experimentalForceLongPolling' elimina los errores 403 (Uncaught in promise)
 */
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

/**
 * Habilitar persistencia de datos offline.
 * Esto permite que la app cargue instantáneamente y guarde registros 
 * aunque no haya internet en ese momento.
 */
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        // Múltiples pestañas abiertas, la persistencia solo funciona en una.
        console.warn("La persistencia de datos falló por múltiples pestañas.");
    } else if (err.code === 'unimplemented') {
        // El navegador no soporta esta característica.
        console.warn("El navegador no soporta persistencia offline.");
    }
});

// Exportamos la app por si necesitas usar Auth o Storage más adelante
export default app;