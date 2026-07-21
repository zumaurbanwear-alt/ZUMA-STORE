import { supabase } from "@/integrations/supabase/client";

export const signInAdmin = async (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password });

export const signOutAdmin = async () => supabase.auth.signOut();
