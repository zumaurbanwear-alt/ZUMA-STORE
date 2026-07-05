import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const NewsletterBand = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("err");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("newsletters").insert({ email });
    setBusy(false);
    if (error && !error.message.includes("duplicate")) {
      setStatus("err");
      return;
    }
    setStatus("ok");
    setEmail("");
  };

  return (
    <section
      className="border-b border-border px-6 md:px-10 flex flex-col justify-center"
      style={{ minHeight: "clamp(160px, 30vh, 320px)" }}
    >
      <div className="max-w-[900px] w-full mx-auto py-10">
        <h2
          className="font-display text-foreground mb-6"
          style={{ fontSize: "clamp(18px, 2.4vw, 28px)", letterSpacing: "0.2em" }}
        >
          GET EARLY ACCESS FOR NEW RELEASES
        </h2>
        <div className="flex border border-foreground/60">
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setStatus("idle"); }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Email"
            className="flex-1 bg-transparent px-6 py-5 text-foreground text-sm outline-none placeholder:text-foreground/50"
          />
          <button
            onClick={submit}
            disabled={busy}
            aria-label="Subscribe"
            className="px-6 text-foreground/70 hover:text-foreground transition-colors text-xl"
          >
            →
          </button>
        </div>
        {status === "ok" && (
          <p className="text-[10px] tracking-[0.25em] uppercase text-primary-hi mt-3">Subscribed</p>
        )}
        {status === "err" && (
          <p className="text-[10px] tracking-[0.25em] uppercase text-destructive mt-3">Invalid email</p>
        )}
      </div>
    </section>
  );
};
