import { supabase } from "@/integrations/supabase/client";

let ensurePromise: Promise<void> | null = null;

/**
 * Ensures the visitor has a Supabase session (anonymous if needed).
 * Edge functions require a valid JWT to prevent credit abuse.
 */
export function ensureSession(): Promise<void> {
  if (ensurePromise) return ensurePromise;
  ensurePromise = (async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) return;
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      ensurePromise = null;
      throw error;
    }
  })();
  return ensurePromise;
}
