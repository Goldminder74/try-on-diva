import React from "react";

// Shared Wigsmi email styling - mahogany + cream palette, serif headings,
// matches the in-app brand. Inline styles (React Email requirement).

export const brand = {
  bg: "#FAF5EE", // cream
  surface: "#ffffff",
  ink: "#3D1C02", // mahogany
  inkSoft: "#5A2E08",
  body: "#3A2A1F",
  muted: "#7A6A5E",
  gold: "#C8A95B",
  border: "#E9DFD2",
};

export const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  margin: 0,
  padding: 0,
};

export const outer = {
  backgroundColor: brand.bg,
  padding: "32px 16px",
};

export const container = {
  margin: "0 auto",
  maxWidth: "560px",
  backgroundColor: brand.surface,
  border: `1px solid ${brand.border}`,
  borderRadius: "12px",
  padding: "40px 36px",
};

export const wordmark = {
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontSize: "20px",
  letterSpacing: "0.02em",
  color: brand.ink,
  margin: "0 0 32px",
  fontWeight: 500,
};

export const h1 = {
  fontFamily: "Georgia, 'Times New Roman', serif",
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
  backgroundColor: brand.ink,
  color: brand.bg,
  fontSize: "14px",
  fontWeight: 500,
  padding: "12px 22px",
  borderRadius: "8px",
  textDecoration: "none",
  margin: "8px 0 8px",
};

export const buttonGold = {
  ...button,
  backgroundColor: brand.gold,
  color: brand.ink,
};

export const divider = {
  borderTop: `1px solid ${brand.border}`,
  margin: "28px 0",
};

export function Wordmark() {
  return <p style={wordmark}>Wigsmi</p>;
}
