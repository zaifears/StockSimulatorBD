---
name: StockSimulatorBD
description: A bright, tactile practice floor for the Dhaka Stock Exchange — real market instrument, zero real risk.
colors:
  practice-blue: "#2563EB"
  practice-blue-deep: "#1D4ED8"
  practice-blue-pressed: "#1E40AF"
  indigo-anchor: "#4338CA"
  gain-emerald: "#10B981"
  gain-teal: "#0AA892"
  gain-emerald-deep: "#059669"
  gain-emerald-light: "#34D399"
  loss-rose: "#F43F5E"
  loss-coral: "#E54D4C"
  loss-rose-deep: "#E11D48"
  loss-rose-light: "#FB7185"
  coin-amber: "#F59E0B"
  coin-amber-deep: "#D97706"
  canvas-light: "#EDEDED"
  card-light: "#FFFFFF"
  wash-buy-light: "#BDECE4"
  wash-sell-light: "#F8CACA"
  toggle-inactive-light: "#C4C4C4"
  pill-neutral-light: "#616161"
  donut-amber: "#F4A236"
  donut-olive: "#85B84B"
  paper-white: "#FFFFFF"
  paper-band: "#F9FAFB"
  paper-inset: "#F3F4F6"
  floor-ink: "#090E17"
  floor-band: "#111418"
  floor-card: "#1A1F26"
  floor-chrome: "#0B0E11"
  ink: "#111827"
  ink-muted: "#6B7280"
  ink-faint: "#9CA3AF"
  ink-inverse: "#F9FAFB"
  hairline: "#E5E7EB"
  hairline-dark: "#1F2937"
typography:
  display:
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "clamp(2.25rem, 6vw, 4.5rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "clamp(1.875rem, 4vw, 2.25rem)"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.05em"
  numeric:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
    fontFeature: "tnum 1"
rounded:
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  3xl: "24px"
  full: "9999px"
spacing:
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
  12: "48px"
  20: "80px"
components:
  button-primary:
    backgroundColor: "{colors.practice-blue}"
    textColor: "{colors.paper-white}"
    typography: "{typography.title}"
    rounded: "{rounded.xl}"
    padding: "16px 32px"
  button-primary-hover:
    backgroundColor: "{colors.practice-blue-deep}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.xl}"
    padding: "16px 32px"
  button-primary-active:
    backgroundColor: "{colors.practice-blue-pressed}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.xl}"
    padding: "16px 32px"
  button-buy:
    backgroundColor: "{colors.gain-teal}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-sell:
    backgroundColor: "{colors.loss-coral}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-toggle-inactive:
    backgroundColor: "{colors.toggle-inactive-light}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "{colors.paper-inset}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "8px 16px"
  input-field:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
    width: "100%"
  card-surface:
    backgroundColor: "{colors.paper-band}"
    textColor: "{colors.ink}"
    rounded: "{rounded.3xl}"
    padding: "32px"
  chip-category:
    backgroundColor: "{colors.paper-inset}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "4px 8px"
  balance-card:
    backgroundColor: "{colors.practice-blue-deep}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.xl}"
    padding: "24px"
---

# Design System: StockSimulatorBD

## Overview

**Creative North Star: "The Training Floor"**

StockSimulatorBD is a rehearsal room built next door to the Dhaka Stock Exchange. Every instrument on the floor is a faithful replica of the real one — the same tickers, the same T+1 wait, the same commission bite, the same 2:15 PM bell — and the replica-ness is stated openly rather than disguised. This is not a pretend brokerage trying to pass for the real thing. It is a place to practice, and the whole visual system exists to make practicing feel welcoming instead of forbidding.

The atmosphere is bright, encouraging, and approachable. The default surface is white, not black; sections alternate white and the faintest warm-grey band so a long page reads as a series of well-lit rooms rather than one dense terminal. Corners are generously soft (up to 24px). Icons sit in tinted rounded tiles. Nothing is cramped, nothing bristles. The audience arrives nervous — a student with no capital, or someone who has kept their savings in Sanchayapatra for a decade and finds the stock market intimidating — and the first job of the interface is to lower the pulse rate, not raise it. A deep navy dark mode exists and is fully supported, but it is the night shift of a bright building, not the system's home state.

