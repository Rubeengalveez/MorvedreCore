import "server-only";

import { escapeHtml } from "@/lib/email/html";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "galvillo9@gmail.com";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL;
const API_KEY = process.env.RESEND_API_KEY;

interface ResendErrorResponse {
  message?: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string;
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
  attachments,
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: EmailAttachment[];
}): Promise<{ success: boolean; error?: string }> {
  if (!API_KEY || !FROM_EMAIL) {
    console.warn("[email] Resend no configurado.");
    return { success: false, error: "Resend no configurado" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject,
        text,
        html,
        attachments,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as ResendErrorResponse | null;
      const message = payload?.message ?? `HTTP ${response.status}`;
      console.error("[email] Error enviando email:", message);
      return { success: false, error: message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("[email] Excepcion enviando email:", message);
    return { success: false, error: message };
  }
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
  const roleLabel = getRoleLabel(role);
  const safeEmail = escapeHtml(email);
  const safeFullName = escapeHtml(fullName);
  const safeRoleLabel = escapeHtml(roleLabel);

  return sendEmail({
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
  <li><strong>Email:</strong> ${safeEmail}</li>
  <li><strong>Nombre:</strong> ${safeFullName}</li>
  <li><strong>Tipo:</strong> ${safeRoleLabel}</li>
</ul>
<p>Entra en <strong>/admin/access-requests</strong> para revisarla.</p>`,
  });
}
