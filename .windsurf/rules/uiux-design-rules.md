# 🎨 UI/UX Design & Frontend Engineering Rules — Ryker Multi-Agent Tech

This document defines the strict UI/UX design standards for all agents, code generators, and developers across the platform.

---

## 🚫 1. Anti-Tacky & Anti-AI Slop Directive (ห้ามออกแบบเวอร์เกินจริง / ลิเก)

AI-generated designs often suffer from "over-designing" — adding unnecessary neon glows, radioactive gradients, and distracting animations. **Avoid the following anti-patterns:**

1. **NO Neon & Radioactive Gradients**:
   - ❌ BANNED: Neon cyan (`#00f0ff`) + hot magenta (`#ff007f`) gradients everywhere.
   - ❌ BANNED: Over-saturated multi-color rainbow borders and flashing drop shadows (`box-shadow: 0 0 30px #ff00ff`).
   - ✅ DO: Use refined, muted, harmonious color palettes (e.g. Zinc, Slate, Neutral, Charcoal) paired with **one single intentional accent color** (e.g., Deep Indigo, Emerald, Royal Blue, Warm Amber).

2. **NO Excessive Glassmorphism & Blurry Unreadable Text**:
   - ❌ BANNED: Stacking 4 layers of `backdrop-filter: blur(20px)` with `rgba(255,255,255,0.05)` where text becomes impossible to read.
   - ✅ DO: Use clean, solid or semi-opaque surfaces with crisp 1px hairline borders (`border: 1px solid rgba(255,255,255,0.08)` in dark mode, or `#e4e4e7` in light mode).

3. **NO Distracting / Overdone Animations**:
   - ❌ BANNED: Elements bouncing, spinning, or pulsating constantly without user trigger.
   - ✅ DO: Use subtle, purposeful micro-interactions (150ms – 250ms with `cubic-bezier(0.16, 1, 0.3, 1)`) on hover, focus, and state transitions.

4. **NO Fake Futuristic / Sci-Fi Clutter**:
   - ❌ BANNED: Adding fake holographic lines, futuristic HUD circles, or random tech hexagons when building standard apps like e-commerce, CRM, or SaaS.
   - ✅ DO: Focus on clean layout, clear hierarchy, high readability, and human-centric usability.

---

## 🎯 2. Reference-First & Intent-Fidelity Principles (ตรงเรฟ 100%)

1. **Strict Reference Alignment**:
   - When the user provides a design reference (e.g., Apple, Stripe, Linear, Vercel, Raycast, Tailwind UI, or custom mockups), **faithfully match the mood, density, typography, and spacing of that reference**.
   - Do not invent random unrelated styling that contradicts the user's explicit theme or brand.

2. **Information Hierarchy & Whitespace**:
   - Prioritize scannability: Page Title ➔ Section Headers ➔ Key Actions ➔ Data Cards.
   - Give elements room to breathe with consistent spacing scale (4px, 8px, 16px, 24px, 32px, 48px).

3. **Typography Excellence**:
   - Use clean, modern system font stacks or premium sans-serifs: `Inter`, `Plus Jakarta Sans`, `Geist`, `Outfit`, `SF Pro Display`.
   - Never use more than 2 font families on a single interface.
   - Establish crisp weight contrast: Regular (`400`) for body, Medium (`500`) for navigation/labels, Semi-Bold (`600`) or Bold (`700`) for headers.

4. **Component Ergonomics & Usability**:
   - **Buttons vs. Badges**: Buttons must look actionable with clear hover/pressed states. Badges/tags must be compact and non-clickable unless filtering.
   - **Form Fields**: Clear labels, accessible placeholders, distinct focus rings (`focus:ring-2 focus:ring-offset-2`), and descriptive error messages.
   - **Empty States & Loading**: Always provide thoughtful empty states with helpful illustrations or CTAs, and smooth skeleton loaders instead of jarring layout shifts.

---

## 📐 3. Standard Design Token System (Tailwind & CSS Variables)

```css
:root {
  /* Light Mode */
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  --border-subtle: #e2e8f0;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --accent-primary: #2563eb;
  --accent-hover: #1d4ed8;
  --accent-subtle: #eff6ff;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
}

[data-theme="dark"] {
  /* Dark Mode (Linear / Vercel Aesthetic) */
  --bg-primary: #09090b;
  --bg-secondary: #121215;
  --bg-tertiary: #18181b;
  --border-subtle: rgba(255, 255, 255, 0.08);
  --text-primary: #f4f4f5;
  --text-secondary: #a1a1aa;
  --text-muted: #71717a;
  --accent-primary: #3b82f6;
  --accent-hover: #60a5fa;
  --accent-subtle: rgba(59, 130, 246, 0.12);
}
```

---

## 📱 4. Responsive & Accessibility Baseline
- **Mobile First**: Fluid layouts (`flex`, `grid`, `clamp()`) that adapt naturally to 375px (Mobile), 768px (Tablet), and 1280px+ (Desktop).
- **Accessibility (a11y)**: Minimum WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text).
- **Interactive Feedback**: Visible `:focus-visible` outlines for keyboard navigators.
