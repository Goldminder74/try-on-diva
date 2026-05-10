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
        avatar_url: z.string().url().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("profiles").update(data).eq("id", userId);
    if (error) throw error;
    return { ok: true };
  });
