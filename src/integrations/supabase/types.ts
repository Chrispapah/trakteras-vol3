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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      assets: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string
          id: string
          name: string
          type: Database["public"]["Enums"]["asset_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name: string
          type: Database["public"]["Enums"]["asset_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["asset_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          asset_context: string | null
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          asset_context?: string | null
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          asset_context?: string | null
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          images: string[] | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          images?: string[] | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          images?: string[] | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          asset_id: string
          created_at: string
          event_id: string
          tags: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          event_id?: string
          tags: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          event_id?: string
          tags?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_event_expenses: {
        Row: {
          cost: number | null
          event_id: string
        }
        Insert: {
          cost?: number | null
          event_id: string
        }
        Update: {
          cost?: number | null
          event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_expenses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "calendar_events"
            referencedColumns: ["event_id"]
          },
        ]
      }
      diary_entries: {
        Row: {
          asset_id: string
          content: string
          created_at: string
          id: string
          images: string[] | null
          tags: string[] | null
          user_id: string
          weather_data: Json | null
        }
        Insert: {
          asset_id: string
          content: string
          created_at?: string
          id?: string
          images?: string[] | null
          tags?: string[] | null
          user_id: string
          weather_data?: Json | null
        }
        Update: {
          asset_id?: string
          content?: string
          created_at?: string
          id?: string
          images?: string[] | null
          tags?: string[] | null
          user_id?: string
          weather_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "diary_entries_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          asset_id: string
          completed: boolean
          created_at: string
          description: string | null
          due_date: string
          id: string
          priority: Database["public"]["Enums"]["reminder_priority"]
          recurring: Database["public"]["Enums"]["reminder_recurring"] | null
          title: string
          user_id: string
        }
        Insert: {
          asset_id: string
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          priority?: Database["public"]["Enums"]["reminder_priority"]
          recurring?: Database["public"]["Enums"]["reminder_recurring"] | null
          title: string
          user_id: string
        }
        Update: {
          asset_id?: string
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          priority?: Database["public"]["Enums"]["reminder_priority"]
          recurring?: Database["public"]["Enums"]["reminder_recurring"] | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      asset_type: "field" | "tractor" | "machine"
      reminder_priority: "low" | "medium" | "high"
      reminder_recurring: "daily" | "weekly" | "monthly" | "yearly"
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
      asset_type: ["field", "tractor", "machine"],
      reminder_priority: ["low", "medium", "high"],
      reminder_recurring: ["daily", "weekly", "monthly", "yearly"],
    },
  },
} as const
