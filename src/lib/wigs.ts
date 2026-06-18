// Live wig data via Supabase. Replaces the previous static demo array.
import { supabase } from "@/integrations/supabase/client";

export type StyleType =
  | "Lace Front" | "HD Wig" | "Glueless" | "Closure"
  | "Bob" | "Long" | "Braided/Protective" | "360 Lace";

export type HairTexture =
  | "Kinky Coily" | "Kinky Straight" | "Deep Wave"
  | "Body Wave" | "Straight" | "Curly" | "Loose Wave";

export interface Wig {
  id: string;
  name: string;
  retailer: string;
  retailer_id: string;
  price: number;
  currency: string;
  style_type: string;
  hair_texture: string;
  hair_length: string | null;
  hair_origin: string | null;
  colors: string[];
  description: string;
  images: string[];
  ar_asset_url: string | null;
  is_featured: boolean;
  in_stock: boolean;
  try_on_count: number;
  product_url: string | null;
  created_at: string;
}

export const STYLE_TYPES: StyleType[] = [
  "Lace Front", "HD Wig", "Glueless", "Closure", "Bob", "Long", "Braided/Protective", "360 Lace",
];
export const HAIR_TEXTURES: HairTexture[] = [
  "Kinky Coily", "Kinky Straight", "Deep Wave", "Body Wave", "Straight", "Curly", "Loose Wave",
];

export function formatPrice(price: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(price);
  } catch {
    return `£${price}`;
  }
}

type WigRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  style_type: string;
  hair_texture: string;
  hair_length: string | null;
  hair_origin: string | null;
  colors: string[] | null;
  images: string[] | null;
  ar_asset_url: string | null;
  is_featured: boolean;
  in_stock: boolean;
  try_on_count: number;
  product_url: string | null;
  created_at: string;
  retailer_id: string;
};

function mapWig(w: WigRow, retailerNames: Map<string, string> = new Map()): Wig {
  return {
    id: w.id,
    name: w.name,
    description: w.description ?? "",
    price: Number(w.price),
    currency: w.currency,
    style_type: w.style_type,
    hair_texture: w.hair_texture,
    hair_length: w.hair_length,
    hair_origin: w.hair_origin,
    colors: w.colors ?? [],
    images: w.images ?? [],
    ar_asset_url: w.ar_asset_url,
    is_featured: w.is_featured,
    in_stock: w.in_stock,
    try_on_count: w.try_on_count,
    product_url: w.product_url,
    created_at: w.created_at,
    retailer_id: w.retailer_id,
    retailer: retailerNames.get(w.retailer_id) ?? "",
  };
}

const SELECT = `
  id, name, description, price, currency, style_type, hair_texture, hair_length,
  hair_origin, colors, images, ar_asset_url, is_featured, in_stock, try_on_count,
  product_url, created_at, retailer_id
`;

async function fetchRetailerNames(retailerIds: string[]): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(retailerIds)].filter(Boolean);
  if (uniqueIds.length === 0) return new Map();

  // Uses the public SECURITY DEFINER function that returns only safe columns
  // (no plan, trial_ends_at, owner_id, contact info, etc.).
  const { data, error } = await supabase.rpc("get_retailers_public", {
    retailer_ids: uniqueIds,
  });

  if (error) return new Map();
  return new Map(
    ((data ?? []) as Array<{ id: string; display_name: string }>).map((r) => [
      r.id,
      r.display_name,
    ]),
  );
}

async function mapWigsWithRetailers(rows: unknown[] | null): Promise<Wig[]> {
  const wigRows = (rows ?? []) as WigRow[];
  const retailerNames = await fetchRetailerNames(wigRows.map((row) => row.retailer_id));
  return wigRows.map((row) => mapWig(row, retailerNames));
}

export async function fetchWigs(): Promise<Wig[]> {
  const { data, error } = await supabase
    .from("wigs")
    .select(SELECT)
    .eq("is_published", true)
    .is("deleted_at", null)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return mapWigsWithRetailers(data);
}

export async function fetchFeaturedWigs(limit = 6): Promise<Wig[]> {
  const { data, error } = await supabase
    .from("wigs")
    .select(SELECT)
    .eq("is_published", true)
    .is("deleted_at", null)
    .eq("is_featured", true)
    .order("featured_rank", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return mapWigsWithRetailers(data);
}

export async function fetchWigById(id: string): Promise<Wig | null> {
  const { data, error } = await supabase
    .from("wigs")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [wig] = await mapWigsWithRetailers([data]);
  return wig ?? null;
}

export async function fetchRelatedWigs(styleType: string, excludeId: string, limit = 4): Promise<Wig[]> {
  const { data, error } = await supabase
    .from("wigs")
    .select(SELECT)
    .eq("is_published", true)
    .is("deleted_at", null)
    .eq("style_type", styleType)
    .neq("id", excludeId)
    .limit(limit);
  if (error) throw error;
  return mapWigsWithRetailers(data);
}

export type RetailerPublic = {
  id: string;
  slug: string | null;
  display_name: string;
  logo_url: string | null;
  website: string | null;
  brand_primary: string | null;
};

export async function fetchRetailerBySlug(slug: string): Promise<RetailerPublic | null> {
  const { data, error } = await supabase
    .from("retailers_public" as never)
    .select("id, slug, display_name, logo_url, website, brand_primary")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as RetailerPublic;
}

export async function fetchWigsByRetailerId(retailerId: string, limit = 24): Promise<Wig[]> {
  const { data, error } = await supabase
    .from("wigs")
    .select(SELECT)
    .eq("is_published", true)
    .is("deleted_at", null)
    .eq("retailer_id", retailerId)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return mapWigsWithRetailers(data);
}
