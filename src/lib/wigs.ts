// Demo wig data. Replaced by Supabase queries in Phase 2.

export type StyleType =
  | "Lace Front"
  | "HD Wig"
  | "Glueless"
  | "Closure"
  | "Bob"
  | "Long"
  | "Braided/Protective"
  | "360 Lace";

export type HairTexture =
  | "Kinky Coily"
  | "Kinky Straight"
  | "Deep Wave"
  | "Body Wave"
  | "Straight"
  | "Curly"
  | "Loose Wave";

export interface Wig {
  id: string;
  name: string;
  retailer: string;
  retailer_id: string;
  price: number;
  currency: string;
  style_type: StyleType;
  hair_texture: HairTexture;
  hair_length: string;
  hair_origin: string;
  colors: string[];
  description: string;
  images: string[];
  ar_asset_url: string | null;
  is_featured: boolean;
  in_stock: boolean;
  try_on_count: number;
  product_url: string;
  created_at: string;
}

const img = (seed: string, w = 800) =>
  `https://picsum.photos/seed/wigsmi-${seed}/${w}/${w}`;

export const WIGS: Wig[] = [
  {
    id: "w-001", name: "Amara Body Wave 22\"", retailer: "Crown & Coil",
    retailer_id: "r-1", price: 189, currency: "GBP",
    style_type: "Lace Front", hair_texture: "Body Wave", hair_length: "Long (18–26\")",
    hair_origin: "Virgin Hair", colors: ["Natural Black", "Mahogany"],
    description: "A flowing body wave with a delicate HD lace front. Pre-plucked hairline, glueless install option.",
    images: [img("amara"), img("amara2")], ar_asset_url: null,
    is_featured: true, in_stock: true, try_on_count: 1240,
    product_url: "#", created_at: "2025-04-12",
  },
  {
    id: "w-002", name: "Zola Kinky Coily Afro", retailer: "Crown & Coil",
    retailer_id: "r-1", price: 145, currency: "GBP",
    style_type: "Glueless", hair_texture: "Kinky Coily", hair_length: "Medium (12–18\")",
    hair_origin: "Human Hair", colors: ["Natural Black"],
    description: "A statement afro with the bounce and definition of natural 4C texture.",
    images: [img("zola"), img("zola2")], ar_asset_url: null,
    is_featured: true, in_stock: true, try_on_count: 894,
    product_url: "#", created_at: "2025-04-20",
  },
  {
    id: "w-003", name: "Imani Sleek Bob", retailer: "Lumi Hair Co.",
    retailer_id: "r-2", price: 99, currency: "GBP",
    style_type: "Bob", hair_texture: "Straight", hair_length: "Short (under 12\")",
    hair_origin: "Remy Human Hair", colors: ["Jet Black", "Honey"],
    description: "A sharp chin-length bob — the boardroom-to-cocktail classic.",
    images: [img("imani"), img("imani2")], ar_asset_url: null,
    is_featured: true, in_stock: true, try_on_count: 2103,
    product_url: "#", created_at: "2025-05-01",
  },
  {
    id: "w-004", name: "Nia Deep Wave 26\"", retailer: "Lumi Hair Co.",
    retailer_id: "r-2", price: 245, currency: "GBP",
    style_type: "HD Wig", hair_texture: "Deep Wave", hair_length: "Long (18–26\")",
    hair_origin: "Virgin Hair", colors: ["Natural Black", "Auburn"],
    description: "Voluminous deep wave with HD melt lace that disappears on every skin tone.",
    images: [img("nia"), img("nia2")], ar_asset_url: null,
    is_featured: true, in_stock: true, try_on_count: 3221,
    product_url: "#", created_at: "2025-05-08",
  },
  {
    id: "w-005", name: "Adaeze Knotless Braids", retailer: "Crown & Coil",
    retailer_id: "r-1", price: 165, currency: "GBP",
    style_type: "Braided/Protective", hair_texture: "Kinky Straight", hair_length: "Long (18–26\")",
    hair_origin: "Synthetic", colors: ["Natural Black", "Burgundy"],
    description: "Hand-tied knotless braid wig — protective styling without the salon hours.",
    images: [img("adaeze"), img("adaeze2")], ar_asset_url: null,
    is_featured: true, in_stock: true, try_on_count: 1782,
    product_url: "#", created_at: "2025-05-12",
  },
  {
    id: "w-006", name: "Yara Loose Wave 20\"", retailer: "Lumi Hair Co.",
    retailer_id: "r-2", price: 175, currency: "GBP",
    style_type: "Lace Front", hair_texture: "Loose Wave", hair_length: "Long (18–26\")",
    hair_origin: "Human Hair", colors: ["Natural Black"],
    description: "Effortless loose wave with movement that catches the light.",
    images: [img("yara"), img("yara2")], ar_asset_url: null,
    is_featured: false, in_stock: true, try_on_count: 612,
    product_url: "#", created_at: "2025-05-15",
  },
  {
    id: "w-007", name: "Folake 360 Lace", retailer: "Crown & Coil",
    retailer_id: "r-1", price: 289, currency: "GBP",
    style_type: "360 Lace", hair_texture: "Body Wave", hair_length: "Long (18–26\")",
    hair_origin: "Virgin Hair", colors: ["Natural Black", "Honey Blonde"],
    description: "Full 360 lace for high ponytails and updos — versatility without limits.",
    images: [img("folake"), img("folake2")], ar_asset_url: null,
    is_featured: false, in_stock: true, try_on_count: 478,
    product_url: "#", created_at: "2025-05-20",
  },
  {
    id: "w-008", name: "Sade Curly Closure", retailer: "Lumi Hair Co.",
    retailer_id: "r-2", price: 129, currency: "GBP",
    style_type: "Closure", hair_texture: "Curly", hair_length: "Medium (12–18\")",
    hair_origin: "Remy Human Hair", colors: ["Natural Black", "Caramel"],
    description: "Defined springy curls in a 5x5 closure unit — soft, breathable, beginner-friendly.",
    images: [img("sade"), img("sade2")], ar_asset_url: null,
    is_featured: false, in_stock: true, try_on_count: 856,
    product_url: "#", created_at: "2025-05-22",
  },
];

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

export function getWigById(id: string) {
  return WIGS.find((w) => w.id === id);
}

export const FEATURED_WIGS = WIGS.filter((w) => w.is_featured);
