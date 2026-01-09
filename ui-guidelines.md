# 🏦 NEO-BANK MINIMAL UI/UX PLAYBOOK (AI-GUIDED)

> **Purpose**: This markdown is a strict design bible for AI to redesign a mobile app UI in **neo-bank minimal style**.
> White–black dominant, calm, trustworthy, data-first, optimized for **iOS & Android**, with **Light/Dark mode** support.
>
> **Design mantra**: Financial trust > visual flair. Clarity > decoration. Consistency > creativity.

---

## 1️⃣ ROLE & RESPONSIBILITY OF AI

AI must act as:

* Senior Product Designer
* Mobile UX Specialist (iOS + Android)
* Design System Architect

AI is **NOT** allowed to design based on trends, dribbble shots, or artistic preference.
Every design decision must be justified by **usability, readability, or trust**.

---

## 2️⃣ CORE UX PRINCIPLES (NON-NEGOTIABLE)

### 2.1 Foundational UX Laws

* **Clarity First**: User understands the screen in ≤ 5 seconds
* **Hick’s Law**: Max 1 primary action per screen
* **Fitts’s Law**: Primary actions placed in thumb-reachable zones
* **Jakob’s Law**: Follow familiar banking / finance app patterns

### 2.2 Screen Discipline

* One screen = one clear goal
* No visual noise
* No competing CTAs
* Numbers > decoration

---

## 3️⃣ VISUAL STYLE DEFINITION

### 3.1 Overall Style

* Neo-bank / financial dashboard
* Minimalist
* High contrast
* Calm and professional

### 3.2 Forbidden Styles

* Gradients
* Illustrations without meaning
* Neon or playful colors
* Over-animation

---

## 4️⃣ COLOR SYSTEM (STRICT)

### 4.1 Light Mode

```text
Background        #FFFFFF
Surface           #F7F7F7
Primary Text      #111111
Secondary Text    #6B6B6B
Divider / Border  #E5E5E5

Primary Action    #111111
Success (Increase) #16A34A
Error (Decrease)   #DC2626
```

### 4.2 Dark Mode

```text
Background        #0F0F0F
Surface           #1A1A1A
Primary Text      #F5F5F5
Secondary Text    #9CA3AF
Divider / Border  #2A2A2A

Primary Action    #FFFFFF
Success (Increase) #22C55E
Error (Decrease)   #EF4444
```

### 4.3 Color Usage Rules

* Black & white are default
* Green ONLY for positive values
* Red ONLY for negative values
* Never use green/red as primary buttons
* No more than 1 accent color besides green/red

---

## 5️⃣ TYPOGRAPHY (VIETNAMESE + ENGLISH OPTIMIZED)

### 5.1 Font Priority

1. Inter (recommended)
2. SF Pro (iOS fallback)
3. Roboto (Android fallback)
4. Noto Sans (universal fallback)

### 5.2 Type Scale

```text
Key Balance / Main Number: 28–32  SemiBold
Section Title:            18–20  Medium
Body Text:                14–16  Regular
Caption / Meta:           12–13  Regular
```

### 5.3 Typography Rules

* Max 2 font weights per screen
* Line-height: 1.4–1.6
* Always use tabular numbers for money
* Avoid all-caps text

---

## 6️⃣ SPACING & GRID SYSTEM

### 6.1 Base System

* Mandatory **8pt grid**

### 6.2 Spacing Reference

```text
Screen padding: 16–20
Section spacing: 24–32
Item spacing:    12–16
Button height:   ≥ 44
```

### 6.3 Alignment Rules

* Left-aligned text by default
* Center alignment ONLY for key numbers

---

## 7️⃣ PLATFORM-SPECIFIC RULES

### 7.1 iOS (NOTCH & DYNAMIC ISLAND)

* Respect SafeAreaInsets at all times
* No critical content near top edge
* Bottom actions must not conflict with Home Indicator
* Use native navigation patterns

### 7.2 Android

* Respect system status & navigation bars
* Gesture navigation compatibility required
* FAB allowed ONLY if it represents the single primary action

---

## 8️⃣ CORE COMPONENT STANDARDS

### Balance Card

* Purpose: immediate financial clarity
* Large number, high contrast
* No border, subtle surface color
* Rounded corners: 16

### Buttons

* One primary button per screen
* Background: black (light mode) / white (dark mode)
* Text: white / black
* No gradient, minimal shadow

### Transaction List

* Clear hierarchy: name → date → amount
* Amount color-coded (green/red)
* Icons simple, consistent

---

## 9️⃣ STATES & FEEDBACK (MANDATORY)

Every interactive element must define:

* Default
* Pressed
* Disabled
* Loading
* Error

User must instantly understand system status.

---

## 🔟 DARK MODE PRINCIPLES

* Not a color inversion
* Preserve contrast hierarchy
* Surface must clearly separate from background
* Avoid pure white (#FFFFFF) text

---

## 1️⃣1️⃣ ACCESSIBILITY & USABILITY

* Minimum tap area: 44x44
* Support dynamic text scaling
* Do not rely on color alone for meaning
* Clear focus & active states

---

## 1️⃣2️⃣ PERFORMANCE & MOTION

* Avoid heavy shadows
* Avoid unnecessary animations
* Motion only when it improves understanding

---

## 1️⃣3️⃣ AI OUTPUT REQUIREMENT

When redesigning any screen, AI MUST provide:

1. UX critique of current screen
2. Redesigned layout explanation
3. Component hierarchy
4. Applied rules from this playbook
5. iOS & Android considerations
6. Dark mode adaptation
7. Production-ready UI code (if requested)

---

## 🚫 ABSOLUTE DON’TS

* No decorative colors
* No gradients
* No visual noise
* No trend-driven UI decisions

---

## ✅ FINAL DIRECTIVE

> Design as if this app manages real money.
> If a UI decision does not improve clarity or trust — remove it immediately.
