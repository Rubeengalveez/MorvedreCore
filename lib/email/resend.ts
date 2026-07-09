const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "galvillo9@gmail.com";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL;
const API_KEY = process.env.RESEND_API_KEY;

interface ResendErrorResponse {
  message?: string;
  name?: string;
}

function getRoleLabel(role: string) {
  return (
    {
      player: "Jugador",
      parent: "Padre/Madre",
      coach: "Entrenador",
      delegate: "Delegado",
      directiva: "Directiva",
      admin: "Admin",
    }[role] ?? role
  );
}

export async function sendAdminAccessRequestNotification({
  email,
  fullName,
  role,
}: {
  email: string;
  fullName: string;
  role: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!API_KEY || !FROM_EMAIL) {
    console.warn("[email] Resend no configurado. No se envia aviso de solicitud.");
    return { success: false, error: "Resend no configurado" };
  }

  const roleLabel = getRoleLabel(role);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: "Nueva solicitud de acceso - Morvedre Core",
        text: `Hola,

Has recibido una nueva solicitud de acceso en Morvedre Core.

Email: ${email}
Nombre: ${fullName}
Tipo: ${roleLabel}

Entra en /admin/access-requests para revisarla.
`,
        html: `<p>Hola,</p>
<p>Has recibido una nueva solicitud de acceso en Morvedre Core.</p>
<ul>
  <li><strong>Email:</strong> ${email}</li>
  <li><strong>Nombre:</strong> ${fullName}</li>
  <li><strong>Tipo:</strong> ${roleLabel}</li>
</ul>
<p>Entra en <strong>/admin/access-requests</strong> para revisarla.</p>`,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as ResendErrorResponse | null;
      const message = payload?.message ?? `HTTP ${response.status}`;
      console.error("[email] Error enviando notificacion:", message);
      return { success: false, error: message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("[email] Excepcion enviando notificacion:", message);
    return { success: false, error: message };
  }
}
