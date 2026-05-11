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
          payload: Json
          retailer_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          retailer_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          retailer_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          last_used_at: string | null
          last4: string
          name: string
          retailer_id: string
          revoked_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          last_used_at?: string | null
          last4: string
          name?: string
          retailer_id: string
          revoked_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          last_used_at?: string | null
          last4?: string
          name?: string
          retailer_id?: string
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
        ]
      }
      consumer_profiles: {
        Row: {
          budget: string | null
          created_at: string
          face_shape: string | null
          last_photo_url: string | null
          lifestyle: string[] | null
          notify_email: boolean
          quiz_completed_at: string | null
          skin_tone: number | null
          style_vibe: string[] | null
          try_on_count_this_month: number
          try_on_month_reset: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget?: string | null
          created_at?: string
          face_shape?: string | null
          last_photo_url?: string | null
          lifestyle?: string[] | null
          notify_email?: boolean
          quiz_completed_at?: string | null
          skin_tone?: number | null
          style_vibe?: string[] | null
          try_on_count_this_month?: number
          try_on_month_reset?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget?: string | null
          created_at?: string
          face_shape?: string | null
          last_photo_url?: string | null
          lifestyle?: string[] | null
          notify_email?: boolean
          quiz_completed_at?: string | null
          skin_tone?: number | null
          style_vibe?: string[] | null
          try_on_count_this_month?: number
          try_on_month_reset?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      retailer_lifecycle_events: {
        Row: {
          event_type: string
          id: string
          metadata: Json
          retailer_id: string
          sent_at: string
        }
        Insert: {
          event_type: string
          id?: string
          metadata?: Json
          retailer_id: string
          sent_at?: string
        }
        Update: {
          event_type?: string
          id?: string
          metadata?: Json
          retailer_id?: string
          sent_at?: string
        }
        Relationships: []
      }
      retailers: {
        Row: {
          brand_primary: string | null
          business_name: string
          contact_name: string | null
          country: string | null
          created_at: string
          currency: string
          display_name: string
          id: string
          is_active: boolean
          logo_url: string | null
          onboarding_completed: boolean
          owner_id: string | null
          plan: string
          referral_source: string | null
          slug: string
          trial_ends_at: string | null
          updated_at: string
          website: string | null
          widget_cta_text: string | null
        }
        Insert: {
          brand_primary?: string | null
          business_name: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          display_name: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          onboarding_completed?: boolean
          owner_id?: string | null
          plan?: string
          referral_source?: string | null
          slug: string
          trial_ends_at?: string | null
          updated_at?: string
          website?: string | null
          widget_cta_text?: string | null
        }
        Update: {
          brand_primary?: string | null
          business_name?: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          display_name?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          onboarding_completed?: boolean
          owner_id?: string | null
          plan?: string
          referral_source?: string | null
          slug?: string
          trial_ends_at?: string | null
          updated_at?: string
          website?: string | null
          widget_cta_text?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_interval: string | null
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          customer_type: string
          environment: string
          id: string
          paddle_customer_id: string | null
          paddle_subscription_id: string | null
          plan: string
          price_id: string | null
          product_id: string | null
          profile_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          billing_interval?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          customer_type: string
          environment?: string
          id?: string
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          plan: string
          price_id?: string | null
          product_id?: string | null
          profile_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          billing_interval?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          customer_type?: string
          environment?: string
          id?: string
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          plan?: string
          price_id?: string | null
          product_id?: string | null
          profile_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      try_on_events: {
        Row: {
          anonymous_session: string | null
          country: string | null
          created_at: string
          device: string | null
          id: string
          retailer_id: string | null
          source: string | null
          user_id: string | null
          wig_id: string
        }
        Insert: {
          anonymous_session?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          id?: string
          retailer_id?: string | null
          source?: string | null
          user_id?: string | null
          wig_id: string
        }
        Update: {
          anonymous_session?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          id?: string
          retailer_id?: string | null
          source?: string | null
          user_id?: string | null
          wig_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "try_on_events_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "try_on_events_wig_id_fkey"
            columns: ["wig_id"]
            isOneToOne: false
            referencedRelation: "wigs"
            referencedColumns: ["id"]
          },
        ]
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
      widget_embeds: {
        Row: {
          allowed_domains: string[]
          config: Json
          created_at: string
          embed_token: string
          id: string
          is_active: boolean
          retailer_id: string
          updated_at: string
          widget_type: string
        }
        Insert: {
          allowed_domains?: string[]
          config?: Json
          created_at?: string
          embed_token?: string
          id?: string
          is_active?: boolean
          retailer_id: string
          updated_at?: string
          widget_type?: string
        }
        Update: {
          allowed_domains?: string[]
          config?: Json
          created_at?: string
          embed_token?: string
          id?: string
          is_active?: boolean
          retailer_id?: string
          updated_at?: string
          widget_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_embeds_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
        ]
      }
      wig_clicks: {
        Row: {
          created_at: string
          id: string
          retailer_id: string | null
          user_id: string | null
          wig_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          retailer_id?: string | null
          user_id?: string | null
          wig_id: string
        }
        Update: {
          created_at?: string
          id?: string
          retailer_id?: string | null
          user_id?: string | null
          wig_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wig_clicks_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wig_clicks_wig_id_fkey"
            columns: ["wig_id"]
            isOneToOne: false
            referencedRelation: "wigs"
            referencedColumns: ["id"]
          },
        ]
      }
      wigs: {
        Row: {
          ar_asset_url: string | null
          auto_unpublished_at: string | null
          click_count: number
          colors: string[]
          created_at: string
          currency: string
          deleted_at: string | null
          description: string | null
          featured_rank: number | null
          hair_length: string | null
          hair_origin: string | null
          hair_texture: string
          id: string
          images: string[]
          in_stock: boolean
          is_featured: boolean
          is_published: boolean
          name: string
          price: number
          product_url: string | null
          retailer_id: string
          style_type: string
          try_on_count: number
          updated_at: string
        }
        Insert: {
          ar_asset_url?: string | null
          auto_unpublished_at?: string | null
          click_count?: number
          colors?: string[]
          created_at?: string
          currency?: string
          deleted_at?: string | null
          description?: string | null
          featured_rank?: number | null
          hair_length?: string | null
          hair_origin?: string | null
          hair_texture: string
          id?: string
          images?: string[]
          in_stock?: boolean
          is_featured?: boolean
          is_published?: boolean
          name: string
          price?: number
          product_url?: string | null
          retailer_id: string
          style_type: string
          try_on_count?: number
          updated_at?: string
        }
        Update: {
          ar_asset_url?: string | null
          auto_unpublished_at?: string | null
          click_count?: number
          colors?: string[]
          created_at?: string
          currency?: string
          deleted_at?: string | null
          description?: string | null
          featured_rank?: number | null
          hair_length?: string | null
          hair_origin?: string | null
          hair_texture?: string
          id?: string
          images?: string[]
          in_stock?: boolean
          is_featured?: boolean
          is_published?: boolean
          name?: string
          price?: number
          product_url?: string | null
          retailer_id?: string
          style_type?: string
          try_on_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wigs_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_items: {
        Row: {
          created_at: string
          user_id: string
          wig_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
          wig_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
          wig_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_wig_id_fkey"
            columns: ["wig_id"]
            isOneToOne: false
            referencedRelation: "wigs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "consumer" | "retailer" | "admin"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["consumer", "retailer", "admin"],
    },
  },
} as const