Against that softness, the system is **lifted and tactile**. Surfaces answer back. Cards rise a pixel or two under the cursor, buttons compress under a thumb, the balance card carries a real gradient and a real shadow. On a mid-range Android phone held one-handed on a bus — the actual usage scene — physical responsiveness is what tells a nervous user that the thing under their finger worked. Motion is short, purposeful, and always honors `prefers-reduced-motion`.

Numbers are the exception to the softness. Every price, quantity, balance, and P&L figure is monospace and tabular-aligned, because money that shifts its own column while it updates does not look trustworthy. The market's own two colors, emerald and rose, are rationed hard so that a red number still means something.

**Key Characteristics:**

- Light-first, with a genuine deep-navy dark mode (`prefers-color-scheme`, no manual toggle)
- Generous radii (12–24px) and roomy padding; thumb-first target sizing
- Practice Blue as the single voice of "safe to touch"
- Emerald/rose reserved exclusively for market truth
- Monospace tabular numerals everywhere money appears
- Tactile response on every interactive surface: hover lift, active press
- Flat white/navy surfaces separated by hairline borders, elevated on state
- Mobile gets a persistent bottom tab bar; desktop gets a glass top bar

## Colors

A sober blue voice on bright paper, with the market's own green-and-red rationed to the moments that carry money.

### Primary

- **Practice Blue** (`#2563EB`): the single voice of "this is safe to touch." Every primary CTA, the active navigation tab, the account balance card, focus rings, link hovers, and the ticker-symbol hover state. On the Training Floor, blue marks the rehearsal itself — never a gain, never a loss, never money changing hands.
- **Practice Blue Deep** (`#1D4ED8`): hover state on primary buttons; the light end of the balance-card gradient.
- **Practice Blue Pressed** (`#1E40AF`): active/pressed state only.
- **Indigo Anchor** (`#4338CA`): the closing note of the two-color gradient — headline accents (`from-blue-600 to-indigo-600`) and the balance card (`from-blue-600 to-indigo-700`). Never appears alone; it exists to give blue somewhere to travel.

### Secondary

- **Gain Teal / Emerald** (`#0AA892`, brand `#10B981`, light `#34D399`): price up, positive P&L, BUY toggle/button, advance breadth bars. In light mode, `#0AA892` (Mint Teal) provides superior contrast (4.2:1 with white badge text) compared to yellow-green.
- **Loss Coral / Rose** (`#E54D4C`, brand `#F43F5E`, deep `#E11D48`): price down, negative P&L, SELL toggle/button, decline breadth bars. Warm strawberry coral eliminates visual fatigue while maintaining urgency.

### Tertiary

- **Coin Amber** (`#F59E0B`, deep `#D97706`): the virtual-currency and caution register. The coin balance pill in the navbar, the commission line in the trade sheet, T+1 lockout notices, and the "practice money has no real value" reminders. Amber is the color of *this is a simulation* — a warm caution, never an alarm.
- **Multi-Asset Allocation (Donut)**: `#F4A236` (Dominant holding ochre amber), `#85B84B` (Secondary holding olive leaf), `#E54D4C` (Coral), `#0AA892` (Teal). Dominant allocation uses warm amber so it never triggers false buy/sell associations.

### Neutral & Operating Surfaces

- **Canvas Ground (Light)** (`#EDEDED` – `#EFEFEF`): the resting page ground for dense operating surfaces (Trade, Portfolio, Watchlist, Market Overview). A soft cool neutral grey that prevents glare and physically frames white cards.
- **Card Surface (Light)** (`#FFFFFF`): crisp pure white for cards, list rows, metric containers, search inputs, and modal sheets. Floating on `#EDEDED`, it establishes immediate tactile separation without heavy borders.
- **Pastel Washes (Light)**:
  - **Buy Pressure Wash** (`#BDECE4`): soft pastel cyan-mint wash for turnover / buy pressure, paired with dark pine text (`#004D40`).
  - **Sell Pressure Wash** (`#F8CACA`): soft pastel strawberry wash for volume / sell pressure, paired with dark burgundy text (`#7F1D1D`).
