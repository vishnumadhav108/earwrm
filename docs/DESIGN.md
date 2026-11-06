# Design

**Clean and dark.** The album art supplies the color, and the interface stays quiet around it.

It draws on three things:
1. **The current app.** Everything new has to match what's already built: the near-black surface, the white alpha ramp, the purple accent for stars, small radii, hairline borders and small tracked uppercase labels.
2. **Vercel's site:** a black canvas, hairline dividers, crisp type, lots of space, monochrome UI with color used sparingly, mono type for metadata.
3. **Letterboxd:** cover grids, star ratings and histograms, a blurred backdrop at the top of detail pages, dense diary rows, and reviews as the main content.

We borrow the feel, not the brand. No Letterboxd orange, green or blue dots, no Vercel triangle, and nothing that could be confused with either product.

## Type

**Verified:** Geist Serif shipped on Oct 30, 2026. It's in the `geist` npm package (v1.9.1 checked) under `geist/font/serif/regular` (also `square` and `variable`), and it's licensed under SIL OFL 1.1. [blog](https://vercel.com/blog/introducing-geist-serif), [repo](https://github.com/vercel/geist-font)

Vercel describes this first release as a **display face** "for headlines, posters, and other large sizes". It comes in **one weight (Regular)** with no italic yet. Its hairlines get lost at small sizes, so earwrm uses it for display and pairs it with Geist Sans everywhere else.

| Role | Font | Where | Rules |
|---|---|---|---|
| Display | **Geist Serif Regular** | the wordmark, page titles, album and song titles on detail pages, list titles, profile names, review pull-quotes, recap headlines, big stat numbers in recaps | 20 px or larger, never smaller than 18 px. Regular only, never faux-bold. Build hierarchy with size, not weight. Tight tracking (-0.02em) |
| UI and body | **Geist Sans** | everything else: body text, reviews, buttons, rows, inputs, tab bar | 400/500/600 |
| Data | **Geist Mono** | track numbers and lengths, rating averages, counts, dates in diary rows, critic score chips | small sizes, `tabular-nums` |
| Labels | Geist Sans 500, uppercase, +0.16–0.2em tracking | section labels ("TRACKLIST", "YOUR HISTORY") | the current label style, kept as is |

**Load the fonts with the `geist` package** (`geist/font/serif/regular`, `geist/font/sans`, `geist/font/mono`) instead of `next/font/google`.
- They're self-hosted, so the build no longer has to fetch from Google Fonts. Today's Archivo setup fails to build when Google can't be reached.
- Geist Serif isn't on Google Fonts yet anyway.
- Archivo is removed.

**Type scale** (as tokens, in px):

| Token | Size |
|---|---|
| display-xl | 40 |
| display-l | 32 |
| display-m | 26 |
| display-s | 22 |
| title | 17 |
| body | 14.5 |
| body-s | 13 |
| meta | 12 |
| label | 10 |

Line height is about 1.1 for display and 1.5 for body.

## Color

These are the current values, renamed to meaning-based tokens. The 40-step alpha ramp in `theme.ts` gets merged down to these:

| Token | Value | Use |
|---|---|---|
| `bg` | #0a0a0b | app surface |
| `page` | #0d0d0f | desktop area around the content |
| `surface` | #131316 | sheets, cards |
| `surface-raised` | #17171b | modals, menus |
| `text` | white / .92 | primary text |
| `text-2` | white / .62 | secondary text |
| `text-3` | white / .48 | tertiary text, meta **and placeholders in enabled inputs**. 4.92–5.01:1 on `bg`, `surface` and `surface-raised` (.42 failed at about 4.05:1) |
| `text-4` | white / .28 | **disabled** controls and decoration only. About 2.5:1, so never for placeholders or information |
| `line` | white / .07 | hairline dividers |
| `line-strong` | white / .16 | outlined buttons, inputs |
| `fill` | white / .05 | inputs, chips |
| `fill-strong` | white / .12 | active segment, hover |
| `accent` | #8f6bf0 | active states, focus rings, selected icons. **Never as the background behind white text** (3.80:1 fails AA) |
| `accent-strong` | #7a55e6 | primary button fill with white text (4.92:1, passes AA) |
| `accent-lt` | #a88bf5 | stars, hearts, icons, links and purple text (7.23:1 on `bg`, 6.53:1 on `surface-raised`). Never lower its opacity for text |
| `danger` | #e06b6b | destructive actions |

- Dark only for now. Tokens live in CSS variables, so a light theme can be added later without touching components.
- Purple is the only accent. It's used for stars, the primary button, active and selected states, and links. Never use it for big background fills.
- **Contrast (calculated from these tokens, WCAG 2.1):** every text token passes AA (4.5:1) on `bg`, `surface` and `surface-raised` after the alpha is blended in. Add a unit test that recomputes the ratio for each token on each surface, so a token change can't silently fail AA.
- **Album headers** over a blurred cover always get a dark scrim (a gradient to `bg`) so title and meta contrast stays predictable whatever the artwork. Test it with a **pure white cover**: the title and meta must still pass AA.

## Shape, space, depth
- **Radius:** 3–4 px for covers, chips and inputs. 6 px for buttons and segments. 10–12 px for sheets and modals. Avatars are round. Same as the current app.
- **Borders:** 1 px hairlines in `line` and `line-strong`. Covers get a faint `line` border so dark artwork doesn't blend into the page.
- **Shadows:** only on modals and sheets. Everything else is flat.
- **Spacing:** a 4 px base grid. 20 px page padding on phones, 32 px on desktop. Leave generous space between sections, the way Vercel does.
- **Motion:** 150–200 ms ease-out for sheets, fades and press feedback. No bouncing. Respect `prefers-reduced-motion`.

## Layout
- **Mobile first**, matching the current app. The bottom tab bar is Home, Diary, center +, Library, Discover.
- **Desktop gets a real layout.** The fixed 402 px phone column goes away.
  - A top nav bar with the wordmark, search and profile, in a content column about 1,120 px max.
  - Album and song pages use two columns: cover and actions on the left, sections on the right.
  - The diary becomes a dense table (date, cover, title, stars, re-listen, review icon), like Letterboxd's diary.
  - Grids go to 6–8 covers per row.
- **Album and song page header:** a heavily blurred and darkened version of the cover fills the top and fades into `bg`, the way Letterboxd uses a backdrop. The title is in Geist Serif display-l, with meta in Geist Mono underneath.

## Components (in `src/components/ui`, built in handoff 03c)
- **Cover:** keeps today's striped-monogram fallback with Cover Art Archive art fading in over it. Hover or long-press shows your rating.
- **Stars:** `accent-lt`, half stars, read-only and input versions. Both use the same component.
- **Rating histogram:** 10 thin bars in `fill-strong`. Your own rating's bar is in `accent-lt`. The average is in Geist Mono.
- **Buttons:**
  - primary: `accent-strong` fill with white text
  - secondary: hairline outline
  - ghost
  - danger: red outline, or red fill inside confirm dialogs
- **Chips:** critic scores, tags and release types (today's type badge). Hairline outline, Geist Mono for the numbers.
- **Rows:** diary row, track row (number · title · length · average stars · your stars), and list item row. All keep the existing swipe and long-press gestures.
- **Section header:** a label plus an optional "See all →".
- **Empty, loading and error states:** use the current EmptyState style. Skeletons are `fill` blocks with a slow shimmer that turns off under reduced motion.
- **Recap story cards:** full bleed, with Geist Serif display-xl for the big number or headline and the album art large.

## Accessibility
- Test with real content: two-line album titles, long artist credits, half-star input, keyboard-only navigation and **200% zoom**, on a real album page.
- Geist Serif at 20 px is the *minimum*. In dense layouts (rows, cards), long titles can fall back to Geist Sans 600.
- Quick-log (long-press) and drag-to-reorder need visible, keyboard-reachable alternatives (a menu, or arrow keys with a move up/down control).
- Visible focus rings (2 px, `accent-lt`).
- Hit targets at least 44 px on touch.
- Every icon button gets an `aria-label`.
- Stars are readable by screen readers ("4.5 out of 5").
- Lighthouse Accessibility must stay at 95 or above, per handoff 03.
