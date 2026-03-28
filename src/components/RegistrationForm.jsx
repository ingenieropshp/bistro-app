import { useState } from 'react';
import { db } from '../services/firebaseConfig';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export const RegistrationForm = () => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validación básica
    if (!formData.nombre.trim() || !formData.telefono.trim() || !formData.fechaNacimiento) {
      alert("Por favor, completa todos los campos.");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "clientes"), {
        nombre: formData.nombre.trim(),
        telefono: formData.telefono.trim(),
        fechaNacimiento: formData.fechaNacimiento,
        fechaRegistro: serverTimestamp() 
      });
      
      alert("¡Gracias! Ya eres parte de Bistro Connect.");
      setFormData({ nombre: '', telefono: '', fechaNacimiento: '' }); 
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Hubo un error al guardar tus datos. Inténtalo de nuevo.");
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
          autoComplete="name"
          placeholder="Ej: Juan Pérez"
          className="form-input"
          value={formData.nombre}
          onChange={(e) => setFormData({...formData, nombre: e.target.value})}
        />
      </div>

      <div className="form-group">
        <label htmlFor="whatsapp">Teléfono / WhatsApp</label>
        <input 
          id="whatsapp"
          type="tel" 
          required
          autoComplete="tel"
          placeholder="+57 300 000 0000"
          className="form-input"
          value={formData.telefono}
          onChange={(e) => setFormData({...formData, telefono: e.target.value})}
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
          onChange={(e) => setFormData({...formData, fechaNacimiento: e.target.value})}
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
            <span>Procesando...</span>
          </div>
        ) : (
          'Unirme a Bistro'
        )}
      </button>
      
      <footer className="form-footer-note">
        <span>🔒 Transacción Segura</span>
      </footer>
    </form>
  );
};