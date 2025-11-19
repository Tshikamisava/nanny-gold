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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_booking_actions: {
        Row: {
          action_type: string
          admin_id: string
          booking_id: string
          created_at: string
          id: string
          performed_at: string
          reason: string | null
        }
        Insert: {
          action_type: string
          admin_id: string
          booking_id: string
          created_at?: string
          id?: string
          performed_at?: string
          reason?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          booking_id?: string
          created_at?: string
          id?: string
          performed_at?: string
          reason?: string | null
        }
        Relationships: []
      }
      admins: {
        Row: {
          admin_level: string | null
          created_at: string
          department: string | null
          id: string
          last_login: string | null
          permissions: Json | null
          updated_at: string
        }
        Insert: {
          admin_level?: string | null
          created_at?: string
          department?: string | null
          id: string
          last_login?: string | null
          permissions?: Json | null
          updated_at?: string
        }
        Update: {
          admin_level?: string | null
          created_at?: string
          department?: string | null
          id?: string
          last_login?: string | null
          permissions?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admins_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_response_templates: {
        Row: {
          body_template: string
          category: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          subject_template: string
          trigger_keywords: string[] | null
          updated_at: string
        }
        Insert: {
          body_template: string
          category: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          subject_template: string
          trigger_keywords?: string[] | null
          updated_at?: string
        }
        Update: {
          body_template?: string
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          subject_template?: string
          trigger_keywords?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      backup_nanny_requests: {
        Row: {
          backup_nanny_id: string
          client_id: string
          client_response_deadline: string | null
          id: string
          notes: string | null
          original_booking_id: string
          reason: string | null
          requested_at: string
          responded_at: string | null
          status: Database["public"]["Enums"]["backup_request_status"]
        }
        Insert: {
          backup_nanny_id: string
          client_id: string
          client_response_deadline?: string | null
          id?: string
          notes?: string | null
          original_booking_id: string
          reason?: string | null
          requested_at?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["backup_request_status"]
        }
        Update: {
          backup_nanny_id?: string
          client_id?: string
          client_response_deadline?: string | null
          id?: string
          notes?: string | null
          original_booking_id?: string
          reason?: string | null
          requested_at?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["backup_request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "backup_nanny_requests_backup_nanny_id_fkey"
            columns: ["backup_nanny_id"]
            isOneToOne: false
            referencedRelation: "available_nannies_with_location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backup_nanny_requests_backup_nanny_id_fkey"
            columns: ["backup_nanny_id"]
            isOneToOne: false
            referencedRelation: "nannies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backup_nanny_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backup_nanny_requests_original_booking_id_fkey"
            columns: ["original_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_billing_adjustments: {
        Row: {
          adjustment_amount: number
          adjustment_type: string
          applied_at: string | null
          billing_period_end: string
          billing_period_start: string
          booking_id: string
          created_at: string
          description: string | null
          id: string
          modification_id: string | null
        }
        Insert: {
          adjustment_amount: number
          adjustment_type: string
          applied_at?: string | null
          billing_period_end: string
          billing_period_start: string
          booking_id: string
          created_at?: string
          description?: string | null
          id?: string
          modification_id?: string | null
        }
        Update: {
          adjustment_amount?: number
          adjustment_type?: string
          applied_at?: string | null
          billing_period_end?: string
          billing_period_start?: string
          booking_id?: string
          created_at?: string
          description?: string | null
          id?: string
          modification_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_billing_adjustments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_billing_adjustments_modification_id_fkey"
            columns: ["modification_id"]
            isOneToOne: false
            referencedRelation: "booking_modifications"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_financials: {
        Row: {
          admin_total_revenue: number
          booking_id: string
          booking_type: string
          calculated_at: string
          commission_amount: number
          commission_percent: number
          commission_source: string | null
          created_at: string
          currency: string | null
          fixed_fee: number
          id: string
          nanny_earnings: number
          updated_at: string
        }
        Insert: {
          admin_total_revenue?: number
          booking_id: string
          booking_type: string
          calculated_at?: string
          commission_amount?: number
          commission_percent?: number
          commission_source?: string | null
          created_at?: string
          currency?: string | null
          fixed_fee?: number
          id?: string
          nanny_earnings?: number
          updated_at?: string
        }
        Update: {
          admin_total_revenue?: number
          booking_id?: string
          booking_type?: string
          calculated_at?: string
          commission_amount?: number
          commission_percent?: number
          commission_source?: string | null
          created_at?: string
          currency?: string | null
          fixed_fee?: number
          id?: string
          nanny_earnings?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_financials_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_modifications: {
        Row: {
          admin_notes: string | null
          admin_reviewed_at: string | null
          admin_reviewed_by: string | null
          booking_id: string
          client_id: string
          created_at: string
          effective_date: string | null
          id: string
          modification_type: string
          nanny_notes: string | null
          nanny_responded_at: string | null
          nanny_responded_by: string | null
          new_values: Json | null
          notes: string | null
          old_values: Json | null
          price_adjustment: number | null
          processed_at: string | null
          processed_by: string | null
          requested_at: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          booking_id: string
          client_id: string
          created_at?: string
          effective_date?: string | null
          id?: string
          modification_type: string
          nanny_notes?: string | null
          nanny_responded_at?: string | null
          nanny_responded_by?: string | null
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          price_adjustment?: number | null
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          booking_id?: string
          client_id?: string
          created_at?: string
          effective_date?: string | null
          id?: string
          modification_type?: string
          nanny_notes?: string | null
          nanny_responded_at?: string | null
          nanny_responded_by?: string | null
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          price_adjustment?: number | null
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_modifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_reassignments: {
        Row: {
          admin_notes: string | null
          alternative_nannies: Json | null
          client_id: string
          client_response: string | null
          created_at: string
          escalated_to_admin: boolean | null
          id: string
          new_nanny_id: string
          original_booking_id: string
          original_nanny_id: string
          reassignment_reason: string
          responded_at: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          alternative_nannies?: Json | null
          client_id: string
          client_response?: string | null
          created_at?: string
          escalated_to_admin?: boolean | null
          id?: string
          new_nanny_id: string
          original_booking_id: string
          original_nanny_id: string
          reassignment_reason?: string
          responded_at?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          alternative_nannies?: Json | null
          client_id?: string
          client_response?: string | null
          created_at?: string
          escalated_to_admin?: boolean | null
          id?: string
          new_nanny_id?: string
          original_booking_id?: string
          original_nanny_id?: string
          reassignment_reason?: string
          responded_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          additional_services_cost: number | null
          base_rate: number
          booking_type: string | null
          client_id: string
          created_at: string
          end_date: string | null
          home_size: string | null
          id: string
          living_arrangement:
            | Database["public"]["Enums"]["living_arrangement"]
            | null
          nanny_id: string
          notes: string | null
          recurring_invoice_day: number | null
          schedule: Json | null
          services: Json | null
          start_date: string
          status: Database["public"]["Enums"]["booking_status"]
          total_monthly_cost: number
          updated_at: string
          work_end_date: string | null
          work_end_time: string | null
          work_start_date: string | null
          work_start_time: string | null
          work_status: string | null
        }
        Insert: {
          additional_services_cost?: number | null
          base_rate: number
          booking_type?: string | null
          client_id: string
          created_at?: string
          end_date?: string | null
          home_size?: string | null
          id?: string
          living_arrangement?:
            | Database["public"]["Enums"]["living_arrangement"]
            | null
          nanny_id: string
          notes?: string | null
          recurring_invoice_day?: number | null
          schedule?: Json | null
          services?: Json | null
          start_date: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_monthly_cost: number
          updated_at?: string
          work_end_date?: string | null
          work_end_time?: string | null
          work_start_date?: string | null
          work_start_time?: string | null
          work_status?: string | null
        }
        Update: {
          additional_services_cost?: number | null
          base_rate?: number
          booking_type?: string | null
          client_id?: string
          created_at?: string
          end_date?: string | null
          home_size?: string | null
          id?: string
          living_arrangement?:
            | Database["public"]["Enums"]["living_arrangement"]
            | null
          nanny_id?: string
          notes?: string | null
          recurring_invoice_day?: number | null
          schedule?: Json | null
          services?: Json | null
          start_date?: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_monthly_cost?: number
          updated_at?: string
          work_end_date?: string | null
          work_end_time?: string | null
          work_start_date?: string | null
          work_start_time?: string | null
          work_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_nanny_id_fkey"
            columns: ["nanny_id"]
            isOneToOne: false
            referencedRelation: "available_nannies_with_location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_nanny_id_fkey"
            columns: ["nanny_id"]
            isOneToOne: false
            referencedRelation: "nannies"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          attendee_email: string
          created_at: string
          error_message: string | null
          event_id: string | null
          id: string
          interview_id: string
          platform: string
          status: string
          updated_at: string
        }
        Insert: {
          attendee_email: string
          created_at?: string
          error_message?: string | null
          event_id?: string | null
          id?: string
          interview_id: string
          platform: string
          status?: string
          updated_at?: string
        }
        Update: {
          attendee_email?: string
          created_at?: string
          error_message?: string | null
          event_id?: string | null
          id?: string
          interview_id?: string
          platform?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          edited_at: string | null
          id: string
          message_type: string | null
          reply_to_id: string | null
          room_id: string
          sender_id: string
          sender_name: string
          sender_type: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          edited_at?: string | null
          id?: string
          message_type?: string | null
          reply_to_id?: string | null
          room_id: string
          sender_id: string
          sender_name: string
          sender_type: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          message_type?: string | null
          reply_to_id?: string | null
          room_id?: string
          sender_id?: string
          sender_name?: string
          sender_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_room_participants: {
        Row: {
          created_at: string | null
          id: string
          joined_at: string | null
          last_seen_at: string | null
          room_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          joined_at?: string | null
          last_seen_at?: string | null
          room_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          joined_at?: string | null
          last_seen_at?: string | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_room_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_invoice_notifications: {
        Row: {
          client_id: string
          created_at: string
          id: string
          invoice_id: string
          payment_processed_at: string | null
          sent_at: string
          viewed_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          invoice_id: string
          payment_processed_at?: string | null
          sent_at?: string
          viewed_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          invoice_id?: string
          payment_processed_at?: string | null
          sent_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_invoice_notifications_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      client_payment_methods: {
        Row: {
          bank: string | null
          card_type: string
          client_id: string
          created_at: string
          exp_month: string
          exp_year: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          last_four: string
          paystack_authorization_code: string
          updated_at: string
        }
        Insert: {
          bank?: string | null
          card_type: string
          client_id: string
          created_at?: string
          exp_month: string
          exp_year: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          last_four: string
          paystack_authorization_code: string
          updated_at?: string
        }
        Update: {
          bank?: string | null
          card_type?: string
          client_id?: string
          created_at?: string
          exp_month?: string
          exp_year?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          last_four?: string
          paystack_authorization_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_preferences: {
        Row: {
          backup_nanny: boolean | null
          booking_sub_type: string | null
          client_id: string
          cooking: boolean | null
          created_at: string
          driving_support: boolean | null
          duration_type: string | null
          ecd_training: boolean | null
          errand_runs: boolean | null
          experience_level:
            | Database["public"]["Enums"]["experience_level"]
            | null
          id: string
          languages: string | null
          light_house_keeping: boolean | null
          living_arrangement:
            | Database["public"]["Enums"]["living_arrangement"]
            | null
          max_budget: number | null
          montessori: boolean | null
          pet_care: boolean | null
          schedule: Json | null
          selected_dates: string[] | null
          special_needs: boolean | null
          time_slots: Json | null
          updated_at: string
        }
        Insert: {
          backup_nanny?: boolean | null
          booking_sub_type?: string | null
          client_id: string
          cooking?: boolean | null
          created_at?: string
          driving_support?: boolean | null
          duration_type?: string | null
          ecd_training?: boolean | null
          errand_runs?: boolean | null
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          id?: string
          languages?: string | null
          light_house_keeping?: boolean | null
          living_arrangement?:
            | Database["public"]["Enums"]["living_arrangement"]
            | null
          max_budget?: number | null
          montessori?: boolean | null
          pet_care?: boolean | null
          schedule?: Json | null
          selected_dates?: string[] | null
          special_needs?: boolean | null
          time_slots?: Json | null
          updated_at?: string
        }
        Update: {
          backup_nanny?: boolean | null
          booking_sub_type?: string | null
          client_id?: string
          cooking?: boolean | null
          created_at?: string
          driving_support?: boolean | null
          duration_type?: string | null
          ecd_training?: boolean | null
          errand_runs?: boolean | null
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          id?: string
          languages?: string | null
          light_house_keeping?: boolean | null
          living_arrangement?:
            | Database["public"]["Enums"]["living_arrangement"]
            | null
          max_budget?: number | null
          montessori?: boolean | null
          pet_care?: boolean | null
          schedule?: Json | null
          selected_dates?: string[] | null
          special_needs?: boolean | null
          time_slots?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_preferences_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          additional_requirements: string | null
          children_ages: string[] | null
          client_contact_email: string | null
          client_contact_name: string | null
          client_contact_phone: string | null
          created_at: string
          discount_applied: number | null
          home_size: string | null
          id: string
          last_payment_reference: string | null
          number_of_children: number | null
          other_dependents: number | null
          payment_references: string[] | null
          pets_in_home: string | null
          placement_fee_discounted: number | null
          placement_fee_original: number | null
          referral_code_used: string | null
          updated_at: string
        }
        Insert: {
          additional_requirements?: string | null
          children_ages?: string[] | null
          client_contact_email?: string | null
          client_contact_name?: string | null
          client_contact_phone?: string | null
          created_at?: string
          discount_applied?: number | null
          home_size?: string | null
          id: string
          last_payment_reference?: string | null
          number_of_children?: number | null
          other_dependents?: number | null
          payment_references?: string[] | null
          pets_in_home?: string | null
          placement_fee_discounted?: number | null
          placement_fee_original?: number | null
          referral_code_used?: string | null
          updated_at?: string
        }
        Update: {
          additional_requirements?: string | null
          children_ages?: string[] | null
          client_contact_email?: string | null
          client_contact_name?: string | null
          client_contact_phone?: string | null
          created_at?: string
          discount_applied?: number | null
          home_size?: string | null
          id?: string
          last_payment_reference?: string | null
          number_of_children?: number | null
          other_dependents?: number | null
          payment_references?: string[] | null
          pets_in_home?: string | null
          placement_fee_discounted?: number | null
          placement_fee_original?: number | null
          referral_code_used?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          assigned_to: string | null
          booking_id: string
          created_at: string
          description: string
          dispute_type: string
          evidence_urls: string[] | null
          id: string
          priority: string
          raised_by: string
          resolution: string | null
          resolved_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          booking_id: string
          created_at?: string
          description: string
          dispute_type: string
          evidence_urls?: string[] | null
          id?: string
          priority?: string
          raised_by: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          booking_id?: string
          created_at?: string
          description?: string
          dispute_type?: string
          evidence_urls?: string[] | null
          id?: string
          priority?: string
          raised_by?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      faq_articles: {
        Row: {
          answer: string
          auto_response_enabled: boolean
          category: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          keywords: string[] | null
          question: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          answer: string
          auto_response_enabled?: boolean
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          keywords?: string[] | null
          question: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          answer?: string
          auto_response_enabled?: boolean
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          keywords?: string[] | null
          question?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: []
      }
      favorite_nannies: {
        Row: {
          created_at: string
          id: string
          nanny_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nanny_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nanny_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_nannies_nanny_id_fkey"
            columns: ["nanny_id"]
            isOneToOne: false
            referencedRelation: "available_nannies_with_location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_nannies_nanny_id_fkey"
            columns: ["nanny_id"]
            isOneToOne: false
            referencedRelation: "nannies"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          calendar_event_created: boolean | null
          calendar_event_data: Json | null
          calendar_event_id: string | null
          calendar_sync_status: string | null
          cancellation_reason: string | null
          cancelled_by: string | null
          client_id: string
          created_at: string
          id: string
          interview_date: string
          interview_time: string
          meeting_link: string | null
          nanny_id: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          calendar_event_created?: boolean | null
          calendar_event_data?: Json | null
          calendar_event_id?: string | null
          calendar_sync_status?: string | null
          cancellation_reason?: string | null
          cancelled_by?: string | null
          client_id: string
          created_at?: string
          id?: string
          interview_date: string
          interview_time: string
          meeting_link?: string | null
          nanny_id: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          calendar_event_created?: boolean | null
          calendar_event_data?: Json | null
          calendar_event_id?: string | null
          calendar_sync_status?: string | null
          cancellation_reason?: string | null
          cancelled_by?: string | null
          client_id?: string
          created_at?: string
          id?: string
          interview_date?: string
          interview_time?: string
          meeting_link?: string | null
          nanny_id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoice_email_logs: {
        Row: {
          bounce_reason: string | null
          created_at: string | null
          delivery_status: string
          id: string
          invoice_id: string | null
          opened_at: string | null
          recipient_email: string
          resend_email_id: string | null
          updated_at: string | null
        }
        Insert: {
          bounce_reason?: string | null
          created_at?: string | null
          delivery_status?: string
          id?: string
          invoice_id?: string | null
          opened_at?: string | null
          recipient_email: string
          resend_email_id?: string | null
          updated_at?: string | null
        }
        Update: {
          bounce_reason?: string | null
          created_at?: string | null
          delivery_status?: string
          id?: string
          invoice_id?: string | null
          opened_at?: string | null
          recipient_email?: string
          resend_email_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_email_logs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          booking_id: string | null
          client_id: string
          created_at: string | null
          currency: string | null
          due_date: string
          email_sent_at: string | null
          email_sent_count: number | null
          id: string
          invoice_number: string
          invoice_type: string | null
          issue_date: string | null
          last_email_sent_to: string | null
          line_items: Json | null
          notes: string | null
          paid_date: string | null
          payment_method: string | null
          payment_reference: string | null
          rewards_applied: number | null
          rewards_balance_after: number | null
          rewards_balance_before: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          booking_id?: string | null
          client_id: string
          created_at?: string | null
          currency?: string | null
          due_date: string
          email_sent_at?: string | null
          email_sent_count?: number | null
          id?: string
          invoice_number: string
          invoice_type?: string | null
          issue_date?: string | null
          last_email_sent_to?: string | null
          line_items?: Json | null
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          rewards_applied?: number | null
          rewards_balance_after?: number | null
          rewards_balance_before?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string | null
          client_id?: string
          created_at?: string | null
          currency?: string | null
          due_date?: string
          email_sent_at?: string | null
          email_sent_count?: number | null
          id?: string
          invoice_number?: string
          invoice_type?: string | null
          issue_date?: string | null
          last_email_sent_to?: string | null
          line_items?: Json | null
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          rewards_applied?: number | null
          rewards_balance_after?: number | null
          rewards_balance_before?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      nannies: {
        Row: {
          admin_assigned_categories: string[] | null
          admin_notes: string | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          bio: string | null
          can_edit_rates: boolean | null
          can_receive_bookings: boolean | null
          certifications: string[] | null
          created_at: string
          experience_level: Database["public"]["Enums"]["experience_level"]
          hourly_rate: number | null
          id: string
          interview_completed_at: string | null
          interview_status: string | null
          is_available: boolean | null
          is_verified: boolean | null
          languages: string[] | null
          monthly_rate: number | null
          pd_compliance_status: string | null
          profile_created_by: string | null
          profile_submitted_at: string | null
          rating: number | null
          service_categories: string[] | null
          skills: string[] | null
          total_reviews: number | null
          updated_at: string
          verification_completed_at: string | null
          verification_status: string | null
        }
        Insert: {
          admin_assigned_categories?: string[] | null
          admin_notes?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bio?: string | null
          can_edit_rates?: boolean | null
          can_receive_bookings?: boolean | null
          certifications?: string[] | null
          created_at?: string
          experience_level?: Database["public"]["Enums"]["experience_level"]
          hourly_rate?: number | null
          id: string
          interview_completed_at?: string | null
          interview_status?: string | null
          is_available?: boolean | null
          is_verified?: boolean | null
          languages?: string[] | null
          monthly_rate?: number | null
          pd_compliance_status?: string | null
          profile_created_by?: string | null
          profile_submitted_at?: string | null
          rating?: number | null
          service_categories?: string[] | null
          skills?: string[] | null
          total_reviews?: number | null
          updated_at?: string
          verification_completed_at?: string | null
          verification_status?: string | null
        }
        Update: {
          admin_assigned_categories?: string[] | null
          admin_notes?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bio?: string | null
          can_edit_rates?: boolean | null
          can_receive_bookings?: boolean | null
          certifications?: string[] | null
          created_at?: string
          experience_level?: Database["public"]["Enums"]["experience_level"]
          hourly_rate?: number | null
          id?: string
          interview_completed_at?: string | null
          interview_status?: string | null
          is_available?: boolean | null
          is_verified?: boolean | null
          languages?: string[] | null
          monthly_rate?: number | null
          pd_compliance_status?: string | null
          profile_created_by?: string | null
          profile_submitted_at?: string | null
          rating?: number | null
          service_categories?: string[] | null
          skills?: string[] | null
          total_reviews?: number | null
          updated_at?: string
          verification_completed_at?: string | null
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nannies_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nanny_availability: {
        Row: {
          advance_notice_days: number | null
          available_dates: string[] | null
          created_at: string
          emergency_available: boolean | null
          id: string
          nanny_id: string
          recurring_schedule: Json | null
          schedule: Json | null
          time_slots: Json | null
          unavailable_dates: string[] | null
          updated_at: string
        }
        Insert: {
          advance_notice_days?: number | null
          available_dates?: string[] | null
          created_at?: string
          emergency_available?: boolean | null
          id?: string
          nanny_id: string
          recurring_schedule?: Json | null
          schedule?: Json | null
          time_slots?: Json | null
          unavailable_dates?: string[] | null
          updated_at?: string
        }
        Update: {
          advance_notice_days?: number | null
          available_dates?: string[] | null
          created_at?: string
          emergency_available?: boolean | null
          id?: string
          nanny_id?: string
          recurring_schedule?: Json | null
          schedule?: Json | null
          time_slots?: Json | null
          unavailable_dates?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nanny_availability_nanny_id_fkey"
            columns: ["nanny_id"]
            isOneToOne: true
            referencedRelation: "available_nannies_with_location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nanny_availability_nanny_id_fkey"
            columns: ["nanny_id"]
            isOneToOne: true
            referencedRelation: "nannies"
            referencedColumns: ["id"]
          },
        ]
      }
      nanny_documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string
          file_url: string
          id: string
          nanny_id: string
          rejection_reason: string | null
          upload_date: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          file_name: string
          file_url: string
          id?: string
          nanny_id: string
          rejection_reason?: string | null
          upload_date?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string
          file_url?: string
          id?: string
          nanny_id?: string
          rejection_reason?: string | null
          upload_date?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nanny_documents_nanny_id_fkey"
            columns: ["nanny_id"]
            isOneToOne: false
            referencedRelation: "available_nannies_with_location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nanny_documents_nanny_id_fkey"
            columns: ["nanny_id"]
            isOneToOne: false
            referencedRelation: "nannies"
            referencedColumns: ["id"]
          },
        ]
      }
      nanny_payment_advice: {
        Row: {
          advice_number: string
          booking_details: Json | null
          commission_deducted: number | null
          created_at: string | null
          currency: string | null
          gross_amount: number
          id: string
          nanny_id: string
          net_amount: number
          payment_date: string | null
          payment_method: string | null
          payment_reference: string | null
          period_end: string
          period_start: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          advice_number: string
          booking_details?: Json | null
          commission_deducted?: number | null
          created_at?: string | null
          currency?: string | null
          gross_amount: number
          id?: string
          nanny_id: string
          net_amount: number
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          period_end: string
          period_start: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          advice_number?: string
          booking_details?: Json | null
          commission_deducted?: number | null
          created_at?: string | null
          currency?: string | null
          gross_amount?: number
          id?: string
          nanny_id?: string
          net_amount?: number
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          period_end?: string
          period_start?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      nanny_payment_notifications: {
        Row: {
          created_at: string
          downloaded_at: string | null
          id: string
          nanny_id: string
          payment_advice_id: string
          sent_at: string
          viewed_at: string | null
        }
        Insert: {
          created_at?: string
          downloaded_at?: string | null
          id?: string
          nanny_id: string
          payment_advice_id: string
          sent_at?: string
          viewed_at?: string | null
        }
        Update: {
          created_at?: string
          downloaded_at?: string | null
          id?: string
          nanny_id?: string
          payment_advice_id?: string
          sent_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nanny_payment_notifications_payment_advice_id_fkey"
            columns: ["payment_advice_id"]
            isOneToOne: false
            referencedRelation: "nanny_payment_advice"
            referencedColumns: ["id"]
          },
        ]
      }
      nanny_payouts: {
        Row: {
          amount_paid: number
          booking_id: string
          created_at: string
          id: string
          nanny_id: string
          payment_method: string | null
          processed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_paid: number
          booking_id: string
          created_at?: string
          id?: string
          nanny_id: string
          payment_method?: string | null
          processed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          booking_id?: string
          created_at?: string
          id?: string
          nanny_id?: string
          payment_method?: string | null
          processed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nanny_payouts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      nanny_services: {
        Row: {
          cooking: boolean | null
          created_at: string
          driving_license: boolean | null
          ecd_training: boolean | null
          id: string
          montessori: boolean | null
          nanny_id: string
          pet_care: boolean | null
          special_needs: boolean | null
        }
        Insert: {
          cooking?: boolean | null
          created_at?: string
          driving_license?: boolean | null
          ecd_training?: boolean | null
          id?: string
          montessori?: boolean | null
          nanny_id: string
          pet_care?: boolean | null
          special_needs?: boolean | null
        }
        Update: {
          cooking?: boolean | null
          created_at?: string
          driving_license?: boolean | null
          ecd_training?: boolean | null
          id?: string
          montessori?: boolean | null
          nanny_id?: string
          pet_care?: boolean | null
          special_needs?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "nanny_services_nanny_id_fkey"
            columns: ["nanny_id"]
            isOneToOne: true
            referencedRelation: "available_nannies_with_location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nanny_services_nanny_id_fkey"
            columns: ["nanny_id"]
            isOneToOne: true
            referencedRelation: "nannies"
            referencedColumns: ["id"]
          },
        ]
      }
      nanny_verification_steps: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          nanny_id: string
          notes: string | null
          status: string
          step_name: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          nanny_id: string
          notes?: string | null
          status?: string
          step_name: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          nanny_id?: string
          notes?: string | null
          status?: string
          step_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nanny_verification_steps_nanny_id_fkey"
            columns: ["nanny_id"]
            isOneToOne: false
            referencedRelation: "available_nannies_with_location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nanny_verification_steps_nanny_id_fkey"
            columns: ["nanny_id"]
            isOneToOne: false
            referencedRelation: "nannies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      operating_costs: {
        Row: {
          amount: number
          category: string
          cost_date: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string
          id: string
          recurring: boolean | null
          recurring_frequency: string | null
          reference_id: string | null
          status: string | null
          updated_at: string | null
          vendor: string | null
        }
        Insert: {
          amount: number
          category: string
          cost_date: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description: string
          id?: string
          recurring?: boolean | null
          recurring_frequency?: string | null
          reference_id?: string | null
          status?: string | null
          updated_at?: string | null
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string
          cost_date?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string
          id?: string
          recurring?: boolean | null
          recurring_frequency?: string | null
          reference_id?: string | null
          status?: string | null
          updated_at?: string | null
          vendor?: string | null
        }
        Relationships: []
      }
      otp_rate_limits: {
        Row: {
          created_at: string | null
          id: string
          identifier: string
          request_count: number | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          identifier: string
          request_count?: number | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          identifier?: string
          request_count?: number | null
          window_start?: string | null
        }
        Relationships: []
      }
      payment_advices: {
        Row: {
          advice_number: string
          base_amount: number
          booking_id: string | null
          created_at: string | null
          currency: string | null
          deductions: number | null
          id: string
          issue_date: string | null
          nanny_id: string
          notes: string | null
          payment_date: string | null
          payment_period_end: string
          payment_period_start: string
          referral_rewards_details: Json | null
          referral_rewards_included: number | null
          status: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          advice_number: string
          base_amount?: number
          booking_id?: string | null
          created_at?: string | null
          currency?: string | null
          deductions?: number | null
          id?: string
          issue_date?: string | null
          nanny_id: string
          notes?: string | null
          payment_date?: string | null
          payment_period_end: string
          payment_period_start: string
          referral_rewards_details?: Json | null
          referral_rewards_included?: number | null
          status?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          advice_number?: string
          base_amount?: number
          booking_id?: string | null
          created_at?: string | null
          currency?: string | null
          deductions?: number | null
          id?: string
          issue_date?: string | null
          nanny_id?: string
          notes?: string | null
          payment_date?: string | null
          payment_period_end?: string
          payment_period_start?: string
          referral_rewards_details?: Json | null
          referral_rewards_included?: number | null
          status?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_authorizations: {
        Row: {
          amount: number
          authorization_code: string | null
          authorization_date: string | null
          booking_id: string | null
          capture_date: string | null
          created_at: string
          currency: string | null
          failure_reason: string | null
          id: string
          next_retry_date: string | null
          paystack_reference: string | null
          paystack_transaction_id: string | null
          retry_count: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          authorization_code?: string | null
          authorization_date?: string | null
          booking_id?: string | null
          capture_date?: string | null
          created_at?: string
          currency?: string | null
          failure_reason?: string | null
          id?: string
          next_retry_date?: string | null
          paystack_reference?: string | null
          paystack_transaction_id?: string | null
          retry_count?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          authorization_code?: string | null
          authorization_date?: string | null
          booking_id?: string | null
          capture_date?: string | null
          created_at?: string
          currency?: string | null
          failure_reason?: string | null
          id?: string
          next_retry_date?: string | null
          paystack_reference?: string | null
          paystack_transaction_id?: string | null
          retry_count?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_authorizations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_proofs: {
        Row: {
          admin_notes: string | null
          amount: number
          booking_id: string | null
          client_id: string
          created_at: string
          id: string
          invoice_id: string | null
          proof_file_url: string
          updated_at: string
          upload_date: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          booking_id?: string | null
          client_id: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          proof_file_url: string
          updated_at?: string
          upload_date?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          booking_id?: string | null
          client_id?: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          proof_file_url?: string
          updated_at?: string
          upload_date?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      payment_schedules: {
        Row: {
          authorization_day: number | null
          booking_id: string
          capture_day: number | null
          created_at: string
          currency: string | null
          customer_code: string | null
          id: string
          is_active: boolean | null
          last_authorization_date: string | null
          last_capture_date: string | null
          monthly_amount: number
          next_authorization_date: string | null
          next_capture_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          authorization_day?: number | null
          booking_id: string
          capture_day?: number | null
          created_at?: string
          currency?: string | null
          customer_code?: string | null
          id?: string
          is_active?: boolean | null
          last_authorization_date?: string | null
          last_capture_date?: string | null
          monthly_amount: number
          next_authorization_date?: string | null
          next_capture_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          authorization_day?: number | null
          booking_id?: string
          capture_day?: number | null
          created_at?: string
          currency?: string | null
          customer_code?: string | null
          id?: string
          is_active?: boolean | null
          last_authorization_date?: string | null
          last_capture_date?: string | null
          monthly_amount?: number
          next_authorization_date?: string | null
          next_capture_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_schedules_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_development_assignments: {
        Row: {
          assigned_at: string
          created_at: string | null
          due_date: string | null
          id: string
          material_id: string
          nanny_id: string
          status: string
        }
        Insert: {
          assigned_at?: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          material_id: string
          nanny_id: string
          status?: string
        }
        Update: {
          assigned_at?: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          material_id?: string
          nanny_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_development_assignments_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "professional_development_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_development_completions: {
        Row: {
          assignment_id: string
          completed_at: string
          completion_data: Json | null
          id: string
          material_id: string
          nanny_id: string
          notes: string | null
          score: number | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          assignment_id: string
          completed_at?: string
          completion_data?: Json | null
          id?: string
          material_id: string
          nanny_id: string
          notes?: string | null
          score?: number | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          assignment_id?: string
          completed_at?: string
          completion_data?: Json | null
          id?: string
          material_id?: string
          nanny_id?: string
          notes?: string | null
          score?: number | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_development_completions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "professional_development_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_development_materials: {
        Row: {
          content_data: Json | null
          content_type: string
          content_url: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          estimated_duration_minutes: number | null
          id: string
          is_active: boolean | null
          is_mandatory: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          content_data?: Json | null
          content_type: string
          content_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          content_data?: Json | null
          content_type?: string
          content_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profile_audit_log: {
        Row: {
          admin_id: string | null
          change_reason: string | null
          created_at: string | null
          field_changed: string
          id: string
          nanny_id: string | null
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          admin_id?: string | null
          change_reason?: string | null
          created_at?: string | null
          field_changed: string
          id?: string
          nanny_id?: string | null
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          admin_id?: string | null
          change_reason?: string | null
          created_at?: string | null
          field_changed?: string
          id?: string
          nanny_id?: string | null
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_audit_log_nanny_id_fkey"
            columns: ["nanny_id"]
            isOneToOne: false
            referencedRelation: "available_nannies_with_location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_audit_log_nanny_id_fkey"
            columns: ["nanny_id"]
            isOneToOne: false
            referencedRelation: "nannies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          phone: string | null
          updated_at: string
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          phone?: string | null
          updated_at?: string
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          phone?: string | null
          updated_at?: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Relationships: []
      }
      referral_logs: {
        Row: {
          booking_id: string | null
          created_at: string
          discount_applied: number | null
          id: string
          notes: string | null
          placement_fee: number | null
          referred_user_id: string
          referrer_id: string
          referrer_type: string | null
          reward_amount: number | null
          reward_percentage: number | null
          status: string
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          discount_applied?: number | null
          id?: string
          notes?: string | null
          placement_fee?: number | null
          referred_user_id: string
          referrer_id: string
          referrer_type?: string | null
          reward_amount?: number | null
          reward_percentage?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          discount_applied?: number | null
          id?: string
          notes?: string | null
          placement_fee?: number | null
          referred_user_id?: string
          referrer_id?: string
          referrer_type?: string | null
          reward_amount?: number | null
          reward_percentage?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_logs_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "referral_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_participants: {
        Row: {
          active: boolean | null
          commission_percentage: number | null
          created_at: string
          date_added: string
          date_issued: string | null
          discount_percentage: number | null
          id: string
          influencer_name: string | null
          is_influencer: boolean | null
          notes: string | null
          referral_code: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          commission_percentage?: number | null
          created_at?: string
          date_added?: string
          date_issued?: string | null
          discount_percentage?: number | null
          id?: string
          influencer_name?: string | null
          is_influencer?: boolean | null
          notes?: string | null
          referral_code: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          commission_percentage?: number | null
          created_at?: string
          date_added?: string
          date_issued?: string | null
          discount_percentage?: number | null
          id?: string
          influencer_name?: string | null
          is_influencer?: boolean | null
          notes?: string | null
          referral_code?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          client_id: string
          comment: string | null
          created_at: string
          id: string
          nanny_id: string
          rating: number
        }
        Insert: {
          booking_id: string
          client_id: string
          comment?: string | null
          created_at?: string
          id?: string
          nanny_id: string
          rating: number
        }
        Update: {
          booking_id?: string
          client_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          nanny_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_nanny_id_fkey"
            columns: ["nanny_id"]
            isOneToOne: false
            referencedRelation: "available_nannies_with_location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_nanny_id_fkey"
            columns: ["nanny_id"]
            isOneToOne: false
            referencedRelation: "nannies"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_balances: {
        Row: {
          available_balance: number | null
          created_at: string | null
          id: string
          last_updated: string | null
          total_earned: number | null
          total_redeemed: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          available_balance?: number | null
          created_at?: string | null
          id?: string
          last_updated?: string | null
          total_earned?: number | null
          total_redeemed?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          available_balance?: number | null
          created_at?: string | null
          id?: string
          last_updated?: string | null
          total_earned?: number | null
          total_redeemed?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reward_redemptions: {
        Row: {
          amount_redeemed: number
          booking_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          redemption_type: string
          user_id: string
        }
        Insert: {
          amount_redeemed: number
          booking_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          redemption_type?: string
          user_id: string
        }
        Update: {
          amount_redeemed?: number
          booking_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          redemption_type?: string
          user_id?: string
        }
        Relationships: []
      }
      role_audit_log: {
        Row: {
          admin_id: string
          change_reason: string | null
          created_at: string | null
          id: string
          new_role: string
          old_role: string | null
          user_id: string
        }
        Insert: {
          admin_id: string
          change_reason?: string | null
          created_at?: string | null
          id?: string
          new_role: string
          old_role?: string | null
          user_id: string
        }
        Update: {
          admin_id?: string
          change_reason?: string | null
          created_at?: string | null
          id?: string
          new_role?: string
          old_role?: string | null
          user_id?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          created_at: string | null
          event_details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      support_chat_messages: {
        Row: {
          attachment_url: string | null
          created_at: string
          id: string
          is_internal: boolean
          message: string
          read_at: string | null
          sender_id: string
          ticket_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_internal?: boolean
          message: string
          read_at?: string | null
          sender_id: string
          ticket_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_internal?: boolean
          message?: string
          read_at?: string | null
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_chat_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          description: string
          id: string
          priority: string
          resolution_notes: string | null
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description: string
          id?: string
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      temp_otp_codes: {
        Row: {
          code: string
          created_at: string | null
          delivery_method: string | null
          expires_at: string | null
          id: string
          identifier: string
          purpose: string
          used: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          delivery_method?: string | null
          expires_at?: string | null
          id?: string
          identifier: string
          purpose?: string
          used?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          delivery_method?: string | null
          expires_at?: string | null
          id?: string
          identifier?: string
          purpose?: string
          used?: boolean | null
        }
        Relationships: []
      }
      user_app_access: {
        Row: {
          app_type: string
          created_at: string
          device_info: Json | null
          id: string
          last_access: string
          user_id: string
        }
        Insert: {
          app_type: string
          created_at?: string
          device_info?: Json | null
          id?: string
          last_access?: string
          user_id: string
        }
        Update: {
          app_type?: string
          created_at?: string
          device_info?: Json | null
          id?: string
          last_access?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      available_nannies_with_location: {
        Row: {
          approval_status: string | null
          experience_level:
            | Database["public"]["Enums"]["experience_level"]
            | null
          first_name: string | null
          hourly_rate: number | null
          id: string | null
          languages: string[] | null
          last_name: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          monthly_rate: number | null
          rating: number | null
          skills: string[] | null
          total_reviews: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nannies_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_booking_on_behalf: {
        Args: { p_admin_id: string; p_booking_id: string; p_reason?: string }
        Returns: boolean
      }
      apply_booking_modification_changes: {
        Args: { p_modification_id: string }
        Returns: undefined
      }
      assign_material_to_all_nannies: {
        Args: { p_due_date?: string; p_material_id: string }
        Returns: undefined
      }
      auto_accept_backup_nanny: { Args: never; Returns: undefined }
      begin_transaction: { Args: never; Returns: undefined }
      calculate_booking_days: {
        Args: { end_date?: string; start_date: string }
        Returns: number
      }
      calculate_booking_revenue:
        | {
            Args: {
              p_booking_days: number
              p_booking_id: string
              p_booking_type: string
              p_monthly_rate_estimate: number
              p_total_amount: number
            }
            Returns: {
              admin_total_revenue: number
              commission_amount: number
              commission_percent: number
              fixed_fee: number
              nanny_earnings: number
            }[]
          }
        | {
            Args: {
              p_additional_services_cost?: number
              p_booking_type: string
              p_client_total: number
              p_home_size: string
            }
            Returns: {
              admin_total_revenue: number
              commission_amount: number
              commission_percent: number
              fixed_fee: number
              nanny_earnings: number
            }[]
          }
        | {
            Args: {
              p_additional_services_cost?: number
              p_booking_id: string
              p_booking_type: string
              p_client_total: number
              p_home_size?: string
              p_living_arrangement?: string
            }
            Returns: Json
          }
      calculate_distance: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      calculate_next_payment_dates: {
        Args: { auth_day?: number; capture_day?: number; input_date?: string }
        Returns: {
          next_auth_date: string
          next_capture_date: string
        }[]
      }
      calculate_service_adjustment: {
        Args: {
          p_booking_id: string
          p_effective_date?: string
          p_is_addition: boolean
          p_service_type: string
        }
        Returns: number
      }
      calculate_unified_revenue: {
        Args: {
          p_booking_type?: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: {
          booking_count: number
          commission_revenue: number
          placement_fees: number
          total_revenue: number
        }[]
      }
      check_booking_conflicts: {
        Args: {
          p_end_date?: string
          p_end_time?: string
          p_nanny_id: string
          p_start_date: string
          p_start_time?: string
        }
        Returns: boolean
      }
      check_nanny_training_compliance: {
        Args: { p_nanny_id: string }
        Returns: {
          days_since_assignment: number
          is_compliant: boolean
          next_suspension_date: string
          overdue_assignments: number
        }[]
      }
      check_otp_rate_limit: {
        Args: { identifier_param: string }
        Returns: boolean
      }
      check_security_status: {
        Args: never
        Returns: {
          check_name: string
          recommendation: string
          status: string
        }[]
      }
      cleanup_expired_otps: { Args: never; Returns: undefined }
      cleanup_expired_security_data: { Args: never; Returns: undefined }
      commit_transaction: { Args: never; Returns: undefined }
      create_dev_admin_role: { Args: { p_user_id: string }; Returns: undefined }
      create_dev_client_profile: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      create_dev_nanny_profile: {
        Args: { p_bio?: string; p_first_name: string; p_user_id: string }
        Returns: undefined
      }
      generate_advice_number: { Args: never; Returns: string }
      generate_client_invoice: {
        Args: {
          p_apply_rewards?: boolean
          p_base_amount: number
          p_booking_id?: string
          p_client_id: string
          p_description?: string
        }
        Returns: string
      }
      generate_invoice_number: { Args: never; Returns: string }
      generate_nanny_payment_advice: {
        Args: {
          p_base_amount: number
          p_booking_id?: string
          p_nanny_id: string
          p_period_end: string
          p_period_start: string
        }
        Returns: string
      }
      get_admin_permissions: { Args: { user_uuid?: string }; Returns: Json }
      get_chat_messages: {
        Args: { room_id_param: string }
        Returns: {
          content: string
          created_at: string
          id: string
          room_id: string
          sender_id: string
          sender_name: string
          sender_type: string
        }[]
      }
      get_dashboard_stats: {
        Args: never
        Returns: {
          active_nannies: number
          support_tickets: number
          today_bookings: number
          total_clients: number
          total_revenue: number
        }[]
      }
      get_nanny_availability: {
        Args: { p_end_date: string; p_nanny_id: string; p_start_date: string }
        Returns: {
          available_slots: Json
          blocked_slots: Json
          date_available: string
          has_bookings: boolean
          has_interviews: boolean
        }[]
      }
      get_nanny_chat_rooms_with_booking_validation: {
        Args: { nanny_id_param: string }
        Returns: {
          booking_status: string
          last_message: string
          last_message_at: string
          other_participant_id: string
          other_participant_name: string
          room_id: string
          room_name: string
          room_type: string
          unread_count: number
        }[]
      }
      get_or_create_chat_room: {
        Args: {
          participant1_id: string
          participant2_id: string
          room_type?: string
        }
        Returns: string
      }
      get_support_stats: {
        Args: never
        Returns: {
          in_progress_tickets: number
          open_tickets: number
          pending_disputes: number
          resolved_today: number
          urgent_tickets: number
        }[]
      }
      get_user_chat_rooms: {
        Args: { user_id_param: string }
        Returns: {
          last_message: string
          last_message_at: string
          other_participant_id: string
          other_participant_name: string
          room_id: string
          room_name: string
          room_type: string
          unread_count: number
        }[]
      }
      insert_system_chat_message: {
        Args: {
          p_is_internal?: boolean
          p_message: string
          p_ticket_id: string
        }
        Returns: string
      }
      is_admin: { Args: { user_uuid?: string }; Returns: boolean }
      is_super_admin: { Args: { user_uuid?: string }; Returns: boolean }
      is_valid_sa_phone: { Args: { phone_number: string }; Returns: boolean }
      log_security_event: {
        Args: {
          p_event_details?: Json
          p_event_type?: string
          p_ip_address?: string
          p_user_agent?: string
          p_user_id?: string
        }
        Returns: undefined
      }
      phone_exists: { Args: { phone_number: string }; Returns: boolean }
      populate_missing_booking_financials: { Args: never; Returns: undefined }
      rollback_transaction: { Args: never; Returns: undefined }
      search_bookings_for_reassignment: {
        Args: { p_search_term: string }
        Returns: {
          booking_id: string
          booking_type: string
          client_id: string
          client_name: string
          nanny_id: string
          nanny_name: string
          start_date: string
          status: string
          total_cost: number
        }[]
      }
      security_validation_report: {
        Args: never
        Returns: {
          category: string
          check_name: string
          details: string
          status: string
        }[]
      }
      seed_system_admin: { Args: { admin_email: string }; Returns: string }
      send_chat_message: {
        Args: {
          content_param: string
          room_id_param: string
          sender_name_param: string
          sender_type_param: string
        }
        Returns: undefined
      }
      set_default_payment_method: {
        Args: { p_client_id: string; p_payment_method_id: string }
        Returns: undefined
      }
      setup_super_admin: { Args: { admin_email: string }; Returns: string }
      update_nanny_compliance_status: { Args: never; Returns: undefined }
      update_nanny_pd_compliance: { Args: never; Returns: undefined }
      update_verification_step: {
        Args: {
          p_nanny_id: string
          p_notes?: string
          p_status: string
          p_step_name: string
        }
        Returns: undefined
      }
      validate_email: { Args: { email: string }; Returns: boolean }
      validate_password_strength: {
        Args: { password_text: string }
        Returns: boolean
      }
      validate_phone_number: { Args: { phone: string }; Returns: boolean }
    }
    Enums: {
      backup_request_status: "pending" | "accepted" | "rejected"
      booking_status:
        | "pending"
        | "confirmed"
        | "active"
        | "completed"
        | "cancelled"
        | "rejected"
      experience_level: "1-3" | "3-6" | "6+"
      living_arrangement: "live-in" | "live-out"
      user_type: "client" | "nanny" | "admin"
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
      backup_request_status: ["pending", "accepted", "rejected"],
      booking_status: [
        "pending",
        "confirmed",
        "active",
        "completed",
        "cancelled",
        "rejected",
      ],
      experience_level: ["1-3", "3-6", "6+"],
      living_arrangement: ["live-in", "live-out"],
      user_type: ["client", "nanny", "admin"],
    },
  },
} as const