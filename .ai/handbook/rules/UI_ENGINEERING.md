# UI Engineering Rules

## Philosophy

CSS is part of the architecture.

Every style must be predictable, composable, and design-token driven.

No visual value may exist without a reason.

Write CSS for 2026, not for Internet Explorer.
Embrace modern CSS fearlessly:

- `:has()`
- `color-mix()`
- `@layer`
- `nesting`
- `container queries`
- `logical properties`

## Browser Baseline

Target browsers:

- Latest Chrome
- Latest Edge
- Latest Safari
- Latest Firefox

No legacy browser support.
Do not implement fallbacks for unsupported browsers unless explicitly required.
Modern CSS features are assumed to be available.

## Progressive Enhancement

Modern features should enhance the experience.
The application must remain functional without:

- animations
- container queries
- `color-mix()`

Core functionality must never depend on visual enhancements.

## Vanilla Extract Conventions

One component. One style file.

**Prefer:**

```
Button/
  Button.tsx
  Button.css.ts
```

**Avoid:**

```
styles/
  buttons.css.ts
  forms.css.ts
  common.css.ts
```

Feature-wide common `styles.css.ts` files are forbidden.

Each `.css.ts` file may only export:

- `style()`
- `styleVariants()`
- `recipe()`
- `globalStyle()` (tokens/reset only)
- `createVar()`

**Forbidden:** Component styles must never import another component's `.css.ts` file.

## CSS Layers

Always use CSS layers to manage specificity across the project. Layer order must be standardized:

```css
@layer reset;
@layer tokens;
@layer base;
@layer components;
@layer utilities;
```

## Units

### Allowed

- `rem`
- `%` (only when required)
- `vh` / `vw` (only when justified)
- `fr`
- `auto`

### Forbidden

- `px`
- `em` (unless typography explicitly requires it)

## Logical CSS Properties

Use logical CSS properties instead of physical properties whenever possible.

**Prefer:**

- `margin-inline`
- `padding-inline`
- `padding-block`
- `inline-size`
- `block-size`
- `min-inline-size`
- `max-inline-size`

**Avoid (unless strictly necessary):**

- `margin-left`
- `margin-right`
- `width`
- `height`

This rule establishes a stronger foundation for internationalization (RTL/LTR), accessibility, and modern CSS architecture.

## Colors, Theme & Color Scheme

Colors must always come from design tokens.

### Theme Ownership

Theme definition is strictly layered.
`Light`, `Dark`, and `High Contrast` themes only change values at the **Theme** layer. Components must remain unaware of the active theme.

### Allowed

```css
hsl(var(--color-primary))
```

### Forbidden

- `#ffffff`
- `#000`
- `rgb(...)`
- `rgba(...)`
- `red`, `blue`, `green`

### Color Scheme

Always define `color-scheme` to ensure native UI elements match the theme.

```css
color-scheme: light dark;
```

## Spacing & Density

Spacing must use design tokens.

### Density Standard

Spacing systems must support multi-density scaling:

- `Compact`
- `Default`
- `Comfortable`
- `Touch`

### Component Spacing

Components must **not** carry their own outer spacing (e.g., margins). The parent container must provide the layout.

**Prefer:**

```css
.parent {
  display: grid;
  gap: var(--space-5);
}
```

**Avoid:**

```css
.card {
  margin-bottom: 2rem;
}
```

## Typography & Fluidity

Typography must be fully tokenized.

- `--font-body`, `--font-heading`, `--font-label`, `--font-mono`
- `--text-xs`, `--text-sm`, `--text-md`, `--text-lg`

### Fluid vs Fixed

Fluid typography should use `clamp()`. Fixed typography is allowed when responsiveness provides no value (e.g., captions, badges, table numbers).

```css
font-size: clamp(0.875rem, 0.82rem + 0.3vw, 1rem);
```

## Width & Height

Width should be content-driven.

### Avoid

Avoid `width: 100%`.

### Prefer

- `inline-size`
- `max-inline-size`
- `fit-content`
- `min()`
- `max()`
- `clamp()`

### Height & Aspect Ratio

Avoid fixed heights.
Prefer intrinsic sizing.
Use `aspect-ratio` whenever the media has a predictable ratio.

## Layout Strategies

Choose the layout primitive that best matches the problem:

- **Grid** → two-dimensional layouts
- **Flex** → one-dimensional layouts (Button group, Navbar, Inline badge list, Breadcrumb)
- **Position** → overlays only

### Overflow

Do **not** use `overflow: hidden` as a default solution to fix layout bugs. Only use it when truly required by the design intent.

## Responsive Design

Responsiveness must be component-based rather than viewport-based.

### Responsive Tokens

Avoid pixel breakpoints. Use semantic names for layout bounds:

- `--container-sm`
- `--container-md`
- `--container-lg`
  _(or compact, medium, expanded)_

### Responsive Strategy Official Order:

1. **Container Query**
2. **Intrinsic Layout** (`minmax()`, `clamp()`, `auto-fit`, `auto-fill`)
3. **Media Query** (Last resort)

