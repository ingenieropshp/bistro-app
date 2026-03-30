import { useState } from 'react';
import { db } from '../services/firebaseConfig';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// Añadimos referidoPor a las props
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
    
    // 1. Validaciones de campos vacíos
    if (!formData.nombre.trim() || !formData.telefono.trim() || !formData.fechaNacimiento) {
      alert("Por favor, completa todos los campos.");
      return;
    }

    setLoading(true);
    try {
      // 2. Guardamos en la colección "clientes" vinculando el restaurantId y referidoPor
      await addDoc(collection(db, "clientes"), {
        nombre: formData.nombre.trim(),
        telefono: formData.telefono.trim(),
        fechaNacimiento: formData.fechaNacimiento,
        restauranteId: restaurantId || 'default', 
        // CAMBIO: Agregamos lógica de referido
        referidoPor: referidoPor || "Directo (QR local)",
        fechaRegistro: serverTimestamp(),
        origen: "Web App"
      });
      
      // 3. Notificamos éxito al componente padre pasando el nombre
      if (onSuccess) {
        onSuccess(formData.nombre.trim()); 
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