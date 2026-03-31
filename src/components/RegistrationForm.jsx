import { useState } from 'react';
import { db } from '../services/firebaseConfig';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs 
} from "firebase/firestore";

// Recibe onSuccess, restaurantId y referidoPor desde App.js
export const RegistrationForm = ({ onSuccess, restaurantId, referidoPor }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    fechaNacimiento: ''
  });
  const [loading, setLoading] = useState(false);

  // --- LÓGICA DE RANGO DE FECHAS ---
  const hoy = new Date();
  const fechaMaxima = hoy.toISOString().split("T")[0];
  const hace90Anios = new Date();
  hace90Anios.setFullYear(hoy.getFullYear() - 90);
  const fechaMinima = hace90Anios.toISOString().split("T")[0];

  // Manejador genérico de inputs
  const handleChange = (e) => {
    const { id, value } = e.target;
    
    let fieldName = id;
    if (id === 'whatsapp') fieldName = 'telefono';
    if (id === 'nacimiento') fieldName = 'fechaNacimiento';

    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 1. Validaciones básicas
    if (!formData.nombre.trim() || !formData.telefono.trim() || !formData.fechaNacimiento) {
      alert("Por favor, completa todos los campos.");
      return;
    }

    setLoading(true);

    try {
      // 2. VALIDAR SI EL CLIENTE YA EXISTE EN ESTE RESTAURANTE
      const q = query(
        collection(db, "clientes"),
        where("telefono", "==", formData.telefono.trim()),
        where("restauranteId", "==", restaurantId)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        alert("Ya estás registrado en este restaurante. ¡Solo puedes unirte una vez!");
        setLoading(false);
        return; 
      }

      // 3. SI NO EXISTE, PROCEDER CON EL REGISTRO (Cambios aplicados aquí)
      const nuevoCliente = {
        nombre: formData.nombre.trim(),
        telefono: formData.telefono.trim(),
        fechaNacimiento: formData.fechaNacimiento,
        restauranteId: restaurantId, // Se mantiene como indicaste en la captura
        puntos: 2, 
        ultimaVisita: serverTimestamp(),
        fechaRegistro: serverTimestamp(), 
        referidoPor: referidoPor || "Directo (QR local)",
        origen: "Web App"
      };

      // 4. GUARDAMOS EN FIREBASE Y CAPTURAMOS LA REFERENCIA
      const docRef = await addDoc(collection(db, "clientes"), nuevoCliente);
      
      // 5. NOTIFICAMOS ÉXITO AL PADRE (App.jsx)
      if (onSuccess) {
        onSuccess(docRef.id, formData.nombre.trim()); 
      }

    } catch (error) {
      console.error("Error detallado de Firebase:", error);
      if (error.code === 'permission-denied') {
        alert("Error de permisos: Revisa las reglas de seguridad en Firebase.");
      } else {
        alert("Hubo un problema al registrar. Por favor, intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="registration-card animate-fade-in">
      <header className="form-header">
        <h2 className="form-title">Crea tu Perfil</h2>
        <p className="form-subtitle">Únete y recibe beneficios exclusivos de Bistro.</p>
      </header>

      <div className="form-group">
        <label htmlFor="nombre">Nombre Completo</label>
        <input 
          id="nombre"
          type="text" 
          required
          placeholder="Ej: Juan Pérez"
          className="form-input"
          value={formData.nombre}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label htmlFor="whatsapp">Teléfono / WhatsApp</label>
        <input 
          id="whatsapp"
          type="tel" 
          required
          placeholder="Ej: 3206587850"
          className="form-input"
          value={formData.telefono}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label htmlFor="nacimiento">Fecha de Nacimiento</label>
        <input 
          id="nacimiento"
          type="date" 
          required
          min={fechaMinima}
          max={fechaMaxima}
          className="form-input"
          value={formData.fechaNacimiento}
          onChange={handleChange}
        />
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="btn-submit"
      >
        {loading ? (
          <div className="loader-container">
            <div className="spinner"></div>
            <span>Registrando...</span>
          </div>
        ) : (
          'Unirme al Club'
        )}
      </button>
      
      <footer className="form-footer-note">
        <span>🔒 Tus datos están protegidos</span>
      </footer>
    </form>
  );
};