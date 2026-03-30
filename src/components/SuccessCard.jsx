export const SuccessCard = ({ restauranteId, nombreRestaurante, nombreCliente = "amigo" }) => {
  
  const handleCompartir = async () => {
    // 1. Codificamos el nombre para que funcione en una URL (ej: "Juan Pérez" -> "Juan%20Pérez")
    const nombreRef = encodeURIComponent(nombreCliente);
    
    // 2. Construimos la URL de referido incluyendo el restaurante y el nombre de quien invita
    const urlReferido = `${window.location.origin}/?r=${restauranteId}&ref=${nombreRef}`;
    
    const shareData = {
      title: `¡Regístrate en ${nombreRestaurante}!`,
      text: `¡Hola! Te invito a registrarte en ${nombreRestaurante}. Si vas de mi parte, ambos recibimos beneficios. 👇`,
      url: urlReferido,
    };

    try {
      // Intenta usar la API nativa de compartir (móviles)
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: Abre WhatsApp directamente con el texto y la URL
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareData.text + " " + urlReferido)}`;
        window.open(whatsappUrl, '_blank');
      }
    } catch (err) {
      console.log("Error al compartir:", err);
    }
  };

  return (
    <div className="registration-card animate-fade-in" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
      {/* Icono de regalo dinámico */}
      <div style={{ fontSize: '4.5rem', marginBottom: '1rem' }}>🎁</div>
      
      <h2 style={{ color: 'var(--accent)', marginBottom: '0.5rem', fontSize: '1.8rem' }}>
        ¡LISTO, {nombreCliente.toUpperCase()}!
      </h2>
      
      <p style={{ marginBottom: '1.5rem', lineHeight: '1.6', color: '#475569' }}>
        Ahora eres embajador de <strong>{nombreRestaurante}</strong>.<br />
        Comparte tu enlace para que tus amigos también reciban beneficios.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <button 
          onClick={handleCompartir}
          className="btn-submit"
          style={{ 
            background: '#25D366', 
            color: 'white',
            marginTop: '0.5rem', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '10px',
            boxShadow: '0 4px 15px rgba(37, 211, 102, 0.3)',
            border: 'none',
            borderRadius: '8px',
            padding: '12px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>📢</span> INVITAR UN AMIGO
        </button>

        <button 
          onClick={() => window.location.reload()} 
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: '#94a3b8', 
            cursor: 'pointer',
            fontSize: '0.9rem',
            textDecoration: 'underline',
            marginTop: '0.5rem'
          }}
        >
          Finalizar y volver
        </button>
      </div>
    </div>
  );
};