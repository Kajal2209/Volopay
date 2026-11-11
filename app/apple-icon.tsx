import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon for iOS (Safari doesn't use SVG favicons there).
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#2340a8" }}>
        <svg width="150" height="150" viewBox="0 0 32 32">
          <rect x="7.5" y="5.5" width="14" height="19" rx="1.6" fill="#ffffff" />
          <path d="M10.5 10.5h8M10.5 14h8M10.5 17.5h5" stroke="#2340a8" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="22" cy="22" r="6.2" fill="#ffffff" />
          <circle cx="22" cy="22" r="4.8" fill="#2340a8" />
          <path d="M19.8 22.1l1.5 1.5 2.9-3" stroke="#ffffff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    size,
  );
}
