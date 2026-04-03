import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const addData = async (table, data) => {
  try {
    const { data: result, error } = await supabase
      .from(table)
      .insert([
        { 
          ...data, 
          // Se usa fecha_registro para el timestamp de inserción
          fecha_registro: new Date().toISOString() 
        }
      ])
      .select(); // Devuelve el objeto insertado

    if (error) {
      // Captura errores específicos de la base de datos (columnas inexistentes, tipos de datos, etc.)
      console.error("Error detallado de Supabase:", error.message, error.details);
      throw error;
    }

    return result;
  } catch (err) {
    console.error("Error en la función addData:", err);
    throw err;
  }
};

export default supabase;