- **Inactive / Disabled Inset (Light)** (`#C4C4C4`): unselected BUY/SELL toggle side, read-only calculation fields (`Drib Qty`, `Total`).
- **Neutral Unchanged Pill (Light)** (`#616161`): solid dark charcoal pill with white text for `0.00%` unchanged state.
- **Paper White** (`#FFFFFF`): marketing page ground and cards on tinted sections.
- **Paper Band** (`#F9FAFB`): alternating section bands on marketing pages.
- **Paper Inset** (`#F3F4F6`): recessed controls — search fields and secondary buttons.
- **Floor Ink** (`#090E17` / `#111823`): the dark-mode page ground. A deep slate midnight navy, never `#000000`.
- **Floor Band** (`#111418`): the dark-mode counterpart to Paper Band; alternating sections.
- **Floor Card** (`#1A1F26` / `#16202D`): the dark-mode card surface.
- **Floor Chrome** (`#0B0E11` / `#0D131D`): navigation chrome (bottom tab bar, sticky toolbars).
- **Ink** (`#111827`) / **Ink Muted** (`#6B7280`) / **Ink Faint** (`#9CA3AF`): heading text, body and secondary text, and metadata/placeholder text respectively. Dark mode inverts to `#F9FAFB` / `#D1D5DB` / `#6B7280`.
- **Hairline** (`#E5E7EB`, dark `#1F2937`): the 1px borders that do subtle separation work.

### Named Rules

**The Market Truth Rule.** Emerald/teal and rose/coral are spent exclusively on market truth: price direction, profit and loss, BUY/SELL, and market-open state. They never appear as decoration, illustration, generic success/error styling, or brand accent. A generic "saved successfully" toast is blue or neutral, not green. The scarcity is the entire point — when a user's portfolio goes red, that red has to land.

**The Blue-Is-Not-Money Rule.** Practice Blue marks affordance and identity, never value. If a number can go up or down, blue may not describe it.

**The Tactile Card-on-Canvas Rule (Light Mode).** On dense app surfaces (trade terminal, portfolio, watchlist, market dashboard), the page ground is `#EDEDED`, never `#FFFFFF`. Pure white cards float on `#EDEDED` to create effortless physical separation and eliminate daytime glare.

**The Three-Rung Ladder Rule (Dark Mode).** Dark mode content surfaces follow `#090E17` (page) → `#111418` (band) → `#1A1F26` (card), plus `#0B0E11` for navigation chrome. Pitch black (`#000000`) is strictly banned.

## Typography

