import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6, "Min 6 chars").max(72),
});

const Auth = () => {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse({ email, password });
    if (!r.success) { toast.error(r.error.issues[0].message); return; }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        toast.success("Account created — check your email to confirm");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav("/admin");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Auth failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm border border-border bg-card p-8 flex flex-col gap-5">
        <Link to="/" className="font-display text-2xl tracking-[0.3em] text-foreground text-center">ZÜMA</Link>
        <h1 className="font-display text-xl tracking-[0.25em] text-center">{mode === "signin" ? "ADMIN LOGIN" : "CREATE ADMIN"}</h1>
        <label className="flex flex-col gap-1.5">
          <span className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground">Email</span>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="bg-background border border-border px-3 py-2.5 text-sm focus:border-primary outline-none" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground">Password</span>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="bg-background border border-border px-3 py-2.5 text-sm focus:border-primary outline-none" />
        </label>
        <button disabled={busy} className="py-3 bg-primary text-primary-foreground text-[11px] tracking-[0.3em] uppercase hover:bg-primary-hi disabled:opacity-50">
          {busy ? "..." : mode === "signin" ? "Sign In" : "Sign Up"}
        </button>
        <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground hover:text-primary-hi">
          {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
        <p className="text-[9px] tracking-[0.18em] uppercase text-muted-foreground text-center leading-relaxed">
          First user to sign up must be granted the admin role from the database.
        </p>
      </form>
    </div>
  );
};
export default Auth;
