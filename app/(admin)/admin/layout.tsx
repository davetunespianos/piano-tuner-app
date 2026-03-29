"use client";

import { Maven_Pro } from "next/font/google";
import "../../globals.css";

const maven = Maven_Pro({
  subsets: ["latin"],
  display: "swap",
});

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: maven.style.fontFamily }}>
      {children}
    </div>
  );
}