import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main>
      <section className="hero">
        <Image
          src="/piano_keyboard.jpg"
          alt="Piano keys"
          fill
          priority
          style={{ objectFit: "cover", objectPosition: "center" }}
        />
        <div className="hero-overlay" />
        <div className="hero-content">
          <h1>Piano Tuning in Southeast Michigan</h1>
          <p className="hero-sub">Serving&nbsp; Lenawee&nbsp; Monroe&nbsp; Washtenaw&nbsp; and&nbsp; Wayne&nbsp; Counties</p>
          <div className="hero-divider">
            <div className="hero-contact">
              <a href="mailto:davetunespianos@gmail.com">davetunespianos@gmail.com</a>
              <a href="tel:7348128096">734-812-8096</a>
            </div>
          </div>
          <Link href="/book" className="hero-btn">Request an Appointment</Link>
        </div>
      </section>
    </main>
  );
}