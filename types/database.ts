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
      push_subscriptions: {
        Row: {
          id: string;
          profile_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          enabled: boolean;
          last_success_at: string | null;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          enabled?: boolean;
          last_success_at?: string | null;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          user_agent?: string | null;
          enabled?: boolean;
          last_success_at?: string | null;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey";
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
          end_at: string | null;
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
          end_at?: string | null;
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
          end_at?: string | null;
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
          travel_meeting_point: string | null;
          travel_compensation_cents: number;
          notes: string | null;
          final_score_us: number | null;
          final_score_them: number | null;
          mvp_player_id: string | null;
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
          travel_meeting_point?: string | null;
          travel_compensation_cents?: number;
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
          travel_meeting_point?: string | null;
          travel_compensation_cents?: number;
          notes?: string | null;
          final_score_us?: number | null;
          final_score_them?: number | null;
          mvp_player_id?: string | null;
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
      travel_offers: {
        Row: {
          id: string;
          match_id: string;
          driver_id: string;
          vehicle_label: string;
          seats_total: number;
          seats_taken: number;
          departure_from: string;
          departure_at: string;
          notes: string | null;
          cancelled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          driver_id: string;
          vehicle_label: string;
          seats_total: number;
          seats_taken?: number;
          departure_from: string;
          departure_at: string;
          notes?: string | null;
          cancelled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          driver_id?: string;
          vehicle_label?: string;
          seats_total?: number;
          seats_taken?: number;
          departure_from?: string;
          departure_at?: string;
          notes?: string | null;
          cancelled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "travel_offers_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "travel_offers_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      travel_reservations: {
        Row: {
          offer_id: string;
          match_id: string;
          player_id: string;
          created_at: string;
          cancelled_at: string | null;
        };
        Insert: {
          offer_id: string;
          match_id: string;
          player_id: string;
          created_at?: string;
          cancelled_at?: string | null;
        };
        Update: {
          offer_id?: string;
          match_id?: string;
          player_id?: string;
          created_at?: string;
          cancelled_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "travel_reservations_offer_id_fkey";
            columns: ["offer_id"];
            isOneToOne: false;
            referencedRelation: "travel_offers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "travel_reservations_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "travel_reservations_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
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
      ranking_snapshots: {
        Row: {
          season_id: string;
          scope: string;
          scope_key: string;
          player_id: string;
          matches_played: number;
          matches_called: number;
          goals: number;
          exclusions: number;
          mvp_count: number;
          trainings_attended: number;
          trainings_total: number;
          attendance_pct: number;
          attendance_streak: number;
          updated_at: string;
        };
        Insert: {
          season_id: string;
          scope: string;
          scope_key: string;
          player_id: string;
          matches_played?: number;
          matches_called?: number;
          goals?: number;
          exclusions?: number;
          mvp_count?: number;
          trainings_attended?: number;
          trainings_total?: number;
          attendance_pct?: number;
          attendance_streak?: number;
          updated_at?: string;
        };
        Update: {
          season_id?: string;
          scope?: string;
          scope_key?: string;
          player_id?: string;
          matches_played?: number;
          matches_called?: number;
          goals?: number;
          exclusions?: number;
          mvp_count?: number;
          trainings_attended?: number;
          trainings_total?: number;
          attendance_pct?: number;
          attendance_streak?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ranking_snapshots_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ranking_snapshots_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      opponent_stats: {
        Row: {
          season_id: string;
          team_id: string;
          opponent: string;
          category_code: string;
          matches_played: number;
          wins: number;
          draws: number;
          losses: number;
          goals_for: number;
          goals_against: number;
          last_match_at: string | null;
          updated_at: string;
        };
        Insert: {
          season_id: string;
          team_id: string;
          opponent: string;
          category_code: string;
          matches_played?: number;
          wins?: number;
          draws?: number;
          losses?: number;
          goals_for?: number;
          goals_against?: number;
          last_match_at?: string | null;
          updated_at?: string;
        };
        Update: {
          season_id?: string;
          team_id?: string;
          opponent?: string;
          category_code?: string;
          matches_played?: number;
          wins?: number;
          draws?: number;
          losses?: number;
          goals_for?: number;
          goals_against?: number;
          last_match_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "opponent_stats_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "opponent_stats_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
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
      streaks: {
        Row: {
          id: string;
          season_id: string;
          subject_type: string;
          subject_id: string;
          streak_type: string;
          current_value: number;
          best_value: number;
          best_at: string | null;
          last_event_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          season_id: string;
          subject_type: string;
          subject_id: string;
          streak_type: string;
          current_value?: number;
          best_value?: number;
          best_at?: string | null;
          last_event_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          season_id?: string;
          subject_type?: string;
          subject_id?: string;
          streak_type?: string;
          current_value?: number;
          best_value?: number;
          best_at?: string | null;
          last_event_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "streaks_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      shop_products: {
        Row: {
          id: string;
          title: string;
          description: string;
          category: string;
          price_cents: number;
          currency: string;
          image_url: string | null;
          sizes: string[];
          available: boolean;
          stock: number | null;
          max_per_order: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          category: string;
          price_cents: number;
          currency?: string;
          image_url?: string | null;
          sizes?: string[];
          available?: boolean;
          stock?: number | null;
          max_per_order?: number;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          category?: string;
          price_cents?: number;
          currency?: string;
          image_url?: string | null;
          sizes?: string[];
          available?: boolean;
          stock?: number | null;
          max_per_order?: number;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      shop_orders: {
        Row: {
          id: string;
          requested_by: string;
          approved_by: string | null;
          managed_by: string | null;
          status: Database["public"]["Enums"]["shop_order_status"];
          total_cents: number;
          currency: string;
          notes: string | null;
          parent_notes: string | null;
          admin_notes: string | null;
          requested_at: string;
          approved_at: string | null;
          ordered_at: string | null;
          received_at: string | null;
          delivered_at: string | null;
          cancelled_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          requested_by: string;
          approved_by?: string | null;
          managed_by?: string | null;
          status?: Database["public"]["Enums"]["shop_order_status"];
          total_cents?: number;
          currency?: string;
          notes?: string | null;
          parent_notes?: string | null;
          admin_notes?: string | null;
          requested_at?: string;
          approved_at?: string | null;
          ordered_at?: string | null;
          received_at?: string | null;
          delivered_at?: string | null;
          cancelled_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          requested_by?: string;
          approved_by?: string | null;
          managed_by?: string | null;
          status?: Database["public"]["Enums"]["shop_order_status"];
          total_cents?: number;
          currency?: string;
          notes?: string | null;
          parent_notes?: string | null;
          admin_notes?: string | null;
          requested_at?: string;
          approved_at?: string | null;
          ordered_at?: string | null;
          received_at?: string | null;
          delivered_at?: string | null;
          cancelled_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shop_orders_requested_by_fkey";
            columns: ["requested_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shop_orders_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shop_orders_managed_by_fkey";
            columns: ["managed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      shop_order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          size: string | null;
          quantity: number;
          unit_price_cents: number;
          subtotal_cents: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          size?: string | null;
          quantity: number;
          unit_price_cents: number;
          subtotal_cents: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          size?: string | null;
          quantity?: number;
          unit_price_cents?: number;
          subtotal_cents?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shop_order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "shop_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shop_order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "shop_products";
            referencedColumns: ["id"];
          },
        ];
      };
      news_posts: {
        Row: {
          id: string;
          author_id: string;
          title: string;
          body_md: string;
          image_url: string | null;
          audience: Database["public"]["Enums"]["news_audience"];
          audience_team_id: string | null;
          pinned: boolean;
          published_at: string;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          title: string;
          body_md: string;
          image_url?: string | null;
          audience?: Database["public"]["Enums"]["news_audience"];
          audience_team_id?: string | null;
          pinned?: boolean;
          published_at?: string;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          title?: string;
          body_md?: string;
          image_url?: string | null;
          audience?: Database["public"]["Enums"]["news_audience"];
          audience_team_id?: string | null;
          pinned?: boolean;
          published_at?: string;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "news_posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "news_posts_audience_team_id_fkey";
            columns: ["audience_team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      news_reactions: {
        Row: {
          id: string;
          post_id: string;
          profile_id: string;
          reaction: Database["public"]["Enums"]["news_reaction"];
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          profile_id: string;
          reaction: Database["public"]["Enums"]["news_reaction"];
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          profile_id?: string;
          reaction?: Database["public"]["Enums"]["news_reaction"];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "news_reactions_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "news_posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "news_reactions_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      access_requests: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: string;
          birth_year: number | null;
          gender: Database["public"]["Enums"]["gender"] | null;
          relation: Database["public"]["Enums"]["parent_relation"] | null;
          status: string;
          candidate_profile_id: string | null;
          approved_by_profile_id: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name: string;
          role: string;
          birth_year?: number | null;
          gender?: Database["public"]["Enums"]["gender"] | null;
          relation?: Database["public"]["Enums"]["parent_relation"] | null;
          status?: string;
          candidate_profile_id?: string | null;
          approved_by_profile_id?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: string;
          birth_year?: number | null;
          gender?: Database["public"]["Enums"]["gender"] | null;
          relation?: Database["public"]["Enums"]["parent_relation"] | null;
          status?: string;
          candidate_profile_id?: string | null;
          approved_by_profile_id?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "access_requests_candidate_profile_id_fkey";
            columns: ["candidate_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "access_requests_approved_by_profile_id_fkey";
            columns: ["approved_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      access_request_children: {
        Row: {
          request_id: string;
          child_profile_id: string;
        };
        Insert: {
          request_id: string;
          child_profile_id: string;
        };
        Update: {
          request_id?: string;
          child_profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "access_request_children_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "access_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "access_request_children_child_profile_id_fkey";
            columns: ["child_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      app_settings: {
        Row: {
          key: string;
          value: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          key: string;
          value: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          key?: string;
          value?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      swap_current_season: {
        Args: { target_id: string };
        Returns: void;
      };
      archive_expired_news: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      create_monthly_payment_reminders: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      get_auth_user_id_by_email: {
        Args: { p_email: string };
        Returns: string;
      };
      reserve_travel_seat: {
        Args: { p_offer_id: string; p_player_id: string };
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
      news_audience: "club" | "team";
      news_reaction: "like" | "fire" | "thanks";
      shop_order_status:
        | "pending_parent"
        | "pending_admin"
        | "rejected"
        | "ordered"
        | "received"
        | "delivered"
        | "cancelled";
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
