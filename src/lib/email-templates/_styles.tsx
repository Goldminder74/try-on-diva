import React from "react";

// Shared Wigsmi email styling - Onyx Couture: an ivory card on a jet-black
// field, Bodoni-style capitals, bordeaux buttons. Inline styles (React Email
// requirement). Email clients cannot load the site's web fonts, so headings
// fall back through the closest installed Didone faces to Georgia.

const display = "'Bodoni Moda', 'Bodoni 72', Didot, 'Bodoni MT', Georgia, 'Times New Roman', serif";

export const brand = {
  bg: "#090706", // onyx
  surface: "#F7F2E8", // ivory paper
  ink: "#171310", // onyx soft
  inkSoft: "#2D2824",
  body: "#2D2824",
  muted: "#6E6457",
  gold: "#B77D56", // bronze
  bordeaux: "#5E1020",
  champagne: "#EADDC1",
  border: "#E3D9C6",
};

export const main = {
  backgroundColor: brand.bg,
  fontFamily:
    "Manrope, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  margin: 0,
  padding: 0,
};

export const outer = {
  backgroundColor: brand.bg,
  padding: "40px 16px",
};

export const container = {
  margin: "0 auto",
  maxWidth: "560px",
  backgroundColor: brand.surface,
  border: `1px solid ${brand.border}`,
  borderRadius: "2px",
  padding: "44px 40px",
};

export const wordmark = {
  fontFamily: display,
  fontSize: "22px",
  letterSpacing: "0.2em",
  textTransform: "uppercase" as const,
  color: brand.ink,
  margin: "0 0 32px",
  fontWeight: 400,
};

export const h1 = {
  fontFamily: display,
  fontSize: "28px",
  lineHeight: 1.2,
  color: brand.ink,
  margin: "0 0 16px",
  fontWeight: 500,
};

export const text = {
  fontSize: "15px",
  lineHeight: 1.6,
  color: brand.body,
  margin: "0 0 16px",
};

export const muted = {
  fontSize: "13px",
  lineHeight: 1.5,
  color: brand.muted,
  margin: "24px 0 0",
};

export const button = {
  display: "inline-block",
  backgroundColor: brand.bordeaux,
  color: brand.champagne,
  fontSize: "12px",
  fontWeight: 500,
  letterSpacing: "0.25em",
  textTransform: "uppercase" as const,
  padding: "14px 26px",
  borderRadius: "0px",
  textDecoration: "none",
  margin: "8px 0 8px",
};

export const buttonGold = {
  ...button,
  backgroundColor: brand.ink,
  color: brand.champagne,
};

export const divider = {
  borderTop: `1px solid ${brand.border}`,
  margin: "28px 0",
};

export function Wordmark() {
  return <p style={wordmark}>Wigsmi</p>;
}
