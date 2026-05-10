/**
 * Wigsmi seed script
 * --------------------------------------------------------------------------
 * Populates the database with demo content for development and demos.
 *
 *   bun run scripts/seed.ts                # data only (idempotent)
 *   bun run scripts/seed.ts --with-analytics  # also seed try-on / click events
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment
 * (already provided locally via .env when running inside Lovable).
 *
 * NOTE: All image URLs below use picsum.photos and are clearly demo
 * placeholders. Do not ship these to production marketing.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const WITH_ANALYTICS = process.argv.includes("--with-analytics");

const ADMIN = { email: "ayo@wigsmi.com", password: "Wigsmi!Admin2026", name: "Ayo" };
const RETAILERS = [
  {
    email: "owner@crownandcoils.com",
    password: "Wigsmi!Retailer1",
    business: "Crown & Coils",
    slug: "crown-and-coils",
    country: "United Kingdom",
    currency: "GBP" as const,
    brand: "#3D1C02",
    website: "https://crownandcoils.example",
    contact: "Adaeze Okeke",
  },
  {
    email: "owner@silkscalp.co",
    password: "Wigsmi!Retailer2",
    business: "Silk & Scalp",
    slug: "silk-and-scalp",
    country: "United States",
    currency: "USD" as const,
    brand: "#5B2A0E",
    website: "https://silkscalp.example",
    contact: "Jordan Hayes",
  },
];
const CONSUMERS = [
  { email: "maya@example.com", password: "Wigsmi!Consumer1", name: "Maya" },
  { email: "zola@example.com", password: "Wigsmi!Consumer2", name: "Zola" },
];

async function ensureUser(email: string, password: string, name: string, role: "admin" | "retailer" | "consumer") {
  // Idempotent: find by email, else create.
  const { data: list } = await admin.auth.admin.listUsers();
  let user = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: name, role },
    });
    if (error) throw error;
    user = data.user!;
  } else {
    await admin.auth.admin.updateUserById(user.id, { password });
  }
  // Ensure role row (trigger inserts consumer by default).
  await admin.from("user_roles").upsert(
    { user_id: user.id, role },
    { onConflict: "user_id,role" },
  );
  return user.id;
}

const WIG_TEMPLATES = [
  { name: "Lagos Honey 22\"", style: "lace-front", texture: "wavy", length: "long", origin: "brazilian", price: 289, colors: ["honey blonde", "caramel"], desc: "Body-wave lace front in honey ombre. Pre-plucked HD lace." },
  { name: "Brooklyn Bob 12\"", style: "bob", texture: "straight", length: "short", origin: "peruvian", price: 169, colors: ["jet black"], desc: "Sleek blunt-cut bob with bone-straight ends." },
  { name: "Goddess Kinky 26\"", style: "kinky-straight", texture: "4a", length: "bust", origin: "brazilian", price: 349, colors: ["natural black"], desc: "Yaki kinky-straight for a relaxed-hair blend." },
  { name: "Sahara Curl 18\"", style: "loose-wave", texture: "curly", length: "medium", origin: "peruvian", price: 219, colors: ["dark brown"], desc: "Loose deep-wave curls with bounce that holds overnight." },
  { name: "Velvet Pixie 8\"", style: "pixie", texture: "4b", length: "short", origin: "synthetic", price: 79, colors: ["rich black"], desc: "Tapered pixie with finger-coiled crown." },
  { name: "Knotless Goddess 30\"", style: "braided", texture: "4c", length: "bust", origin: "synthetic", price: 129, colors: ["1B", "burgundy"], desc: "Knotless goddess braids pre-installed on a lace cap." },
  { name: "Mahogany Wave 20\"", style: "loose-wave", texture: "wavy", length: "long", origin: "brazilian", price: 259, colors: ["mahogany"], desc: "Glueless lace front in warm mahogany tones." },
  { name: "Royal Yaki 24\"", style: "kinky-straight", texture: "4a", length: "long", origin: "peruvian", price: 309, colors: ["natural black"], desc: "Yaki straight blow-out texture for matched blends." },
  { name: "Ivory Bob 10\"", style: "bob", texture: "straight", length: "short", origin: "brazilian", price: 189, colors: ["platinum"], desc: "Statement platinum bob with HD transparent lace." },
  { name: "Coily Crown 16\"", style: "closure", texture: "4c", length: "medium", origin: "brazilian", price: 239, colors: ["1B"], desc: "5x5 closure unit with coily kinky curl pattern." },
  { name: "Auburn Glow 22\"", style: "lace-front", texture: "wavy", length: "long", origin: "peruvian", price: 279, colors: ["auburn"], desc: "Auburn balayage on a body-wave 13x4 frontal." },
  { name: "Twist & Coil 14\"", style: "braided", texture: "4b", length: "medium", origin: "synthetic", price: 99, colors: ["1B", "honey"], desc: "Senegalese twist crochet preset on a wig cap." },
  { name: "Onyx Pixie 6\"", style: "pixie", texture: "straight", length: "short", origin: "synthetic", price: 69, colors: ["jet black"], desc: "Asymmetric pixie cut with side-swept fringe." },
  { name: "Cinnamon Wave 24\"", style: "loose-wave", texture: "wavy", length: "long", origin: "brazilian", price: 299, colors: ["cinnamon"], desc: "Cinnamon-tinted body wave with face-framing layers." },
  { name: "Silk Press 28\"", style: "kinky-straight", texture: "straight", length: "bust", origin: "brazilian", price: 359, colors: ["natural black"], desc: "Salon-finished silk press look out the box." },
  { name: "Coco Closure 16\"", style: "closure", texture: "curly", length: "medium", origin: "peruvian", price: 229, colors: ["cocoa brown"], desc: "4x4 lace closure unit with deep-wave curls." },
  { name: "Berry Bob 12\"", style: "bob", texture: "wavy", length: "short", origin: "brazilian", price: 179, colors: ["wine"], desc: "Tucked-edge bob with subtle wave and berry tone." },
  { name: "Afro Cloud 14\"", style: "lace-front", texture: "4c", length: "medium", origin: "synthetic", price: 119, colors: ["1B"], desc: "Voluminous afro fro on a glueless lace front." },
  { name: "Toffee Loose 22\"", style: "loose-wave", texture: "wavy", length: "long", origin: "peruvian", price: 269, colors: ["toffee"], desc: "Loose-wave toffee melt with HD ear-to-ear lace." },
  { name: "Twist-Out Halo 18\"", style: "closure", texture: "4a", length: "medium", origin: "brazilian", price: 249, colors: ["natural black"], desc: "Pre-styled twist-out halo with defined coils." },
];

function img(seed: string) {
  // picsum.photos seeded URL — DEMO ONLY
  return `https://picsum.photos/seed/${seed}/800/1000`;
}

async function seedWigs(retailerIds: string[]) {
  for (let i = 0; i < WIG_TEMPLATES.length; i++) {
    const t = WIG_TEMPLATES[i];
    const retailerId = retailerIds[i % retailerIds.length];
    const slug = `${t.name}-${i}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const isFeatured = i < 5;

    // Idempotent on (retailer_id, name).
    const { data: existing } = await admin
      .from("wigs")
      .select("id")
      .eq("retailer_id", retailerId)
      .eq("name", t.name)
      .maybeSingle();

    const row = {
      retailer_id: retailerId,
      name: t.name,
      description: t.desc,
      style_type: t.style,
      hair_texture: t.texture,
      hair_length: t.length,
      hair_origin: t.origin,
      price: t.price,
      currency: i % 2 === 0 ? "GBP" : "USD",
      colors: t.colors,
      images: [img(`${slug}-1`), img(`${slug}-2`)],
      is_published: true,
      is_featured: isFeatured,
      featured_rank: isFeatured ? i + 1 : null,
      in_stock: true,
    };

    if (existing) await admin.from("wigs").update(row).eq("id", existing.id);
    else await admin.from("wigs").insert(row);
  }
}

async function seedAnalytics(retailerIds: string[]) {
  const { data: wigs } = await admin.from("wigs").select("id, retailer_id").in("retailer_id", retailerIds);
  if (!wigs?.length) return;
  const devices = ["mobile", "desktop", "tablet"];
  const sources = ["direct", "embed", "instagram", "tiktok"];
  const countries = ["GB", "US", "NG", "ZA", "CA"];
  const tryOns: any[] = [];
  const clicks: any[] = [];
  for (let i = 0; i < 400; i++) {
    const w = wigs[i % wigs.length];
    tryOns.push({
      wig_id: w.id,
      retailer_id: w.retailer_id,
      device: devices[i % devices.length],
      source: sources[i % sources.length],
      country: countries[i % countries.length],
      anonymous_session: `seed-${i}`,
      created_at: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000).toISOString(),
    });
  }
  for (let i = 0; i < 120; i++) {
    const w = wigs[i % wigs.length];
    clicks.push({
      wig_id: w.id,
      retailer_id: w.retailer_id,
      created_at: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000).toISOString(),
    });
  }
  // chunked inserts to stay under payload limits
  for (let i = 0; i < tryOns.length; i += 100) await admin.from("try_on_events").insert(tryOns.slice(i, i + 100));
  for (let i = 0; i < clicks.length; i += 100) await admin.from("wig_clicks").insert(clicks.slice(i, i + 100));
}

async function main() {
  console.log("Seeding admin...");
  await ensureUser(ADMIN.email, ADMIN.password, ADMIN.name, "admin");

  console.log("Seeding retailers...");
  const retailerIds: string[] = [];
  for (const r of RETAILERS) {
    const ownerId = await ensureUser(r.email, r.password, r.business, "retailer");
    const { data: existing } = await admin.from("retailers").select("id").eq("slug", r.slug).maybeSingle();
    const row = {
      owner_id: ownerId,
      business_name: r.business,
      display_name: r.business,
      slug: r.slug,
      country: r.country,
      currency: r.currency,
      brand_primary: r.brand,
      website: r.website,
      contact_name: r.contact,
      onboarding_completed: true,
      is_active: true,
      trial_ends_at: new Date(Date.now() + 60 * 86400000).toISOString(),
    };
    let retailerId: string;
    if (existing) {
      await admin.from("retailers").update(row).eq("id", existing.id);
      retailerId = existing.id;
    } else {
      const { data } = await admin.from("retailers").insert(row).select("id").single();
      retailerId = data!.id;
    }
    retailerIds.push(retailerId);

    // Widget embed
    const { data: w } = await admin.from("widget_embeds").select("id").eq("retailer_id", retailerId).maybeSingle();
    if (!w) await admin.from("widget_embeds").insert({ retailer_id: retailerId, widget_type: "full", config: {}, allowed_domains: [] });
  }

  console.log("Seeding consumers...");
  for (const c of CONSUMERS) await ensureUser(c.email, c.password, c.name, "consumer");

  console.log("Seeding wigs...");
  await seedWigs(retailerIds);

  if (WITH_ANALYTICS) {
    console.log("Seeding analytics events...");
    await seedAnalytics(retailerIds);
  }

  console.log("\nDone. Credentials:");
  console.table([
    { role: "admin", email: ADMIN.email, password: ADMIN.password },
    ...RETAILERS.map((r) => ({ role: "retailer", email: r.email, password: r.password })),
    ...CONSUMERS.map((c) => ({ role: "consumer", email: c.email, password: c.password })),
  ]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
