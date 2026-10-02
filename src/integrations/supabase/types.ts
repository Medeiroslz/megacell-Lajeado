export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          path: string
          product_id: string | null
          product_name: string | null
          session_id: string
          title: string
          visitor_id: string
        }
        Insert: {
          created_at?: string
          event_type?: string
          id?: string
          path?: string
          product_id?: string | null
          product_name?: string | null
          session_id: string
          title?: string
          visitor_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          path?: string
          product_id?: string | null
          product_name?: string | null
          session_id?: string
          title?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_sessions: {
        Row: {
          browser: string
          country: string
          device_type: string
          duration_seconds: number
          entry_path: string
          id: string
          is_bounce: boolean
          last_seen_at: string
          os: string
          pageviews_count: number
          referrer: string
          referrer_domain: string
          started_at: string
          utm_campaign: string
          utm_medium: string
          utm_source: string
          visitor_id: string
        }
        Insert: {
          browser?: string
          country?: string
          device_type?: string
          duration_seconds?: number
          entry_path?: string
          id: string
          is_bounce?: boolean
          last_seen_at?: string
          os?: string
          pageviews_count?: number
          referrer?: string
          referrer_domain?: string
          started_at?: string
          utm_campaign?: string
          utm_medium?: string
          utm_source?: string
          visitor_id: string
        }
        Update: {
          browser?: string
          country?: string
          device_type?: string
          duration_seconds?: number
          entry_path?: string
          id?: string
          is_bounce?: boolean
          last_seen_at?: string
          os?: string
          pageviews_count?: number
          referrer?: string
          referrer_domain?: string
          started_at?: string
          utm_campaign?: string
          utm_medium?: string
          utm_source?: string
          visitor_id?: string
        }
        Relationships: []
      }
      depoimentos: {
        Row: {
          alt_text: string
          created_at: string
          id: string
          image_path: string
          is_active: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          alt_text?: string
          created_at?: string
          id?: string
          image_path: string
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          alt_text?: string
          created_at?: string
          id?: string
          image_path?: string
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string
          device: string | null
          id: string
          path: string
          product_id: string | null
          product_name: string | null
          referrer: string | null
          session_id: string | null
        }
        Insert: {
          created_at?: string
          device?: string | null
          id?: string
          path: string
          product_id?: string | null
          product_name?: string | null
          referrer?: string | null
          session_id?: string | null
        }
        Update: {
          created_at?: string
          device?: string | null
          id?: string
          path?: string
          product_id?: string | null
          product_name?: string | null
          referrer?: string | null
          session_id?: string | null
        }
        Relationships: []
      }
      preorder_settings: {
        Row: {
          agree_label: string
          button_label: string
          created_at: string
          cta_label: string
          deposit_info: string
          gift_images: Json
          gifts: string[]
          id: string
          image_path: string
          is_active: boolean
          rules: string
          subtitle: string
          title: string
          updated_at: string
          whatsapp_url: string
        }
        Insert: {
          agree_label?: string
          button_label?: string
          created_at?: string
          cta_label?: string
          deposit_info?: string
          gift_images?: Json
          gifts?: string[]
          id?: string
          image_path?: string
          is_active?: boolean
          rules?: string
          subtitle?: string
          title?: string
          updated_at?: string
          whatsapp_url?: string
        }
        Update: {
          agree_label?: string
          button_label?: string
          created_at?: string
          cta_label?: string
          deposit_info?: string
          gift_images?: Json
          gifts?: string[]
          id?: string
          image_path?: string
          is_active?: boolean
          rules?: string
          subtitle?: string
          title?: string
          updated_at?: string
          whatsapp_url?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          created_at: string
          cta_label: string
          cta_url: string
          cta_url_luisa: string
          description: string | null
          id: string
          images: string[]
          installment_12x: number
          installment_18x: number
          installment_label: string
          is_available: boolean
          name: string
          price: number
          sort_order: number
          specs: Json
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          cta_label?: string
          cta_url?: string
          cta_url_luisa?: string
          description?: string | null
          id?: string
          images?: string[]
          installment_12x?: number
          installment_18x?: number
          installment_label?: string
          is_available?: boolean
          name: string
          price?: number
          sort_order?: number
          specs?: Json
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          cta_label?: string
          cta_url?: string
          cta_url_luisa?: string
          description?: string | null
          id?: string
          images?: string[]
          installment_12x?: number
          installment_18x?: number
          installment_label?: string
          is_available?: boolean
          name?: string
          price?: number
          sort_order?: number
          specs?: Json
          updated_at?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          address: string
          city_state: string
          created_at: string
          id: string
          instagram_handle: string
          instagram_url: string
          legal_name: string
          repair_quote_url: string
          store_name: string
          tagline: string
          updated_at: string
          whatsapp_url: string
        }
        Insert: {
          address?: string
          city_state?: string
          created_at?: string
          id?: string
          instagram_handle?: string
          instagram_url?: string
          legal_name?: string
          repair_quote_url?: string
          store_name?: string
          tagline?: string
          updated_at?: string
          whatsapp_url?: string
        }
        Update: {
          address?: string
          city_state?: string
          created_at?: string
          id?: string
          instagram_handle?: string
          instagram_url?: string
          legal_name?: string
          repair_quote_url?: string
          store_name?: string
          tagline?: string
          updated_at?: string
          whatsapp_url?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      analytics_report: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      analytics_summary: { Args: { _days: number }; Returns: Json }
    }
    Enums: {
      app_role: "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin"],
    },
  },
} as const
