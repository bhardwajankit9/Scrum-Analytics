// ─── Supabase Database Type Definitions ──────────────────────────────────────
// Matches the schema in supabase/migrations/001_schema.sql.
// Used to type the Supabase client for full type-safety across all queries.
// Generated-style format required by @supabase/supabase-js v2.x

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id:                 string
          name:               string
          description:        string
          scrum_time:         string
          scrum_timezone:     string
          status:             'active' | 'archived'
          late_grace_minutes: number
          created_at:         string
        }
        Insert: {
          id?:                string
          name:               string
          description?:       string
          scrum_time:         string
          scrum_timezone?:    string
          status?:            'active' | 'archived'
          late_grace_minutes?: number
          created_at?:        string
        }
        Update: Partial<Database['public']['Tables']['projects']['Insert']>
        Relationships: []
      }

      attendees: {
        Row: {
          id:          string
          name:        string
          email:       string
          employee_id: string
          role:        'dev' | 'qa' | 'ba' | 'lead'
          project:     string
          manager:     string
          status:      'active' | 'on_leave' | 'inactive'
          created_at:  string
        }
        Insert: {
          id?:         string
          name:        string
          email:       string
          employee_id: string
          role:        'dev' | 'qa' | 'ba' | 'lead'
          project?:    string
          manager?:    string
          status?:     'active' | 'on_leave' | 'inactive'
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['attendees']['Insert']>
        Relationships: []
      }

      attendance_entries: {
        Row: {
          id:           string
          project_id:   string
          attendee_id:  string
          date:         string
          join_time:    string | null
          status:       'present' | 'late' | 'absent'
          minutes_late: number
          work_mode:    'office' | 'wfh' | null
          notes:        string
          marked_by:    string
          marked_at:    string
        }
        Insert: {
          id?:          string
          project_id:   string
          attendee_id:  string
          date:         string
          join_time?:   string | null
          status:       'present' | 'late' | 'absent'
          minutes_late?: number
          work_mode?:   'office' | 'wfh' | null
          notes?:       string
          marked_by?:   string
          marked_at?:   string
        }
        Update: Partial<Database['public']['Tables']['attendance_entries']['Insert']>
        Relationships: [
          { foreignKeyName: 'attendance_entries_project_id_fkey';  columns: ['project_id'];  referencedRelation: 'projects';  referencedColumns: ['id'] },
          { foreignKeyName: 'attendance_entries_attendee_id_fkey'; columns: ['attendee_id']; referencedRelation: 'attendees'; referencedColumns: ['id'] }
        ]
      }

      holidays: {
        Row: {
          id:           string
          project_id:   string
          holiday_date: string
          name:         string
          created_at:   string
        }
        Insert: {
          id?:          string
          project_id:   string
          holiday_date: string
          name:         string
          created_at?:  string
        }
        Update: Partial<Database['public']['Tables']['holidays']['Insert']>
        Relationships: [
          { foreignKeyName: 'holidays_project_id_fkey'; columns: ['project_id']; referencedRelation: 'projects'; referencedColumns: ['id'] }
        ]
      }

      leaves: {
        Row: {
          id:          string
          project_id:  string
          attendee_id: string
          start_date:  string
          end_date:    string
          reason:      string
          approved_by: string
          created_at:  string
        }
        Insert: {
          id?:          string
          project_id:   string
          attendee_id:  string
          start_date:   string
          end_date:     string
          reason?:      string
          approved_by?: string
          created_at?:  string
        }
        Update: Partial<Database['public']['Tables']['leaves']['Insert']>
        Relationships: [
          { foreignKeyName: 'leaves_project_id_fkey';  columns: ['project_id'];  referencedRelation: 'projects';  referencedColumns: ['id'] },
          { foreignKeyName: 'leaves_attendee_id_fkey'; columns: ['attendee_id']; referencedRelation: 'attendees'; referencedColumns: ['id'] }
        ]
      }

      project_memberships: {
        Row: {
          id:         string
          project_id: string
          user_name:  string
          user_email: string
          role:       'owner_pmo' | 'pmo' | 'viewer'
          created_at: string
        }
        Insert: {
          id?:         string
          project_id:  string
          user_name:   string
          user_email:  string
          role?:       'owner_pmo' | 'pmo' | 'viewer'
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['project_memberships']['Insert']>
        Relationships: [
          { foreignKeyName: 'project_memberships_project_id_fkey'; columns: ['project_id']; referencedRelation: 'projects'; referencedColumns: ['id'] }
        ]
      }

      user_mpins: {
        Row: {
          user_id:    string
          pin_hash:   string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id:     string
          pin_hash:    string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['user_mpins']['Insert']>
        Relationships: []
      }

      notifications: {
        Row: {
          id:           string
          user_id:      string
          alert_type:   string
          title:        string
          message:      string
          related_data: Record<string, unknown> | null
          is_read:      boolean
          is_dismissed: boolean
          created_at:   string
          read_at:      string | null
        }
        Insert: {
          id?:           string
          user_id:       string
          alert_type:    string
          title:         string
          message:       string
          related_data?: Record<string, unknown> | null
          is_read?:      boolean
          is_dismissed?: boolean
          created_at?:   string
          read_at?:      string | null
        }
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
        Relationships: []
      }

      user_profiles: {
        Row: {
          id:         string
          name:       string
          email:      string | null
          avatar_url: string | null
          provider:   string
          role:       string
          last_login: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id:          string
          name?:       string
          email?:      string | null
          avatar_url?: string | null
          provider?:   string
          role?:       string
          last_login?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>
        Relationships: []
      }

      notification_settings: {
        Row: {
          id:                   string
          config_key:           string
          enabled_alerts:       Record<string, boolean>
          delivery_method:      string
          reminder_time:        string
          late_threshold:       number
          sendgrid_api_key:     string
          sendgrid_from_email:  string
          slack_webhook_url:    string
          recipients:           unknown[]
          updated_at:           string
        }
        Insert: {
          id?:                   string
          config_key:            string
          enabled_alerts?:       Record<string, boolean>
          delivery_method?:      string
          reminder_time?:        string
          late_threshold?:       number
          sendgrid_api_key?:     string
          sendgrid_from_email?:  string
          slack_webhook_url?:    string
          recipients?:           unknown[]
          updated_at?:           string
        }
        Update: Partial<Database['public']['Tables']['notification_settings']['Insert']>
        Relationships: []
      }

      blockers: {
        Row: {
          id:            string
          project_id:    string
          attendee_id:   string
          reported_date: string
          reported_by:   string
          description:   string
          severity:      'critical' | 'high' | 'medium' | 'low'
          status:        'open' | 'in_progress' | 'resolved'
          resolved_date: string | null
          resolved_by:   string | null
          related_data:  Record<string, unknown> | null
          notes:         string
          created_at:    string
          updated_at:    string
        }
        Insert: {
          id?:            string
          project_id:     string
          attendee_id:    string
          reported_date:  string
          reported_by:    string
          description?:   string
          severity?:      'critical' | 'high' | 'medium' | 'low'
          status?:        'open' | 'in_progress' | 'resolved'
          resolved_date?: string | null
          resolved_by?:   string | null
          related_data?:  Record<string, unknown> | null
          notes?:         string
          created_at?:    string
          updated_at?:    string
        }
        Update: Partial<Database['public']['Tables']['blockers']['Insert']>
        Relationships: [
          { foreignKeyName: 'blockers_project_id_fkey'; columns: ['project_id']; referencedRelation: 'projects'; referencedColumns: ['id'] },
          { foreignKeyName: 'blockers_attendee_id_fkey'; columns: ['attendee_id']; referencedRelation: 'attendees'; referencedColumns: ['id'] }
        ]
      }

      scrum_sessions: {
        Row: {
          id:               string
          project_id:       string
          session_date:     string
          scrum_start_time: string
          scrum_end_time:   string
          duration_minutes: number
          attendees_marked: number
          created_at:       string
        }
        Insert: {
          id?:              string
          project_id:       string
          session_date:     string
          scrum_start_time: string
          scrum_end_time:   string
          duration_minutes?: number
          attendees_marked?: number
          created_at?:      string
        }
        Update: Partial<Database['public']['Tables']['scrum_sessions']['Insert']>
        Relationships: [
          { foreignKeyName: 'scrum_sessions_project_id_fkey'; columns: ['project_id']; referencedRelation: 'projects'; referencedColumns: ['id'] }
        ]
      }

      attendance_rules: {
        Row: {
          id:                      string
          project_id:              string
          default_scrum_start_time: string
          default_scrum_end_time:   string
          grace_period_minutes:    number
          late_threshold_minutes:  number
          auto_mark_absent_after:  number | null
          working_days:            string
          timezone:                string
          created_at:              string
          updated_at:              string
        }
        Insert: {
          id?:                     string
          project_id:              string
          default_scrum_start_time: string
          default_scrum_end_time:   string
          grace_period_minutes?:   number
          late_threshold_minutes?:  number
          auto_mark_absent_after?:  number | null
          working_days?:           string
          timezone?:               string
          created_at?:             string
          updated_at?:             string
        }
        Update: Partial<Database['public']['Tables']['attendance_rules']['Insert']>
        Relationships: [
          { foreignKeyName: 'attendance_rules_project_id_fkey'; columns: ['project_id']; referencedRelation: 'projects'; referencedColumns: ['id'] }
        ]
      }
    }
    Views:   Record<string, never>
    Functions: Record<string, never>
    Enums:   Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// ── Convenience row types ──────────────────────────────────────────────────────
export type ProjectRow               = Database['public']['Tables']['projects']['Row']
export type AttendeeRow              = Database['public']['Tables']['attendees']['Row']
export type AttendanceEntryRow       = Database['public']['Tables']['attendance_entries']['Row']
export type HolidayRow               = Database['public']['Tables']['holidays']['Row']
export type LeaveRow                 = Database['public']['Tables']['leaves']['Row']
export type ProjectMembershipRow     = Database['public']['Tables']['project_memberships']['Row']
export type UserMPINRow              = Database['public']['Tables']['user_mpins']['Row']
export type UserProfileRow           = Database['public']['Tables']['user_profiles']['Row']
export type NotificationRow          = Database['public']['Tables']['notifications']['Row']
export type NotificationSettingsRow  = Database['public']['Tables']['notification_settings']['Row']
export type BlockerRow               = Database['public']['Tables']['blockers']['Row']
export type ScrumSessionRow          = Database['public']['Tables']['scrum_sessions']['Row']
export type AttendanceRuleRow        = Database['public']['Tables']['attendance_rules']['Row']
