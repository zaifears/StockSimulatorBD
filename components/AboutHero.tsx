// components/AboutHero.tsx
// The /about-us headline block. Styles: ./AboutHero.css for the headline and
// app/about-us/about.css for the rest, on the homepage system in app/home.css.
import './AboutHero.css';

const AboutHero = () => {
  return (
    <div className="ab-intro">
      <h1 id="about-title" className="ab-intro__head">About StockSimulatorBD</h1>
      <p className="hm-lead">
        We built this platform to provide a realistic, risk-free environment to master the stock
        market.
      </p>
    </div>
  );
};

export default AboutHero;
