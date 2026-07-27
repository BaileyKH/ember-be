import { createClient } from "@supabase/supabase-js";
import { cfg } from "../config.js";

export const supabaseAdmin = createClient(cfg.db.supabaseUrl, cfg.db.supabaseSecret, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
    }
})