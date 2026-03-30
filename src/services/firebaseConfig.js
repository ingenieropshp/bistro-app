import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";

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
 * 'experimentalForceLongPolling' elimina los errores 403.
 * 'localCache' con 'persistentMultipleTabManager' reemplaza a 'enableIndexedDbPersistence'
 * solucionando el aviso de múltiples pestañas abiertas.
 */
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// Exportamos la app por si necesitas usar Auth o Storage más adelante
export default app;