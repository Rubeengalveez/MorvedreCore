export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          auth_user_id: string;
          full_name: string;
          photo_url: string | null;
          birth_year: number | null;
          gender: Database["public"]["Enums"]["gender"];
          cap_number: number | null;
          license_active: boolean;
          phone_e164: string | null;
          email_contact: string | null;
          notes: string | null;
          must_change_password: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id: string;
          full_name: string;
          photo_url?: string | null;
          birth_year?: number | null;
          gender?: Database["public"]["Enums"]["gender"];
          cap_number?: number | null;
          license_active?: boolean;
          phone_e164?: string | null;
          email_contact?: string | null;
          notes?: string | null;
          must_change_password?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string;
          full_name?: string;
          photo_url?: string | null;
          birth_year?: number | null;
          gender?: Database["public"]["Enums"]["gender"];
          cap_number?: number | null;
          license_active?: boolean;
          phone_e164?: string | null;
          email_contact?: string | null;
          notes?: string | null;
          must_change_password?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_auth_user_id_fkey";
            columns: ["auth_user_id"];
            isOneToOne: true;
            referencedRelation: "users";
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
      parent_child_links: {
        Row: {
          parent_profile_id: string;
          child_profile_id: string;
          relation: Database["public"]["Enums"]["parent_relation"];
        };
        Insert: {
          parent_profile_id: string;
          child_profile_id: string;
          relation: Database["public"]["Enums"]["parent_relation"];
        };
        Update: {
          parent_profile_id?: string;
          child_profile_id?: string;
          relation?: Database["public"]["Enums"]["parent_relation"];
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
