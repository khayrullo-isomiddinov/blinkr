---
name: Kinetic Minimalist
colors:
  surface: '#111319'
  surface-dim: '#111319'
  surface-bright: '#373940'
  surface-container-lowest: '#0c0e14'
  surface-container-low: '#191b22'
  surface-container: '#1e1f26'
  surface-container-high: '#282a30'
  surface-container-highest: '#33343b'
  on-surface: '#e2e2eb'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#e2e2eb'
  inverse-on-surface: '#2e3037'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#4cd7f6'
  on-secondary: '#003640'
  secondary-container: '#03b5d3'
  on-secondary-container: '#00424e'
  tertiary: '#d0bcff'
  on-tertiary: '#3c0091'
  tertiary-container: '#a078ff'
  on-tertiary-container: '#340080'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#e9ddff'
  tertiary-fixed-dim: '#d0bcff'
  on-tertiary-fixed: '#23005c'
  on-tertiary-fixed-variant: '#5516be'
  background: '#111319'
  on-background: '#e2e2eb'
  surface-variant: '#33343b'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.025em
  headline-md:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.015em
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 21px
    letterSpacing: -0.006em
  body-sm:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: -0.005em
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-xs:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  space-2xs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-base: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
  space-2xl: 2rem
  space-3xl: 3rem
  col-feed-max: 620px
  col-sidebar-left: 260px
  col-sidebar-right: 340px
  gutter: 1rem
---

## Brand & Style

This design system embodies the precision and velocity of high-tier developer tooling merged with the expressive agility of next-generation social feeds. The aesthetic reflects restrained minimalism: crisp typographic pacing, precise 1px hairline dividers, and deliberate bursts of high-chroma electric indigo. 

### Target Audience & Mood
Engineers, founders, creators, and digital natives who demand fluid speed, zero visual friction, and ultra-high information density without cognitive clutter. The interface feels instant, authoritative, and tactically engineered—prioritizing content creation and rapid consumption over decorative fluff.

### Core Visual Principles
- **Hairline Precision**: Depth is articulated through 1px crisp borders (`border-subtle`) rather than heavy dropshadows or bulky nested cards.
- **Electric Intentionality**: Vibrant electric indigo and cyan-violet accents are reserved exclusively for focus targets, primary calls-to-action, active indicators, and high-signal interactions.
- **Content Flatness**: Feeds unfold across edge-to-edge structural planes partitioned by crisp dividing lines, keeping media and typographic prose at the absolute center of attention.

## Colors

The palette leverages a deep charcoal/slate canvas for dark mode (`#0B0D13` base background with `#131620` card surfaces) coupled with high-contrast neutral scales. Semantic accents are tuned to industry-standard social metaphors with refined luminosity.

### Color Architecture
- **Primary Canvas**: Deep Obsidian (`#0B0D13`) provides endless depth; Elevated Surfaces (`#131620`) provide soft, ambient contrast without turning grey or washed out.
- **Accents**: 
  - `Electric Indigo` (`#6366F1`): Primary interactive action, focused controls, active navigation.
  - `Cyan Highlight` (`#06B6D4`): Badges, telemetry, live streams, secondary indicators.
  - `Violet Glow` (`#8B5CF6`): Subtle gradient pairing for marketing and profile highlights.
- **Hairlines & Borders**:
  - `Border Subtle`: `rgba(255, 255, 255, 0.08)` (Feeds, divider bars, passive lists).
  - `Border Default`: `rgba(255, 255, 255, 0.14)` (Inputs, interactive buttons, modal frames).
  - `Border Focus`: `rgba(99, 102, 241, 0.60)` (Active keyboard focus rings, active field borders).
- **Text & Foreground**:
  - `Text Primary`: `#F8FAFC` (Titles, body prose, handles).
  - `Text Secondary`: `#94A3B8` (Usernames `@handle`, timestamps, passive counts).
  - `Text Tertiary`: `#64748B` (Placeholders, metadata, muted counters).
- **Social Semantics**:
  - `Like / Heart`: `#F43F5E` (Rose).
  - `Repost / Boost`: `#10B981` (Emerald).
  - `Bookmark / Save`: `#38BDF8` (Sky).
  - `Verified / Official`: `#6366F1` (Indigo).

## Typography

The typography relies on the technical discipline of Geist. The system maintains tight tracking and crisp vertical cadence, preventing social timelines from bloating while preserving effortless reading during continuous scroll.

### Typographic Roles
- **Display & Headlines**: Tightly tracked (`-0.02em` to `-0.03em`) with heavy weight (`600`–`700`). Reserved for onboarding headers, modal titles, and section dividers.
- **Social Feed Body**: Set at `15px` to `16px` with a proportional `1.5` line-height for quick parsing of multi-paragraph threads and inline links.
- **Metadata & Handles**: `label-sm` and `body-sm` rendered in muted slates (`#94A3B8` / `#64748B`) to create instant contrast against the primary display text.
- **Numbers & Metrics**: Tabular figures enabled (`font-variant-numeric: tabular-nums`) for repost counts, reply counters, and live analytics.

## Layout & Spacing

