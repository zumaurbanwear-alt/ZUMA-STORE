import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AdminProductsPanel } from "@/pages/admin/AdminProductsPanel";
import { AdminOrdersPanel } from "@/pages/admin/AdminOrdersPanel";
import { AdminAuditPanel } from "@/pages/admin/AdminAuditPanel";
import { AdminExpensesSection } from "@/pages/admin/AdminExpensesSection";

const Admin = () => {
  const nav = useNavigate();
  const { user, isAdmin, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) nav("/zm-portal-x92-login");
  }, [user, loading, nav]);

  if (loading) return <div className="min-h-screen bg-background grid place-items-center text-muted-foreground text-xs">Loading...</div>;
  if (!user) return null; // navigate effect will redirect
  if (!isAdmin) return (
    <div className="min-h-screen bg-background grid place-items-center px-6">
      <div className="text-center max-w-md">
        <h1 className="font-display text-2xl tracking-[0.25em] mb-3">ACCESS DENIED</h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Your account does not have admin privileges. Contact the store owner.
        </p>
        <button onClick={() => supabase.auth.signOut().then(() => nav("/zm-portal-x92-login"))} className="mt-6 px-5 py-2 border border-primary text-primary text-[10px] tracking-[0.22em] uppercase hover:bg-primary hover:text-primary-foreground">Sign out</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <header className="flex justify-between items-center mb-10 border-b border-border pb-5">
        <div>
          <h1 className="font-display text-2xl md:text-3xl tracking-[0.3em]">ZÜMA — ADMIN</h1>
          <p className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground mt-1">Live store manager</p>
        </div>
        <button onClick={() => supabase.auth.signOut().then(() => nav("/"))} className="px-4 py-2 border border-border text-[10px] tracking-[0.22em] uppercase text-muted-foreground hover:text-primary-hi">
          Sign out
        </button>
      </header>

      <AdminProductsPanel />
      <AdminOrdersPanel />
      <AdminAuditPanel />
      <AdminExpensesSection />
    </div>
  );
};
export default Admin;
