export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido"
    });
  }

  try {
    const { token } = req.body || {};

    if (!token) {
      return res.status(400).json({
        error: "Falta el token de la oferta"
      });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: "Falta configurar Supabase"
      });
    }

    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json"
    };

    // Buscar la oferta mediante el token
    const ofertaResp = await fetch(
      `${supabaseUrl}/rest/v1/ofertas_trabajo` +
      `?access_token=eq.${encodeURIComponent(token)}` +
      `&select=id,estado,solicitud_id,tecnico_id` +
      `&limit=1`,
      { headers }
    );

    if (!ofertaResp.ok) {
      throw new Error("No se pudo consultar la oferta");
    }

    const ofertas = await ofertaResp.json();
    const oferta = ofertas[0];

    if (!oferta) {
      return res.status(404).json({
        error: "La oferta no existe o el enlace no es válido"
      });
    }

    if (oferta.estado !== "Pendiente") {
      return res.status(409).json({
        error: "Este trabajo ya fue respondido"
      });
    }

    // Buscar los datos del técnico
    let tecnico = null;

    for (const tabla of ["tecnicos", "solicitudes_tecnicos"]) {
      const tecnicoResp = await fetch(
        `${supabaseUrl}/rest/v1/${tabla}` +
        `?id=eq.${oferta.tecnico_id}` +
        `&select=*` +
        `&limit=1`,
        { headers }
      );

      if (tecnicoResp.ok) {
        const tecnicos = await tecnicoResp.json();

        if (tecnicos.length > 0) {
          tecnico = tecnicos[0];
          break;
        }
      }
    }

    if (!tecnico) {
      return res.status(404).json({
        error: "No se encontraron los datos del técnico"
      });
    }

    const nombreTecnico =
      tecnico.nombre ||
      tecnico.nombre_completo ||
      "Técnico asignado";

    const telefonoTecnico =
      tecnico.telefono ||
      tecnico.whatsapp ||
      tecnico.celular ||
      "";

    // Asignar la solicitud solamente si continúa disponible
    const solicitudResp = await fetch(
      `${supabaseUrl}/rest/v1/solicitudes` +
      `?id=eq.${oferta.solicitud_id}` +
      `&estado=eq.Nueva`,
      {
        method: "PATCH",
        headers: {
          ...headers,
          Prefer: "return=representation"
        },
        body: JSON.stringify({
          estado: "Asignada",
          tecnico_asignado: nombreTecnico,
          telefono_tecnico: telefonoTecnico
        })
      }
    );

    if (!solicitudResp.ok) {
      const detalle = await solicitudResp.text();
      console.error("Error solicitud:", detalle);

      return res.status(500).json({
        error: "No se pudo asignar el trabajo"
      });
    }

    const solicitudesActualizadas = await solicitudResp.json();

    if (solicitudesActualizadas.length === 0) {
      return res.status(409).json({
        error: "El trabajo ya fue tomado por otro técnico"
      });
    }

    // Marcar la oferta como aceptada
    const aceptarResp = await fetch(
      `${supabaseUrl}/rest/v1/ofertas_trabajo` +
      `?id=eq.${oferta.id}`,
      {
        method: "PATCH",
        headers: {
          ...headers,
          Prefer: "return=representation"
        },
        body: JSON.stringify({
          estado: "Aceptada",
          respondido_at: new Date().toISOString()
        })
      }
    );

    if (!aceptarResp.ok) {
      const detalle = await aceptarResp.text();
      console.error("Error oferta:", detalle);

      return res.status(500).json({
        error: "El trabajo se asignó, pero no se actualizó la oferta"
      });
    }

    return res.status(200).json({
      ok: true,
      mensaje: "Trabajo aceptado correctamente",
      solicitud: solicitudesActualizadas[0]
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Error interno del servidor"
    });
  }
}
