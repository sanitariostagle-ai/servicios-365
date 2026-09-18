export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Método no permitido"
    });
  }

  const { token } = req.query;

  if (!token || typeof token !== "string") {
    return res.status(400).json({
      error: "Falta el token de la oferta"
    });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      error: "Configuración del servidor incompleta"
    });
  }

  const headers = {
    apikey: supabaseKey,
    Accept: "application/json"
  };

  try {

    // 1. Buscar la oferta por token
    const ofertaResp = await fetch(
      `${supabaseUrl}/rest/v1/ofertas_trabajo` +
      `?access_token=eq.${encodeURIComponent(token)}` +
      `&select=id,estado,created_at,solicitud_id,tecnico_id` +
      `&limit=1`,
      { headers }
    );

    if (!ofertaResp.ok) {
      const detalle = await ofertaResp.text();
      console.error("Error oferta:", detalle);

      return res.status(500).json({
        error: "No se pudo consultar la oferta"
      });
    }

    const ofertas = await ofertaResp.json();

    if (!ofertas.length) {
      return res.status(404).json({
        error: "Oferta no encontrada"
      });
    }

    const oferta = ofertas[0];

    // 2. Buscar la solicitud
    const solicitudResp = await fetch(
      `${supabaseUrl}/rest/v1/solicitudes` +
      `?id=eq.${oferta.solicitud_id}` +
      `&select=id,numero_solicitud,servicio,localidad,problema,urgencia,estado` +
      `&limit=1`,
      { headers }
    );

    if (!solicitudResp.ok) {
      const detalle = await solicitudResp.text();
      console.error("Error solicitud:", detalle);

      return res.status(500).json({
        error: "No se pudo consultar la solicitud"
      });
    }

    const solicitudes = await solicitudResp.json();

    // 3. Buscar el técnico
    const tecnicoResp = await fetch(
      `${supabaseUrl}/rest/v1/tecnicos` +
      `?id=eq.${oferta.tecnico_id}` +
      `&select=id,nombre,especialidad,zona` +
      `&limit=1`,
      { headers }
    );

    if (!tecnicoResp.ok) {
      const detalle = await tecnicoResp.text();
      console.error("Error técnico:", detalle);

      return res.status(500).json({
        error: "No se pudo consultar el técnico"
      });
    }

    const tecnicos = await tecnicoResp.json();

    res.setHeader("Cache-Control", "no-store");

    return res.status(200).json({
      ok: true,
      oferta,
      solicitud: solicitudes[0] || null,
      tecnico: tecnicos[0] || null
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: "Error interno del servidor"
    });
  }
}
