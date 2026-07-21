import { supabase } from "@/integrations/supabase/client";

export const signInAdmin = async (email: string, password: string) => {
  const normalizedEmail = email.trim();
  const normalizedPassword = password.trim();

  return supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: normalizedPassword,
  });
};

export const signOutAdmin = async () => supabase.auth.signOut();
