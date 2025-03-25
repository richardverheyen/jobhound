import { User as CustomUser } from './index'

declare module '@supabase/supabase-js' {
  export interface User extends CustomUser {}
} 