**Display / Body Font:** Inter (via `next/font/google`, `display: swap`, subset `latin`), falling back to `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
**Numeric Font:** the platform monospace stack (`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`) with `tabular-nums`

**Character:** One neutral, highly legible workhorse doing everything except money. Inter carries the friendliness at heavy weights and stays readable at the 10–11px label sizes the dense trading tables demand. The monospace break is deliberate and load-bearing: the moment type stops being prose and starts being currency, it changes voice. `font-feature-settings: 'rlig' 1, 'calt' 1` is on globally; `font-synthesis: none` prevents faux-bolding on low-end Android.

### Hierarchy

- **Display** (800, `clamp(2.25rem, 6vw, 4.5rem)`, 1.08, `-0.025em`): page-opening hero headlines. One per page, maximum. Carries one phrase in solid Practice Blue to name its subject. Gradient text is retired for headings; emphasis comes from weight, size and the single blue phrase.
- **Headline** (800, `clamp(1.875rem, 4vw, 2.25rem)`, 1.2, `-0.025em`): section openers. Usually carries one blue-tinted phrase to name the section's subject.
- **Title** (700, 18px, 1.4): card headings, modal headers, stock symbols in tables.
- **Body** (400, 16px, 1.6): all prose. Capped at `max-w-2xl`/`max-w-3xl` for reading measure. Steps up to 18px on marketing pages at `sm` and above.
- **Label** (700, 10–11px, `0.05em`, uppercase): the system's connective tissue — table column heads, metric captions on the balance card, category badges, nav labels, section eyebrows. Their smallness is affordable only because they are uppercase, bold, and tracked out.
- **Numeric** (600, 12–14px in tables, 24–30px on the balance figure, `tabular-nums`): every price, quantity, balance, commission, and P&L value.

### Named Rules

**The Money Is Monospace Rule.** If it is a price, a quantity, a balance, a commission, or a P&L figure, it is monospace with `tabular-nums`. No exceptions — a proportional digit that reflows its own column on every tick reads as unreliable, which is the one thing a practice environment cannot afford to look like.

**The Loud Heading, Quiet Label Rule.** The type system has only two registers that raise their voice — Display and Headline, both at weight 800 with tightened tracking. Everything else is 10–18px and calm. There is no middle tier competing for attention.

## Layout

A centered single-column stack, capped at `max-w-6xl` (1152px) on marketing pages and `max-w-7xl` (1280px) on chrome (navbar, footer) and dense app surfaces. Horizontal padding steps `px-4 → sm:px-6 → lg:px-8` (16 → 24 → 32px). Marketing sections breathe at `py-20` (80px), rising to `py-32` on the most spacious pages; app surfaces tighten to `p-3`–`p-6`.

The spacing rhythm is Tailwind's 4px base, but the system in practice uses a narrow vocabulary: `1.5/2/3` (6/8/12px) inside controls and between icon and label, `4/5/6` (16/20/24px) for card padding and grid gutters, `8/12` (32/48px) between grouped blocks, `20` (80px) between sections. Sub-4px values appear only as micro-nudges (`-mt-0.5`) in stacked label/value pairs.

Card grids are `grid-cols-1 → sm:grid-cols-2 → lg:grid-cols-3` with `gap-6`. Two-column editorial splits use `lg:grid-cols-2 gap-12 items-center`.

**Breakpoints** are Tailwind defaults (`sm` 640, `md` 768, `lg` 1024, `xl` 1280), but the one that matters structurally is **`lg`**: below it the top navigation collapses and a fixed bottom tab bar takes over; at and above it the tab bar disappears and full horizontal nav returns. The dense market table (`StockRow`) and the mobile card (`StockCardMobile`) are two separate components serving the same data across that same line, not one responsive component.

Mobile app surfaces deliberately break the container: `-mx-4` with `rounded-none sm:rounded-xl` lets the balance card and market toolbar run edge-to-edge on a phone and become inset rounded cards from `sm` up. Safe-area insets are respected via `.pb-safe` / `.pt-safe` (`env(safe-area-inset-*)`), and the bottom tab bar is 68px tall plus safe area.

### Named Rules

**The Edge-to-Edge Rule.** On phones, primary app surfaces span the full viewport width (`-mx-4`, square corners) and only become inset rounded cards at `sm` and above. Screen width is scarce on the device most users actually hold; a 16px gutter around a data card is 8% of it wasted.

**The Thumb Zone Rule.** Primary destructive-adjacent and high-frequency actions (BUY, SELL, navigation) live in the lower third of a phone screen. The bottom tab bar is not a mobile convention borrowed for its own sake — it is where the thumb already is.

## Elevation & Depth

The system is **lifted and tactile**. Surfaces are physical objects: they rest, they rise when approached, and they compress when pressed. Depth is built from three cooperating layers — a hairline border that defines the edge, a tonal step that separates the plane, and a shadow that expresses state and hierarchy.

Resting cards carry a border plus `shadow-sm`. Approaching a card raises it (`hover:-translate-y-1` with `hover:shadow-md`) — an actual translation, not just a shadow swap, because on a touch device the press feedback (`active:scale-95`) is the only lift a user ever gets. Primary buttons rest at `shadow-lg` and rise to `shadow-xl`. Overlays and floating chrome sit highest.

Colored shadows are a signature: primary buttons cast blue (`shadow-blue-500/30`), the active BUY toggle casts emerald, the active SELL toggle casts rose. The shadow inherits the meaning of the thing casting it.

In dark mode shadows largely stop working, and the tonal ladder (`#090E17` → `#111418` → `#1A1F26`) plus hairline borders carries separation instead. The bottom tab bar drops its shadow entirely (`dark:shadow-none`) rather than smearing a black blur on near-black.

