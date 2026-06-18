// Hand-authored types matching the Supabase schema.
// Run `supabase gen types typescript` to auto-generate after connecting your project.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      care_circles: {
        Row: {
          id: string;
          name: string;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['care_circles']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['care_circles']['Insert']>;
      };
      children: {
        Row: {
          id: string;
          care_circle_id: string;
          name: string;
          date_of_birth: string;
          weight_kg: number | null;
          sex: 'male' | 'female' | 'other' | null;
          conditions: Json;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['children']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['children']['Insert']>;
      };
      circle_members: {
        Row: {
          id: string;
          care_circle_id: string;
          user_id: string;
          role: 'primary' | 'secondary';
          permissions: Json;
          status: 'invited' | 'active';
          invited_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['circle_members']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['circle_members']['Insert']>;
      };
      circle_invites: {
        Row: {
          id: string;
          care_circle_id: string;
          email: string;
          role: 'primary' | 'secondary';
          permissions: Json;
          token: string;
          created_by: string;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['circle_invites']['Row'], 'id' | 'token' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['circle_invites']['Insert']>;
      };
      nutrients: {
        Row: {
          key: string;
          display_name: string;
          unit: string;
          sort_order: number;
        };
        Insert: Database['public']['Tables']['nutrients']['Row'];
        Update: Partial<Database['public']['Tables']['nutrients']['Row']>;
      };
      foods: {
        Row: {
          id: string;
          care_circle_id: string | null;
          name: string;
          brand: string | null;
          source: 'global' | 'custom' | 'csv';
          default_serving_g: number;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['foods']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['foods']['Insert']>;
      };
      food_nutrients: {
        Row: {
          food_id: string;
          nutrient_key: string;
          amount_per_100g: number;
        };
        Insert: Database['public']['Tables']['food_nutrients']['Row'];
        Update: Partial<Database['public']['Tables']['food_nutrients']['Row']>;
      };
      food_servings: {
        Row: {
          id: string;
          food_id: string;
          label: string;
          grams: number;
        };
        Insert: Omit<Database['public']['Tables']['food_servings']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['food_servings']['Insert']>;
      };
      child_nutrient_targets: {
        Row: {
          id: string;
          child_id: string;
          nutrient_key: string;
          basis: 'absolute' | 'per_kg';
          daily_limit_amount: number | null;
          per_kg_amount: number | null;
          effective_from: string;
          effective_to: string | null;
          set_by: string;
          note: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['child_nutrient_targets']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['child_nutrient_targets']['Insert']>;
      };
      meals: {
        Row: {
          id: string;
          child_id: string;
          logged_by: string;
          logged_at: string;
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'formula' | 'supplement' | null;
          note: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['meals']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['meals']['Insert']>;
      };
      meal_items: {
        Row: {
          id: string;
          meal_id: string;
          food_id: string;
          amount_grams: number;
          computed_nutrients: Json;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['meal_items']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['meal_items']['Insert']>;
      };
      tracker_events: {
        Row: {
          id: string;
          child_id: string;
          type: string;
          occurred_at: string;
          logged_by: string;
          data: Json;
          note: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tracker_events']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['tracker_events']['Insert']>;
      };
      photos: {
        Row: {
          id: string;
          child_id: string;
          storage_path: string;
          caption: string | null;
          taken_at: string | null;
          uploaded_by: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['photos']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['photos']['Insert']>;
      };
    };
    Views: {
      daily_nutrient_intake: {
        Row: {
          child_id: string;
          log_date: string;
          nutrient_key: string;
          total_amount: number;
          effective_limit: number | null;
          basis: 'absolute' | 'per_kg' | null;
          percent_of_limit: number | null;
          within_limit: boolean | null;
        };
      };
    };
    Functions: {
      is_circle_member: { Args: { p_care_circle_id: string }; Returns: boolean };
      has_permission: { Args: { p_care_circle_id: string; p_permission: string }; Returns: boolean };
      is_circle_primary: { Args: { p_care_circle_id: string }; Returns: boolean };
    };
    Enums: {};
  };
}

// Convenience row types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type CareCircle = Database['public']['Tables']['care_circles']['Row'];
export type Child = Database['public']['Tables']['children']['Row'];
export type CircleMember = Database['public']['Tables']['circle_members']['Row'];
export type CircleInvite = Database['public']['Tables']['circle_invites']['Row'];
export type Nutrient = Database['public']['Tables']['nutrients']['Row'];
export type Food = Database['public']['Tables']['foods']['Row'];
export type FoodNutrient = Database['public']['Tables']['food_nutrients']['Row'];
export type FoodServing = Database['public']['Tables']['food_servings']['Row'];
export type ChildNutrientTarget = Database['public']['Tables']['child_nutrient_targets']['Row'];
export type Meal = Database['public']['Tables']['meals']['Row'];
export type MealItem = Database['public']['Tables']['meal_items']['Row'];
export type TrackerEvent = Database['public']['Tables']['tracker_events']['Row'];
export type Photo = Database['public']['Tables']['photos']['Row'];
export type DailyNutrientIntake = Database['public']['Views']['daily_nutrient_intake']['Row'];

// Permissions shape stored in circle_members.permissions
export interface MemberPermissions {
  can_log: boolean;
  can_view_analytics: boolean;
  can_edit_targets: boolean;
  can_manage_members: boolean;
  can_edit_foods: boolean;
}
