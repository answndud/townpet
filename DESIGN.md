---
name: TownPet
description: Policy-first local pet community UI for feed, search, posting, moderation, and operations.
colors:
  background: "#f8fafd"
  foreground: "#1e3f74"
  primary: "#3567b5"
  primary-hover: "#2f5da4"
  link: "#2f5da4"
  heading: "#1f3f71"
  text-primary: "#10284a"
  text-muted: "#4f678d"
  text-subtle: "#5a7398"
  surface: "#ffffff"
  surface-soft: "#f8fbff"
  surface-muted: "#eef3fb"
  surface-page: "#fbfdff"
  border: "#dbe6f5"
  border-soft: "#dbe6f6"
  border-control: "#cbdcf5"
  danger-soft-bg: "#fff7f7"
  danger-soft-text: "#a8525b"
typography:
  display:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.8
  label:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.22em"
  mono:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.45
rounded:
  control: "8px"
  panel: "10px"
  card: "12px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "0.5625rem 0.875rem"
  button-soft:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary-hover}"
    rounded: "{rounded.control}"
    padding: "0.4375rem 0.75rem"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.card}"
    padding: "1rem"
  input-soft:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "0.5625rem 0.75rem"
---

# Design System: TownPet

## 1. Overview

**Creative North Star: "The Neighborhood Ledger"**

TownPet should feel like a calm local operating surface: more trustworthy registry than social toy, more neighborhood utility than marketing page. The product uses a restrained blue-tinted palette, clear borders, compact controls, and structured labels to make locality, category, and policy state visible.

The current implementation is a Next.js product UI with Tailwind CSS v4, global `tp-*` utility classes, Space Grotesk for the interface, and IBM Plex Mono for compact metadata. Future design work should preserve this foundation before introducing new tokens or components.

**Key Characteristics:**
- Light, blue-tinted product surfaces with clear scan paths.
- Compact controls and badges for feed, search, moderation, and admin workflows.
- Policy and trust signals shown as first-class interface content.
- Warmth through clarity and local context, not decorative pet motifs.

## 2. Colors

The palette is restrained and blue-tinted, using surface contrast, borders, and rare primary actions to create hierarchy.

### Primary
- **Civic Blue** (`#3567b5`): Primary buttons, selected filter states, strong calls to action.
- **Link Blue** (`#2f5da4`): Links and hover states where navigation needs emphasis.

### Neutral
- **Snowfield Page** (`#f8fafd`): Global page background.
- **White Surface** (`#ffffff`): Cards, forms, tables, and raised product surfaces.
- **Soft Blue Surface** (`#f8fbff`): Inputs, muted panels, and secondary content blocks.
- **Ledger Ink** (`#10284a`): Main readable text.
- **Muted Slate Blue** (`#4f678d`): Secondary text and metadata.
- **Soft Border Blue** (`#dbe6f5` / `#dbe6f6`): Structural borders.

### Named Rules

**The Rare Accent Rule.** Primary blue should identify action or selection, not flood entire screens.

**The No Toy Palette Rule.** Do not add saturated pet-themed pinks, yellows, or mascot colors unless a specific campaign or empty state justifies them.

## 3. Typography

**Display Font:** Space Grotesk with system fallback
**Body Font:** Space Grotesk with system fallback
**Label/Mono Font:** IBM Plex Mono for metadata-like utility text when needed

**Character:** The pairing is structured and slightly technical, which fits a policy-first community product. Korean UI copy should stay direct and readable; avoid long poetic headings inside product surfaces.

### Hierarchy
- **Display** (700, `1.5rem` to `1.875rem`, `1.15`): Page titles and major screen headings.
- **Post Title** (700, `1.375rem` to `1.95rem`, `1.18`): Detail pages where content title is the object.
- **Section Title** (600, `1rem`, `1.3`): Panels, form groups, admin sections.
- **Body** (400, `0.9375rem`, `1.8`): Reading content and descriptions, capped near 65-75ch.
- **Meta / Label** (500-600, `0.75rem`, compact line-height): badges, table metadata, filters, and operational labels.

### Named Rules

**The Product Scale Rule.** Use fixed `rem` sizes for product UI and dashboards. Reserve fluid type only for future brand or editorial surfaces.

## 4. Elevation

TownPet uses borders and tonal surfaces first, with soft shadows reserved for shell cards, hover emphasis, and empty-state icons. Depth should clarify grouping rather than decorate.

### Shadow Vocabulary
- **Card Lift** (`0 10px 24px rgba(30, 63, 116, 0.05)`): Standard card elevation for content blocks.
- **Hero Lift** (`0 10px 24px rgba(30, 63, 116, 0.06)`): Slightly stronger shell panels.
- **Floating Menu** (`0 18px 40px rgba(16, 40, 74, 0.16)`): Popovers and editor menus.

### Named Rules

**The Border-First Rule.** Start with border and background contrast. Add shadow only when the element must float above its neighbors.

## 5. Components

### Buttons
- **Shape:** 8px radius, compact heights from `1.875rem` to `2.25rem`.
- **Primary:** Civic Blue background, white text, used for committing actions.
- **Soft:** White background with blue border and blue text, used for secondary actions and navigation.
- **Hover / Focus:** Subtle background shift and a visible blue focus ring. Do not remove focus states for visual cleanliness.

### Chips
- **Style:** Small, bordered, high-density labels with `0.6875rem` text.
- **State:** Active filter pills use a soft blue fill and stronger blue border. Inactive chips stay white or lightly muted.

### Cards / Containers
- **Corner Style:** 10-12px radius for product panels and cards.
- **Background:** White for primary content, soft blue for nested form panels.
- **Shadow Strategy:** Use soft card lift sparingly; dense admin and table-like surfaces can rely on borders.
- **Border:** Blue-tinted structural borders are part of the brand language.
- **Internal Padding:** Prefer compact, consistent product spacing over oversized marketing padding.

### Inputs / Fields
- **Style:** Soft blue background, blue-tinted border, 8px radius.
- **Focus:** Border shifts to primary blue with a translucent focus ring.
- **Error / Disabled:** Keep error states textual and structural; do not rely on color alone.

### Navigation
- **Style:** App shell header is dense, utility-first, and responsive. It should expose feed, search, profile, auth, notification, and admin affordances without becoming a marketing nav.
- **Mobile:** Quick links must remain short enough for Korean labels and unread badges.

## 6. Do's and Don'ts

Do:
- Preserve `tp-*` utilities and existing Tailwind conventions before inventing new primitives.
- Make `LOCAL` / `GLOBAL` and moderation context visible in screen structure.
- Design empty, loading, disabled, and failure states as part of the workflow.
- Keep admin screens quiet, dense, and optimized for scan and repeated action.
- Use real TownPet data shapes when polishing UI.

Don't:
- Convert product screens into landing pages.
- Use nested cards, glassmorphism, gradient text, or purple-blue AI gradients.
- Hide policy restrictions in helper text after the user has already failed.
- Add mascot-heavy or cute decorative elements to high-risk flows.
- Replace established fonts, colors, radii, or button patterns without an explicit design task.
