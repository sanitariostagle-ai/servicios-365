export default async function handler(req, res) {
  // Solo permitimos consultas GET
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Método no permitido"
    });
  }

  const { token } = req.query;

  // Validamos que venga un token
  if (!token || typeof token !== "string") {
    return res.status(400).json({
      error: "Falta el token de la oferta"
    });
  }

  // Validación básica de UUID
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(token)) {
    return res.status(400).json({
      error: "Token inválido"
    });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Faltan variables de entorno de Supabase");

    return res.status(500).json({
      error: "Configuración del servidor incompleta"
    });
  }

  try {
    const select = [
      "id",
      "estado",
      "created_at",
      "solicitud_id",
      "tecnico_id",
      "solicitudes!inner(numero_solicitud,servicio,localidad,problema,urgencia)",
      "tecnicos!inner(nombre,especialidad,zona)"
    ].join(",");

    const url =
      `${supabaseUrl}/rest/v1/ofertas_trabajo` +
      `?access_token=eq.${encodeURIComponent(token)}` +
      `&select=${encodeURIComponent(select)}` +
      `&limit=1`;

    const respuesta = await fetch(url, {
      headers: {
        apikey: supabaseKey,
        Accept: "application/json"
      }
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.text();

      console.error(
        "Error consultando Supabase:",
        respuesta.status,
        detalle
      );

      return res.status(500).json({
        error: "No se pudo consultar la oferta"
      });
    }

    const datos = await respuesta.json();

    if (!Array.isArray(datos) || datos.length === 0) {
      return res.status(404).json({
        error: "Oferta no encontrada"
      });
    }

    res.setHeader("Cache-Control", "no-store");

    return res.status(200).json({
      ok: true,
      oferta: datos[0]
    });

  } catch (error) {
    console.error("Error interno:", error);

    return res.status(500).json({
      error: "Error interno del servidor"
    });
  }
}
