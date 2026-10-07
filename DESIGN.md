# DESIGN.md - Buffett's Edge

## Design direction

Buffett's Edge is a financial data dashboard for Berkshire Hathaway operating segments.
The audience is sophisticated investors and analysts who want dense, accurate data.
The feeling: a Bloomberg terminal meets an investor presentation - serious, bold, data-forward.

### Subject grounding

1. **What is it?** SEC XBRL visualization of Berkshire operating businesses
2. **For whom?** Investors, analysts who dig past the stock portfolio
3. **World made of:** SEC filings, railroads (BNSF), power plants (BHE), insurance
   underwriting, manufacturing - industrial America, capital allocation
4. **World's artifacts:** Bloomberg terminals, deal sheets, annual reports, Buffett's letters
5. **Signature element:** The capital allocation map - generators vs absorbers

### Design dials (taste-skill)

- **VARIANCE: 8** - Asymmetric layouts, varied section rhythm
- **MOTION: 7** - Staggered reveals, confident hover states
- **DENSITY: 6** - Dense data but breathable, not overwhelming

---

## Colors

### Primary palette

```yaml
colors:
  ink: "#0c0f0a"           # Deep dark green-black ground
  surface: "#141916"       # Card/panel backgrounds
  elevated: "#1c211a"      # Hover states, tooltips
  rule: "#2a3128"          # Borders, dividers
  muted: "#6b7a68"         # Tertiary text
  secondary: "#9ca898"     # Secondary text
  bright: "#e8ede6"        # Primary text
```

### The signal color: Money Green

```yaml
signal:
  base: "#10b981"          # Emerald 500 - THE ownable color
  dim: "#059669"           # For subtle accents
  bright: "#34d399"        # For emphasis moments
```

**Why emerald green?** This is a finance product about capital allocation.
Green = money, profit, positive flow. Used BOLDLY on:
- Hero headline "three quarters"
- Big KPI numerals
- Positive values in tables/charts
- Active/hover states

### Status colors

```yaml
status:
  positive: "#10b981"      # Same as signal - consistency
  negative: "#ef4444"      # Red for losses/absorbers
```

### Segment colors (functional)

Industrial palette appropriate to railroads, utilities, manufacturing:

| Segment | Hex | Reasoning |
|---------|-----|-----------|
| BNSF | `#ea580c` | Railroad orange |
| BHE | `#16a34a` | Utility/energy green |
| Insurance | `#3b82f6` | Trust, stability blue |
| Manufacturing | `#a855f7` | Distinct purple |
| Service/Retail | `#eab308` | Commerce gold |
| McLane | `#78716c` | Neutral distribution |
| Pilot | `#f43f5e` | Fuel station red |

---

## Typography

### The type system

```yaml
typography:
  display:
    fontFamily: "Instrument Serif"
    # Characterful editorial serif for poster headlines
    # NOT Fraunces (overused AI tell)
    
  body:
    fontFamily: "Geist"
    # Clean modern grotesque, excellent for UI
    
  mono:
    fontFamily: "JetBrains Mono"
    # Tabular figures for all data
```

### Type scale

| Use | Size | Weight | Class |
|-----|------|--------|-------|
| Hero headline | clamp(2.5rem, 8vw, 5.5rem) | 400 | `.display` |
| Section titles | 1.25-1.5rem | 500 | Default |
| Body | 15px | 400 | Default |
| Data labels | 13px mono | 400 | `.nums` |
| KPI numbers | 1.875-2.25rem mono | 500 | `.big-num` |
| Small/meta | 12-13px | 400 | Default |

### The poster headline

Hero text uses Instrument Serif at poster scale with tight leading (0.95).
One key phrase ("three quarters") is set in the signal color for impact.

---

## Layout

### Asymmetric grid

- **Max width:** 80rem (1280px) for content area
- **Hero:** Two-column asymmetric - text left (dominant), capital map right
- **Sections:** Varied rhythm, not uniform spacing
- **Charts:** Some full-width, some in 2/3 + 1/3 or 1.2fr + 1fr grids

### Spacing rhythm (varied, not uniform)

- Hero to content: 48px
- Between major sections: 64px (space-y-16)
- Inside panels: 20px
- Grid gaps: 32px (gap-8)

### The signature element

