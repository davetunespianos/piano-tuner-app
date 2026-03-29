export default function PianoLifeSaver() {
  return (
    <main className="page-content">
      <h2>Piano Life Saver System</h2>
      <p>
        The Piano Life Saver system creates a micro-environment around your
        piano's soundboard, maintaining consistent humidity year-round to help
        protect your investment and maintain pitch stability.
      </p>
      <p>
        Dave is a Certified Piano Life Saver Installer. Download or view the
        brochure below to learn more, or contact Dave at 734-812-8096 for
        installation pricing.
      </p>
      <iframe
        src="/piano-life-saver-brochure-for-web.pdf"
        width="100%"
        height="700px"
        style={{ border: "1px solid #ddd", marginTop: "1rem" }}
      />
        <p style={{ marginTop: "1rem" }}>
            <a href="/piano-life-saver-brochure-for-web.pdf" download style={{ color: "#1a1a1a", fontWeight: "600" }}>
                Download the brochure (PDF)
            </a>
        </p>
    </main>
  );
}