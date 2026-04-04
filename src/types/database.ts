/**
 * Database Type Definitions
 * Auto-generated types for Supabase tables
 */

// User roles
export type UserRole = 'user' | 'admin' | 'moderator';

// User status
export type UserStatus = 'active' | 'inactive' | 'suspended';

// Notification types
export type NotificationType = 'system' | 'alert' | 'info' | 'success' | 'warning' | 'error';

// Audit log action types
export type AuditAction = 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout';

// Audit log status
export type AuditStatus = 'success' | 'failure' | 'pending';

/**
 * Users table
 * Extended user data linked to Supabase auth.users
 */
export interface User {
  id: string; // UUID
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  status: UserStatus;
  last_sign_in_at: string | null; // ISO timestamp
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * User insert/update type
 */
export interface UserInsert {
  id?: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role?: UserRole;
  status?: UserStatus;
  last_sign_in_at?: string;
}

/**
 * Profiles table
 * Extended user profile information
 */
export interface Profile {
  id: string; // UUID, FK to users
  bio: string | null;
  website: string | null;
  location: string | null;
  phone: string | null;
  preferences: Record<string, unknown>; // JSONB
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Profile insert/update type
 */
export interface ProfileInsert {
  id?: string;
  bio?: string;
  website?: string;
  location?: string;
  phone?: string;
  preferences?: Record<string, unknown>;
}

/**
 * Sessions table
 * User session tracking
 */
export interface Session {
  id: string; // UUID
  user_id: string; // UUID, FK to users
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string; // ISO timestamp
  ip_address: string | null;
  user_agent: string | null;
  is_active: boolean;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Session insert/update type
 */
export interface SessionInsert {
  id?: string;
  user_id: string;
  access_token?: string;
  refresh_token?: string;
  expires_at: string;
  ip_address?: string;
  user_agent?: string;
  is_active?: boolean;
}

/**
 * Audit logs table
 * Action tracking for compliance and debugging
 */
export interface AuditLog {
  id: string; // UUID
  user_id: string | null; // UUID, FK to users
  action: AuditAction;
  resource_type: string | null;
  resource_id: string | null; // UUID
  changes: Record<string, unknown> | null; // JSONB
  ip_address: string | null;
  user_agent: string | null;
  status: AuditStatus;
  error_message: string | null;
  created_at: string; // ISO timestamp
}

/**
 * Audit log insert type
 */
export interface AuditLogInsert {
  id?: string;
  user_id?: string;
  action: AuditAction;
  resource_type?: string;
  resource_id?: string;
  changes?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  status?: AuditStatus;
  error_message?: string;
}

/**
 * Notifications table
 * User notifications
 */
export interface Notification {
  id: string; // UUID
  user_id: string; // UUID, FK to users
  type: NotificationType;
  title: string;
  message: string | null;
  data: Record<string, unknown> | null; // JSONB
  is_read: boolean;
  read_at: string | null; // ISO timestamp
  created_at: string; // ISO timestamp
}

/**
 * Notification insert/update type
 */
export interface NotificationInsert {
  id?: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message?: string;
  data?: Record<string, unknown>;
  is_read?: boolean;
  read_at?: string;
}

/**
 * Settings table
 * Application configuration
 */
export interface Setting {
  id: string; // UUID
  key: string;
  value: Record<string, unknown> | string | number | boolean | null; // JSONB
  description: string | null;
  is_public: boolean;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Setting insert/update type
 */
export interface SettingInsert {
  id?: string;
  key: string;
  value?: Record<string, unknown> | string | number | boolean | null;
  description?: string;
  is_public?: boolean;
}

/**
 * Database schema type
 * Maps all tables and their types
 */
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: UserInsert;
        Update: Partial<UserInsert>;
      };
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: Partial<ProfileInsert>;
      };
      sessions: {
        Row: Session;
        Insert: SessionInsert;
        Update: Partial<SessionInsert>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: AuditLogInsert;
      };
      notifications: {
        Row: Notification;
        Insert: NotificationInsert;
        Update: Partial<NotificationInsert>;
      };
      settings: {
        Row: Setting;
        Insert: SettingInsert;
        Update: Partial<SettingInsert>;
      };
    };
  };
}
