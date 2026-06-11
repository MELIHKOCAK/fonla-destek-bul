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
      campaign_ai_summaries: {
        Row: {
          campaign_id: string
          created_at: string
          failure_code: string | null
          failure_message_masked: string | null
          generated_at: string | null
          generation_started_at: string | null
          id: string
          language_code: string
          model_identifier: string | null
          prompt_version: string
          schema_version: number
          source_hash: string
          source_version: number
          stale_at: string | null
          status: Database["public"]["Enums"]["campaign_ai_summary_status"]
          summary_json: Json | null
          updated_at: string
          word_count: number | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          failure_code?: string | null
          failure_message_masked?: string | null
          generated_at?: string | null
          generation_started_at?: string | null
          id?: string
          language_code: string
          model_identifier?: string | null
          prompt_version: string
          schema_version: number
          source_hash: string
          source_version: number
          stale_at?: string | null
          status: Database["public"]["Enums"]["campaign_ai_summary_status"]
          summary_json?: Json | null
          updated_at?: string
          word_count?: number | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          failure_code?: string | null
          failure_message_masked?: string | null
          generated_at?: string | null
          generation_started_at?: string | null
          id?: string
          language_code?: string
          model_identifier?: string | null
          prompt_version?: string
          schema_version?: number
          source_hash?: string
          source_version?: number
          stale_at?: string | null
          status?: Database["public"]["Enums"]["campaign_ai_summary_status"]
          summary_json?: Json | null
          updated_at?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_ai_summaries_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_ai_summary_audit: {
        Row: {
          actor_type: string
          cache_hit: boolean
          campaign_id: string
          created_at: string
          id: number
          language_code: string
          result_type: string
        }
        Insert: {
          actor_type: string
          cache_hit: boolean
          campaign_id: string
          created_at?: string
          id?: number
          language_code: string
          result_type: string
        }
        Update: {
          actor_type?: string
          cache_hit?: boolean
          campaign_id?: string
          created_at?: string
          id?: number
          language_code?: string
          result_type?: string
        }
        Relationships: []
      }
      campaign_ai_summary_rate_limits: {
        Row: {
          actor_key_hash: string
          campaign_id: string
          created_at: string
          last_generation_request_at: string
          updated_at: string
        }
        Insert: {
          actor_key_hash: string
          campaign_id: string
          created_at?: string
          last_generation_request_at: string
          updated_at?: string
        }
        Update: {
          actor_key_hash?: string
          campaign_id?: string
          created_at?: string
          last_generation_request_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_ai_summary_rate_limits_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_comments: {
        Row: {
          author_id: string
          body: string
          campaign_id: string
          created_at: string
          edited_at: string | null
          id: string
          parent_id: string | null
          status: Database["public"]["Enums"]["comment_status"]
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          campaign_id: string
          created_at?: string
          edited_at?: string | null
          id?: string
          parent_id?: string | null
          status?: Database["public"]["Enums"]["comment_status"]
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          campaign_id?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          parent_id?: string | null
          status?: Database["public"]["Enums"]["comment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_comments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "campaign_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_follows: {
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
            foreignKeyName: "campaign_follows_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
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
      campaign_reports: {
        Row: {
          assigned_admin_id: string | null
          campaign_id: string | null
          comment_id: string | null
          created_at: string
          description: string | null
          id: string
          reason_code: string
          reporter_id: string
          resolution_note: string | null
          status: Database["public"]["Enums"]["report_status"]
          updated_at: string
        }
        Insert: {
          assigned_admin_id?: string | null
          campaign_id?: string | null
          comment_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reason_code: string
          reporter_id: string
          resolution_note?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Update: {
          assigned_admin_id?: string | null
          campaign_id?: string | null
          comment_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reason_code?: string
          reporter_id?: string
          resolution_note?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_reports_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "campaign_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_reviews: {
        Row: {
          campaign_id: string
          created_at: string
          creator_visible_notes: string | null
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
          creator_visible_notes?: string | null
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
          creator_visible_notes?: string | null
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
      campaign_settlements: {
        Row: {
          campaign_id: string
          computed_at: string | null
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
          refunded_amount_minor: number
          status: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          computed_at?: string | null
          created_at?: string
          creator_id: string
          currency?: string
          environment?: Database["public"]["Enums"]["financial_environment"]
          gross_amount_minor?: number
          id?: string
          net_amount_minor?: number
          other_deduction_amount_minor?: number
          platform_fee_amount_minor?: number
          provider_fee_amount_minor?: number
          refunded_amount_minor?: number
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          computed_at?: string | null
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
          refunded_amount_minor?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_settlements_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
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
          edit_history: Json
          edited_at: string | null
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
          edit_history?: Json
          edited_at?: string | null
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
          edit_history?: Json
          edited_at?: string | null
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
          ai_summary_source_version: number
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
          reject_reason_code: string | null
          reject_reason_note: string | null
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
          ai_summary_source_version?: number
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
          reject_reason_code?: string | null
          reject_reason_note?: string | null
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
          ai_summary_source_version?: number
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
          reject_reason_code?: string | null
          reject_reason_note?: string | null
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
          {
            foreignKeyName: "campaigns_creator_id_profiles_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_creator_id_profiles_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
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
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: Database["public"]["Enums"]["contact_message_status"]
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: Database["public"]["Enums"]["contact_message_status"]
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: Database["public"]["Enums"]["contact_message_status"]
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      contributions: {
        Row: {
          amount_minor: number
          anonymous: boolean
          backer_id: string
          campaign_id: string
          contact_email: string | null
          contact_email_encrypted: string | null
          contact_phone: string | null
          created_at: string
          currency: string
          display_name_snapshot: string | null
          environment: Database["public"]["Enums"]["financial_environment"]
          id: string
          idempotency_key: string | null
          reward_tier_id: string | null
          risk_acknowledged_at: string | null
          shipping_address_encrypted: string | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_line1: string | null
          shipping_line2: string | null
          shipping_postal_code: string | null
          shipping_recipient_name: string | null
          status: Database["public"]["Enums"]["contribution_status"]
          updated_at: string
        }
        Insert: {
          amount_minor: number
          anonymous?: boolean
          backer_id: string
          campaign_id: string
          contact_email?: string | null
          contact_email_encrypted?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string
          display_name_snapshot?: string | null
          environment?: Database["public"]["Enums"]["financial_environment"]
          id?: string
          idempotency_key?: string | null
          reward_tier_id?: string | null
          risk_acknowledged_at?: string | null
          shipping_address_encrypted?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_line1?: string | null
          shipping_line2?: string | null
          shipping_postal_code?: string | null
          shipping_recipient_name?: string | null
          status?: Database["public"]["Enums"]["contribution_status"]
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          anonymous?: boolean
          backer_id?: string
          campaign_id?: string
          contact_email?: string | null
          contact_email_encrypted?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string
          display_name_snapshot?: string | null
          environment?: Database["public"]["Enums"]["financial_environment"]
          id?: string
          idempotency_key?: string | null
          reward_tier_id?: string | null
          risk_acknowledged_at?: string | null
          shipping_address_encrypted?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_line1?: string | null
          shipping_line2?: string | null
          shipping_postal_code?: string | null
          shipping_recipient_name?: string | null
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
      creator_payment_accounts: {
        Row: {
          capabilities_snapshot: Json
          charges_enabled: boolean
          country: string | null
          created_at: string
          creator_id: string
          default_currency: string | null
          details_submitted: boolean
          disabled_reason: string | null
          environment: Database["public"]["Enums"]["financial_environment"]
          id: string
          last_provider_sync_at: string | null
          onboarding_status: Database["public"]["Enums"]["creator_payment_account_status"]
          payouts_enabled: boolean
          provider: string
          provider_account_id: string | null
          requirements_currently_due: string[]
          requirements_eventually_due: string[]
          requirements_past_due: string[]
          requirements_pending_verification: string[]
          updated_at: string
        }
        Insert: {
          capabilities_snapshot?: Json
          charges_enabled?: boolean
          country?: string | null
          created_at?: string
          creator_id: string
          default_currency?: string | null
          details_submitted?: boolean
          disabled_reason?: string | null
          environment: Database["public"]["Enums"]["financial_environment"]
          id?: string
          last_provider_sync_at?: string | null
          onboarding_status?: Database["public"]["Enums"]["creator_payment_account_status"]
          payouts_enabled?: boolean
          provider?: string
          provider_account_id?: string | null
          requirements_currently_due?: string[]
          requirements_eventually_due?: string[]
          requirements_past_due?: string[]
          requirements_pending_verification?: string[]
          updated_at?: string
        }
        Update: {
          capabilities_snapshot?: Json
          charges_enabled?: boolean
          country?: string | null
          created_at?: string
          creator_id?: string
          default_currency?: string | null
          details_submitted?: boolean
          disabled_reason?: string | null
          environment?: Database["public"]["Enums"]["financial_environment"]
          id?: string
          last_provider_sync_at?: string | null
          onboarding_status?: Database["public"]["Enums"]["creator_payment_account_status"]
          payouts_enabled?: boolean
          provider?: string
          provider_account_id?: string | null
          requirements_currently_due?: string[]
          requirements_eventually_due?: string[]
          requirements_past_due?: string[]
          requirements_pending_verification?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      creator_transfer_reversals: {
        Row: {
          amount_minor: number
          completed_at: string | null
          created_at: string
          creator_transfer_id: string
          currency: string
          id: string
          provider_transfer_reversal_id: string | null
          reason: string | null
          status: Database["public"]["Enums"]["creator_transfer_reversal_status"]
        }
        Insert: {
          amount_minor: number
          completed_at?: string | null
          created_at?: string
          creator_transfer_id: string
          currency?: string
          id?: string
          provider_transfer_reversal_id?: string | null
          reason?: string | null
          status?: Database["public"]["Enums"]["creator_transfer_reversal_status"]
        }
        Update: {
          amount_minor?: number
          completed_at?: string | null
          created_at?: string
          creator_transfer_id?: string
          currency?: string
          id?: string
          provider_transfer_reversal_id?: string | null
          reason?: string | null
          status?: Database["public"]["Enums"]["creator_transfer_reversal_status"]
        }
        Relationships: [
          {
            foreignKeyName: "creator_transfer_reversals_creator_transfer_id_fkey"
            columns: ["creator_transfer_id"]
            isOneToOne: false
            referencedRelation: "creator_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_transfers: {
        Row: {
          amount_minor: number
          campaign_id: string
          completed_at: string | null
          created_at: string
          creator_id: string
          creator_payment_account_id: string | null
          currency: string
          environment: Database["public"]["Enums"]["financial_environment"]
          failure_code: string | null
          failure_message_sanitized: string | null
          id: string
          initiated_at: string | null
          provider: string
          provider_transfer_group: string | null
          provider_transfer_id: string | null
          settlement_id: string | null
          status: Database["public"]["Enums"]["creator_transfer_status"]
          updated_at: string
        }
        Insert: {
          amount_minor: number
          campaign_id: string
          completed_at?: string | null
          created_at?: string
          creator_id: string
          creator_payment_account_id?: string | null
          currency?: string
          environment?: Database["public"]["Enums"]["financial_environment"]
          failure_code?: string | null
          failure_message_sanitized?: string | null
          id?: string
          initiated_at?: string | null
          provider?: string
          provider_transfer_group?: string | null
          provider_transfer_id?: string | null
          settlement_id?: string | null
          status?: Database["public"]["Enums"]["creator_transfer_status"]
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          campaign_id?: string
          completed_at?: string | null
          created_at?: string
          creator_id?: string
          creator_payment_account_id?: string | null
          currency?: string
          environment?: Database["public"]["Enums"]["financial_environment"]
          failure_code?: string | null
          failure_message_sanitized?: string | null
          id?: string
          initiated_at?: string | null
          provider?: string
          provider_transfer_group?: string | null
          provider_transfer_id?: string | null
          settlement_id?: string | null
          status?: Database["public"]["Enums"]["creator_transfer_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_transfers_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_transfers_creator_payment_account_id_fkey"
            columns: ["creator_payment_account_id"]
            isOneToOne: false
            referencedRelation: "creator_payment_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_transfers_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "campaign_settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      email_deliveries: {
        Row: {
          attempt_count: number
          created_at: string
          dedupe_key: string
          id: string
          last_error: string | null
          next_attempt_at: string
          outbox_id: string | null
          provider_message_id: string | null
          recipient_email: string
          recipient_user_id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["email_delivery_status"]
          template_data: Json
          template_name: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          dedupe_key: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          outbox_id?: string | null
          provider_message_id?: string | null
          recipient_email: string
          recipient_user_id: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_delivery_status"]
          template_data?: Json
          template_name: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          dedupe_key?: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          outbox_id?: string | null
          provider_message_id?: string | null
          recipient_email?: string
          recipient_user_id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_delivery_status"]
          template_data?: Json
          template_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_deliveries_outbox_id_fkey"
            columns: ["outbox_id"]
            isOneToOne: false
            referencedRelation: "notification_outbox"
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
          creator_transfer_id: string | null
          creator_transfer_reversal_id: string | null
          currency: string
          entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          environment: Database["public"]["Enums"]["financial_environment"]
          id: string
          metadata: Json
          payment_transaction_id: string | null
          payout_id: string | null
          provider_payout_id: string | null
          refund_id: string | null
          reversal_of_entry_id: string | null
        }
        Insert: {
          amount_minor: number
          campaign_id?: string | null
          contribution_id?: string | null
          correlation_id?: string | null
          created_at?: string
          creator_transfer_id?: string | null
          creator_transfer_reversal_id?: string | null
          currency?: string
          entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          environment?: Database["public"]["Enums"]["financial_environment"]
          id?: string
          metadata?: Json
          payment_transaction_id?: string | null
          payout_id?: string | null
          provider_payout_id?: string | null
          refund_id?: string | null
          reversal_of_entry_id?: string | null
        }
        Update: {
          amount_minor?: number
          campaign_id?: string | null
          contribution_id?: string | null
          correlation_id?: string | null
          created_at?: string
          creator_transfer_id?: string | null
          creator_transfer_reversal_id?: string | null
          currency?: string
          entry_type?: Database["public"]["Enums"]["ledger_entry_type"]
          environment?: Database["public"]["Enums"]["financial_environment"]
          id?: string
          metadata?: Json
          payment_transaction_id?: string | null
          payout_id?: string | null
          provider_payout_id?: string | null
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
            foreignKeyName: "financial_ledger_entries_creator_transfer_id_fkey"
            columns: ["creator_transfer_id"]
            isOneToOne: false
            referencedRelation: "creator_transfers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_ledger_entries_creator_transfer_reversal_id_fkey"
            columns: ["creator_transfer_reversal_id"]
            isOneToOne: false
            referencedRelation: "creator_transfer_reversals"
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
            foreignKeyName: "financial_ledger_entries_provider_payout_id_fkey"
            columns: ["provider_payout_id"]
            isOneToOne: false
            referencedRelation: "provider_payouts"
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
      legal_consents: {
        Row: {
          accepted_at: string
          created_at: string
          document_slug: string
          document_version: string
          id: string
          ip_hash: string | null
          user_agent_hint: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          created_at?: string
          document_slug: string
          document_version: string
          id?: string
          ip_hash?: string | null
          user_agent_hint?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          created_at?: string
          document_slug?: string
          document_version?: string
          id?: string
          ip_hash?: string | null
          user_agent_hint?: string | null
          user_id?: string
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          content_url: string | null
          created_at: string
          effective_at: string | null
          id: string
          slug: string
          status: string
          summary: string | null
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          content_url?: string | null
          created_at?: string
          effective_at?: string | null
          id?: string
          slug: string
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
          version: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          content_url?: string | null
          created_at?: string
          effective_at?: string | null
          id?: string
          slug?: string
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      notification_outbox: {
        Row: {
          attempt_count: number
          correlation_id: string | null
          created_at: string
          dedupe_key: string
          entity_id: string | null
          entity_type: string
          event_type: Database["public"]["Enums"]["notification_event_type"]
          id: string
          last_error: string | null
          next_attempt_at: string
          payload: Json
          recipient_user_id: string
          status: Database["public"]["Enums"]["notification_outbox_status"]
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          correlation_id?: string | null
          created_at?: string
          dedupe_key: string
          entity_id?: string | null
          entity_type: string
          event_type: Database["public"]["Enums"]["notification_event_type"]
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          payload?: Json
          recipient_user_id: string
          status?: Database["public"]["Enums"]["notification_outbox_status"]
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          correlation_id?: string | null
          created_at?: string
          dedupe_key?: string
          entity_id?: string | null
          entity_type?: string
          event_type?: Database["public"]["Enums"]["notification_event_type"]
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          payload?: Json
          recipient_user_id?: string
          status?: Database["public"]["Enums"]["notification_outbox_status"]
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          campaign_updates_email: boolean
          marketing_email: boolean
          transaction_email: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_updates_email?: boolean
          marketing_email?: boolean
          transaction_email?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_updates_email?: boolean
          marketing_email?: boolean
          transaction_email?: boolean
          updated_at?: string
          user_id?: string
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
      payment_provider_configs: {
        Row: {
          capture_model: string
          checkout_mode: string
          connect_flow: string
          created_at: string
          creator_onboarding_enabled: boolean
          currency: string
          environment: Database["public"]["Enums"]["financial_environment"]
          failed_campaign_model: string
          id: string
          live_payments_enabled: boolean
          payments_enabled: boolean
          production_approval_note: string | null
          production_approval_status: Database["public"]["Enums"]["production_approval_status"]
          provider: string
          refunds_enabled: boolean
          transfers_enabled: boolean
          updated_at: string
        }
        Insert: {
          capture_model?: string
          checkout_mode?: string
          connect_flow?: string
          created_at?: string
          creator_onboarding_enabled?: boolean
          currency?: string
          environment: Database["public"]["Enums"]["financial_environment"]
          failed_campaign_model?: string
          id?: string
          live_payments_enabled?: boolean
          payments_enabled?: boolean
          production_approval_note?: string | null
          production_approval_status?: Database["public"]["Enums"]["production_approval_status"]
          provider: string
          refunds_enabled?: boolean
          transfers_enabled?: boolean
          updated_at?: string
        }
        Update: {
          capture_model?: string
          checkout_mode?: string
          connect_flow?: string
          created_at?: string
          creator_onboarding_enabled?: boolean
          currency?: string
          environment?: Database["public"]["Enums"]["financial_environment"]
          failed_campaign_model?: string
          id?: string
          live_payments_enabled?: boolean
          payments_enabled?: boolean
          production_approval_note?: string | null
          production_approval_status?: Database["public"]["Enums"]["production_approval_status"]
          provider?: string
          refunds_enabled?: boolean
          transfers_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount_minor: number
          attempt_number: number
          checkout_expires_at: string | null
          completed_at: string | null
          contribution_id: string
          created_at: string
          currency: string
          domain_status:
            | Database["public"]["Enums"]["payment_domain_status"]
            | null
          environment: Database["public"]["Enums"]["financial_environment"]
          error_code: string | null
          error_message: string | null
          failure_code: string | null
          failure_message_sanitized: string | null
          id: string
          last_provider_event_id: string | null
          livemode: boolean | null
          provider: string
          provider_balance_transaction_id: string | null
          provider_charge_id: string | null
          provider_checkout_session_id: string | null
          provider_connected_account_id: string | null
          provider_created_at: string | null
          provider_payment_id: string | null
          provider_payment_intent_id: string | null
          provider_reference: string | null
          provider_status: string | null
          sanitized_metadata: Json
          status: Database["public"]["Enums"]["payment_status"]
          stripe_idempotency_key: string | null
          transfer_group: string | null
          updated_at: string
        }
        Insert: {
          amount_minor: number
          attempt_number?: number
          checkout_expires_at?: string | null
          completed_at?: string | null
          contribution_id: string
          created_at?: string
          currency?: string
          domain_status?:
            | Database["public"]["Enums"]["payment_domain_status"]
            | null
          environment?: Database["public"]["Enums"]["financial_environment"]
          error_code?: string | null
          error_message?: string | null
          failure_code?: string | null
          failure_message_sanitized?: string | null
          id?: string
          last_provider_event_id?: string | null
          livemode?: boolean | null
          provider: string
          provider_balance_transaction_id?: string | null
          provider_charge_id?: string | null
          provider_checkout_session_id?: string | null
          provider_connected_account_id?: string | null
          provider_created_at?: string | null
          provider_payment_id?: string | null
          provider_payment_intent_id?: string | null
          provider_reference?: string | null
          provider_status?: string | null
          sanitized_metadata?: Json
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_idempotency_key?: string | null
          transfer_group?: string | null
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          attempt_number?: number
          checkout_expires_at?: string | null
          completed_at?: string | null
          contribution_id?: string
          created_at?: string
          currency?: string
          domain_status?:
            | Database["public"]["Enums"]["payment_domain_status"]
            | null
          environment?: Database["public"]["Enums"]["financial_environment"]
          error_code?: string | null
          error_message?: string | null
          failure_code?: string | null
          failure_message_sanitized?: string | null
          id?: string
          last_provider_event_id?: string | null
          livemode?: boolean | null
          provider?: string
          provider_balance_transaction_id?: string | null
          provider_charge_id?: string | null
          provider_checkout_session_id?: string | null
          provider_connected_account_id?: string | null
          provider_created_at?: string | null
          provider_payment_id?: string | null
          provider_payment_intent_id?: string | null
          provider_reference?: string | null
          provider_status?: string | null
          sanitized_metadata?: Json
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_idempotency_key?: string | null
          transfer_group?: string | null
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
          auto_follow_on_pledge: boolean
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
          auto_follow_on_pledge?: boolean
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
          auto_follow_on_pledge?: boolean
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
      provider_payouts: {
        Row: {
          amount_minor: number
          arrival_date: string | null
          created_at: string
          creator_id: string
          creator_payment_account_id: string | null
          currency: string
          environment: Database["public"]["Enums"]["financial_environment"]
          failure_code: string | null
          failure_message_sanitized: string | null
          id: string
          provider: string
          provider_payout_id: string | null
          status: Database["public"]["Enums"]["provider_payout_status"]
          updated_at: string
        }
        Insert: {
          amount_minor: number
          arrival_date?: string | null
          created_at?: string
          creator_id: string
          creator_payment_account_id?: string | null
          currency?: string
          environment?: Database["public"]["Enums"]["financial_environment"]
          failure_code?: string | null
          failure_message_sanitized?: string | null
          id?: string
          provider?: string
          provider_payout_id?: string | null
          status?: Database["public"]["Enums"]["provider_payout_status"]
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          arrival_date?: string | null
          created_at?: string
          creator_id?: string
          creator_payment_account_id?: string | null
          currency?: string
          environment?: Database["public"]["Enums"]["financial_environment"]
          failure_code?: string | null
          failure_message_sanitized?: string | null
          id?: string
          provider?: string
          provider_payout_id?: string | null
          status?: Database["public"]["Enums"]["provider_payout_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_payouts_creator_payment_account_id_fkey"
            columns: ["creator_payment_account_id"]
            isOneToOne: false
            referencedRelation: "creator_payment_accounts"
            referencedColumns: ["id"]
          },
        ]
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
      release_gates: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          description: string | null
          enabled: boolean
          evidence_url: string | null
          key: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          description?: string | null
          enabled?: boolean
          evidence_url?: string | null
          key: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          description?: string | null
          enabled?: boolean
          evidence_url?: string | null
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
      reward_reservations: {
        Row: {
          backer_id: string
          confirmed_at: string | null
          contribution_id: string
          created_at: string
          environment: Database["public"]["Enums"]["financial_environment"]
          expires_at: string
          id: string
          quantity: number
          release_reason: string | null
          released_at: string | null
          reward_tier_id: string
          status: Database["public"]["Enums"]["reward_reservation_status"]
          updated_at: string
        }
        Insert: {
          backer_id: string
          confirmed_at?: string | null
          contribution_id: string
          created_at?: string
          environment?: Database["public"]["Enums"]["financial_environment"]
          expires_at: string
          id?: string
          quantity?: number
          release_reason?: string | null
          released_at?: string | null
          reward_tier_id: string
          status?: Database["public"]["Enums"]["reward_reservation_status"]
          updated_at?: string
        }
        Update: {
          backer_id?: string
          confirmed_at?: string | null
          contribution_id?: string
          created_at?: string
          environment?: Database["public"]["Enums"]["financial_environment"]
          expires_at?: string
          id?: string
          quantity?: number
          release_reason?: string | null
          released_at?: string | null
          reward_tier_id?: string
          status?: Database["public"]["Enums"]["reward_reservation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_reservations_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_reservations_reward_tier_id_fkey"
            columns: ["reward_tier_id"]
            isOneToOne: false
            referencedRelation: "reward_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_tiers: {
        Row: {
          amount_minor: number
          campaign_id: string
          claimed_count: number
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
          claimed_count?: number
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
          claimed_count?: number
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
          api_version: string | null
          attempt_count: number
          dead_lettered_at: string | null
          environment: Database["public"]["Enums"]["financial_environment"]
          event_created_at: string | null
          event_type: string
          id: string
          last_error: string | null
          livemode: boolean | null
          next_retry_at: string | null
          payload_hash: string
          processed_at: string | null
          processing_completed_at: string | null
          processing_started_at: string | null
          processing_status: string
          provider: string
          provider_account_id: string | null
          provider_event_id: string
          provider_object_id: string | null
          provider_object_type: string | null
          received_at: string
          request_id: string | null
          signature_valid: boolean
        }
        Insert: {
          api_version?: string | null
          attempt_count?: number
          dead_lettered_at?: string | null
          environment?: Database["public"]["Enums"]["financial_environment"]
          event_created_at?: string | null
          event_type: string
          id?: string
          last_error?: string | null
          livemode?: boolean | null
          next_retry_at?: string | null
          payload_hash: string
          processed_at?: string | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          processing_status?: string
          provider: string
          provider_account_id?: string | null
          provider_event_id: string
          provider_object_id?: string | null
          provider_object_type?: string | null
          received_at?: string
          request_id?: string | null
          signature_valid?: boolean
        }
        Update: {
          api_version?: string | null
          attempt_count?: number
          dead_lettered_at?: string | null
          environment?: Database["public"]["Enums"]["financial_environment"]
          event_created_at?: string | null
          event_type?: string
          id?: string
          last_error?: string | null
          livemode?: boolean | null
          next_retry_at?: string | null
          payload_hash?: string
          processed_at?: string | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          processing_status?: string
          provider?: string
          provider_account_id?: string | null
          provider_event_id?: string
          provider_object_id?: string | null
          provider_object_type?: string | null
          received_at?: string
          request_id?: string | null
          signature_valid?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      creator_campaign_reviews: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          creator_visible_notes: string | null
          decision: Database["public"]["Enums"]["review_decision"] | null
          from_status: Database["public"]["Enums"]["campaign_status"] | null
          id: string | null
          to_status: Database["public"]["Enums"]["campaign_status"] | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          creator_visible_notes?: string | null
          decision?: Database["public"]["Enums"]["review_decision"] | null
          from_status?: Database["public"]["Enums"]["campaign_status"] | null
          id?: string | null
          to_status?: Database["public"]["Enums"]["campaign_status"] | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          creator_visible_notes?: string | null
          decision?: Database["public"]["Enums"]["review_decision"] | null
          from_status?: Database["public"]["Enums"]["campaign_status"] | null
          id?: string | null
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
      my_reports: {
        Row: {
          campaign_id: string | null
          comment_id: string | null
          created_at: string | null
          description: string | null
          id: string | null
          reason_code: string | null
          reporter_id: string | null
          status: Database["public"]["Enums"]["report_status"] | null
          updated_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          comment_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          reason_code?: string | null
          reporter_id?: string | null
          status?: Database["public"]["Enums"]["report_status"] | null
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          comment_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          reason_code?: string | null
          reporter_id?: string | null
          status?: Database["public"]["Enums"]["report_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_reports_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "campaign_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles_public: {
        Row: {
          avatar_path: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          location: string | null
          username: string | null
          website_url: string | null
        }
        Insert: {
          avatar_path?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          location?: string | null
          username?: string | null
          website_url?: string | null
        }
        Update: {
          avatar_path?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          location?: string | null
          username?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _assert_admin: { Args: never; Returns: undefined }
      _finalize_contribution_paid: {
        Args: { _contribution_id: string; _payment_transaction_id: string }
        Returns: {
          amount_minor: number
          anonymous: boolean
          backer_id: string
          campaign_id: string
          contact_email: string | null
          contact_email_encrypted: string | null
          contact_phone: string | null
          created_at: string
          currency: string
          display_name_snapshot: string | null
          environment: Database["public"]["Enums"]["financial_environment"]
          id: string
          idempotency_key: string | null
          reward_tier_id: string | null
          risk_acknowledged_at: string | null
          shipping_address_encrypted: string | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_line1: string | null
          shipping_line2: string | null
          shipping_postal_code: string | null
          shipping_recipient_name: string | null
          status: Database["public"]["Enums"]["contribution_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "contributions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_hide_comment: {
        Args: { _comment_id: string; _reason: string }
        Returns: {
          author_id: string
          body: string
          campaign_id: string
          created_at: string
          edited_at: string | null
          id: string
          parent_id: string | null
          status: Database["public"]["Enums"]["comment_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "campaign_comments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      approve_campaign: {
        Args: {
          _campaign_id: string
          _creator_note?: string
          _expected_lock_version: number
          _internal_note?: string
        }
        Returns: {
          ai_summary_source_version: number
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
          reject_reason_code: string | null
          reject_reason_note: string | null
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
        SetofOptions: {
          from: "*"
          to: "campaigns"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      campaign_contributions_for_creator: {
        Args: { _campaign_id: string }
        Returns: {
          amount_minor: number
          anonymous: boolean
          campaign_id: string
          created_at: string
          currency: string
          display_name_snapshot: string
          id: string
          reward_tier_id: string
          status: Database["public"]["Enums"]["contribution_status"]
        }[]
      }
      campaign_is_public: { Args: { _campaign_id: string }; Returns: boolean }
      campaign_owned_by_me: { Args: { _campaign_id: string }; Returns: boolean }
      campaign_status: {
        Args: { _campaign_id: string }
        Returns: Database["public"]["Enums"]["campaign_status"]
      }
      check_username_available: {
        Args: { _username: string }
        Returns: boolean
      }
      claim_campaign_ai_summary_generation: {
        Args: {
          _actor_key_hash: string
          _campaign_id: string
          _language_code: string
          _prompt_version: string
          _rate_limit_seconds?: number
          _schema_version: number
          _source_hash: string
          _source_version: number
        }
        Returns: Json
      }
      claim_username: { Args: { _username: string }; Returns: undefined }
      claim_webhook_event: {
        Args: {
          _api_version: string
          _environment: Database["public"]["Enums"]["financial_environment"]
          _event_created_at: string
          _event_type: string
          _livemode: boolean
          _payload_hash: string
          _provider: string
          _provider_account_id: string
          _provider_event_id: string
          _provider_object_id: string
          _provider_object_type: string
          _request_id: string
          _signature_valid: boolean
        }
        Returns: {
          event_id: string
          is_new: boolean
        }[]
      }
      confirm_reward_reservation: {
        Args: { _contribution_id: string }
        Returns: number
      }
      create_campaign_draft: {
        Args: { _category_id: string; _title: string }
        Returns: {
          ai_summary_source_version: number
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
          reject_reason_code: string | null
          reject_reason_note: string | null
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
        SetofOptions: {
          from: "*"
          to: "campaigns"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_comment: {
        Args: { _body: string; _campaign_id: string; _parent_id: string }
        Returns: {
          author_id: string
          body: string
          campaign_id: string
          created_at: string
          edited_at: string | null
          id: string
          parent_id: string | null
          status: Database["public"]["Enums"]["comment_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "campaign_comments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_contribution: {
        Args: {
          _amount_minor: number
          _anonymous: boolean
          _campaign_id: string
          _idempotency_key: string
          _reward_tier_id: string
          _risk_ack: boolean
          _shipping: Json
        }
        Returns: {
          amount_minor: number
          anonymous: boolean
          backer_id: string
          campaign_id: string
          contact_email: string | null
          contact_email_encrypted: string | null
          contact_phone: string | null
          created_at: string
          currency: string
          display_name_snapshot: string | null
          environment: Database["public"]["Enums"]["financial_environment"]
          id: string
          idempotency_key: string | null
          reward_tier_id: string | null
          risk_acknowledged_at: string | null
          shipping_address_encrypted: string | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_line1: string | null
          shipping_line2: string | null
          shipping_postal_code: string | null
          shipping_recipient_name: string | null
          status: Database["public"]["Enums"]["contribution_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "contributions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      creator_campaign_reviews: {
        Args: { _campaign_id: string }
        Returns: {
          campaign_id: string
          created_at: string
          creator_visible_notes: string
          decision: Database["public"]["Enums"]["review_decision"]
          from_status: Database["public"]["Enums"]["campaign_status"]
          id: string
          to_status: Database["public"]["Enums"]["campaign_status"]
        }[]
      }
      creator_edit_update: {
        Args: { _body: string; _title: string; _update_id: string }
        Returns: {
          author_id: string
          body_content: string
          campaign_id: string
          created_at: string
          edit_history: Json
          edited_at: string | null
          id: string
          is_published: boolean
          published_at: string | null
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "campaign_updates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_unique_campaign_slug: {
        Args: { _base: string }
        Returns: string
      }
      get_admin_audit_log: {
        Args: {
          p_action?: string
          p_actor_user_id?: string
          p_entity_id?: string
          p_entity_type?: string
          p_from?: string
          p_limit?: number
          p_offset?: number
          p_to?: string
        }
        Returns: {
          action: string
          actor_user_id: string
          after_data: Json
          before_data: Json
          correlation_id: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          reason: string
          total_count: number
        }[]
      }
      get_admin_dashboard_overview: { Args: never; Returns: Json }
      get_admin_system_alerts: { Args: never; Returns: Json }
      get_campaign_payment_readiness: {
        Args: { _campaign_id: string }
        Returns: Json
      }
      get_campaign_progress: {
        Args: { _campaign_id: string }
        Returns: {
          backer_count: number
          contribution_count: number
          funded_pct: number
          goal_amount_minor: number
          raised_amount_minor: number
        }[]
      }
      get_contribution_status: {
        Args: { _id: string }
        Returns: {
          amount_minor: number
          campaign_id: string
          created_at: string
          currency: string
          environment: Database["public"]["Enums"]["financial_environment"]
          id: string
          latest_attempt_number: number
          latest_payment_status: Database["public"]["Enums"]["payment_status"]
          reward_tier_id: string
          status: Database["public"]["Enums"]["contribution_status"]
        }[]
      }
      get_creator_campaign_analytics: {
        Args: { p_campaign_id: string; p_from?: string; p_to?: string }
        Returns: Json
      }
      get_creator_campaign_backers: {
        Args: { p_campaign_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          amount_minor: number
          contribution_id: string
          created_at: string
          display_name: string
          is_anonymous: boolean
          reward_tier_id: string
          reward_title: string
          shipping_required: boolean
          status: Database["public"]["Enums"]["contribution_status"]
        }[]
      }
      get_creator_campaign_finance: {
        Args: { p_campaign_id: string }
        Returns: Json
      }
      get_creator_campaign_overview: {
        Args: { p_campaign_id: string }
        Returns: Json
      }
      get_creator_overview: { Args: never; Returns: Json }
      get_my_contributions: {
        Args: never
        Returns: {
          amount_minor: number
          campaign_id: string
          campaign_slug: string
          campaign_title: string
          created_at: string
          currency: string
          environment: Database["public"]["Enums"]["financial_environment"]
          id: string
          latest_payment_status: Database["public"]["Enums"]["payment_status"]
          reward_tier_id: string
          reward_title: string
          status: Database["public"]["Enums"]["contribution_status"]
        }[]
      }
      get_my_creator_payment_account: {
        Args: {
          _environment?: Database["public"]["Enums"]["financial_environment"]
        }
        Returns: Json
      }
      get_notification_preferences: {
        Args: never
        Returns: {
          campaign_updates_email: boolean
          marketing_email: boolean
          transaction_email: boolean
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "notification_preferences"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_public_campaign_by_slug: {
        Args: { _slug: string }
        Returns: {
          backer_count: number
          category_name: string
          category_slug: string
          cover_external_url: string
          cover_storage_path: string
          creator_avatar_path: string
          creator_display_name: string
          creator_id: string
          creator_username: string
          currency: string
          end_at: string
          funds_usage_content: string
          goal_amount_minor: number
          id: string
          published_at: string
          raised_amount_minor: number
          risks_content: string
          short_description: string
          slug: string
          start_at: string
          status: Database["public"]["Enums"]["campaign_status"]
          story_content: string
          timeline_content: string
          title: string
        }[]
      }
      get_public_campaign_media: {
        Args: { _campaign_id: string }
        Returns: {
          alt_text: string
          external_url: string
          id: string
          is_cover: boolean
          media_type: Database["public"]["Enums"]["campaign_media_type"]
          sort_order: number
          storage_path: string
        }[]
      }
      get_public_campaign_rewards: {
        Args: { _campaign_id: string }
        Returns: {
          amount_minor: number
          description: string
          estimated_delivery_date: string
          id: string
          quantity_limit: number
          shipping_required: boolean
          sort_order: number
          title: string
        }[]
      }
      get_public_campaign_updates: {
        Args: { _campaign_id: string }
        Returns: {
          body_content: string
          id: string
          published_at: string
          title: string
        }[]
      }
      get_public_campaigns: {
        Args: {
          _category_slugs?: string[]
          _ending_within_days?: number
          _funded_max?: number
          _funded_min?: number
          _limit?: number
          _offset?: number
          _q?: string
          _sort?: string
          _statuses?: string[]
        }
        Returns: {
          backer_count: number
          category_name: string
          category_slug: string
          cover_external_url: string
          cover_storage_path: string
          creator_avatar_path: string
          creator_display_name: string
          creator_username: string
          currency: string
          end_at: string
          goal_amount_minor: number
          id: string
          published_at: string
          raised_amount_minor: number
          short_description: string
          slug: string
          start_at: string
          status: Database["public"]["Enums"]["campaign_status"]
          title: string
          total_count: number
        }[]
      }
      get_public_categories: {
        Args: never
        Returns: {
          description: string
          icon_name: string
          id: string
          name: string
          slug: string
          sort_order: number
        }[]
      }
      get_public_creator_profile: {
        Args: { _username: string }
        Returns: {
          avatar_path: string
          bio: string
          display_name: string
          id: string
          location: string
          total_backers: number
          total_campaigns: number
          username: string
          website_url: string
        }[]
      }
      get_unread_notification_count: { Args: never; Returns: number }
      get_user_dashboard_overview: {
        Args: never
        Returns: {
          active_supported_count: number
          expected_rewards_count: number
          pending_refund_minor: number
          total_paid_minor: number
          unread_notifications: number
        }[]
      }
      get_user_favorites: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          campaign_id: string
          end_at: string
          favorited_at: string
          short_description: string
          slug: string
          status: Database["public"]["Enums"]["campaign_status"]
          title: string
        }[]
      }
      get_user_payments: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          amount_minor: number
          attempt_number: number
          campaign_slug: string
          campaign_title: string
          completed_at: string
          contribution_id: string
          created_at: string
          currency: string
          domain_status: Database["public"]["Enums"]["payment_domain_status"]
          environment: Database["public"]["Enums"]["financial_environment"]
          failure_code: string
          failure_message_sanitized: string
          id: string
          status: Database["public"]["Enums"]["payment_status"]
        }[]
      }
      get_user_refunds: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          amount_minor: number
          campaign_slug: string
          campaign_title: string
          contribution_id: string
          created_at: string
          id: string
          reason: string
          status: Database["public"]["Enums"]["refund_status"]
          updated_at: string
        }[]
      }
      get_user_rewards: {
        Args: never
        Returns: {
          campaign_id: string
          campaign_slug: string
          campaign_title: string
          contribution_id: string
          contribution_status: Database["public"]["Enums"]["contribution_status"]
          created_at: string
          estimated_delivery_date: string
          quantity: number
          reservation_id: string
          reservation_status: Database["public"]["Enums"]["reward_reservation_status"]
          reward_description: string
          reward_tier_id: string
          reward_title: string
          shipping_required: boolean
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_release_gate_open: { Args: { p_key: string }; Returns: boolean }
      is_username_reserved: { Args: { _username: string }; Returns: boolean }
      mark_all_notifications_read: { Args: never; Returns: number }
      mark_notification_read: { Args: { _id: string }; Returns: undefined }
      mark_webhook_event_processed: {
        Args: { _error?: string; _event_id: string; _status: string }
        Returns: undefined
      }
      my_contributions: {
        Args: never
        Returns: {
          amount_minor: number
          anonymous: boolean
          campaign_id: string
          created_at: string
          currency: string
          id: string
          reward_tier_id: string
          status: Database["public"]["Enums"]["contribution_status"]
          updated_at: string
        }[]
      }
      notify_claim_batch: {
        Args: { p_limit?: number }
        Returns: {
          attempt_count: number
          correlation_id: string | null
          created_at: string
          dedupe_key: string
          entity_id: string | null
          entity_type: string
          event_type: Database["public"]["Enums"]["notification_event_type"]
          id: string
          last_error: string | null
          next_attempt_at: string
          payload: Json
          recipient_user_id: string
          status: Database["public"]["Enums"]["notification_outbox_status"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "notification_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      notify_enqueue: {
        Args: {
          p_correlation_id?: string
          p_dedupe_key: string
          p_entity_id: string
          p_entity_type: string
          p_event_type: Database["public"]["Enums"]["notification_event_type"]
          p_payload: Json
          p_recipient_user_id: string
        }
        Returns: string
      }
      notify_mark_done: { Args: { p_id: string }; Returns: undefined }
      notify_mark_failed: {
        Args: { p_error: string; p_id: string; p_retriable: boolean }
        Returns: undefined
      }
      publish_campaign_update: {
        Args: { _body: string; _campaign_id: string; _title: string }
        Returns: {
          author_id: string
          body_content: string
          campaign_id: string
          created_at: string
          edit_history: Json
          edited_at: string | null
          id: string
          is_published: boolean
          published_at: string | null
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "campaign_updates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      publish_due_campaigns: { Args: never; Returns: number }
      record_legal_consent: {
        Args: {
          p_document_slug: string
          p_document_version: string
          p_ip_hash?: string
          p_user_agent_hint?: string
        }
        Returns: string
      }
      reject_campaign: {
        Args: {
          _campaign_id: string
          _creator_note: string
          _expected_lock_version: number
          _reason_code: string
        }
        Returns: {
          ai_summary_source_version: number
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
          reject_reason_code: string | null
          reject_reason_note: string | null
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
        SetofOptions: {
          from: "*"
          to: "campaigns"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      release_expired_reward_reservations: { Args: never; Returns: number }
      release_reward_reservation: {
        Args: { _contribution_id: string; _reason: string }
        Returns: number
      }
      report_target: {
        Args: {
          _campaign_id: string
          _comment_id: string
          _description: string
          _reason_code: string
        }
        Returns: {
          assigned_admin_id: string | null
          campaign_id: string | null
          comment_id: string | null
          created_at: string
          description: string | null
          id: string
          reason_code: string
          reporter_id: string
          resolution_note: string | null
          status: Database["public"]["Enums"]["report_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "campaign_reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_campaign_revision: {
        Args: {
          _campaign_id: string
          _creator_note: string
          _expected_lock_version: number
          _issues?: Json
        }
        Returns: {
          ai_summary_source_version: number
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
          reject_reason_code: string | null
          reject_reason_note: string | null
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
        SetofOptions: {
          from: "*"
          to: "campaigns"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reserve_reward: {
        Args: {
          _contribution_id: string
          _quantity?: number
          _reward_tier_id: string
          _ttl_seconds?: number
        }
        Returns: {
          backer_id: string
          confirmed_at: string | null
          contribution_id: string
          created_at: string
          environment: Database["public"]["Enums"]["financial_environment"]
          expires_at: string
          id: string
          quantity: number
          release_reason: string | null
          released_at: string | null
          reward_tier_id: string
          status: Database["public"]["Enums"]["reward_reservation_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "reward_reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      simulate_test_payment: {
        Args: { _contribution_id: string; _scenario: string }
        Returns: {
          amount_minor: number
          attempt_number: number
          checkout_expires_at: string | null
          completed_at: string | null
          contribution_id: string
          created_at: string
          currency: string
          domain_status:
            | Database["public"]["Enums"]["payment_domain_status"]
            | null
          environment: Database["public"]["Enums"]["financial_environment"]
          error_code: string | null
          error_message: string | null
          failure_code: string | null
          failure_message_sanitized: string | null
          id: string
          last_provider_event_id: string | null
          livemode: boolean | null
          provider: string
          provider_balance_transaction_id: string | null
          provider_charge_id: string | null
          provider_checkout_session_id: string | null
          provider_connected_account_id: string | null
          provider_created_at: string | null
          provider_payment_id: string | null
          provider_payment_intent_id: string | null
          provider_reference: string | null
          provider_status: string | null
          sanitized_metadata: Json
          status: Database["public"]["Enums"]["payment_status"]
          stripe_idempotency_key: string | null
          transfer_group: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "payment_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      soft_delete_comment: {
        Args: { _comment_id: string }
        Returns: {
          author_id: string
          body: string
          campaign_id: string
          created_at: string
          edited_at: string | null
          id: string
          parent_id: string | null
          status: Database["public"]["Enums"]["comment_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "campaign_comments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      stale_campaign_ai_summaries_for_campaign: {
        Args: { _campaign_id: string }
        Returns: undefined
      }
      start_campaign_review: {
        Args: { _campaign_id: string; _expected_lock_version: number }
        Returns: {
          ai_summary_source_version: number
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
          reject_reason_code: string | null
          reject_reason_note: string | null
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
        SetofOptions: {
          from: "*"
          to: "campaigns"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_campaign_for_review: {
        Args: { _campaign_id: string; _expected_lock_version: number }
        Returns: {
          ai_summary_source_version: number
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
          reject_reason_code: string | null
          reject_reason_note: string | null
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
        SetofOptions: {
          from: "*"
          to: "campaigns"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      suspend_campaign: {
        Args: {
          _campaign_id: string
          _expected_lock_version: number
          _reason: string
        }
        Returns: {
          ai_summary_source_version: number
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
          reject_reason_code: string | null
          reject_reason_note: string | null
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
        SetofOptions: {
          from: "*"
          to: "campaigns"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      toggle_favorite: { Args: { _campaign_id: string }; Returns: boolean }
      toggle_follow: { Args: { _campaign_id: string }; Returns: boolean }
      update_campaign_draft: {
        Args: {
          _campaign_id: string
          _expected_lock_version: number
          _patch: Json
        }
        Returns: {
          ai_summary_source_version: number
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
          reject_reason_code: string | null
          reject_reason_note: string | null
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
        SetofOptions: {
          from: "*"
          to: "campaigns"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_comment: {
        Args: { _body: string; _comment_id: string }
        Returns: {
          author_id: string
          body: string
          campaign_id: string
          created_at: string
          edited_at: string | null
          id: string
          parent_id: string | null
          status: Database["public"]["Enums"]["comment_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "campaign_comments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_notification_preferences: {
        Args: { p_campaign_updates_email: boolean; p_marketing_email: boolean }
        Returns: {
          campaign_updates_email: boolean
          marketing_email: boolean
          transaction_email: boolean
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "notification_preferences"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      campaign_ai_summary_status:
        | "generating"
        | "completed"
        | "failed"
        | "stale"
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
      comment_status: "visible" | "hidden_by_admin" | "deleted_by_author"
      contact_message_status: "new" | "read" | "resolved"
      contribution_status:
        | "pending"
        | "authorized"
        | "captured"
        | "failed"
        | "cancelled"
        | "refunded"
        | "partially_refunded"
      creator_payment_account_status:
        | "not_started"
        | "onboarding_pending"
        | "pending_verification"
        | "enabled"
        | "restricted"
        | "payouts_disabled"
        | "rejected"
      creator_transfer_reversal_status: "pending" | "completed" | "failed"
      creator_transfer_status:
        | "pending"
        | "in_transit"
        | "paid"
        | "failed"
        | "reversed"
        | "partially_reversed"
        | "cancelled"
      email_delivery_status:
        | "queued"
        | "sent"
        | "failed"
        | "dead_letter"
        | "bounced"
        | "suppressed"
        | "pending_provider"
        | "skipped"
      financial_environment: "test" | "live"
      ledger_entry_type:
        | "contribution_capture"
        | "contribution_refund"
        | "platform_fee"
        | "provider_fee"
        | "payout"
        | "adjustment"
        | "reversal"
        | "creator_transfer_created"
        | "creator_transfer_completed"
        | "creator_transfer_reversed"
        | "provider_payout_observed"
        | "dispute_opened"
        | "chargeback_recorded"
      notification_event_type:
        | "registration_completed"
        | "campaign_submitted"
        | "campaign_revision_requested"
        | "campaign_approved"
        | "campaign_rejected"
        | "campaign_published"
        | "contribution_created"
        | "payment_action_required"
        | "payment_succeeded"
        | "payment_failed"
        | "payment_session_expired"
        | "campaign_goal_reached"
        | "campaign_failed"
        | "refund_started"
        | "refund_completed"
        | "creator_transfer_started"
        | "creator_transfer_completed"
        | "creator_transfer_failed"
        | "transfer_reversal_started"
        | "transfer_reversal_completed"
        | "provider_payout_observed"
        | "provider_payout_failed"
        | "campaign_update_published"
        | "creator_comment_reply"
      notification_outbox_status:
        | "pending"
        | "processing"
        | "done"
        | "failed"
        | "skipped"
      payment_domain_status:
        | "created"
        | "pending"
        | "action_required"
        | "processing"
        | "paid"
        | "failed"
        | "cancelled"
        | "expired"
        | "partially_refunded"
        | "refunded"
        | "disputed"
        | "chargeback"
      payment_status:
        | "initiated"
        | "pending"
        | "authorized"
        | "captured"
        | "failed"
        | "cancelled"
        | "expired"
        | "refunded"
        | "action_required"
        | "processing"
        | "paid"
        | "disputed"
        | "chargeback"
      payout_status:
        | "scheduled"
        | "processing"
        | "paid"
        | "failed"
        | "cancelled"
        | "on_hold"
      production_approval_status:
        | "not_verified"
        | "in_review"
        | "verified"
        | "rejected"
      provider_payout_status:
        | "pending"
        | "in_transit"
        | "paid"
        | "failed"
        | "cancelled"
      refund_status:
        | "requested"
        | "processing"
        | "succeeded"
        | "failed"
        | "cancelled"
      report_status: "open" | "reviewing" | "resolved" | "dismissed"
      review_decision:
        | "approved"
        | "rejected"
        | "revision_requested"
        | "suspended"
        | "reinstated"
      reward_reservation_status:
        | "reserved"
        | "confirmed"
        | "released"
        | "expired"
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
      campaign_ai_summary_status: [
        "generating",
        "completed",
        "failed",
        "stale",
      ],
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
      comment_status: ["visible", "hidden_by_admin", "deleted_by_author"],
      contact_message_status: ["new", "read", "resolved"],
      contribution_status: [
        "pending",
        "authorized",
        "captured",
        "failed",
        "cancelled",
        "refunded",
        "partially_refunded",
      ],
      creator_payment_account_status: [
        "not_started",
        "onboarding_pending",
        "pending_verification",
        "enabled",
        "restricted",
        "payouts_disabled",
        "rejected",
      ],
      creator_transfer_reversal_status: ["pending", "completed", "failed"],
      creator_transfer_status: [
        "pending",
        "in_transit",
        "paid",
        "failed",
        "reversed",
        "partially_reversed",
        "cancelled",
      ],
      email_delivery_status: [
        "queued",
        "sent",
        "failed",
        "dead_letter",
        "bounced",
        "suppressed",
        "pending_provider",
        "skipped",
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
        "creator_transfer_created",
        "creator_transfer_completed",
        "creator_transfer_reversed",
        "provider_payout_observed",
        "dispute_opened",
        "chargeback_recorded",
      ],
      notification_event_type: [
        "registration_completed",
        "campaign_submitted",
        "campaign_revision_requested",
        "campaign_approved",
        "campaign_rejected",
        "campaign_published",
        "contribution_created",
        "payment_action_required",
        "payment_succeeded",
        "payment_failed",
        "payment_session_expired",
        "campaign_goal_reached",
        "campaign_failed",
        "refund_started",
        "refund_completed",
        "creator_transfer_started",
        "creator_transfer_completed",
        "creator_transfer_failed",
        "transfer_reversal_started",
        "transfer_reversal_completed",
        "provider_payout_observed",
        "provider_payout_failed",
        "campaign_update_published",
        "creator_comment_reply",
      ],
      notification_outbox_status: [
        "pending",
        "processing",
        "done",
        "failed",
        "skipped",
      ],
      payment_domain_status: [
        "created",
        "pending",
        "action_required",
        "processing",
        "paid",
        "failed",
        "cancelled",
        "expired",
        "partially_refunded",
        "refunded",
        "disputed",
        "chargeback",
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
        "action_required",
        "processing",
        "paid",
        "disputed",
        "chargeback",
      ],
      payout_status: [
        "scheduled",
        "processing",
        "paid",
        "failed",
        "cancelled",
        "on_hold",
      ],
      production_approval_status: [
        "not_verified",
        "in_review",
        "verified",
        "rejected",
      ],
      provider_payout_status: [
        "pending",
        "in_transit",
        "paid",
        "failed",
        "cancelled",
      ],
      refund_status: [
        "requested",
        "processing",
        "succeeded",
        "failed",
        "cancelled",
      ],
      report_status: ["open", "reviewing", "resolved", "dismissed"],
      review_decision: [
        "approved",
        "rejected",
        "revision_requested",
        "suspended",
        "reinstated",
      ],
      reward_reservation_status: [
        "reserved",
        "confirmed",
        "released",
        "expired",
      ],
      user_role: ["admin", "moderator", "reviewer", "creator", "backer"],
    },
  },
} as const