### Shadow Vocabulary

- **Rest** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`): every card and control at rest.
- **Raise** (`box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`): card hover, sticky toolbars, the balance card on mobile.
- **Action** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`): primary buttons at rest, the balance card at `sm`+.
- **Action Raised** (`box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`): primary button hover.
- **Tinted Action** (`box-shadow: 0 10px 15px -3px rgb(37 99 235 / 0.3)`): the signature colored cast under primary/BUY/SELL controls. Swap the RGB for emerald `16 185 129` or rose `244 63 94`.
- **Chrome Lift** (`box-shadow: 0 -4px 10px rgba(0,0,0,0.03)`): upward-casting shadow under the fixed bottom tab bar. Light mode only.

### Glass

Two frosted treatments exist and are reserved for chrome that overlaps content: `.navbar-backdrop` (`blur(24px) saturate(180%)`, `rgba(255,255,255,0.85)` / dark `rgba(17,24,39,0.85)`) and `.glass-effect` (`blur(16px) saturate(180%)`, 80% opacity). Both have `@supports not` fallbacks to 95% opaque solids — on the low-end Android hardware most users are on, backdrop-filter is a real cost and a real risk.

Marketing pages layer one more atmospheric device: large blurred color orbs (`blur-[100px]`–`blur-[120px]`) at 5–20% opacity behind a 24px grid of hairlines. Always `pointer-events-none` and `aria-hidden`, always in the hero or the closing CTA, never behind dense data.

### Named Rules

**The Lift Is Feedback Rule.** Every interactive surface changes elevation or scale on interaction — `hover:-translate-y-1` on cards, `hover:scale-105` / `active:scale-95` on buttons. A control that does not move when touched reads as broken on a phone, where there is no hover state to reassure.

**The Dark Mode Drops Shadow Rule.** Shadow is a light-mode tool. In dark mode, separate with the tonal ladder and hairline borders; do not stack black blurs on near-black surfaces.

**The Atmosphere Stays Behind Copy Rule.** Blurred orbs and grid overlays belong to marketing surfaces only. Nothing decorative renders behind a price, a table, or a form.

## Shapes

Roundness scales with the size and softness of the thing. Small utilitarian controls take `rounded-md`/`rounded-lg` (6–8px). Buttons, inputs, toolbars, and app cards take `rounded-xl`/`rounded-2xl` (12–16px). Marketing and content cards take `rounded-3xl` (24px), and the largest feature panels reach `rounded-[2rem]` (32px). Badges, pills, status chips, avatars, and icon dots are `rounded-full`.

Icon tiles are a recurring motif: a 48–56px `rounded-2xl` square, filled with a 10%-tint of a semantic color, bordered with a 1px tint of the same hue, holding a 24px Lucide icon. They are how the system decorates without ever adding illustration.

Borders are almost always exactly 1px and almost always a neutral hairline. Colored borders appear only where the fill is already a semantic tint (amber notice, emerald buy header, rose sell header). The one deliberate 2px border is the ghost/outline button variant, where the stroke *is* the button.

Dividers are borders, not rules: `border-t`/`border-b` on the container, never a separate `<hr>`.

### Named Rules

**The Radius Follows Register Rule.** Density gets tighter corners, storytelling gets softer ones. A 24px radius on a table row is as wrong as a 6px radius on a hero card.

