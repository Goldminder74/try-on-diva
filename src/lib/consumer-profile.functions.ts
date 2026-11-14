import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const QuizSchema = z.object({
  face_shape: z.enum(["oval", "round", "heart", "square", "long", "diamond"]).nullable(),
  skin_tone: z.number().int().min(1).max(6).nullable(),
  style_vibe: z.array(z.string().min(1).max(40)).max(8),
  budget: z.enum(["under-100", "100-250", "250-500", "500-plus"]).nullable(),
  lifestyle: z.array(z.string().min(1).max(40)).max(8),
});

export const getMyConsumerProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: cp }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("consumer_profiles").select("*").eq("user_id", userId).maybeSingle(),
    ]);
    // A stored photo is a path in the shopper's own folder: hand back a link
    // that lasts an hour. Older rows hold a full link and pass through.
    if (profile?.avatar_url && !/^https?:\/\//.test(profile.avatar_url)) {
      const { data: signed } = await supabase.storage
        .from("user-photos")
        .createSignedUrl(profile.avatar_url, 60 * 60);
      profile.avatar_url = signed?.signedUrl ?? null;
    }
    return { profile, consumer: cp };
  });

export const saveStyleQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => QuizSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("consumer_profiles")
      .update({
        face_shape: data.face_shape,
        skin_tone: data.skin_tone,
        style_vibe: data.style_vibe,
        budget: data.budget,
        lifestyle: data.lifestyle,
        quiz_completed_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    if (error) throw error;
    return { ok: true };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        display_name: z.string().min(1).max(80).optional(),
        country: z.string().min(2).max(60).nullable().optional(),
        // The storage path of a photo in the shopper's own folder. It is
        // signed for an hour each time the profile is read, instead of storing
        // a link that stays valid for a year.
        avatar_url: z.string().max(300).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.avatar_url && !/^[A-Za-z0-9._-]+$/.test(data.avatar_url.slice(userId.length + 1))) {
      throw new Error("Invalid photo.");
    }
    if (data.avatar_url && !data.avatar_url.startsWith(`${userId}/`)) {
      throw new Error("Invalid photo.");
    }
    const { error } = await supabase.from("profiles").update(data).eq("id", userId);
    if (error) throw error;
    return { ok: true };
  });
