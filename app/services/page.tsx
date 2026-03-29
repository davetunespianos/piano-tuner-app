import Link from "next/link";

export default function Services() {
  return (
    <main className="page-content">
      <h2>Services & Rates</h2>
      <ul className="service-list">
        <li>
          <span>Standard Tuning</span>
          <span className="service-price">$100</span>
        </li>
        <li>
          <span>Pitch Raise with Tuning</span>
          <span className="service-price">$125</span>
        </li>
        <li>
          <span>Action Repair or Regulation</span>
          <span className="service-price">$50/hour + parts</span>
        </li>
        <li>
          <span>Piano Life Saver Maintenance</span>
          <span className="service-price">$30</span>
        </li>
        <li>
          <span>
            Piano Life Saver Installation{" "}
            <Link href="/piano-life-saver" style={{ fontSize: "0.85rem", color: "#666" }}>
              — learn more
            </Link>
          </span>
          <span className="service-price">Contact for quote</span>
        </li>
      </ul>
      <p style={{ fontFamily: "Arial, sans-serif", fontSize: "0.9rem", color: "#666" }}>
        Piano Life Saver Maintenance includes humidifier and sensor cleaning,
        new tank liner, fresh humidifier pads, and water refill with pad
        treatment.
      </p>
      <p style={{ fontFamily: "Arial, sans-serif", fontSize: "0.9rem", color: "#666" }}>
        Dave is a Certified Piano Life Saver Installer.{" "}
        <Link href="/contact" style={{ color: "#1a1a1a" }}>Contact Dave</Link> for
        installation pricing.
      </p>
    </main>
  );
}