**The Square-On-Phone Rule.** Full-bleed mobile surfaces lose their radius entirely (`rounded-none sm:rounded-xl`). A rounded corner touching a screen edge reads as a rendering mistake.

## Components

### Buttons

- **Shape:** softly rounded (`rounded-xl`, 12px) for primary and navigation actions; tighter (`rounded-lg`, 8px) inside dense trading UI.
- **Primary:** Practice Blue fill (`#2563EB`), white text, weight 700, `padding: 16px 32px` at full size, resting `shadow-lg` with a blue-tinted cast.
- **Hover / Focus:** darkens to `#1D4ED8`, rises `translateY(-4px)`, shadow deepens to `shadow-xl`, over `200–300ms`. Focus-visible draws a 2px Practice Blue outline at 2px offset.
- **Active:** `#1E40AF` with `scale(0.95)` — the press is felt, not just seen.
- **Ghost / Secondary:** neutral inset fill (`#F3F4F6` / dark `#1F2937`), ink text, same radius and motion. Used for the second of two choices, never for the only choice on screen.
- **Outline:** 2px Practice Blue border, blue text, transparent fill; inverts to solid blue with white text on hover. The blog and secondary CTAs use this.
- **Disabled:** `opacity: 0.5`, `cursor: not-allowed`, all motion suppressed. Market-closed BUY/SELL buttons additionally flatten to neutral grey — they lose their semantic color entirely, so a closed market never shows a live-looking green button.

### Buy / Sell Controls

The system's most semantically loaded control, and the only place emerald/teal and rose/coral are allowed to fill an interactive surface.

- **Segmented Toggle (Light Mode):**
  - **Active BUY:** Solid Mint Teal (`#0AA892` / `#09A892`) fill with bold white text.
  - **Active SELL:** Solid Coral Red (`#E54D4C`) fill with bold white text.
  - **Inactive Side:** Flat neutral grey (`#C4C4C4`) with dark charcoal text (`#111827`).
- **Primary Execution CTA:** A full-width bottom action button that strictly matches the active state: `#07AA8F` for BUY and `#E54D4C` for SELL, with bold white text.
- **Table actions:** ghost-tinted at rest (`bg-emerald-500/10`, emerald text) and flooding to full fill with white text on hover — the color is always present, the commitment only arrives on approach.
- **Market-closed state:** both actions collapse to neutral grey with `cursor-not-allowed`. Color returns only when the exchange is open.

### Cards / Containers

- **Corner Style:** `rounded-3xl` (24px) for content and marketing cards; `rounded-xl`/`2xl` (12–16px) for app-surface cards.
- **Background Architecture:**
  - **Light Mode:** Crisp pure white (`#FFFFFF`) cards resting on the `#EDEDED` canvas ground.
  - **Dark Mode:** Deep slate navy (`#16202D` / `#1A1F26`) cards resting on `#111823` canvas ground.
- **Border:** 1px hairline (`#E0E0E0` in light mode, `#243345` in dark mode).
- **Shadow Strategy:** rest at `shadow-sm`, hover to `shadow-md` with `translateY(-4px)`. See Elevation.
- **Internal Padding:** 24–32px (`p-6 sm:p-8`) on content cards, 12–20px on dense app cards.
- **The Change Pill Badge + Stacked Delta (Signature Pattern):**
  - **Pill Badge:** Solid filled rounded rectangle (`rounded-lg`, 6–8px radius, `px-2 py-1`):
    - Positive / Gain: `#15A292` fill + bold white text (e.g. `+0.42%`).
    - Unchanged / NC: `#616161` fill + bold white text (e.g. `0.00%`).
    - Negative / Loss: `#DC5051` fill + bold white text (e.g. `-0.38%`, `-7.26%`).
  - **Stacked Delta:** Immediately beneath the pill, the absolute change is printed in unbadged text (`+0.1`, `-3.2`, `0.0`) in the corresponding semantic color.
