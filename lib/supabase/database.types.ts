export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_alpaca_credentials: {
        Row: {
          id: string;
          user_id: string;
          encrypted_api_key: string;
          encrypted_api_secret: string;
          is_paper: boolean;
          validated_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          encrypted_api_key: string;
          encrypted_api_secret: string;
          is_paper?: boolean;
          validated_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          encrypted_api_key?: string;
          encrypted_api_secret?: string;
          is_paper?: boolean;
          validated_at?: string | null;
          created_at?: string;
        };
      };
      strategies: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          allocation_pct: number;
          rebalance_fraction: number;
          params_json: Json;
          signal_conditions_json: Json | null;
          universe_type: string;
          universe_config_json: Json;
          is_enabled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          allocation_pct: number;
          rebalance_fraction?: number;
          params_json: Json;
          signal_conditions_json?: Json | null;
          universe_type?: string;
          universe_config_json?: Json;
          is_enabled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          allocation_pct?: number;
          rebalance_fraction?: number;
          params_json?: Json;
          signal_conditions_json?: Json | null;
          universe_type?: string;
          universe_config_json?: Json;
          is_enabled?: boolean;
          created_at?: string;
        };
      };
      strategy_runs: {
        Row: {
          id: string;
          user_id: string;
          strategy_id: string;
          started_at: string;
          ended_at: string | null;
          status: string;
          signal_values_json: Json | null;
          log_json: Json | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          strategy_id: string;
          started_at?: string;
          ended_at?: string | null;
          status?: string;
          signal_values_json?: Json | null;
          log_json?: Json | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          strategy_id?: string;
          started_at?: string;
          ended_at?: string | null;
          status?: string;
          signal_values_json?: Json | null;
          log_json?: Json | null;
        };
      };
      targets: {
        Row: {
          id: string;
          run_id: string;
          symbol: string;
          target_shares: number;
          target_value: number;
        };
        Insert: {
          id?: string;
          run_id: string;
          symbol: string;
          target_shares: number;
          target_value: number;
        };
        Update: {
          id?: string;
          run_id?: string;
          symbol?: string;
          target_shares?: number;
          target_value?: number;
        };
      };
      positions_snapshot: {
        Row: {
          id: string;
          user_id: string;
          as_of: string;
          symbol: string;
          qty: number;
          avg_price: number;
          market_value: number;
          asset_class: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          as_of?: string;
          symbol: string;
          qty: number;
          avg_price: number;
          market_value: number;
          asset_class?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          as_of?: string;
          symbol?: string;
          qty?: number;
          avg_price?: number;
          market_value?: number;
          asset_class?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          run_id: string | null;
          symbol: string;
          side: string;
          qty: number;
          status: string;
          alpaca_order_id: string | null;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          run_id?: string | null;
          symbol: string;
          side: string;
          qty: number;
          status?: string;
          alpaca_order_id?: string | null;
          submitted_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          run_id?: string | null;
          symbol?: string;
          side?: string;
          qty?: number;
          status?: string;
          alpaca_order_id?: string | null;
          submitted_at?: string;
        };
      };
      signal_sources: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          type: string;
          config_json: Json;
          is_global: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          type: string;
          config_json: Json;
          is_global?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          type?: string;
          config_json?: Json;
          is_global?: boolean;
          created_at?: string;
        };
      };
      signal_readings: {
        Row: {
          id: string;
          source_id: string;
          value: number;
          raw_response: Json | null;
          fetched_at: string;
        };
        Insert: {
          id?: string;
          source_id: string;
          value: number;
          raw_response?: Json | null;
          fetched_at?: string;
        };
        Update: {
          id?: string;
          source_id?: string;
          value?: number;
          raw_response?: Json | null;
          fetched_at?: string;
        };
      };
      synthetic_indices: {
        Row: {
          id: string;
          user_id: string;
          symbol: string;
          name: string;
          components_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          symbol: string;
          name: string;
          components_json: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          symbol?: string;
          name?: string;
          components_json?: Json;
          created_at?: string;
        };
      };
      global_signal_rules: {
        Row: {
          id: string;
          user_id: string;
          signal_source_id: string;
          conditions_json: Json;
          priority: number;
          is_enabled: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          signal_source_id: string;
          conditions_json: Json;
          priority?: number;
          is_enabled?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          signal_source_id?: string;
          conditions_json?: Json;
          priority?: number;
          is_enabled?: boolean;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
