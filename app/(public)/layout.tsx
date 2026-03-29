"use client";

import { Maven_Pro } from "next/font/google";
import "../globals.css";
import Link from "next/link";
import { useState } from "react";

const maven = Maven_Pro({
  subsets: ["latin"],
  display: "swap",
});

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{ fontFamily: maven.style.fontFamily }}>
      <nav>
        <Link href="/" className="nav-logo" onClick={() => setMenuOpen(false)}>
          David Cossey - Piano Tuner
        </Link>
        <ul className="nav-links">
          <li><Link href="/services">Services and Rates</Link></li>
          <li><Link href="/book">Request an Appointment</Link></li>
          <li><Link href="/contact">Contact Dave</Link></li>
          <li><Link href="/about">About</Link></li>
          <li><Link href="/faq">FAQs</Link></li>
        </ul>
        <button
          className="hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span className={menuOpen ? "bar open" : "bar"}></span>
          <span className={menuOpen ? "bar open" : "bar"}></span>
          <span className={menuOpen ? "bar open" : "bar"}></span>
        </button>
      </nav>
      <div className={menuOpen ? "mobile-menu active" : "mobile-menu"}>
        <ul>
          <li><Link href="/services" onClick={() => setMenuOpen(false)}>Services and Rates</Link></li>
          <li><Link href="/book" onClick={() => setMenuOpen(false)}>Request an Appointment</Link></li>
          <li><Link href="/contact" onClick={() => setMenuOpen(false)}>Contact Dave</Link></li>
          <li><Link href="/about" onClick={() => setMenuOpen(false)}>About</Link></li>
          <li><Link href="/faq" onClick={() => setMenuOpen(false)}>FAQs</Link></li>
        </ul>
      </div>
      {children}
      <footer>
        <img
          src="/piano-life-saver.png"
          alt="Certified Piano Life Saver Installer"
          style={{ width: "150px", height: "150px", marginBottom: "1rem" }}
        />
        <ul className="footer-links">
          <li><Link href="/services">Services and Rates</Link></li>
          <li><Link href="/book">Request an Appointment</Link></li>
          <li><Link href="/contact">Contact Dave</Link></li>
          <li><Link href="/about">About</Link></li>
          <li><Link href="/faq">FAQs</Link></li>
        </ul>
        <p>Copyright {new Date().getFullYear()} David Cossey - Piano Tuner - Ypsilanti, MI</p>
      </footer>
    </div>
  );
}