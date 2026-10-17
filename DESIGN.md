# LuxyDrive Design System

Source of truth for `@luxydrive/ui` and every screen in `apps/web`. Tokens are written as `{group.name}`; implement them as Tailwind theme tokens in `packages/ui` and never hard-code their values in the app.

## Overview

LuxyDrive is a generous, photography-led marketplace for luxury vehicle experiences: private jets, yachts and camper vans. The base canvas is **pure white** (`{colors.canvas}` — #ffffff) with deep near-black ink (`{colors.ink}` — #222222) for headlines and body. A single accent, **Primary** (`{colors.primary}` — #ff385c), carries every primary CTA, the search orb, the saved-heart state and inline brand links. There is no secondary brand color.

Type runs **Inter** (variable) for everything, with a system stack underneath. Weights stay modest: display headlines render at 22–28px in weight 500–700, never the heavy weights of enterprise dashboards. Photography (listing cards, category imagery) carries the visual weight, not typographic muscle.

The shape language is **soft**. Buttons are 8px radius (`{rounded.sm}`), listing cards ~14px (`{rounded.md}`), the search bar is a full pill (`{rounded.full}`), hearts and the search orb are circles (`{rounded.full}`), and category chips run at 32px (`{rounded.xl}`). Every interactive element is rounded.

**Key characteristics:**
- Single accent color: `{colors.primary}`, used sparingly. Most pages are 90% white + ink with one or two primary moments.
- One typeface: Inter. Display weights 500–700, body 400.
- Category navigation: **Jets privados**, **Yates**, **Autocaravanas**, each with a 32px icon. The active tab uses an underline rule (`{component.category-tab-active}`).
- Pill-shaped global search bar: white surface, divided by 1px hairlines into Dónde / Cuándo / Quién segments, ending in a circular primary search orb (`{component.search-orb}`).
- Listing cards are photo-first: rounded image, offer badge top-left, heart top-right, then 4–5 lines of meta beneath.
- Dropdowns and footer are clean text columns over the white canvas: no card surface, no shadow.
- One elevation tier only (see Elevation), used on hover-floated cards, the search bar and dropdowns.
- 4px base spacing, major sections at `{spacing.section}` (64px): generous, but dense enough to show many cards per scroll.

## Colors

### Brand
- **Primary** (`{colors.primary}` — #ff385c): Primary CTA backgrounds ("Solicitar reserva", "Continuar", "Buscar"), the search orb, the saved-heart state and inline brand links.
- **Primary Active** (`{colors.primary-active}` — #e00b41): Pressed / pointer-down state, used on `{component.button-primary-active}`.
- **Primary Disabled** (`{colors.primary-disabled}` — #ffd1da): Pale tint for disabled CTAs.

### Surface
- **Canvas** (`{colors.canvas}` — #ffffff): Default page background. No dark mode.
- **Surface Soft** (`{colors.surface-soft}` — #f7f7f7): Lightest fill: disabled fields, sub-nav hover backgrounds, inline filter band.
- **Surface Strong** (`{colors.surface-strong}` — #f2f2f2): Circular icon-button surface (back arrow, listing toolbar buttons).

### Hairlines & Borders
- **Hairline** (`{colors.hairline}` — #dddddd): Default 1px border: search bar dividers, table separators, footer column splitters, card borders.
- **Hairline Soft** (`{colors.hairline-soft}` — #ebebeb): Lighter divider for long-scrolling body separators.
- **Border Strong** (`{colors.border-strong}` — #c1c1c1): Disabled outline buttons and form input outlines.

### Text
- **Ink** (`{colors.ink}` — #222222): Dominant text color: headlines, body, nav links, most inline links. Never pure black.
- **Body** (`{colors.body}` — #3f3f3f): Secondary running text inside long descriptions where ink feels too heavy.
- **Muted** (`{colors.muted}` — #6a6a6a): Sub-titles, inactive category tabs, footer sub-labels, "Ver todo" links.
- **Muted Soft** (`{colors.muted-soft}` — #929292): Disabled link text. Use sparingly.
- **Star Rating** (`{colors.star-rating}` — #222222): Rating stars and numbers render in ink, never yellow or gold.
- **On Primary** (`{colors.on-primary}` — #ffffff): Text on primary CTAs.

### Semantic
- **Error** (`{colors.error}` — #c13515): Inline form validation text. Distinct from Primary: darker, more saturated red.
- **Error Hover** (`{colors.error-hover}` — #b32505): Error link hover.
- **Legal Link** (`{colors.legal-link}` — #428bff): Links inside legal copy (Privacidad, Términos) only.

### Scrim
- **Scrim** (`{colors.scrim}` — #000000 at 50% opacity): Modal backdrop (date picker, login dialog, language picker). Stored as the base hex; opacity applied at render time.

## Typography

### Font Family
**Inter** (variable, self-hosted) for everything: display, body, navigation, captions, microcopy. Fallback stack: `Inter, -apple-system, system-ui, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`. There is no separate display family.

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.rating-display}` | 64px | 700 | 1.1 | -1px | Listing detail rating ("4.9") |
| `{typography.display-xl}` | 28px | 700 | 1.43 | 0 | Homepage h1 ("Experiencias de lujo a tu alcance") |
| `{typography.display-lg}` | 22px | 500 | 1.18 | -0.44px | Listing detail h1 ("Jet privado Marbella → Madrid") |
| `{typography.display-md}` | 21px | 700 | 1.43 | 0 | Section heads in listing detail ("Qué incluye") |
| `{typography.display-sm}` | 20px | 600 | 1.20 | -0.18px | Sub-section titles ("Antes de reservar") |
| `{typography.title-md}` | 16px | 600 | 1.25 | 0 | Card titles, city link titles |
| `{typography.title-sm}` | 16px | 500 | 1.25 | 0 | Footer column heads |
| `{typography.body-md}` | 16px | 400 | 1.5 | 0 | Default running text |
| `{typography.body-sm}` | 14px | 400 | 1.43 | 0 | Card meta lines, dates, prices |
| `{typography.caption}` | 14px | 500 | 1.29 | 0 | Search segment labels ("Dónde", "Cuándo", "Quién"), input labels |
| `{typography.caption-sm}` | 13px | 400 | 1.23 | 0 | Footer legal line ("© 2026 LuxyDrive") |
| `{typography.badge}` | 11px | 600 | 1.18 | 0 | Offer badge text ("Empty leg", "Última hora") |
| `{typography.micro-label}` | 12px | 700 | 1.33 | 0 | Card micro-labels |
| `{typography.uppercase-tag}` | 8px | 700 | 1.25 | 0.32px (uppercase) | "NUEVO" tag on category tabs |
| `{typography.button-md}` | 16px | 500 | 1.25 | 0 | Primary CTA labels |
| `{typography.button-sm}` | 14px | 500 | 1.29 | 0 | Pill button labels (category chips) |
| `{typography.link}` | 14px | 400 | 1.43 | 0 | Inline body links |
| `{typography.nav-link}` | 16px | 600 | 1.25 | 0 | Category tab labels |

### Principles
Display weights stay modest. The homepage h1 at 28px / 700 sits under the search bar so photography and the listing grid carry the hierarchy. The listing-detail h1 at 22px / 500 is even quieter; the photo banner does the work above it.

The only typographically loud moment is the **rating display** (`{typography.rating-display}`, 64px / 700) on listing detail: ratings are a peak trust signal.

## Layout

### Spacing System
- **Base unit:** 4px (2px micro-step).
- **Tokens:** `{spacing.xxs}` 2px · `{spacing.xs}` 4px · `{spacing.sm}` 8px · `{spacing.md}` 12px · `{spacing.base}` 16px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.xxl}` 48px · `{spacing.section}` 64px.
- **Section padding (vertical):** `{spacing.section}` (64px) for major page bands.
- **Card internal padding:** `{spacing.lg}` (24px) for `{component.provider-card}` and `{component.booking-card}`; `{spacing.base}` (16px) for the listing-card meta block; `{spacing.sm}` (8px) for caption / date-row gutters.
- **Gutters:** `{spacing.base}` (16px) between cards in grids; `{spacing.lg}` (24px) between footer columns; `{spacing.xs}` (4px) on dense category-chip dividers.

### Grid & Container
- **Max content width:** ~1280px centered on home and editorial pages; listing detail caps at ~1080px.
- **Listing grid:** 4-up on desktop (see Responsive Behavior).
- **Listing detail:** 2 columns: photos / description on the left (~64%), sticky booking card (`{component.booking-card}`) on the right (~32%).
- **Footer:** 3 link columns (Ayuda / Proveedores / LuxyDrive) on desktop, 1 column on mobile.

### Whitespace Philosophy
Editorial bands get 64px of vertical breathing room, but card grids are compressed to 16px gaps. The page reads as "open hero, dense marketplace below".

## Elevation

One shadow tier plus the flat baseline.

- **Flat (no shadow):** body, hero, footer, editorial bands — 95% of surfaces.
- **Float:** `box-shadow: rgba(0, 0, 0, 0.02) 0 0 0 1px, rgba(0, 0, 0, 0.04) 0 2px 6px 0, rgba(0, 0, 0, 0.1) 0 4px 8px 0` — listing cards on hover, the search bar at rest, dropdown menus (account, language, date picker). The only shadow in the system.
- **Modal scrim:** `{colors.scrim}` at 50% opacity.

Depth comes from photography, white-on-white separation and rounded clipping, never from layered shadows.

## Components

### Buttons

**`button-primary`** — Primary fill, white text, 8px radius, 14×24px padding, 48px height, weight 500. Main CTA: "Solicitar reserva", "Continuar", "Buscar".

**`button-primary-active`** — Pressed state: background `{colors.primary-active}`. No transform, no shadow change.

**`button-primary-disabled`** — `{colors.primary-disabled}` background, white text, `cursor: not-allowed`.

**`button-secondary`** — White fill, ink text, 1px ink outline, 8px radius. "Guardar", "Cancelar", inverse CTAs over primary surfaces.

**`button-tertiary-text`** — Plain ink text, no surface or border, underlined on hover. "Mostrar más", modal close labels.

**`button-pill-primary`** — Pill-shaped primary CTA for featured cells ("Publica tu vehículo"): 9999px radius, 10×20px padding, 14px label.

### Search Surface

**`search-bar-pill`** — Signature global search bar. White fill, 9999px radius, 64px height, hairline border plus the float shadow. Split by vertical hairlines into `{component.search-field-segment}` cells (Dónde / Cuándo / Quién); each segment has a `{typography.caption}` label above a placeholder line.

**`search-orb`** — Circular primary orb at the right end of the search bar. 48×48px, white magnifying-glass icon centered. The hottest color moment on the homepage.

### Top Navigation

**`top-nav`** — White surface, 80px height, 1px bottom hairline. LuxyDrive wordmark flush left, category tabs (Jets privados / Yates / Autocaravanas) centered, account utilities (provider link, language, account menu) flush right.

**`category-tab-active`** — Ink label in `{typography.nav-link}`, 32px icon, 2px ink underline beneath the icon-label pair.

**`category-tab-inactive`** — Muted label, icon, no underline.

**`new-tag`** — Tiny pill badge (`{rounded.full}`) anchored top-right of an icon, with "NUEVO" in `{typography.uppercase-tag}`.

### Listing Cards

**`listing-card`** — Photo-first card. 1:1 image with `{rounded.md}` clipping, carousel dots overlay, `{component.offer-badge}` top-left, heart top-right (`{component.icon-button-circle}`, outlined by default, primary-filled when saved). Beneath the image, 4–5 meta lines: title (`{typography.title-md}`), location or route and dates (`{typography.body-sm}` muted), and the price with its unit ("4.200 € · experiencia completa" or "350 € / persona").

**`listing-card-photo`** — The photo plate alone, reused where the meta block is not needed (favorites, compact results).

**`offer-badge`** — White pill (`{rounded.full}`) in `{typography.badge}` over the photo, with the float shadow. Labels the offer type: "Empty leg", "Última hora", "Oferta flash".

### Listing Detail

**`rating-display-card`** — 64px / 700 rating number with the review count and a row of ink stat columns beneath. The largest type in the system.

**`amenity-row`** — 1-column list of icon + ink label in `{typography.body-md}`. 12px row padding, no borders between rows; the section is closed by hairline dividers above and below.

**`reviews-card`** — 2-column grid of review excerpts: author row (avatar, name, date) above a 3-line excerpt with a "Mostrar más" tertiary link.

**`provider-card`** — White card, `{rounded.md}`, 24px padding: provider logo or avatar, name, verified badge, response-rate stat and a "Contactar" `{component.button-secondary}`.

**`booking-card`** — Sticky right-rail card on listing detail. White, `{rounded.md}`, 1px hairline border, float shadow, 24px padding. Contains price and unit (`{typography.display-md}`), service date / route selector, passenger stepper, full-width "Solicitar reserva" primary CTA and a fee breakdown in `{typography.body-sm}`.

### Date Picker

**`date-picker-day`** — 40×40px circular cell with the day in `{typography.body-sm}`; transparent fill, ink text.

**`date-picker-day-selected`** — Ink fill, white text, full circle. Days inside a selected range share a `{colors.surface-soft}` lozenge background.

### Forms

**`text-input`** — White surface, 1px hairline outline, `{rounded.sm}`, 56px height, 14×12px padding. Label above in `{typography.caption}` muted, placeholder in `{typography.body-md}` muted. On focus the border becomes 2px `{colors.ink}`: no glow, no ring. On error the border and helper text use `{colors.error}`.

### Footer

**`footer-light`** — White surface (same as the canvas), 48×80px padding. Three link columns (Ayuda / Proveedores / LuxyDrive) with 24px gutters; each column has a `{typography.title-sm}` head and `{component.footer-link}` rows in `{typography.body-sm}` ink.

**`legal-band`** — Strip below the footer columns: copyright, language picker, currency (EUR) and social icons, all in `{colors.muted}` at `{typography.caption-sm}`.

## Responsive Behavior

| Name | Width | Key Changes |
|---|---|---|
| Mobile | < 744px | Top nav collapses to logo + menu; category tabs become a horizontal scroll strip; search bar collapses to one tappable pill; listing cards 1-up; booking card becomes a sticky bottom bar. |
| Tablet | 744–1128px | Category tabs stay, search bar narrows; listing cards 2-up; booking card stays in a narrower right rail. |
| Desktop | 1128–1440px | Full top nav, search bar with all 3 segments; listing cards 4-up; listing detail in 2 columns. |
| Wide | > 1440px | Content caps at 1440px on listing / search pages and ~1280px on editorial; gutters absorb the rest. |

### Touch Targets
- Primary CTAs and the search orb: minimum 48×48px.
- Heart button: 32×32px, with 12px padding inside the photo card to enlarge the hit area.
- Date-picker day cells: 40×40px.

### Collapsing Strategy
- Category tabs become a horizontal scroll strip below 744px.
- The 3 search segments collapse into one entry that opens a full-screen search overlay on mobile.
- Grids drop columns at each breakpoint; they never reflow into uneven rows.
- The booking card moves from the sticky right rail to a sticky bottom bar on mobile, with only the price and the "Solicitar reserva" CTA.

## Not Yet Defined

- **Hover states** beyond the card float shadow.
- **Loading states / skeleton screens.**
- **Map view** for route-based results.
- **Iconography set** (choose one open-source icon library and use it everywhere).
