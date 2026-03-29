import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";

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
 * causados por bloqueos de red en la comunicación por WebSockets.
 */
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  // Opcional: puedes añadir 'useFetchStreams: false' si los errores persistieran, 
  // pero con Long Polling debería ser suficiente.
});

// Exportamos la app por si necesitas usar Auth o Storage más adelante
export default app;