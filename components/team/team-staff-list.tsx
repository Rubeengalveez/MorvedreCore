import { Avatar } from "@/components/ui/avatar";
import { Silbato } from "@/components/brand/pictograms";
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
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <Silbato
          className="h-5 w-5"
          accent={teamColor}
        />
        <h2 className="font-display text-lg font-bold text-brand-deep">
          Cuerpo técnico
        </h2>
      </div>
      {staff.length === 0 ? (
        <div className="rounded-md border border-dashed border-ink-300 bg-paper p-5 text-center text-sm leading-relaxed text-ink-600">
          Aún no hay cuerpo técnico asignado. Cuando el admin lo asigne,
          aparecerá aquí.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {staff.map((member) => (
            <li
              key={`${member.profile_id}-${member.role}`}
              className="flex items-center gap-3 rounded-md border border-ink-300 bg-paper p-3"
            >
              <Avatar
                src={member.photo_url}
                name={member.full_name}
                size={48}
              />
              <div className="flex flex-1 flex-col">
                <span className="font-display text-base font-bold leading-tight text-brand-deep">
                  {member.full_name}
                </span>
                <span className="text-sm text-ink-600">
                  {ROLE_LABELS[member.role] ?? member.role}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
