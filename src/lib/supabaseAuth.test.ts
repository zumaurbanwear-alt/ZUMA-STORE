import { beforeEach, describe, expect, it, vi } from "vitest";
import { signInAdmin } from "./supabaseAuth";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

describe("signInAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("trims email and password before calling Supabase", async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({ data: {}, error: null } as never);

    await signInAdmin("  admin@example.com  ", "  secret123  ");

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "admin@example.com",
      password: "secret123",
    });
  });
});
