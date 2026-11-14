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

const FETCH_BLOCK = 1000;

export async function fetchWigs(): Promise<Wig[]> {
  const rows: unknown[] = [];
  for (let from = 0; ; from += FETCH_BLOCK) {
    const { data, error } = await supabase
      .from("wigs")
      .select(SELECT)
      .eq("is_published", true)
      .is("deleted_at", null)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + FETCH_BLOCK - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < FETCH_BLOCK) break;
  }
  return mapWigsWithRetailers(rows as Parameters<typeof mapWigsWithRetailers>[0]);
}

export async function fetchFeaturedWigs(limit = 6): Promise<Wig[]> {
  const { data, error } = await supabase
    .from("wigs")
    .select(SELECT)
    .eq("is_published", true)
    .is("deleted_at", null)
    .eq("is_featured", true)
    // The home shortlist is curated by Wigsmi: a retailer's own "featured"
    // tick orders their shop and widget, but only a ranked wig appears here.
    .not("featured_rank", "is", null)
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
    .eq("is_published", true)
    .is("deleted_at", null)
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

const AFFILIATE_HOSTS = [
  "awin1.com", "anrdoezrs.net", "dpbolvw.net", "jdoqocy.com", "kqzyfj.com",
  "tkqlhce.com", "impact.com", "sjv.io", "pxf.io",
];

/** True when the product URL goes through a known affiliate network. */
export function isAffiliateLink(productUrl: string | null | undefined): boolean {
  if (!productUrl) return false;
  let host: string;
  try {
    host = new URL(productUrl).hostname.toLowerCase();
  } catch {
    return false;
  }
  return AFFILIATE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

export function affiliateDisclosure(retailers: string[]): string | null {
  const names = Array.from(new Set(retailers.filter(Boolean)));
  if (names.length === 0) return null;
  const list = names.length === 1
    ? names[0]
    : `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
  return `Wigsmi earns a commission if you buy from ${list}.`;
}

export function catalogueDisclosure(wigs: Pick<Wig, "retailer" | "product_url">[] | null | undefined): string | null {
  return affiliateDisclosure((wigs ?? []).filter((w) => isAffiliateLink(w.product_url)).map((w) => w.retailer));
}
