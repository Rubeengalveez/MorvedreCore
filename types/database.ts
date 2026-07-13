export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      access_request_children: {
        Row: {
          child_profile_id: string;
          request_id: string;
        };
        Insert: {
          child_profile_id: string;
          request_id: string;
        };
        Update: {
          child_profile_id?: string;
          request_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "access_request_children_child_profile_id_fkey";
            columns: ["child_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "access_request_children_child_profile_id_fkey";
            columns: ["child_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "access_request_children_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "access_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      access_requests: {
        Row: {
          approved_at: string | null;
          approved_by_profile_id: string | null;
          birth_year: number | null;
          candidate_profile_id: string | null;
          created_at: string;
          email: string;
          full_name: string;
          gender: string | null;
          id: string;
          relation: string | null;
          role: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by_profile_id?: string | null;
          birth_year?: number | null;
          candidate_profile_id?: string | null;
          created_at?: string;
          email: string;
          full_name: string;
          gender?: string | null;
          id?: string;
          relation?: string | null;
          role: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by_profile_id?: string | null;
          birth_year?: number | null;
          candidate_profile_id?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string;
          gender?: string | null;
          id?: string;
          relation?: string | null;
          role?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "access_requests_approved_by_profile_id_fkey";
            columns: ["approved_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "access_requests_approved_by_profile_id_fkey";
            columns: ["approved_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "access_requests_candidate_profile_id_fkey";
            columns: ["candidate_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "access_requests_candidate_profile_id_fkey";
            columns: ["candidate_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          after_data: Json | null;
          before_data: Json | null;
          created_at: string;
          id: number;
          row_id: string | null;
          table_name: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          after_data?: Json | null;
          before_data?: Json | null;
          created_at?: string;
          id?: never;
          row_id?: string | null;
          table_name: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          after_data?: Json | null;
          before_data?: Json | null;
          created_at?: string;
          id?: never;
          row_id?: string | null;
          table_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_log_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      historical_player_stats: {
        Row: {
          archived_at: string;
          attendance_pct: number;
          category_code: string;
          exclusions: number;
          goals: number;
          matches_called: number;
          matches_played: number;
          mvp_count: number;
          profile_id: string;
          profile_name: string;
          season_id: string;
          team_label: string;
          trainings_attended: number;
          trainings_total: number;
        };
        Insert: {
          archived_at?: string;
          attendance_pct?: number;
          category_code: string;
          exclusions?: number;
          goals?: number;
          matches_called?: number;
          matches_played?: number;
          mvp_count?: number;
          profile_id: string;
          profile_name: string;
          season_id: string;
          team_label: string;
          trainings_attended?: number;
          trainings_total?: number;
        };
        Update: {
          archived_at?: string;
          attendance_pct?: number;
          category_code?: string;
          exclusions?: number;
          goals?: number;
          matches_called?: number;
          matches_played?: number;
          mvp_count?: number;
          profile_id?: string;
          profile_name?: string;
          season_id?: string;
          team_label?: string;
          trainings_attended?: number;
          trainings_total?: number;
        };
        Relationships: [
          {
            foreignKeyName: "historical_player_stats_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "historical_player_stats_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "historical_player_stats_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      historical_team_matchups: {
        Row: {
          archived_at: string;
          category_code: string;
          draws: number;
          goals_against: number;
          goals_for: number;
          id: string;
          last_match_at: string | null;
          losses: number;
          matches_played: number;
          opponent: string;
          opponent_key: string;
          season_id: string;
          team_id: string;
          team_label: string;
          wins: number;
        };
        Insert: {
          archived_at?: string;
          category_code: string;
          draws?: number;
          goals_against?: number;
          goals_for?: number;
          id?: string;
          last_match_at?: string | null;
          losses?: number;
          matches_played?: number;
          opponent: string;
          opponent_key: string;
          season_id: string;
          team_id: string;
          team_label: string;
          wins?: number;
        };
        Update: {
          archived_at?: string;
          category_code?: string;
          draws?: number;
          goals_against?: number;
          goals_for?: number;
          id?: string;
          last_match_at?: string | null;
          losses?: number;
          matches_played?: number;
          opponent?: string;
          opponent_key?: string;
          season_id?: string;
          team_id?: string;
          team_label?: string;
          wins?: number;
        };
        Relationships: [
          {
            foreignKeyName: "historical_team_matchups_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "historical_team_matchups_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      match_availability: {
        Row: {
          available: boolean;
          created_at: string;
          date: string;
          player_id: string;
          reason: string | null;
          updated_at: string;
        };
        Insert: {
          available?: boolean;
          created_at?: string;
          date: string;
          player_id: string;
          reason?: string | null;
          updated_at?: string;
        };
        Update: {
          available?: boolean;
          created_at?: string;
          date?: string;
          player_id?: string;
          reason?: string | null;
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
          {
            foreignKeyName: "match_availability_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      match_callups: {
        Row: {
          cap_number: number | null;
          confirmed_at: string | null;
          created_at: string;
          match_id: string;
          player_id: string;
          source_team_id: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          cap_number?: number | null;
          confirmed_at?: string | null;
          created_at?: string;
          match_id: string;
          player_id: string;
          source_team_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          cap_number?: number | null;
          confirmed_at?: string | null;
          created_at?: string;
          match_id?: string;
          player_id?: string;
          source_team_id?: string | null;
          status?: string;
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
            foreignKeyName: "match_callups_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
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
          created_at: string;
          entered_at: string;
          entered_by: string | null;
          exclusions: number;
          goals: number;
          match_id: string;
          mvp: boolean;
          player_id: string;
          updated_at: string;
          validated_at: string | null;
          validated_by: string | null;
        };
        Insert: {
          created_at?: string;
          entered_at?: string;
          entered_by?: string | null;
          exclusions?: number;
          goals?: number;
          match_id: string;
          mvp?: boolean;
          player_id: string;
          updated_at?: string;
          validated_at?: string | null;
          validated_by?: string | null;
        };
        Update: {
          created_at?: string;
          entered_at?: string;
          entered_by?: string | null;
          exclusions?: number;
          goals?: number;
          match_id?: string;
          mvp?: boolean;
          player_id?: string;
          updated_at?: string;
          validated_at?: string | null;
          validated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "match_stats_entered_by_fkey";
            columns: ["entered_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_stats_entered_by_fkey";
            columns: ["entered_by"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
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
            foreignKeyName: "match_stats_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_stats_validated_by_fkey";
            columns: ["validated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_stats_validated_by_fkey";
            columns: ["validated_by"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      matches: {
        Row: {
          competition_type: string;
          created_at: string;
          final_score_them: number | null;
          final_score_us: number | null;
          id: string;
          is_home: boolean;
          location: string | null;
          logistics_enabled: boolean;
          mvp_player_id: string | null;
          notes: string | null;
          opponent: string;
          pool_name: string | null;
          scheduled_at: string;
          season_id: string;
          status: string;
          team_id: string;
          travel_compensation_cents: number;
          travel_meeting_point: string | null;
          updated_at: string;
        };
        Insert: {
          competition_type?: string;
          created_at?: string;
          final_score_them?: number | null;
          final_score_us?: number | null;
          id?: string;
          is_home?: boolean;
          location?: string | null;
          logistics_enabled?: boolean;
          mvp_player_id?: string | null;
          notes?: string | null;
          opponent: string;
          pool_name?: string | null;
          scheduled_at: string;
          season_id: string;
          status?: string;
          team_id: string;
          travel_compensation_cents?: number;
          travel_meeting_point?: string | null;
          updated_at?: string;
        };
        Update: {
          competition_type?: string;
          created_at?: string;
          final_score_them?: number | null;
          final_score_us?: number | null;
          id?: string;
          is_home?: boolean;
          location?: string | null;
          logistics_enabled?: boolean;
          mvp_player_id?: string | null;
          notes?: string | null;
          opponent?: string;
          pool_name?: string | null;
          scheduled_at?: string;
          season_id?: string;
          status?: string;
          team_id?: string;
          travel_compensation_cents?: number;
          travel_meeting_point?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "matches_mvp_player_id_fkey";
            columns: ["mvp_player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_mvp_player_id_fkey";
            columns: ["mvp_player_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
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
      news_posts: {
        Row: {
          audience: string;
          audience_team_id: string | null;
          author_id: string;
          body_md: string;
          created_at: string;
          expires_at: string | null;
          id: string;
          image_url: string | null;
          pinned: boolean;
          published_at: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          audience?: string;
          audience_team_id?: string | null;
          author_id: string;
          body_md: string;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          image_url?: string | null;
          pinned?: boolean;
          published_at?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          audience?: string;
          audience_team_id?: string | null;
          author_id?: string;
          body_md?: string;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          image_url?: string | null;
          pinned?: boolean;
          published_at?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "news_posts_audience_team_id_fkey";
            columns: ["audience_team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "news_posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "news_posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      news_reactions: {
        Row: {
          created_at: string;
          id: string;
          post_id: string;
          profile_id: string;
          reaction: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          post_id: string;
          profile_id: string;
          reaction: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          post_id?: string;
          profile_id?: string;
          reaction?: string;
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
          {
            foreignKeyName: "news_reactions_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          href: string | null;
          id: string;
          kind: string;
          read_at: string | null;
          recipient_id: string;
          related_match_id: string | null;
          related_training_session_id: string | null;
          title: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          href?: string | null;
          id?: string;
          kind: string;
          read_at?: string | null;
          recipient_id: string;
          related_match_id?: string | null;
          related_training_session_id?: string | null;
          title: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          href?: string | null;
          id?: string;
          kind?: string;
          read_at?: string | null;
          recipient_id?: string;
          related_match_id?: string | null;
          related_training_session_id?: string | null;
          title?: string;
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
            foreignKeyName: "notifications_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
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
      opponent_stats: {
        Row: {
          category_code: string;
          draws: number;
          goals_against: number;
          goals_for: number;
          last_match_at: string | null;
          losses: number;
          matches_played: number;
          opponent: string;
          season_id: string;
          team_id: string;
          updated_at: string;
          wins: number;
        };
        Insert: {
          category_code: string;
          draws?: number;
          goals_against?: number;
          goals_for?: number;
          last_match_at?: string | null;
          losses?: number;
          matches_played?: number;
          opponent: string;
          season_id: string;
          team_id: string;
          updated_at?: string;
          wins?: number;
        };
        Update: {
          category_code?: string;
          draws?: number;
          goals_against?: number;
          goals_for?: number;
          last_match_at?: string | null;
          losses?: number;
          matches_played?: number;
          opponent?: string;
          season_id?: string;
          team_id?: string;
          updated_at?: string;
          wins?: number;
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
      parent_child_links: {
        Row: {
          child_profile_id: string;
          parent_profile_id: string;
          relation: string;
        };
        Insert: {
          child_profile_id: string;
          parent_profile_id: string;
          relation: string;
        };
        Update: {
          child_profile_id?: string;
          parent_profile_id?: string;
          relation?: string;
        };
        Relationships: [
          {
            foreignKeyName: "parent_child_links_child_profile_id_fkey";
            columns: ["child_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "parent_child_links_child_profile_id_fkey";
            columns: ["child_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "parent_child_links_parent_profile_id_fkey";
            columns: ["parent_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "parent_child_links_parent_profile_id_fkey";
            columns: ["parent_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      profile_notification_prefs: {
        Row: {
          enabled: boolean;
          notification_type: string;
          profile_id: string;
        };
        Insert: {
          enabled?: boolean;
          notification_type: string;
          profile_id: string;
        };
        Update: {
          enabled?: boolean;
          notification_type?: string;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profile_notification_prefs_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profile_notification_prefs_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      profile_permissions: {
        Row: {
          granted_at: string;
          granted_by: string | null;
          permission: string;
          profile_id: string;
        };
        Insert: {
          granted_at?: string;
          granted_by?: string | null;
          permission: string;
          profile_id: string;
        };
        Update: {
          granted_at?: string;
          granted_by?: string | null;
          permission?: string;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profile_permissions_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profile_permissions_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profile_permissions_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profile_permissions_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          auth_user_id: string | null;
          birth_year: number | null;
          calendar_token: string;
          cap_number: number | null;
          created_at: string;
          email_contact: string | null;
          full_name: string;
          gender: string | null;
          id: string;
          license_active: boolean;
          must_change_password: boolean;
          notes: string | null;
          phone_e164: string | null;
          photo_url: string | null;
          school_enrolled: boolean;
          school_payment_paid: boolean;
          team_color: string | null;
          updated_at: string;
        };
        Insert: {
          auth_user_id?: string | null;
          birth_year?: number | null;
          calendar_token?: string;
          cap_number?: number | null;
          created_at?: string;
          email_contact?: string | null;
          full_name: string;
          gender?: string | null;
          id?: string;
          license_active?: boolean;
          must_change_password?: boolean;
          notes?: string | null;
          phone_e164?: string | null;
          photo_url?: string | null;
          school_enrolled?: boolean;
          school_payment_paid?: boolean;
          team_color?: string | null;
          updated_at?: string;
        };
        Update: {
          auth_user_id?: string | null;
          birth_year?: number | null;
          calendar_token?: string;
          cap_number?: number | null;
          created_at?: string;
          email_contact?: string | null;
          full_name?: string;
          gender?: string | null;
          id?: string;
          license_active?: boolean;
          must_change_password?: boolean;
          notes?: string | null;
          phone_e164?: string | null;
          photo_url?: string | null;
          school_enrolled?: boolean;
          school_payment_paid?: boolean;
          team_color?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          enabled: boolean;
          endpoint: string;
          id: string;
          last_error: string | null;
          last_success_at: string | null;
          p256dh: string;
          profile_id: string;
          updated_at: string;
          user_agent: string | null;
        };
        Insert: {
          auth: string;
          created_at?: string;
          enabled?: boolean;
          endpoint: string;
          id?: string;
          last_error?: string | null;
          last_success_at?: string | null;
          p256dh: string;
          profile_id: string;
          updated_at?: string;
          user_agent?: string | null;
        };
        Update: {
          auth?: string;
          created_at?: string;
          enabled?: boolean;
          endpoint?: string;
          id?: string;
          last_error?: string | null;
          last_success_at?: string | null;
          p256dh?: string;
          profile_id?: string;
          updated_at?: string;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      ranking_snapshots: {
        Row: {
          attendance_pct: number;
          attendance_streak: number;
          exclusions: number;
          goals: number;
          matches_called: number;
          matches_played: number;
          mvp_count: number;
          player_id: string;
          scope: string;
          scope_key: string;
          season_id: string;
          trainings_attended: number;
          trainings_total: number;
          updated_at: string;
        };
        Insert: {
          attendance_pct?: number;
          attendance_streak?: number;
          exclusions?: number;
          goals?: number;
          matches_called?: number;
          matches_played?: number;
          mvp_count?: number;
          player_id: string;
          scope: string;
          scope_key: string;
          season_id: string;
          trainings_attended?: number;
          trainings_total?: number;
          updated_at?: string;
        };
        Update: {
          attendance_pct?: number;
          attendance_streak?: number;
          exclusions?: number;
          goals?: number;
          matches_called?: number;
          matches_played?: number;
          mvp_count?: number;
          player_id?: string;
          scope?: string;
          scope_key?: string;
          season_id?: string;
          trainings_attended?: number;
          trainings_total?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ranking_snapshots_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ranking_snapshots_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ranking_snapshots_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      seasons: {
        Row: {
          archived_at: string | null;
          created_at: string;
          end_date: string;
          id: string;
          is_current: boolean;
          label: string;
          start_date: string;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          end_date: string;
          id?: string;
          is_current?: boolean;
          label: string;
          start_date: string;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          end_date?: string;
          id?: string;
          is_current?: boolean;
          label?: string;
          start_date?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      shop_order_items: {
        Row: {
          created_at: string;
          id: string;
          order_id: string;
          personalization: string | null;
          product_id: string;
          quantity: number;
          size: string | null;
          subtotal_cents: number;
          unit_price_cents: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          order_id: string;
          personalization?: string | null;
          product_id: string;
          quantity: number;
          size?: string | null;
          subtotal_cents: number;
          unit_price_cents: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          order_id?: string;
          personalization?: string | null;
          product_id?: string;
          quantity?: number;
          size?: string | null;
          subtotal_cents?: number;
          unit_price_cents?: number;
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
      shop_orders: {
        Row: {
          admin_notes: string | null;
          approved_at: string | null;
          approved_by: string | null;
          cancelled_at: string | null;
          currency: string;
          delivered_at: string | null;
          id: string;
          managed_by: string | null;
          notes: string | null;
          ordered_at: string | null;
          parent_notes: string | null;
          received_at: string | null;
          requested_at: string;
          requested_by: string;
          status: Database["public"]["Enums"]["shop_order_status"];
          total_cents: number;
          updated_at: string;
        };
        Insert: {
          admin_notes?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          cancelled_at?: string | null;
          currency?: string;
          delivered_at?: string | null;
          id?: string;
          managed_by?: string | null;
          notes?: string | null;
          ordered_at?: string | null;
          parent_notes?: string | null;
          received_at?: string | null;
          requested_at?: string;
          requested_by: string;
          status?: Database["public"]["Enums"]["shop_order_status"];
          total_cents?: number;
          updated_at?: string;
        };
        Update: {
          admin_notes?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          cancelled_at?: string | null;
          currency?: string;
          delivered_at?: string | null;
          id?: string;
          managed_by?: string | null;
          notes?: string | null;
          ordered_at?: string | null;
          parent_notes?: string | null;
          received_at?: string | null;
          requested_at?: string;
          requested_by?: string;
          status?: Database["public"]["Enums"]["shop_order_status"];
          total_cents?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shop_orders_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shop_orders_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shop_orders_managed_by_fkey";
            columns: ["managed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shop_orders_managed_by_fkey";
            columns: ["managed_by"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shop_orders_requested_by_fkey";
            columns: ["requested_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shop_orders_requested_by_fkey";
            columns: ["requested_by"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      shop_product_images: {
        Row: {
          alt: string | null;
          created_at: string;
          id: string;
          is_cover: boolean;
          product_id: string;
          sort_order: number;
          storage_path: string | null;
          url: string;
        };
        Insert: {
          alt?: string | null;
          created_at?: string;
          id?: string;
          is_cover?: boolean;
          product_id: string;
          sort_order?: number;
          storage_path?: string | null;
          url: string;
        };
        Update: {
          alt?: string | null;
          created_at?: string;
          id?: string;
          is_cover?: boolean;
          product_id?: string;
          sort_order?: number;
          storage_path?: string | null;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shop_product_images_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "shop_products";
            referencedColumns: ["id"];
          },
        ];
      };
      shop_products: {
        Row: {
          available: boolean;
          category: string;
          created_at: string;
          created_by: string;
          currency: string;
          description: string;
          id: string;
          image_url: string | null;
          max_per_order: number;
          personalization_enabled: boolean;
          personalization_label: string;
          personalization_max_length: number;
          price_cents: number;
          sizes: string[];
          stock: number | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          available?: boolean;
          category: string;
          created_at?: string;
          created_by: string;
          currency?: string;
          description: string;
          id?: string;
          image_url?: string | null;
          max_per_order?: number;
          personalization_enabled?: boolean;
          personalization_label?: string;
          personalization_max_length?: number;
          price_cents: number;
          sizes?: string[];
          stock?: number | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          available?: boolean;
          category?: string;
          created_at?: string;
          created_by?: string;
          currency?: string;
          description?: string;
          id?: string;
          image_url?: string | null;
          max_per_order?: number;
          personalization_enabled?: boolean;
          personalization_label?: string;
          personalization_max_length?: number;
          price_cents?: number;
          sizes?: string[];
          stock?: number | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shop_products_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shop_products_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      streaks: {
        Row: {
          best_at: string | null;
          best_value: number;
          current_value: number;
          id: string;
          last_event_at: string | null;
          season_id: string;
          streak_type: string;
          subject_id: string;
          subject_type: string;
          updated_at: string;
        };
        Insert: {
          best_at?: string | null;
          best_value?: number;
          current_value?: number;
          id?: string;
          last_event_at?: string | null;
          season_id: string;
          streak_type: string;
          subject_id: string;
          subject_type: string;
          updated_at?: string;
        };
        Update: {
          best_at?: string | null;
          best_value?: number;
          current_value?: number;
          id?: string;
          last_event_at?: string | null;
          season_id?: string;
          streak_type?: string;
          subject_id?: string;
          subject_type?: string;
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
      team_rosters: {
        Row: {
          created_at: string;
          joined_at: string;
          left_at: string | null;
          player_id: string;
          squad_number: number | null;
          team_id: string;
        };
        Insert: {
          created_at?: string;
          joined_at?: string;
          left_at?: string | null;
          player_id: string;
          squad_number?: number | null;
          team_id: string;
        };
        Update: {
          created_at?: string;
          joined_at?: string;
          left_at?: string | null;
          player_id?: string;
          squad_number?: number | null;
          team_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_rosters_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_rosters_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_rosters_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      team_staff: {
        Row: {
          granted_at: string;
          granted_by: string | null;
          profile_id: string;
          role: string;
          team_id: string;
        };
        Insert: {
          granted_at?: string;
          granted_by?: string | null;
          profile_id: string;
          role: string;
          team_id: string;
        };
        Update: {
          granted_at?: string;
          granted_by?: string | null;
          profile_id?: string;
          role?: string;
          team_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_staff_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_staff_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
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
            foreignKeyName: "team_staff_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_staff_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      teams: {
        Row: {
          category_code: string;
          color: string;
          created_at: string;
          gender: string;
          home_pool: string | null;
          id: string;
          label: string;
          notes: string | null;
          season_id: string;
          team_type: string;
          updated_at: string;
        };
        Insert: {
          category_code: string;
          color?: string;
          created_at?: string;
          gender: string;
          home_pool?: string | null;
          id?: string;
          label: string;
          notes?: string | null;
          season_id: string;
          team_type?: string;
          updated_at?: string;
        };
        Update: {
          category_code?: string;
          color?: string;
          created_at?: string;
          gender?: string;
          home_pool?: string | null;
          id?: string;
          label?: string;
          notes?: string | null;
          season_id?: string;
          team_type?: string;
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
      training_attendance: {
        Row: {
          marked_at: string;
          marked_by: string | null;
          player_id: string;
          present: boolean;
          reason: string | null;
          session_id: string;
          updated_at: string;
        };
        Insert: {
          marked_at?: string;
          marked_by?: string | null;
          player_id: string;
          present?: boolean;
          reason?: string | null;
          session_id: string;
          updated_at?: string;
        };
        Update: {
          marked_at?: string;
          marked_by?: string | null;
          player_id?: string;
          present?: boolean;
          reason?: string | null;
          session_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "training_attendance_marked_by_fkey";
            columns: ["marked_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "training_attendance_marked_by_fkey";
            columns: ["marked_by"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
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
            foreignKeyName: "training_attendance_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "training_attendance_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "training_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      training_blocks: {
        Row: {
          created_at: string;
          created_by: string | null;
          end_date: string;
          end_time: string;
          id: string;
          is_active: boolean;
          kind: string;
          label: string;
          location: string | null;
          start_date: string;
          start_time: string;
          team_id: string;
          updated_at: string;
          weekdays: number[];
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          end_date: string;
          end_time: string;
          id?: string;
          is_active?: boolean;
          kind?: string;
          label: string;
          location?: string | null;
          start_date: string;
          start_time: string;
          team_id: string;
          updated_at?: string;
          weekdays: number[];
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          end_date?: string;
          end_time?: string;
          id?: string;
          is_active?: boolean;
          kind?: string;
          label?: string;
          location?: string | null;
          start_date?: string;
          start_time?: string;
          team_id?: string;
          updated_at?: string;
          weekdays?: number[];
        };
        Relationships: [
          {
            foreignKeyName: "training_blocks_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "training_blocks_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "training_blocks_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      training_sessions: {
        Row: {
          block_id: string | null;
          cancellation_reason: string | null;
          cancelled: boolean;
          cancelled_at: string | null;
          cancelled_by: string | null;
          created_at: string;
          duration_minutes: number;
          end_at: string | null;
          id: string;
          location: string | null;
          notes: string | null;
          scheduled_at: string;
          team_id: string;
          updated_at: string;
        };
        Insert: {
          block_id?: string | null;
          cancellation_reason?: string | null;
          cancelled?: boolean;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          created_at?: string;
          duration_minutes?: number;
          end_at?: string | null;
          id?: string;
          location?: string | null;
          notes?: string | null;
          scheduled_at: string;
          team_id: string;
          updated_at?: string;
        };
        Update: {
          block_id?: string | null;
          cancellation_reason?: string | null;
          cancelled?: boolean;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          created_at?: string;
          duration_minutes?: number;
          end_at?: string | null;
          id?: string;
          location?: string | null;
          notes?: string | null;
          scheduled_at?: string;
          team_id?: string;
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
            foreignKeyName: "training_sessions_cancelled_by_fkey";
            columns: ["cancelled_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "training_sessions_cancelled_by_fkey";
            columns: ["cancelled_by"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "training_sessions_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      travel_offers: {
        Row: {
          cancelled: boolean;
          created_at: string;
          departure_at: string;
          departure_from: string;
          driver_id: string;
          id: string;
          match_id: string;
          notes: string | null;
          seats_taken: number;
          seats_total: number;
          updated_at: string;
          vehicle_label: string;
        };
        Insert: {
          cancelled?: boolean;
          created_at?: string;
          departure_at: string;
          departure_from: string;
          driver_id: string;
          id?: string;
          match_id: string;
          notes?: string | null;
          seats_taken?: number;
          seats_total: number;
          updated_at?: string;
          vehicle_label: string;
        };
        Update: {
          cancelled?: boolean;
          created_at?: string;
          departure_at?: string;
          departure_from?: string;
          driver_id?: string;
          id?: string;
          match_id?: string;
          notes?: string | null;
          seats_taken?: number;
          seats_total?: number;
          updated_at?: string;
          vehicle_label?: string;
        };
        Relationships: [
          {
            foreignKeyName: "travel_offers_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "travel_offers_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "travel_offers_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
        ];
      };
      travel_reservations: {
        Row: {
          cancelled_at: string | null;
          created_at: string;
          match_id: string;
          offer_id: string;
          player_id: string;
        };
        Insert: {
          cancelled_at?: string | null;
          created_at?: string;
          match_id: string;
          offer_id: string;
          player_id: string;
        };
        Update: {
          cancelled_at?: string | null;
          created_at?: string;
          match_id?: string;
          offer_id?: string;
          player_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "travel_reservations_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "travel_reservations_offer_id_fkey";
            columns: ["offer_id"];
            isOneToOne: false;
            referencedRelation: "travel_offers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "travel_reservations_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "travel_reservations_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      treasury_concepts: {
        Row: {
          active: boolean;
          applies_to: Database["public"]["Enums"]["treasury_applies_to"];
          code: string;
          created_at: string;
          default_amount_cents: number | null;
          id: string;
          kind: Database["public"]["Enums"]["treasury_concept_kind"];
          label: string;
          periodicity: Database["public"]["Enums"]["treasury_periodicity"];
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          applies_to?: Database["public"]["Enums"]["treasury_applies_to"];
          code: string;
          created_at?: string;
          default_amount_cents?: number | null;
          id?: string;
          kind?: Database["public"]["Enums"]["treasury_concept_kind"];
          label: string;
          periodicity?: Database["public"]["Enums"]["treasury_periodicity"];
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          applies_to?: Database["public"]["Enums"]["treasury_applies_to"];
          code?: string;
          created_at?: string;
          default_amount_cents?: number | null;
          id?: string;
          kind?: Database["public"]["Enums"]["treasury_concept_kind"];
          label?: string;
          periodicity?: Database["public"]["Enums"]["treasury_periodicity"];
          updated_at?: string;
        };
        Relationships: [];
      };
      treasury_lines: {
        Row: {
          amount_cents: number;
          closure_id: string;
          concept_id: string | null;
          created_at: string;
          description: string;
          id: string;
          paid: boolean;
          paid_at: string | null;
          payment_method: Database["public"]["Enums"]["treasury_payment_method"] | null;
          profile_id: string;
          source_id: string | null;
          source_type: string;
        };
        Insert: {
          amount_cents: number;
          closure_id: string;
          concept_id?: string | null;
          created_at?: string;
          description: string;
          id?: string;
          paid?: boolean;
          paid_at?: string | null;
          payment_method?: Database["public"]["Enums"]["treasury_payment_method"] | null;
          profile_id: string;
          source_id?: string | null;
          source_type?: string;
        };
        Update: {
          amount_cents?: number;
          closure_id?: string;
          concept_id?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          paid?: boolean;
          paid_at?: string | null;
          payment_method?: Database["public"]["Enums"]["treasury_payment_method"] | null;
          profile_id?: string;
          source_id?: string | null;
          source_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "treasury_lines_closure_id_fkey";
            columns: ["closure_id"];
            isOneToOne: false;
            referencedRelation: "treasury_period_closures";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "treasury_lines_concept_id_fkey";
            columns: ["concept_id"];
            isOneToOne: false;
            referencedRelation: "treasury_concepts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "treasury_lines_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "treasury_lines_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      treasury_period_closures: {
        Row: {
          generated_at: string;
          generated_by: string;
          id: string;
          notes: string | null;
          period_end: string;
          period_label: string;
          period_start: string;
          season_id: string;
          sent_at: string | null;
          sent_to_email: string | null;
          status: Database["public"]["Enums"]["treasury_closure_status"];
          total_cents: number;
        };
        Insert: {
          generated_at?: string;
          generated_by: string;
          id?: string;
          notes?: string | null;
          period_end: string;
          period_label: string;
          period_start: string;
          season_id: string;
          sent_at?: string | null;
          sent_to_email?: string | null;
          status?: Database["public"]["Enums"]["treasury_closure_status"];
          total_cents?: number;
        };
        Update: {
          generated_at?: string;
          generated_by?: string;
          id?: string;
          notes?: string | null;
          period_end?: string;
          period_label?: string;
          period_start?: string;
          season_id?: string;
          sent_at?: string | null;
          sent_to_email?: string | null;
          status?: Database["public"]["Enums"]["treasury_closure_status"];
          total_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "treasury_period_closures_generated_by_fkey";
            columns: ["generated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "treasury_period_closures_generated_by_fkey";
            columns: ["generated_by"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "treasury_period_closures_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      treasury_profile_concepts: {
        Row: {
          active: boolean;
          amount_cents: number | null;
          concept_id: string;
          created_at: string;
          ends_on: string | null;
          id: string;
          profile_id: string;
          starts_on: string | null;
        };
        Insert: {
          active?: boolean;
          amount_cents?: number | null;
          concept_id: string;
          created_at?: string;
          ends_on?: string | null;
          id?: string;
          profile_id: string;
          starts_on?: string | null;
        };
        Update: {
          active?: boolean;
          amount_cents?: number | null;
          concept_id?: string;
          created_at?: string;
          ends_on?: string | null;
          id?: string;
          profile_id?: string;
          starts_on?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "treasury_profile_concepts_concept_id_fkey";
            columns: ["concept_id"];
            isOneToOne: false;
            referencedRelation: "treasury_concepts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "treasury_profile_concepts_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "treasury_profile_concepts_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          granted_at: string;
          granted_by: string | null;
          id: string;
          profile_id: string;
          role: string;
          scope_team_id: string | null;
        };
        Insert: {
          granted_at?: string;
          granted_by?: string | null;
          id?: string;
          profile_id: string;
          role: string;
          scope_team_id?: string | null;
        };
        Update: {
          granted_at?: string;
          granted_by?: string | null;
          id?: string;
          profile_id?: string;
          role?: string;
          scope_team_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      profiles_public: {
        Row: {
          birth_year: number | null;
          cap_number: number | null;
          full_name: string | null;
          gender: string | null;
          id: string | null;
          license_active: boolean | null;
          photo_url: string | null;
          team_color: string | null;
        };
        Insert: {
          birth_year?: number | null;
          cap_number?: number | null;
          full_name?: string | null;
          gender?: string | null;
          id?: string | null;
          license_active?: boolean | null;
          photo_url?: string | null;
          team_color?: string | null;
        };
        Update: {
          birth_year?: number | null;
          cap_number?: number | null;
          full_name?: string | null;
          gender?: string | null;
          id?: string | null;
          license_active?: boolean | null;
          photo_url?: string | null;
          team_color?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      archive_expired_news: { Args: never; Returns: number };
      archive_season: {
        Args: {
          p_new_end_date: string;
          p_new_label: string;
          p_new_start_date: string;
          p_season_id: string;
        };
        Returns: Json;
      };
      can_manage_attendance_for: {
        Args: { target_team_id: string };
        Returns: boolean;
      };
      create_monthly_payment_reminders: { Args: never; Returns: number };
      get_auth_user_id_by_email: { Args: { p_email: string }; Returns: string };
      is_admin: { Args: never; Returns: boolean };
      is_coach_of: { Args: { p_team_id: string }; Returns: boolean };
      is_delegate_of: { Args: { team_id: string }; Returns: boolean };
      recalculate_opponent_stats: {
        Args: { p_opponent: string; p_season_id: string; p_team_id: string };
        Returns: undefined;
      };
      reserve_travel_seat: {
        Args: { p_offer_id: string; p_player_id: string };
        Returns: undefined;
      };
      swap_current_season: { Args: { target_id: string }; Returns: undefined };
    };
    Enums: {
      shop_order_status:
        | "pending_parent"
        | "pending_admin"
        | "rejected"
        | "ordered"
        | "received"
        | "delivered"
        | "cancelled";
      treasury_applies_to: "all_players" | "all_members" | "specific_role" | "specific_profile";
      treasury_closure_status: "draft" | "sent" | "archived";
      treasury_concept_kind: "fee" | "material" | "tournament" | "adjustment" | "discount";
      treasury_payment_method: "bank_transfer" | "bizum" | "cash" | "other";
      treasury_periodicity: "monthly" | "seasonal" | "one_off";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      shop_order_status: [
        "pending_parent",
        "pending_admin",
        "rejected",
        "ordered",
        "received",
        "delivered",
        "cancelled",
      ],
      treasury_applies_to: ["all_players", "all_members", "specific_role", "specific_profile"],
      treasury_closure_status: ["draft", "sent", "archived"],
      treasury_concept_kind: ["fee", "material", "tournament", "adjustment", "discount"],
      treasury_payment_method: ["bank_transfer", "bizum", "cash", "other"],
      treasury_periodicity: ["monthly", "seasonal", "one_off"],
    },
  },
} as const;
