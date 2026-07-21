import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { isAdminRoleRecord } from "@/lib/auth";

export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (!s?.user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const { data } = await supabase.from("user_roles").select("role").eq("user_id", s.user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(isAdminRoleRecord(data));
      setLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (!s?.user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const { data } = await supabase.from("user_roles").select("role").eq("user_id", s.user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(isAdminRoleRecord(data));
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user, isAdmin, loading };
};
