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
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          after_data: Json | null
          before_data: Json | null
          correlation_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          reason: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          correlation_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          reason?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          correlation_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      campaign_media: {
        Row: {
          alt_text: string | null
          campaign_id: string
          created_at: string
          external_url: string | null
          id: string
          is_cover: boolean
          media_type: Database["public"]["Enums"]["campaign_media_type"]
          metadata: Json
          sort_order: number
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          campaign_id: string
          created_at?: string
          external_url?: string | null
          id?: string
          is_cover?: boolean
          media_type: Database["public"]["Enums"]["campaign_media_type"]
          metadata?: Json
          sort_order?: number
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          campaign_id?: string
          created_at?: string
          external_url?: string | null
          id?: string
          is_cover?: boolean
          media_type?: Database["public"]["Enums"]["campaign_media_type"]
          metadata?: Json
          sort_order?: number
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_media_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_reviews: {
        Row: {
          campaign_id: string
          created_at: string
          decision: Database["public"]["Enums"]["review_decision"]
          from_status: Database["public"]["Enums"]["campaign_status"] | null
          id: string
          notes: string | null
          reviewer_id: string
          to_status: Database["public"]["Enums"]["campaign_status"] | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          decision: Database["public"]["Enums"]["review_decision"]
          from_status?: Database["public"]["Enums"]["campaign_status"] | null
          id?: string
          notes?: string | null
          reviewer_id: string
          to_status?: Database["public"]["Enums"]["campaign_status"] | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          decision?: Database["public"]["Enums"]["review_decision"]
          from_status?: Database["public"]["Enums"]["campaign_status"] | null
          id?: string
          notes?: string | null
          reviewer_id?: string
          to_status?: Database["public"]["Enums"]["campaign_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_reviews_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_updates: {
        Row: {
          author_id: string
          body_content: string
          campaign_id: string
          created_at: string
          id: string
          is_published: boolean
          published_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body_content: string
          campaign_id: string
          created_at?: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body_content?: string
          campaign_id?: string
          created_at?: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_updates_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          approved_at: string | null
          cancellation_reason: string | null
          category_id: string
          closed_at: string | null
          created_at: string
          creator_id: string
          currency: string
          end_at: string | null
          funds_usage_content: string | null
          goal_amount_minor: number
          id: string
          lock_version: number
          published_at: string | null
          risks_content: string | null
          short_description: string | null
          slug: string
          start_at: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          story_content: string | null
          submitted_at: string | null
          suspension_reason: string | null
          timeline_content: string | null
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          cancellation_reason?: string | null
          category_id: string
          closed_at?: string | null
          created_at?: string
          creator_id: string
          currency?: string
          end_at?: string | null
          funds_usage_content?: string | null
          goal_amount_minor: number
          id?: string
          lock_version?: number
          published_at?: string | null
          risks_content?: string | null
          short_description?: string | null
          slug: string
          start_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          story_content?: string | null
          submitted_at?: string | null
          suspension_reason?: string | null
          timeline_content?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          cancellation_reason?: string | null
          category_id?: string
          closed_at?: string | null
          created_at?: string
          creator_id?: string
          currency?: string
          end_at?: string | null
          funds_usage_content?: string | null
          goal_amount_minor?: number
          id?: string
          lock_version?: number
          published_at?: string | null
          risks_content?: string | null
          short_description?: string | null
          slug?: string
          start_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          story_content?: string | null
          submitted_at?: string | null
          suspension_reason?: string | null
          timeline_content?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          icon_name: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      contributions: {
        Row: {
          amount_minor: number
          anonymous: boolean
          backer_id: string
          campaign_id: string
          contact_email_encrypted: string | null
          created_at: string
          currency: string
          display_name_snapshot: string | null
          environment: Database["public"]["Enums"]["financial_environment"]
          id: string
          idempotency_key: string | null
          reward_tier_id: string | null
          risk_acknowledged_at: string | null
          shipping_address_encrypted: string | null
          status: Database["public"]["Enums"]["contribution_status"]
          updated_at: string
        }
        Insert: {
          amount_minor: number
          anonymous?: boolean
          backer_id: string
          campaign_id: string
          contact_email_encrypted?: string | null
          created_at?: string
          currency?: string
          display_name_snapshot?: string | null
          environment?: Database["public"]["Enums"]["financial_environment"]
          id?: string
          idempotency_key?: string | null
          reward_tier_id?: string | null
          risk_acknowledged_at?: string | null
          shipping_address_encrypted?: string | null
          status?: Database["public"]["Enums"]["contribution_status"]
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          anonymous?: boolean
          backer_id?: string
          campaign_id?: string
          contact_email_encrypted?: string | null
          created_at?: string
          currency?: string
          display_name_snapshot?: string | null
          environment?: Database["public"]["Enums"]["financial_environment"]
          id?: string
          idempotency_key?: string | null
          reward_tier_id?: string | null
          risk_acknowledged_at?: string | null
          shipping_address_encrypted?: string | null
          status?: Database["public"]["Enums"]["contribution_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contributions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributions_reward_tier_id_fkey"
            columns: ["reward_tier_id"]
            isOneToOne: false
            referencedRelation: "reward_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          campaign_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_ledger_entries: {
        Row: {
          amount_minor: number
          campaign_id: string | null
          contribution_id: string | null
          correlation_id: string | null
          created_at: string
          currency: string
          entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          environment: Database["public"]["Enums"]["financial_environment"]
          id: string
          metadata: Json
          payment_transaction_id: string | null
          payout_id: string | null
          refund_id: string | null
          reversal_of_entry_id: string | null
        }
        Insert: {
          amount_minor: number
          campaign_id?: string | null
          contribution_id?: string | null
          correlation_id?: string | null
          created_at?: string
          currency?: string
          entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          environment?: Database["public"]["Enums"]["financial_environment"]
          id?: string
          metadata?: Json
          payment_transaction_id?: string | null
          payout_id?: string | null
          refund_id?: string | null
          reversal_of_entry_id?: string | null
        }
        Update: {
          amount_minor?: number
          campaign_id?: string | null
          contribution_id?: string | null
          correlation_id?: string | null
          created_at?: string
          currency?: string
          entry_type?: Database["public"]["Enums"]["ledger_entry_type"]
          environment?: Database["public"]["Enums"]["financial_environment"]
          id?: string
          metadata?: Json
          payment_transaction_id?: string | null
          payout_id?: string | null
          refund_id?: string | null
          reversal_of_entry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_ledger_entries_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_ledger_entries_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_ledger_entries_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_ledger_entries_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_ledger_entries_refund_id_fkey"
            columns: ["refund_id"]
            isOneToOne: false
            referencedRelation: "refunds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_ledger_entries_reversal_of_entry_id_fkey"
            columns: ["reversal_of_entry_id"]
            isOneToOne: false
            referencedRelation: "financial_ledger_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      idempotency_keys: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          key: string
          request_hash: string
          response_reference: Json
          scope: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          key: string
          request_hash: string
          response_reference?: Json
          scope: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          key?: string
          request_hash?: string
          response_reference?: Json
          scope?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json
          dedupe_key: string | null
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json
          dedupe_key?: string | null
          id?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json
          dedupe_key?: string | null
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount_minor: number
          attempt_number: number
          contribution_id: string
          created_at: string
          currency: string
          environment: Database["public"]["Enums"]["financial_environment"]
          error_code: string | null
          error_message: string | null
          id: string
          provider: string
          provider_payment_id: string | null
          provider_reference: string | null
          sanitized_metadata: Json
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount_minor: number
          attempt_number?: number
          contribution_id: string
          created_at?: string
          currency?: string
          environment?: Database["public"]["Enums"]["financial_environment"]
          error_code?: string | null
          error_message?: string | null
          id?: string
          provider: string
          provider_payment_id?: string | null
          provider_reference?: string | null
          sanitized_metadata?: Json
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          attempt_number?: number
          contribution_id?: string
          created_at?: string
          currency?: string
          environment?: Database["public"]["Enums"]["financial_environment"]
          error_code?: string | null
          error_message?: string | null
          id?: string
          provider?: string
          provider_payment_id?: string | null
          provider_reference?: string | null
          sanitized_metadata?: Json
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "contributions"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          campaign_id: string
          created_at: string
          creator_id: string
          currency: string
          environment: Database["public"]["Enums"]["financial_environment"]
          gross_amount_minor: number
          id: string
          net_amount_minor: number
          other_deduction_amount_minor: number
          platform_fee_amount_minor: number
          provider_fee_amount_minor: number
          provider_payout_id: string | null
          refund_amount_minor: number
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          creator_id: string
          currency?: string
          environment?: Database["public"]["Enums"]["financial_environment"]
          gross_amount_minor: number
          id?: string
          net_amount_minor: number
          other_deduction_amount_minor?: number
          platform_fee_amount_minor?: number
          provider_fee_amount_minor?: number
          provider_payout_id?: string | null
          refund_amount_minor?: number
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          creator_id?: string
          currency?: string
          environment?: Database["public"]["Enums"]["financial_environment"]
          gross_amount_minor?: number
          id?: string
          net_amount_minor?: number
          other_deduction_amount_minor?: number
          platform_fee_amount_minor?: number
          provider_fee_amount_minor?: number
          provider_payout_id?: string | null
          refund_amount_minor?: number
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_fees: {
        Row: {
          calculation_snapshot: Json
          campaign_id: string | null
          contribution_id: string | null
          created_at: string
          fee_amount_minor: number
          fee_rate_bps: number
          id: string
        }
        Insert: {
          calculation_snapshot?: Json
          campaign_id?: string | null
          contribution_id?: string | null
          created_at?: string
          fee_amount_minor: number
          fee_rate_bps: number
          id?: string
        }
        Update: {
          calculation_snapshot?: Json
          campaign_id?: string | null
          contribution_id?: string | null
          created_at?: string
          fee_amount_minor?: number
          fee_rate_bps?: number
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_fees_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_fees_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "contributions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          email_notifications_enabled: boolean
          id: string
          is_public: boolean
          location: string | null
          marketing_emails_enabled: boolean
          updated_at: string
          username: string | null
          website_url: string | null
        }
        Insert: {
          avatar_path?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email_notifications_enabled?: boolean
          id: string
          is_public?: boolean
          location?: string | null
          marketing_emails_enabled?: boolean
          updated_at?: string
          username?: string | null
          website_url?: string | null
        }
        Update: {
          avatar_path?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email_notifications_enabled?: boolean
          id?: string
          is_public?: boolean
          location?: string | null
          marketing_emails_enabled?: boolean
          updated_at?: string
          username?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount_minor: number
          contribution_id: string
          created_at: string
          id: string
          payment_transaction_id: string
          provider_refund_id: string | null
          reason: string | null
          requested_by: string | null
          status: Database["public"]["Enums"]["refund_status"]
          updated_at: string
        }
        Insert: {
          amount_minor: number
          contribution_id: string
          created_at?: string
          id?: string
          payment_transaction_id: string
          provider_refund_id?: string | null
          reason?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["refund_status"]
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          contribution_id?: string
          created_at?: string
          id?: string
          payment_transaction_id?: string
          provider_refund_id?: string | null
          reason?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["refund_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_tiers: {
        Row: {
          amount_minor: number
          campaign_id: string
          created_at: string
          description: string | null
          estimated_delivery_date: string | null
          id: string
          is_active: boolean
          quantity_limit: number | null
          shipping_required: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          amount_minor: number
          campaign_id: string
          created_at?: string
          description?: string | null
          estimated_delivery_date?: string | null
          id?: string
          is_active?: boolean
          quantity_limit?: number | null
          shipping_required?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          campaign_id?: string
          created_at?: string
          description?: string | null
          estimated_delivery_date?: string | null
          id?: string
          is_active?: boolean
          quantity_limit?: number | null
          shipping_required?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_tiers_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_by: string | null
          created_at: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          attempt_count: number
          event_type: string
          id: string
          last_error: string | null
          payload_hash: string
          processed_at: string | null
          processing_status: string
          provider: string
          provider_event_id: string
          received_at: string
          signature_valid: boolean
        }
        Insert: {
          attempt_count?: number
          event_type: string
          id?: string
          last_error?: string | null
          payload_hash: string
          processed_at?: string | null
          processing_status?: string
          provider: string
          provider_event_id: string
          received_at?: string
          signature_valid?: boolean
        }
        Update: {
          attempt_count?: number
          event_type?: string
          id?: string
          last_error?: string | null
          payload_hash?: string
          processed_at?: string | null
          processing_status?: string
          provider?: string
          provider_event_id?: string
          received_at?: string
          signature_valid?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      campaign_media_type: "image" | "video" | "document"
      campaign_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "revision_requested"
        | "approved"
        | "scheduled"
        | "live"
        | "successful"
        | "failed"
        | "cancelled"
        | "suspended"
        | "payout_pending"
        | "paid_out"
        | "refunding"
        | "refunded"
        | "rejected"
      contribution_status:
        | "pending"
        | "authorized"
        | "captured"
        | "failed"
        | "cancelled"
        | "refunded"
        | "partially_refunded"
      financial_environment: "test" | "live"
      ledger_entry_type:
        | "contribution_capture"
        | "contribution_refund"
        | "platform_fee"
        | "provider_fee"
        | "payout"
        | "adjustment"
        | "reversal"
      payment_status:
        | "initiated"
        | "pending"
        | "authorized"
        | "captured"
        | "failed"
        | "cancelled"
        | "expired"
        | "refunded"
      payout_status:
        | "scheduled"
        | "processing"
        | "paid"
        | "failed"
        | "cancelled"
        | "on_hold"
      refund_status:
        | "requested"
        | "processing"
        | "succeeded"
        | "failed"
        | "cancelled"
      review_decision:
        | "approved"
        | "rejected"
        | "revision_requested"
        | "suspended"
        | "reinstated"
      user_role: "admin" | "moderator" | "reviewer" | "creator" | "backer"
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
      campaign_media_type: ["image", "video", "document"],
      campaign_status: [
        "draft",
        "submitted",
        "under_review",
        "revision_requested",
        "approved",
        "scheduled",
        "live",
        "successful",
        "failed",
        "cancelled",
        "suspended",
        "payout_pending",
        "paid_out",
        "refunding",
        "refunded",
        "rejected",
      ],
      contribution_status: [
        "pending",
        "authorized",
        "captured",
        "failed",
        "cancelled",
        "refunded",
        "partially_refunded",
      ],
      financial_environment: ["test", "live"],
      ledger_entry_type: [
        "contribution_capture",
        "contribution_refund",
        "platform_fee",
        "provider_fee",
        "payout",
        "adjustment",
        "reversal",
      ],
      payment_status: [
        "initiated",
        "pending",
        "authorized",
        "captured",
        "failed",
        "cancelled",
        "expired",
        "refunded",
      ],
      payout_status: [
        "scheduled",
        "processing",
        "paid",
        "failed",
        "cancelled",
        "on_hold",
      ],
      refund_status: [
        "requested",
        "processing",
        "succeeded",
        "failed",
        "cancelled",
      ],
      review_decision: [
        "approved",
        "rejected",
        "revision_requested",
        "suspended",
        "reinstated",
      ],
      user_role: ["admin", "moderator", "reviewer", "creator", "backer"],
    },
  },
} as const