The **Capital Map** (generators vs absorbers bar chart) is the signature visual:
1. Appears in compact form in the hero as the "product shot"
2. Appears expanded in main content with explanation
3. Shows the core insight: where capital flows in/out

---

## Motion

### Scroll reveals

Staggered entrance animations using CSS keyframes:
- Elements fade up with `translateY(20px) -> 0`
- 0.6s duration, cubic-bezier(0.16, 1, 0.3, 1) easing
- Staggered delays: 0.1s, 0.2s, 0.3s, 0.4s

### Hover states with character

- **Cards:** `hover-lift` - translateY(-2px) with subtle green glow shadow
- **Table rows:** Background transition to elevated color
- **Chart tooltips:** Appear with subtle cursor highlight

### Reduced motion

All motion respects `prefers-reduced-motion: reduce`:
```css
@media (prefers-reduced-motion: reduce) {
  .reveal { animation: none; opacity: 1; transform: none; }
  .hover-lift { transition: none; }
  .hover-lift:hover { transform: none; }
}
```

---

## Components

### KPI stats

Big monospace numerals with the signal color for emphasis:
- Label in muted text, small size
- Value in `big-num` class, 2.25rem+
- Accent values in signal green

### Data table

- Dark surface background with subtle border
- Sortable columns with signal-colored active state
- Staggered row reveal animation
- High-margin values highlighted in signal green
- Negative YoY values in loss red

### Charts

- Surface background panels with subtle border
- Emerald cursor highlight on hover
- Dark tooltip with elevated background
- Segment colors at 85% opacity for fills

### Panels

Simple containers - border + surface background + padding.
No heavy shadows, no glassmorphism.

---

## Refused defaults (AI tells avoided)

### First-order tells

- ❌ Purple/indigo gradients (C1)
- ❌ Inter as sole typeface (T1)
- ❌ Centered hero template (L1)
- ❌ Three identical feature cards (L2)
- ❌ Generic scale-105 hovers (M4)
- ❌ Uniform spacing/rhythm (S1)

### Second-order tells

- ❌ Cream + terracotta "Claude look" (SD1)
- ❌ Near-black + acid green (SD2) - we use emerald, not neon
- ❌ All-caps tracking-wide eyebrows (SD4)
- ❌ Middle dots in labels (SD4d)
- ❌ Decorative 01/02/03 numbers (SD6)
- ❌ Gradient text (C6)
- ❌ Glassmorphism (K3)
- ❌ Muted text below AA contrast (C9)

### Design choices made

- ✅ **Ownable color:** Emerald green as bold signal, used on hero text and KPIs
- ✅ **Poster type:** Instrument Serif at clamp(2.5rem, 8vw, 5.5rem) with 0.95 leading
- ✅ **Signature element:** Capital map as hero visual and identity
- ✅ **Asymmetric layout:** 2/3+1/3 grids, varied section rhythm
- ✅ **Motion with intent:** Staggered reveals, meaningful hover states
- ✅ **Dense but breathable:** DENSITY 6 for data product

---

## Accessibility

### Contrast ratios (WCAG AA)

| Element | Foreground | Background | Ratio |
|---------|-----------|------------|-------|
| Body text | #e8ede6 | #0c0f0a | 14.3:1 ✓ |
| Secondary | #9ca898 | #0c0f0a | 6.8:1 ✓ |
| Muted | #6b7a68 | #0c0f0a | 4.5:1 ✓ |
| Signal | #10b981 | #0c0f0a | 6.2:1 ✓ |
| Loss | #ef4444 | #0c0f0a | 5.4:1 ✓ |

### Focus states

All interactive elements have visible focus states via browser defaults
or custom focus-visible styles.

### Reduced motion

All animations respect prefers-reduced-motion.

### Mobile

Responsive down to 375px:
- Hero stacks to single column
- Tables scroll horizontally
- Charts maintain minimum height
- KPIs wrap naturally

---

## Do's and Don'ts

### Do

- Use emerald green boldly on important data points
- Let the capital map be the visual hero
- Keep asymmetric, varied rhythm
- Use staggered animations on lists/tables
- Maintain high contrast throughout

### Don't

- Add purple/indigo anywhere
- Use uniform card grids
- Add decorative elements (badges, pills)
- Use gradients on text
- Reduce motion without checking preference
- Copy the portfolio hub's amber - this has its own green identity
