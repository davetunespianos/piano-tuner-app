import Link from "next/link";

export default function FAQ() {
  const faqs = [
    {
      q: "How often should a piano be tuned?",
      a: "Dave's recommendation is to have your home piano tuned once per year, at a minimum. Having your home piano tuned every six months is better for the long term stability of the instrument. Obviously, you will decide what is best for your instrument and your ear. If you play your piano regularly, you will most likely notice when it starts going out of tune and wish to have it tuned more often.",
    },
    {
      q: "What is a pitch raise?",
      a: "A pitch raise simply means that the strings are tightened gradually in smaller increments. This is so that the soundboard and bridge do not crack under the strain of sudden higher tension being put on the strings. When tuned to pitch, the soundboard of a piano is subjected to around 1000 pounds of downforce.",
    },
    {
      q: "Why does my piano go out of tune so badly in the winter?",
      a: "The short answer: lack of humidity. During times of low humidity (0-20%) the wood in the instrument shrinks causing a change in string tension. Moderate humidity (35-50%) is generally best for pianos, and an environment with stable humidity is ideal.",
    },
    {
      q: "Is it possible to regulate the humidity inside my piano?",
      a: "Yes. The Piano Life Saver system creates a micro-environment around the piano's soundboard. The system maintains consistent humidity for your piano year-round and can help maintain pitch stability. Dave is a Certified Piano Life Saver Installer and would be happy to help you decide if this system is right for you and your piano.",
    },
  ];

  return (
    <main className="page-content">
      <h2>Piano Care and Maintenance FAQs</h2>
      {faqs.map((item, i) => (
        <div className="faq-item" key={i}>
          <h3>{item.q}</h3>
          <p>{item.a}</p>
        </div>
      ))}
      <p style={{ marginTop: "2rem" }}>
        <Link href="/piano-life-saver" style={{ color: "#1a1a1a", fontWeight: "600" }}>
          Learn more about the Piano Life Saver system
        </Link>
      </p>
    </main>
  );
}