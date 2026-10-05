"use client";
import {
  TeamMemberPicker,
  TeamMembersList,
  type TeamStaffRole,
} from "@/components/team/team-member-manager";
export interface StaffOption {
  id: string;
  full_name: string;
}
export interface StaffAssignSheetProps {
  teamId: string;
  candidates: StaffOption[];
  triggerLabel?: string;
  assigned?: Array<{ profile_id: string; role: string }>;
}
export function StaffAssignSheet(props: StaffAssignSheetProps) {
  return <TeamMemberPicker {...props} kind="staff" />;
}
export interface StaffListProps {
  teamId: string;
  staff: Array<{ profile_id: string; role: TeamStaffRole; full_name: string }>;
  editable?: boolean;
}
export function StaffList({ teamId, staff, editable = true }: StaffListProps) {
  return (
    <TeamMembersList
      teamId={teamId}
      kind="staff"
      editable={editable}
      members={staff.map((row) => ({ ...row, id: row.profile_id }))}
    />
  );
}
