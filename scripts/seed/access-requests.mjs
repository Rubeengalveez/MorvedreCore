import { randomUUID } from "node:crypto";

import { admin, loadBatch, mergeBatch, resetRng } from "./base.mjs";

async function main() {
  resetRng();
  console.log("[access] Generando solicitudes de acceso en estados representativos...\n");

  const batch = loadBatch() ?? {};
  const approverId = batch.dirIds?.[0];
  const playerIds = batch.playerIds ?? [];
  if (!approverId || playerIds.length < 4) throw new Error("Faltan perfiles para las solicitudes.");

  const candidateId = randomUUID();
  const { error: candidateError } = await admin.from("profiles").insert({
    id: candidateId,
    auth_user_id: null,
    full_name: "Nicolás Peris Ferrer",
    birth_year: 2013,
    gender: "male",
    license_active: false,
    must_change_password: true,
  });
  if (candidateError) throw candidateError;

  const now = new Date();
  const approvedAt = new Date(now.getTime() - 5 * 86400000).toISOString();
  const approvedPlayerId = playerIds[2];
  const activatedParentId = batch.parentIds?.[0];
  const { data: linkedProfiles, error: linkedError } = await admin
    .from("profiles")
    .select("id, full_name, birth_year, gender")
    .in("id", [approvedPlayerId, activatedParentId].filter(Boolean));
  if (linkedError) throw linkedError;
  const linkedById = new Map((linkedProfiles ?? []).map((profile) => [profile.id, profile]));
  const approvedPlayer = linkedById.get(approvedPlayerId);
  const activatedParent = linkedById.get(activatedParentId);
  const requests = [
    {
      id: randomUUID(),
      email: "nicolas.peris@familia.test",
      full_name: "Nicolás Peris Ferrer",
      role: "player",
      birth_year: 2013,
      gender: "male",
      relation: null,
      status: "pending",
      candidate_profile_id: candidateId,
      approved_by_profile_id: null,
      approved_at: null,
      created_at: new Date(now.getTime() - 2 * 86400000).toISOString(),
    },
    {
      id: randomUUID(),
      email: "familia.soler@familia.test",
      full_name: "María Soler Gil",
      role: "parent",
      birth_year: 1984,
      gender: "female",
      relation: "mother",
      status: "pending",
      candidate_profile_id: null,
      approved_by_profile_id: null,
      approved_at: null,
      created_at: new Date(now.getTime() - 86400000).toISOString(),
    },
    {
      id: randomUUID(),
      email: "jugador.aprobado@familia.test",
      full_name: approvedPlayer?.full_name ?? "Jugador aprobado",
      role: "player",
      birth_year: approvedPlayer?.birth_year ?? 2010,
      gender: approvedPlayer?.gender ?? "male",
      relation: null,
      status: "approved",
      candidate_profile_id: approvedPlayerId,
      approved_by_profile_id: approverId,
      approved_at: approvedAt,
      created_at: new Date(now.getTime() - 8 * 86400000).toISOString(),
    },
    {
      id: randomUUID(),
      email: "familia.activada@familia.test",
      full_name: activatedParent?.full_name ?? "Familia activada",
      role: "parent",
      birth_year: activatedParent?.birth_year ?? 1981,
      gender: activatedParent?.gender ?? "female",
      relation: "legal_guardian",
      status: "activated",
      candidate_profile_id: activatedParentId ?? null,
      approved_by_profile_id: approverId,
      approved_at: approvedAt,
      created_at: new Date(now.getTime() - 12 * 86400000).toISOString(),
    },
  ];

  const { error: requestError } = await admin.from("access_requests").insert(requests);
  if (requestError) throw requestError;
  const { error: childError } = await admin.from("access_request_children").insert({
    request_id: requests[1].id,
    child_profile_id: playerIds[0],
  });
  if (childError) throw childError;

  mergeBatch({
    accessRequestIds: requests.map((request) => request.id),
    accessCandidateId: candidateId,
  });
  console.log(`[access] OK: ${requests.length} solicitudes y un candidato sin vincular.`);
}

main().catch((error) => {
  console.error("[access] FATAL:", error);
  process.exit(1);
});
