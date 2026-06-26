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
          granted_by: string;
          granted_at: string;
        };
        Insert: {
          profile_id: string;
          role: Database["public"]["Enums"]["user_role"];
          scope_team_id?: string | null;
          granted_by: string;
          granted_at?: string;
        };
        Update: {
          profile_id?: string;
          role?: Database["public"]["Enums"]["user_role"];
          scope_team_id?: string | null;
          granted_by?: string;
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: "admin" | "coach" | "delegate" | "directiva" | "parent" | "player";
      gender: "male" | "female" | "other" | "prefer_not_to_say";
      parent_relation: "mother" | "father" | "legal_guardian" | "other";
      notification_type:
        | "convocatoria"
        | "entrenamiento_cancelado"
        | "pedido_pendiente"
        | "noticia_fijada"
        | "resultado_publicado"
        | "cierre_mensual";
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
