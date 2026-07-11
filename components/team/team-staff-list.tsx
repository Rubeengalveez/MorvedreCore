import { Avatar } from "@/components/ui/avatar";
import type { StaffMember } from "@/server/queries/teams";

const ROLE_LABELS: Record<string, string> = {
  head_coach: "Entrenador principal",
  assistant_coach: "Entrenador asistente",
  delegate: "Delegado",
  physical_trainer: "Preparador físico",
};

export interface TeamStaffListProps {
  staff: StaffMember[];
  teamColor: string;
}

export function TeamStaffList({ staff, teamColor }: TeamStaffListProps) {
  return (
    <section aria-labelledby="team-staff-heading">
      <div className="mb-3 flex items-end justify-between gap-3 px-1">
        <div>
          <p className="text-pool-blue text-xs font-extrabold tracking-[0.12em] uppercase">
            Dirección deportiva
          </p>
          <h2
            id="team-staff-heading"
            className="font-display text-pool-deep text-xl font-extrabold"
          >
            Cuerpo técnico
          </h2>
        </div>
        <span className="text-ink-500 text-sm font-semibold tabular-nums">{staff.length}</span>
      </div>

      <ul className="border-ink-200 bg-paper-card divide-ink-200 divide-y overflow-hidden rounded-2xl border shadow-sm">
        {staff.map((member) => (
          <li
            key={`${member.profile_id}-${member.role}`}
            className="flex min-h-[72px] items-center gap-3 px-4 py-3"
          >
            <Avatar
              src={member.photo_url}
              name={member.full_name}
              size={46}
              teamColor={teamColor}
              className="border-ink-200"
            />
            <div className="min-w-0 flex-1">
              <p className="font-display text-pool-deep truncate text-base font-extrabold">
                {member.full_name}
              </p>
              <p className="text-ink-500 mt-0.5 text-xs">
                {ROLE_LABELS[member.role] ?? member.role}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
