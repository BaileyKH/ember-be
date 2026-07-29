import { createClient } from "@supabase/supabase-js";
import { cfg } from "../config.js";

export const supabaseAdmin = createClient(cfg.db.supabaseUrl, cfg.db.supabaseSecret, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
    }
})

export async function createTripBannerUrl(imgPath: string | null): Promise<string | null> {
    if (!imgPath) {
        return null
    }

    const { data, error } = await supabaseAdmin.storage
        .from("trip-banners")
        .createSignedUrl(imgPath, 60 * 60)

    if (error) {
        throw new Error("Failed to create trip banner url")
    }

    return data.signedUrl
}