- **Donut Asset Allocation Card:**
  - Cutout diameter: ~68% of donut diameter.
  - Center hole displays active holding stats: Symbol (18px bold `#111827`), Total Qty, Total Cost, Invest Percent (11px muted `#6B7280`).
  - Allocation hues: Dominant holding in Ochre Amber (`#F4A236`), secondary in Olive Leaf (`#85B84B`), minor holdings in Coral (`#E54D4C`) and Teal (`#0AA892`).
- **Advance/Decline Histogram & Breadth Bar:**
  - Rounded capsule bars (`rounded-full`) in red, grey, and teal with count labels above (`189`, `88`, `43`...).
  - Horizontal composite bar showing immediate market ratio: `■ NEG: 336` (Red), `■ NC: 20` (Grey), `■ POS: 27` (Teal).
- **Gainer / Loser Portfolio Ratio Bar:**
  - Thin 4px horizontal track split into green gainer segment (`#0AA892`) and red loser segment (`#DC5051`).
  - Flanked by `1 Gainers` and `3 Loser` count text.

### Inputs / Fields

- **Style:** white (dark: `#111827`-family) fill, 1px hairline border, `rounded-lg` (8px), `padding: 12px 16px`, muted placeholder.
- **Focus:** 2px Practice Blue ring plus a blue border, with a slight `scale(1.02)` swell on standard text inputs — the field physically acknowledges the cursor. The trade-quantity input uses the ring without the scale (it sits inside a tight stepper row where growth would jostle its neighbors).
- **Search:** a taller variant (40–56px) with a leading 16px search icon at 12–16px inset and a `rounded-xl` radius; focus ring softens to `ring-blue-500/20`.
- **Steppers:** `−` and `+` buttons flanking a centered monospace value, each a `rounded-lg` inset tile that darkens on hover.
- **Disabled:** `opacity: 0.5`, `cursor: not-allowed`; dark mode additionally sinks the fill to `#111827`.

### Navigation

- **Desktop (`lg`+):** a 64px top bar, frosted (`blur(24px) saturate(180%)`, 85% opaque). Logo mark (28–32px) plus wordmark where "BD" is set in Practice Blue. Links are weight-500 muted ink shifting to Practice Blue on hover. The coin balance sits in an amber pill (`bg-amber-50`, 1px amber border, `rounded-xl`) — the only amber in the chrome, and the only element allowed to interrupt the blue voice.
- **Mobile (`< lg`):** a fixed bottom tab bar, 68px plus safe-area inset, frosted over `#0B0E11` in dark mode, with an upward `Chrome Lift` shadow in light mode. The active tab gets a `rounded-xl` blue-tinted pill behind its icon, a heavier stroke weight (`2.5px` vs `2px`), and full-opacity label; inactive labels sit at 80%.
- **Both:** `active:scale-95` on every tap target.

### Modals / Sheets

The trade modal is the system's signature interaction and behaves differently by device: a **bottom sheet** on phones (`items-end`, square top corners, a 48×6px grab handle, `pb-safe`) and a **centered dialog** from `sm` up (`items-center`, `p-4` inset). Backdrop is `rgba(0,0,0,0.6)` with a light `blur(4px)`; entry is a 200ms fade. The header takes a 10–20% tint of the active semantic color (emerald for buy, rose for sell) with a matching border, so the sheet announces its own intent before any text is read. Success and failure states replace the body with a centered 48px circular icon tile, a bold status line, and a single full-width dismiss button.

### Balance Card (signature)

The one surface in the product that is unapologetically a hero. A `from-blue-600 to-indigo-700` gradient panel, white text throughout, with a blurred white orb bleeding off the top-right corner at 10% opacity. The balance itself is 24–30px monospace at weight 700; supporting metrics sit in `bg-white/10` `rounded-lg` tiles behind a `border-white/20` divider, each labeled in 10px uppercase Practice-Blue-tinted white (`text-blue-200`). A market-status pill in the top-right carries the only emerald/rose in the card. On phones it runs edge-to-edge with square corners and collapses its metric grid behind a "show details" toggle; from `sm` up it becomes a rounded card with all metrics visible.

