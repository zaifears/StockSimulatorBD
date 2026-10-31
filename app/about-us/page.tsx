import Image from 'next/image';
import AboutHero from '@/components/AboutHero';
import Footer from '@/components/shared/Footer';
import '../home.css';
import './about.css';

const RULES = [
  {
    title: 'Real Market Data',
    body: 'Experience the DSE with authentic price movements, category tracking, and market trends to ensure your virtual trades reflect reality.',
  },
  {
    title: 'Risk-Free Learning',
    body: 'Start with a virtual portfolio balance. Make mistakes, learn from them, and build your trading confidence before investing real capital.',
  },
  {
    title: 'Realistic Rules',
    body: 'We simulate actual DSE trading conditions, including standard broker commissions and accurate portfolio settlement mechanics.',
  },
];

export default function AboutUsPage() {
  return (
    <div className="hm ab">
      {/* HERO: the headline beside the person who builds it */}
      <section className="hm ab-hero" aria-labelledby="about-title">
        <div className="hm-wrap ab-hero__grid">
          <AboutHero />

          <aside className="ab-maker" aria-label="Who builds StockSimulatorBD">
            <p className="ab-maker__label">Built &amp; maintained by</p>
            <a href="https://shahoriar.bd" target="_blank" rel="noopener noreferrer" className="ab-maker__name">
              Md Al Shahoriar Hossain
            </a>
            <ul className="ab-maker__links" role="list">
              <li>
                <a href="https://shahoriar.bd" target="_blank" rel="noopener noreferrer">
                  shahoriar.bd
                </a>
              </li>
              <li>
                <a href="https://linkedin.com/in/shahoriarhossain" target="_blank" rel="noopener noreferrer">
                  LinkedIn
                </a>
              </li>
              <li>
                <a href="https://github.com/zaifears" target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>
              </li>
            </ul>
          </aside>
        </div>
      </section>

      {/* WHY: the reason, then the three things it holds to */}
      <section className="hm hm-sec hm-sec--band" aria-labelledby="why-title">
        <div className="hm-wrap">
          <div className="hm-head">
            <h2 id="why-title">Why We Built StockSimulatorBD</h2>
            <p className="hm-lead">
              We built a paper trading platform for the Dhaka Stock Exchange. Whether you&apos;re a
              student just discovering the market, a new investor moving beyond Sanchayapatra or
              fixed deposits and feeling unsure about stocks, or an experienced trader testing new
              strategies, our simulator provides a 100% risk-free environment to hone your investing
              skills.
            </p>
          </div>

          <ul className="ab-ledger" role="list">
            {RULES.map((rule) => (
              <li key={rule.title}>
                <h3>{rule.title}</h3>
                <p>{rule.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* SOLIDARITY */}
      <section className="hm hm-sec hm-sec--rule ab-solidarity" aria-label="Solidarity statement">
        <div className="hm-wrap">
          <figure>
            <Image
              src="/free_palestine.png"
              alt="Free Palestine"
              width={1200}
              height={627}
              sizes="(max-width: 640px) 92vw, 640px"
            />
          </figure>
        </div>
      </section>

      {/* CONTACT */}
      <section className="hm hm-sec hm-sec--band ab-contact" aria-labelledby="contact-title">
        <div className="hm-wrap ab-contact__grid">
          <h2 id="contact-title">Get in Touch</h2>
          <div className="ab-contact__act">
            <p className="hm-lead">Have questions, ideas, or feedback? We&apos;d love to hear from you!</p>
            <div className="hm-actions">
              <a href="mailto:hello@shahoriar.bd" className="hm-btn">
                Email Us
              </a>
              <a
                href="https://shahoriar.bd/contact"
                target="_blank"
                rel="noopener noreferrer"
                className="hm-btn hm-btn--outline"
              >
                Contact Page
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="hm-foot">
        <Footer />
      </div>
    </div>
  );
}
