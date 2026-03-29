import Link from "next/link";

export default function Book() {
  return (
    <main className="page-content">
      <h2>Request an Appointment</h2>
      <p>
        Online scheduling is coming soon. In the meantime, please contact Dave
        directly to schedule your appointment.
      </p>
      <p>
        <strong>Phone:</strong>{" "}
        <a href="tel:7348128096" style={{ color: "#1a1a1a" }}>734-812-8096</a>
      </p>
      <p>
        <strong>Email:</strong>{" "}
        <a href="mailto:davetunespianos@gmail.com" style={{ color: "#1a1a1a" }}>
          davetunespianos@gmail.com
        </a>
      </p>
      <p>
        <Link href="/contact" style={{ color: "#1a1a1a" }}>→ Contact page</Link>
      </p>
    </main>
  );
}