export type Database = {
  public: {
    Tables: {
      parent_child_links: {
        Row: {
          parent_profile_id: string;
          child_profile_id: string;
          relation: Database["public"]["Enums"]["parent_relation"];
          created_at: string;
        };
        Insert: {
          parent_profile_id: string;
          child_profile_id: string;
          relation: Database["public"]["Enums"]["parent_relation"];
          created_at?: string;
        };
        Update: {
          parent_profile_id?: string;
          child_profile_id?: string;
          relation?: Database["public"]["Enums"]["parent_relation"];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "parent_child_links_parent_profile_id_fkey";
            columns: ["parent_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "parent_child_links_child_profile_id_fkey";
            columns: ["child_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profile_notification_prefs: {
        Row: {
          profile_id: string;
          notification_type: Database["public"]["Enums"]["notification_type"];
          enabled: boolean;
        };
        Insert: {
          profile_id: string;
          notification_type: Database["public"]["Enums"]["notification_type"];
          enabled?: boolean;
        };
        Update: {
          profile_id?: string;
          notification_type?: Database["public"]["Enums"]["notification_type"];
          enabled?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "profile_notification_prefs_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          auth_user_id: string | null;
          full_name: string;
          photo_url: string | null;
          birth_year: number | null;
          gender: Database["public"]["Enums"]["gender"];
          cap_number: number | null;
          license_active: boolean;
          phone_e164: string | null;
          email_contact: string | null;
          notes: string | null;
          team_color: string | null;
          school_enrolled: boolean;
          school_payment_paid: boolean;
          must_change_password: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          full_name: string;
          photo_url?: string | null;
          birth_year?: number | null;
          gender?: Database["public"]["Enums"]["gender"];
          cap_number?: number | null;
          license_active?: boolean;
          phone_e164?: string | null;
          email_contact?: string | null;
          notes?: string | null;
          team_color?: string | null;
          school_enrolled?: boolean;
          school_payment_paid?: boolean;
          must_change_password?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string | null;
          full_name?: string;
          photo_url?: string | null;
          birth_year?: number | null;
          gender?: Database["public"]["Enums"]["gender"];
          cap_number?: number | null;
          license_active?: boolean;
          phone_e164?: string | null;
          email_contact?: string | null;
          notes?: string | null;
          team_color?: string | null;
          school_enrolled?: boolean;
          school_payment_paid?: boolean;
          must_change_password?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      seasons: {
        Row: {
          id: string;
          label: string;
          start_date: string;
          end_date: string;
          is_current: boolean;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          label: string;
          start_date: string;
          end_date: string;
          is_current?: boolean;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          label?: string;
          start_date?: string;
          end_date?: string;
          is_current?: boolean;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      team_rosters: {
        Row: {
          team_id: string;
          player_id: string;
          squad_number: number | null;
          joined_at: string;
          left_at: string | null;
          created_at: string;
        };
        Insert: {
          team_id: string;
          player_id: string;
          squad_number?: number | null;
          joined_at?: string;
          left_at?: string | null;
          created_at?: string;
        };
        Update: {
          team_id?: string;
          player_id?: string;
          squad_number?: number | null;
          joined_at?: string;
          left_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_rosters_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_rosters_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      team_staff: {
        Row: {
          team_id: string;
          profile_id: string;
          role: Database["public"]["Enums"]["staff_role"];
          granted_by: string | null;
          granted_at: string;
        };
        Insert: {
          team_id: string;
          profile_id: string;
          role: Database["public"]["Enums"]["staff_role"];
          granted_by?: string | null;
          granted_at?: string;
        };
        Update: {
          team_id?: string;
          profile_id?: string;
          role?: Database["public"]["Enums"]["staff_role"];
          granted_by?: string | null;
          granted_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_staff_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_staff_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_staff_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      teams: {
        Row: {
          id: string;
          season_id: string;
          category_code: Database["public"]["Enums"]["category_code"];
          label: string;
          gender: Database["public"]["Enums"]["team_gender"];
          team_type: Database["public"]["Enums"]["team_type"];
          color: string;
          home_pool: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          season_id: string;
          category_code: Database["public"]["Enums"]["category_code"];
          label: string;
          gender: Database["public"]["Enums"]["team_gender"];
          team_type?: Database["public"]["Enums"]["team_type"];
          color?: string;
          home_pool?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          season_id?: string;
          category_code?: Database["public"]["Enums"]["category_code"];
          label?: string;
          gender?: Database["public"]["Enums"]["team_gender"];
          team_type?: Database["public"]["Enums"]["team_type"];
          color?: string;
          home_pool?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teams_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          profile_id: string;
          role: Database["public"]["Enums"]["user_role"];
          scope_team_id: string | null;
          granted_by: string | null;
          granted_at: string;
        };
        Insert: {
          profile_id: string;
          role: Database["public"]["Enums"]["user_role"];
          scope_team_id?: string | null;
          granted_by?: string | null;
          granted_at?: string;
        };
        Update: {
          profile_id?: string;
          role?: Database["public"]["Enums"]["user_role"];
          scope_team_id?: string | null;
          granted_by?: string | null;
          granted_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_scope_team_id_fkey";
            columns: ["scope_team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      training_blocks: {
        Row: {
          id: string;
          team_id: string;
          label: string;
          weekdays: number[];
          start_date: string;
          end_date: string;
          start_time: string;
          end_time: string;
          location: string | null;
          kind: string;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          label: string;
          weekdays: number[];
          start_date: string;
          end_date: string;
          start_time: string;
          end_time: string;
          location?: string | null;
          kind?: string;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          label?: string;
          weekdays?: number[];
          start_date?: string;
          end_date?: string;
          start_time?: string;
          end_time?: string;
          location?: string | null;
          kind?: string;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "training_blocks_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "training_blocks_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      training_sessions: {
        Row: {
          id: string;
          block_id: string | null;
          team_id: string;
          scheduled_at: string;
          duration_minutes: number;
          location: string | null;
          cancelled: boolean;
          cancellation_reason: string | null;
          cancelled_by: string | null;
          cancelled_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          block_id?: string | null;
          team_id: string;
          scheduled_at: string;
          duration_minutes?: number;
          location?: string | null;
          cancelled?: boolean;
          cancellation_reason?: string | null;
          cancelled_by?: string | null;
          cancelled_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          block_id?: string | null;
          team_id?: string;
          scheduled_at?: string;
          duration_minutes?: number;
          location?: string | null;
          cancelled?: boolean;
          cancellation_reason?: string | null;
          cancelled_by?: string | null;
          cancelled_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "training_sessions_block_id_fkey";
            columns: ["block_id"];
            isOneToOne: false;
            referencedRelation: "training_blocks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "training_sessions_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "training_sessions_cancelled_by_fkey";
            columns: ["cancelled_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      training_attendance: {
        Row: {
          session_id: string;
          player_id: string;
          present: boolean;
          reason: string | null;
          marked_by: string | null;
          marked_at: string;
          updated_at: string;
        };
        Insert: {
          session_id: string;
          player_id: string;
          present?: boolean;
          reason?: string | null;
          marked_by?: string | null;
          marked_at?: string;
          updated_at?: string;
        };
        Update: {
          session_id?: string;
          player_id?: string;
          present?: boolean;
          reason?: string | null;
          marked_by?: string | null;
          marked_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "training_attendance_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "training_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "training_attendance_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "training_attendance_marked_by_fkey";
            columns: ["marked_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      matches: {
        Row: {
          id: string;
          season_id: string;
          team_id: string;
          opponent: string;
          competition_type: string;
          is_home: boolean;
          location: string | null;
          pool_name: string | null;
          scheduled_at: string;
          status: string;
          logistics_enabled: boolean;
          notes: string | null;
          final_score_us: number | null;
          final_score_them: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          season_id: string;
          team_id: string;
          opponent: string;
          competition_type?: string;
          is_home?: boolean;
          location?: string | null;
          pool_name?: string | null;
          scheduled_at: string;
          status?: string;
          logistics_enabled?: boolean;
          notes?: string | null;
          final_score_us?: number | null;
          final_score_them?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          season_id?: string;
          team_id?: string;
          opponent?: string;
          competition_type?: string;
          is_home?: boolean;
          location?: string | null;
          pool_name?: string | null;
          scheduled_at?: string;
          status?: string;
          logistics_enabled?: boolean;
          notes?: string | null;
          final_score_us?: number | null;
          final_score_them?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "matches_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      match_availability: {
        Row: {
          player_id: string;
          date: string;
          available: boolean;
          reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          player_id: string;
          date: string;
          available?: boolean;
          reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          player_id?: string;
          date?: string;
          available?: boolean;
          reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "match_availability_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      match_callups: {
        Row: {
          match_id: string;
          player_id: string;
          cap_number: number | null;
          status: string;
          confirmed_at: string | null;
          source_team_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          match_id: string;
          player_id: string;
          cap_number?: number | null;
          status?: string;
          confirmed_at?: string | null;
          source_team_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          match_id?: string;
          player_id?: string;
          cap_number?: number | null;
          status?: string;
          confirmed_at?: string | null;
          source_team_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "match_callups_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_callups_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_callups_source_team_id_fkey";
            columns: ["source_team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      match_stats: {
        Row: {
          match_id: string;
          player_id: string;
          goals: number;
          exclusions: number;
          mvp: boolean;
          entered_by: string | null;
          entered_at: string;
          validated_by: string | null;
          validated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          match_id: string;
          player_id: string;
          goals?: number;
          exclusions?: number;
          mvp?: boolean;
          entered_by?: string | null;
          entered_at?: string;
          validated_by?: string | null;
          validated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          match_id?: string;
          player_id?: string;
          goals?: number;
          exclusions?: number;
          mvp?: boolean;
          entered_by?: string | null;
          entered_at?: string;
          validated_by?: string | null;
          validated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "match_stats_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_stats_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_stats_entered_by_fkey";
            columns: ["entered_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_stats_validated_by_fkey";
            columns: ["validated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          kind: string;
          title: string;
          body: string | null;
          href: string | null;
          read_at: string | null;
          related_match_id: string | null;
          related_training_session_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          kind: string;
          title: string;
          body?: string | null;
          href?: string | null;
          read_at?: string | null;
          related_match_id?: string | null;
          related_training_session_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          recipient_id?: string;
          kind?: string;
          title?: string;
          body?: string | null;
          href?: string | null;
          read_at?: string | null;
          related_match_id?: string | null;
          related_training_session_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_related_match_id_fkey";
            columns: ["related_match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_related_training_session_id_fkey";
            columns: ["related_training_session_id"];
            isOneToOne: false;
            referencedRelation: "training_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      profiles_public: {
        Row: {
          id: string;
          full_name: string;
          photo_url: string | null;
          birth_year: number | null;
          gender: Database["public"]["Enums"]["gender"];
          cap_number: number | null;
          license_active: boolean;
        };
        Relationships: [];
      };
    };
    Functions: {
      swap_current_season: {
        Args: { target_id: string };
        Returns: void;
      };
    };
    Enums: {
      user_role: "admin" | "coach" | "delegate" | "directiva" | "parent" | "player";
      gender: "male" | "female" | "other" | "prefer_not_to_say";
      parent_relation: "mother" | "father" | "legal_guardian" | "other";
      notification_type:
        | "convocatoria"
        | "match_reminder"
        | "training_cancelled"
        | "news_pinned"
        | "result_published"
        | "monthly_close";
      category_code:
        | "benjamin"
        | "alevin"
        | "infantil"
        | "cadete"
        | "juvenil"
        | "absoluto"
        | "escuela";
      team_type: "competitive" | "school";
      team_gender: "male" | "female" | "mixed";
      staff_role: "head_coach" | "assistant_coach" | "delegate" | "physical_trainer";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type DatabaseTableName = keyof Database["public"]["Tables"];

export type Tables<
  TName extends DatabaseTableName,
  TKind extends "Row" | "Insert" | "Update" = "Row",
> = Database["public"]["Tables"][TName][TKind];

export type Enums<TName extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][TName];
