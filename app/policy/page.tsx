import React from "react";

export const metadata = {
  title: "Privacy Policy | StockSimulatorBD",
  description: "StockSimulatorBD Privacy Policy: Learn how we store, use, and protect your personal information when using our platform.",
};

export default function PolicyPage() {
  return (
    <main className="max-w-2xl mx-auto pt-40 pb-10 px-4">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

      <p className="mb-4">
        <strong>Last updated:</strong> August 15, 2026
      </p>

      <p className="mb-4">
        StockSimulatorBD (previously known as SkillDash) is committed to protecting your privacy. This policy outlines how we collect, use, store, and protect your personal information while using our platform, and sets out the terms and disclaimers that apply to your use of the simulator.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">Information We Collect</h2>
      <ul className="list-disc list-inside mb-4">
        <li>Account information (such as name, email, profile details)</li>
        <li>Usage data (pages, actions, interactions)</li>
        <li>Content and submissions you make (comments, simulation activity, community participation)</li>
        <li>Technical data (device, browser, IP address, session details)</li>
        <li>Approximate location (see &quot;Analytics &amp; Approximate Location&quot; below)</li>
        <li>Payment reference data for coin recharges (bKash transaction ID and amount — we do not collect or store your bKash PIN, password, or full account number)</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-2">Analytics &amp; Approximate Location</h2>
      <p className="mb-2">
        To understand how StockSimulatorBD is used and improve it, we track site-wide analytics for every visitor, whether or not you&apos;re logged in:
      </p>
      <ul className="list-disc list-inside mb-4">
        <li>Session data — pages visited, time spent, device type (mobile/tablet/desktop), and the site or search engine you arrived from</li>
        <li>For logged-in accounts, a lightweight per-account visit count and last-visit timestamp, used for account activity and re-engagement purposes</li>
        <li>
          Approximate location at the city/district level (e.g. Dhaka, Chattogram, Khulna), derived automatically from your IP address by our hosting provider&apos;s network. This is a coarse estimate, not precise GPS or a street address, and is used only in aggregate — to see which parts of Bangladesh visitors come from — not to track any individual&apos;s movements.
        </li>
      </ul>
      <p className="mb-4">
        Raw session records are kept for a limited period (around 90 days) for troubleshooting and abuse prevention, after which only aggregated, non-identifying counts are retained.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">How We Use Your Information</h2>
      <ul className="list-disc list-inside mb-4">
        <li>To provide and improve StockSimulatorBD services</li>
        <li>To personalize your experience (recommendations, dashboard, notifications)</li>
        <li>To communicate updates, offers, or critical information regarding our platform</li>
        <li>For analytics and troubleshooting</li>
        <li>To detect and prevent abuse (for example, tampering with a virtual balance)</li>
        <li>To comply with legal obligations</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-2">Data Protection & Security</h2>
      <ul className="list-disc list-inside mb-4">
        <li>All data is securely stored and transmitted using industry standards.</li>
        <li>We do not sell or share your personal data with third parties except as required by law or with partnership disclosure.</li>
        <li>Access to personal data is restricted to authorized staff only.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-2">Your Choices & Rights</h2>
      <ul className="list-disc list-inside mb-4">
        <li>You can update, correct, or delete your profile at any time.</li>
        <li>Contact us to request data deletion or for additional privacy queries.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-2">Trading Simulator Disclaimer</h2>
      <p className="mb-2">
        StockSimulatorBD is an educational paper-trading tool, not a brokerage, investment platform, or financial advisory service:
      </p>
      <ul className="list-disc list-inside mb-4">
        <li>Nothing on this platform — including prices, charts, AI-generated analysis, or any other content — is financial, investment, tax, or legal advice. It should not be relied on to make real investment decisions.</li>
        <li>Market data is sourced from public DSE information and may be delayed, incomplete, or occasionally inaccurate. We simulate real conditions (T+1 settlement, commission, market hours) as closely as we can, but simulated performance will not exactly match real trading outcomes.</li>
        <li>We are not registered with, endorsed by, or affiliated with the Dhaka Stock Exchange, the Bangladesh Securities and Exchange Commission, or any licensed broker.</li>
        <li>Past or simulated performance on this platform is not a guarantee or prediction of how any real investment will perform. Before investing real money, please consult a licensed financial advisor or your BO account broker.</li>
        <li>If you&apos;re new to investing — including if you&apos;re moving from safer instruments like Sanchayapatra, fixed deposits, or other government securities into the stock market — please treat this simulator as a practice space to build understanding, not as a signal of what to buy or sell with real capital.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-2">Payments &amp; Virtual Currency</h2>
      <ul className="list-disc list-inside mb-4">
        <li>Coins purchased via bKash recharge are virtual trading credits usable only inside the StockSimulatorBD simulator.</li>
        <li>Coins have no real-world monetary value, cannot be withdrawn, redeemed for cash, transferred to another account, or exchanged for any good or service outside the simulator.</li>
        <li>Recharges are manually reviewed before coins are credited. If a genuine issue occurs with your recharge (for example, a payment taken but coins not credited), contact us and we&apos;ll make it right, including a refund where appropriate.</li>
        <li>We reserve the right to reverse, freeze, or reset a virtual balance we reasonably believe was obtained through tampering, exploitation, or a forged transaction, without separate notice.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-2">Terms of Use</h2>
      <ul className="list-disc list-inside mb-4">
        <li>You&apos;re responsible for the activity on your account and for keeping your login credentials secure.</li>
        <li>Don&apos;t attempt to manipulate prices, balances, or platform data outside the normal use of the simulator; accounts found doing so may be suspended or have their balance reset.</li>
        <li>The platform is provided &quot;as is&quot;, without warranty of uninterrupted availability or error-free operation, to the fullest extent permitted by law.</li>
        <li>These terms are governed by the laws of Bangladesh.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-2">Contact</h2>
      <p className="mb-2">
        For any questions or concerns about our privacy policy, please email us at{" "}
        <a href="mailto:hello@shahoriar.bd" className="underline text-indigo-600">
          hello@shahoriar.bd
        </a>.
      </p>
      <p>
        Your continued use of StockSimulatorBD means you agree to this policy, the terms and disclaimers above, and any updates posted on this page.
      </p>
    </main>
  );
}