### Data Table Row (signature)

The dense market table is where the Training Floor stops being friendly and starts being an instrument. Rows are `px-5 py-3`, separated by hairlines, with a full-row hover tint. Symbol is bold ink shifting to Practice Blue on hover; company name sits beneath at 10px in faint ink, truncated at 180px. Every numeric column is monospace and right-aligned. Change and P&L columns stack a bold value over a 10px secondary figure at 80% opacity, tinted emerald or rose. Category badges (A/B/N/Z) are 10–12px bold uppercase chips on a 10% tint of green/yellow/blue/red respectively — the one sanctioned use of green and red outside market truth, because a DSE category *is* market truth.

### Charts

Candlesticks use the market-standard teal/coral pair (`#26A69A` up, `#EF5350` down) rather than the UI's emerald/rose. This is deliberate: chart convention is its own language and traders read it faster than a brand palette. Grid lines `#334155`, axis text `#94A3B8`.

## Do's and Don'ts

### Do:

- **Do** set every price, quantity, balance, commission, and P&L figure in monospace with `tabular-nums`.
- **Do** give every interactive surface a physical response — `hover:-translate-y-1` on cards, `hover:scale-105 active:scale-95` on buttons.
- **Do** run primary app surfaces edge-to-edge on phones (`-mx-4 rounded-none sm:rounded-xl`).
- **Do** strip semantic color from BUY/SELL when the market is closed; grey with `cursor-not-allowed` is the correct closed state.
- **Do** use the icon-tile motif (48–56px `rounded-2xl`, 10% color tint, 1px tint border, 24px Lucide icon) instead of illustration.
- **Do** reach for amber whenever the copy is about virtual currency, commission, T+1 waiting, or the fact that this is a simulation.
- **Do** stay inside the three-rung dark ladder: `#090E17` page, `#111418` band, `#1A1F26` card, plus `#0B0E11` for chrome.
- **Do** wrap decorative motion in `prefers-reduced-motion` guards and mark atmospheric layers `pointer-events-none aria-hidden`.
- **Do** ship a `@supports not (backdrop-filter: ...)` fallback with every frosted surface.

### Don't:

- **Don't** use emerald or rose for anything other than market truth — price direction, P&L, BUY/SELL, market-open state, and DSE category badges. A generic success message is blue or neutral. *(Known drift: `components/AuthForm.tsx` currently styles its success and error banners in green and red; that predates this rule and should migrate.)*
- **Don't** color a value with Practice Blue. Blue means affordance and identity; if a number can rise or fall, blue may not describe it.
- **Don't** invent a fourth dark surface value, and don't reach for the legacy `--bg-primary: #000000` dark-mode variable in `globals.css` — the shipped system uses `#090E17`, and that CSS variable is stale.
- **Don't** write `bg-blue-500`, `bg-purple-500`, `bg-emerald-500`, or `bg-orange-500` expecting Tailwind's value. `globals.css` overrides all four with `!important` to their 700-weight equivalents for contrast. Use `bg-blue-600` and its siblings explicitly.
- **Don't** put blurred orbs, grid overlays, or any decorative layer behind a table, a price, or a form.
- **Don't** stack shadows in dark mode; separate with the tonal ladder and hairlines instead.
- **Don't** exceed one Display-weight headline per page, and don't introduce a type tier between Title (18px) and Headline (30px+).
- **Don't** set a heading in gradient text. One phrase in solid Practice Blue carries the emphasis; the gradient reads as decoration standing in for a decision. *(Known drift: the creator credit on `app/about-us/page.tsx` still uses gradient text.)*
- **Don't** add a second brand accent. The palette is Practice Blue with indigo as its resolution, plus three rationed semantic colors. A fifth hue is a regression.
- **Don't** apply the focus `scale(1.02)` to inputs inside tight horizontal groups (steppers, toolbars) — it jostles their neighbors.