Layout is anchored on a strictly aligned column architecture centered around human focal span. 

### Grid & Layout Structure
- **Desktop (1280px+)**: Three-column pinned layout:
  - Left Navigation Rail: Fixed `260px` with fluid vertical links and user switcher.
  - Main Central Feed: Constrained strictly to `620px` max-width. Keeps posts scannable without horizontal eye wandering.
  - Right Rail (Discovery & Trends): Fixed `340px` for search, trending tags, and recommended follows.
- **Tablet (768px - 1024px)**: Left rail collapses into an icon-only dock (`64px`); feed maintains `600px`; right rail collapses into an overlay panel.
- **Mobile (< 768px)**: Central feed expands edge-to-edge (`100vw`); top persistent sticky sub-navigation tab bar (`48px`); fixed bottom navigation bar (`56px`). Hairline borders transition from lateral borders to horizontal item separators.

### Spacing Cadence
All spatial relationships scale from a base 4px/8px rhythm. Feed items use `16px` vertical and horizontal internal padding, with an `8px` gap between avatars and author metadata.

## Elevation & Depth

This system intentionally avoids multi-tiered drop shadows in favor of flat structural planes, hairline outlines, and targeted micro-glows.

### Plane Architecture
- **Level 0 (Base)**: `#0B0D13` - Infinite background canvas across main shell and timeline backdrop.
- **Level 1 (Surfaces & Feeds)**: `#11141D` - Floating panels, sidebars, compose containers. Delimited by a 1px solid border (`rgba(255, 255, 255, 0.08)`).
- **Level 2 (Popovers & Modals)**: `#181B26` - Context menus, quote popovers, mentions suggestions. Features a crisp border (`rgba(255, 255, 255, 0.14)`) and a restrained, diffused ambient shadow: `0 12px 32px -4px rgba(0, 0, 0, 0.65)`.
- **Micro-Glow Focus**: Interactive elements in active or focused states receive a low-spread radial halo using the brand primary: `box-shadow: 0 0 0 2px #0B0D13, 0 0 0 4px rgba(99, 102, 241, 0.7)`.

## Shapes

The design uses a refined geometric pairing of modern rounded rectangles and pure pills.

### Geometry Guidelines
- **Pills (`rounded-full`)**: Primary call-to-action buttons, user avatars, feed filtering chips, notification count pills, and tab indicators.
- **Containers (`rounded-xl` / 12px–16px)**: Quoted post embeds, attached image carousels, contextual dropdowns, and modal dialogs.
- **Micro Elements (`rounded-md` / 6px–8px)**: Form inputs, reaction toolbars, keyboard shortcuts, and code blocks.

## Components

### Buttons
- **Primary (Electric Action)**: Full pill (`rounded-full`). Background `#6366F1`, label `#FFFFFF` in `label-sm` weight 600. Hover: `#4F46E5`. Active: `#4338CA` with scale `0.98`.
- **Secondary (Subtle Surface)**: Full pill. Background `rgba(255, 255, 255, 0.06)`, border `1px solid rgba(255, 255, 255, 0.12)`, text `#F8FAFC`. Hover: `rgba(255, 255, 255, 0.10)`.
- **Ghost (Action Toolbar)**: Circular (`34px x 34px`) or tight pill. Transparent background. Text `#94A3B8`. Hover states tint toward their semantic role (e.g., Like button icon & background tint to `rgba(244, 63, 94, 0.12)` with icon `#F43F5E`).

### Input Fields & Compose Area
- **Feed Composer**: Borderless rich-text editor directly embedded in the flow. Expandable text area, placeholder `#64748B`. Sticky bottom action bar containing media uploader, poll creator, emoji trigger, and character progress ring.
- **Search Bar**: Fully rounded (`rounded-full`) with a subtle `#131620` background, 1px border `rgba(255, 255, 255, 0.08)`, search icon in `#64748B`. Expands to `#181B26` with an indigo border on focus.

### Timeline Posts & Feed Rows
- Single flat surface separated by a 1px border bottom (`rgba(255, 255, 255, 0.07)`). No enclosed card margins on mobile; clean horizontal dividers on desktop.
- **Interaction Row**: Evenly spaced cluster of 4 actions (Reply, Repost, Like, Bookmark, Share). Counts are rendered in `label-sm` beside muted icons, transitioning instantly to respective semantic colors on click with a `1.15x` momentary spring bounce.

### Chips & Filter Tabs
- **Segmented Tabs**: Enclosed inside a `rounded-full` container with `rgba(255, 255, 255, 0.04)` background. Active tab gets a crisp white or indigo pill highlight with smooth sliding interpolation (`spring(damping: 24, stiffness: 280)`).
- **Metadata Chips**: Small badges (`rounded-full`, padding `2px 8px`, `label-xs`) with subtle tinted borders (e.g., `rgba(6, 182, 212, 0.2)` with cyan text for trending categories).

### Embedded Media & Quoted Posts
- Enclosed with `rounded-xl` and a 1px solid border (`rgba(255, 255, 255, 0.1)`). Images render edge-to-edge inside the frame with an aspect ratio of `16:9` or `1:1` grid tiles.