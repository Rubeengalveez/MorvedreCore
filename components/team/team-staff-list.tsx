import { Avatar } from "@/components/ui/avatar";
import type { StaffMember } from "@/server/queries/teams";
import { AdaptivePlayerName } from "@/components/ui/adaptive-player-name";

import { TEAM_STAFF_LABELS } from "@/lib/domain/team-presentation";

export interface TeamStaffListProps {
  staff: StaffMember[];
  teamColor: string;
}

export function TeamStaffList({ staff, teamColor }: TeamStaffListProps) {
  return (
    <section aria-labelledby="team-staff-heading">
      <div className="mb-3 flex items-end justify-between gap-3 px-1">
        <div>
          <h2
            id="team-staff-heading"
            className="font-display text-pool-deep text-xl font-extrabold"
          >
            Cuerpo técnico
          </h2>
        </div>
        <span className="border-pool-deep/65 text-pool-deep rounded-lg border bg-white px-2.5 py-1 text-sm font-bold tabular-nums">
          {staff.length}
        </span>
      </div>

      <ul className="space-y-2">
        {staff.map((member) => (
          <li
            key={`${member.profile_id}-${member.role}`}
            className="border-pool-deep/65 flex min-h-[72px] items-center gap-3 rounded-xl border-2 bg-white px-4 py-3"
          >
            <Avatar
              src={member.photo_url}
              name={member.full_name}
              size={46}
              teamColor={teamColor}
              className="border-pool-deep/65"
            />
            <div className="min-w-0 flex-1">
              <p className="font-display text-pool-deep text-base font-extrabold">
                <AdaptivePlayerName name={member.full_name} />
              </p>
              <p className="text-pool-deep mt-1 text-sm font-semibold">
                {TEAM_STAFF_LABELS[member.role] ?? member.role}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
