export interface ProfileSummary {
  id: string;
  full_name: string;
  photo_url: string | null;
  birth_year: number | null;
  cap_number: number | null;
  team_color: string | null;
  must_change_password: boolean;
  calendar_token: string;
  is_active: boolean;
}
