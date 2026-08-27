---
name: One Health Hub
colors:
  surface: '#f8f9ff'
  surface-dim: '#cfdbef'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dde9fd'
  surface-container-highest: '#d7e3f7'
  on-surface: '#101c2a'
  on-surface-variant: '#434752'
  inverse-surface: '#253140'
  inverse-on-surface: '#eaf1ff'
  outline: '#737783'
  outline-variant: '#c3c6d3'
  surface-tint: '#2b5cb0'
  primary: '#003a84'
  on-primary: '#ffffff'
  primary-container: '#1d51a5'
  on-primary-container: '#b2c8ff'
  inverse-primary: '#aec6ff'
  secondary: '#1b6d24'
  on-secondary: '#ffffff'
  secondary-container: '#a0f399'
  on-secondary-container: '#217128'
  tertiary: '#672b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#8b3d00'
  on-tertiary-container: '#ffb992'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#aec6ff'
  on-primary-fixed: '#001a43'
  on-primary-fixed-variant: '#004397'
  secondary-fixed: '#a3f69c'
  secondary-fixed-dim: '#88d982'
  on-secondary-fixed: '#002204'
  on-secondary-fixed-variant: '#005312'
  tertiary-fixed: '#ffdbc9'
  tertiary-fixed-dim: '#ffb68e'
  on-tertiary-fixed: '#331200'
  on-tertiary-fixed-variant: '#763300'
  background: '#f8f9ff'
  on-background: '#101c2a'
  surface-variant: '#d7e3f7'
  background-subtle: '#F1F3F6'
  status-success: '#2E7D32'
  status-warning: '#ED6C02'
  status-error: '#D32F2F'
  status-info: '#0288D1'
  surface-white: '#FFFFFF'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  status-disclaimer:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.05em
  headline-md-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  container-max: 1280px
---

## Brand & Style
The design system for the Regional One Health Data Convergence Hub is rooted in transparency, scientific rigor, and institutional authority. It serves as a bridge between complex data analysis and public health decision-making within the CEEAC region.

The aesthetic follows a **Modern Corporate** approach, characterized by high-density information layouts that remain legible through generous whitespace and a strictly logical hierarchy. The visual narrative balances the technical nature of "One Health" (Human, Animal, Environmental health) with a clean, accessible interface that feels reliable and "official." Every element is designed to minimize cognitive load, allowing regional stakeholders to focus on critical data trends and status alerts.

## Colors
The palette is dominated by an institutional Deep Blue (`#1D51A5`), representing authority and data integrity, and a Natural Green (`#2E7D32`), symbolizing the environmental and animal health components of the One Health mission.

**Usage Guidelines:**
- **Backgrounds:** Use `#FFFFFF` for primary surfaces and `#F1F3F6` for page-level backgrounds and container differentiation.
- **Grays:** Use `#5F6B7C` for secondary text and icons to maintain a softer, more professional contrast than pure black.
- **Status Tokens:** Semantic colors are reserved for data validation and urgency levels. These must be used consistently across badges, table indicators, and charts.

## Typography
The design system utilizes **Inter** exclusively to leverage its exceptional legibility in data-heavy environments. 

**Text Roles:**
- **Headlines:** Set in high weights (600-700) with slight negative letter-spacing for a modern, compact look.
- **Data Tables:** Use `body-md` for standard cell content.
- **Disclaimer:** The text "Données simulées — Version démonstrateur" must be styled using the `status-disclaimer` role, typically placed in the footer or directly under primary chart titles in an uppercase, subtle gray format to ensure transparency without distracting from the data.

## Layout & Spacing
The system employs a **12-column fixed grid** for desktop, centered within the viewport. Spacing follows a 4px base unit to ensure alignment in dense data visualizations.

- **Desktop:** 24px gutters with 48px page margins.
- **Mobile:** Transition to a fluid single-column layout with 16px horizontal margins.
- **Data Density:** In dashboards, use 12px or 16px padding within cards to maximize the "aéré" (airy) feel while maintaining a high information-to-ink ratio.

## Elevation & Depth
Depth is conveyed through **Tonal Layering** and **Ambient Shadows**. 

The primary canvas uses the subtle gray background, while interactive or primary content sits on white cards. Shadows are extremely soft: a 4px to 12px blur with very low opacity (5-10%) using the primary blue as a tint. This creates a "lifted" effect for cards without the clutter of heavy borders. Borders should be restricted to table dividers and input fields using a light gray tint.

## Shapes
A **Rounded** (8px / 0.5rem) shape language is applied to buttons, cards, and input fields. This softens the institutional feel, making the software appear modern and user-friendly. Status badges should utilize a full pill-shape (`rounded-xl` or 100px) to distinguish them clearly from interactive buttons.

## Components
- **Buttons:** Primary buttons use the Deep Blue background with white text. They are fully rounded (pill-style) or 8px radius depending on the context.
- **Data Tables:** Rows should have a subtle hover state (`#F1F3F6`). Use `label-sm` for column headers to differentiate from data.
- **Status Badges:**
  - **Validé (Success):** Green background (low opacity) with dark green text.
  - **Vérification (Warning):** Orange background (low opacity) with dark orange text.
  - **Critique (Error):** Red background (low opacity) with dark red text.
  - **Info (Info):** Blue background (low opacity) with dark blue text.
- **Cards:** White background, 8px corner radius, and a 1px soft border or light ambient shadow.
- **Inputs:** Clean, outlined boxes with a 1px stroke. Focus states should use a 2px primary blue halo.
- **Charts:** Use the primary and secondary colors for data series. Avoid high-saturation "neon" colors; stay within the institutional palette.