## Z-Index Scale

Z-index must be strictly token-driven and follow a predefined global scale.

### Defined Hierarchy

0. base
1. sticky
2. dropdown
3. overlay
4. modal
5. toast
6. tooltip

## Borders

Border width and style must both use tokens.

```css
/* Always */
border: var(--border-width-default) var(--border-style-default)
  hsl(var(--border));
```

## Radius

Use tokens only.

```css
border-radius: var(--radius-md);
```

## Shadows

Only predefined elevation tokens.
Never stack arbitrary shadows. Shadow recipes belong to the Design System.

## Animations & Motion Tokens

Never animate layout. Animate paint or composite only (GPU accelerated).

### Allowed Properties

- `opacity`
- `transform`

### Forbidden Properties

- `width`, `height`, `top`, `left`, `margin`, `padding`

### Transitions

Both duration and easing must be tokens. `transition: all` is completely forbidden.

## Accessibility

Every component must satisfy:

- keyboard navigation
- visible focus
- semantic HTML first
- sufficient color contrast
- reduced motion support

ARIA is only used when native HTML cannot express semantics.

## Interactive Elements

### State via Data Attributes

Use state attributes rather than utility classes for interactive states. This is standard for modern component architectures.

```css
[data-state="open"]
[data-state="closed"]
[data-selected="true"]
[data-disabled="true"]
```

### Variant Standard

Every component must share a consistent semantic API for variants.

```tsx
<Button variant="primary" size="md" tone="success" loading disabled />
```

```css
/* CSS Usage */
[data-variant='primary'] {
}
```

### Focus

`outline: none` is completely forbidden without a robust fallback.
Every interactive element must explicitly define `:focus-visible`.

### Cursor

`cursor: pointer` is only allowed on genuinely interactive elements (buttons, links). Avoid throwing `cursor: pointer` onto arbitrary `div` wrappers.

## SVG & Icons

### SVG Styling

Always rely on currentColor for inheritance.

### Icon Tokens

Both size and stroke-width must be defined by tokens.

- `--icon-size-sm`, `--icon-size-md`, `--icon-size-lg`
- `--icon-stroke`

## CSS Specificity and Nesting

### CSS Nesting

Prefer native CSS nesting to reduce selector duplication.
Do not increase specificity unnecessarily.
Nesting depth should not exceed 2 levels.

## Design Tokens

Every visual value must originate from layered tokens. Custom CSS variables without structural naming are forbidden.

### Token Ownership Architecture

Token ownership flows strictly downwards.

```
Design System
    │
Primitive Tokens (e.g. --blue-500)
    │
Theme Tokens (e.g. Light/Dark mappings)
    │
Semantic Tokens (e.g. --color-primary)
    │
Component Tokens (e.g. --button-background)
    │
Feature Aliases (e.g. --checkout-button-background)
    │
Component Usage
```

- Features must never access Primitive tokens.
- Only the Design System modifies Primitive, Theme, and Semantic tokens.

### State Tokens

States (Hover, Active, Focus, Disabled) must be explicit tokens, not generated via opacity/filters inside the component.

```css
/* Correct */
--button-background
--button-background-hover
--button-background-active
--button-background-disabled
```

## Magic Numbers

Magic numbers are completely forbidden across all properties, not just spacing.

## Performance & Rendering

### Performance

- Avoid unnecessary DOM nodes.
- Prefer CSS over JavaScript for visual behaviors.
- Avoid expensive selectors.
- Avoid deep nesting.
- Avoid forced synchronous layouts.

### Rendering

Prefer:

- `content-visibility`
- `contain`
- `contain-intrinsic-size`

where appropriate to optimize rendering performance.

## Escape Hatch

Breaking these rules requires:

1. documented justification
2. code review approval
3. comment explaining why

## Forbidden

Never use:

- `!important`
- inline styles
- CSS Modules
- Styled Components
- Emotion
- Tailwind
- Bootstrap
- Material UI styling
- magic numbers
- hardcoded colors
- hardcoded spacing
- `transition: all`
- `outline: none` (without `:focus-visible` fallback)
- `width: 100%` (without justification)

## CSS Review Checklist

Every pull request must verify:

- [ ] Uses design tokens only
- [ ] Uses logical properties
- [ ] No `px`
- [ ] No hardcoded colors
- [ ] No `!important`
- [ ] No `transition: all`
- [ ] No `width: 100%` without justification
- [ ] No fixed height
- [ ] No selector depth > 2
- [ ] Accessibility verified
- [ ] Reduced motion verified
- [ ] Container Query considered before Media Query

## Enforcement

Engineering rules must be enforced automatically whenever possible. Documentation alone is not considered enforcement.

Preferred mechanisms:

- ESLint
- TypeScript
- **Stylelint** (Mandatory rules: `stylelint-config-standard`, `stylelint-order`, `stylelint-declaration-strict-value` to enforce token usage for colors, spacing, z-index, duration)
- `postcss-logical` (only if needed)
- CI checks
