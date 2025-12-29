# 1. Product Overview

**Product name (working):** Family Financial Visibility System  
**Product type:** Multi-profile family finance management application  
**Core problem solved:** Lack of financial visibility, psychological friction, and absence of a unified financial picture within families and couples.

This system is **not** a traditional expense-tracking app. It is a **financial visibility and decision-support system** designed to reduce conflict, enable trust, and provide actionable insight at the family level.

---

# 2. Core Design Principles

1. **Human-first, not money-first** – Users interact as *people (profiles)*, not wallets.
2. **Separation of concerns** – Personal financial experience is isolated from family-level oversight.
3. **Transparency without intrusion** – Visibility is abstracted via status, not raw numbers.
4. **Decision-oriented analytics** – Data exists to guide action, not bookkeeping.

---

# 3. System Architecture Overview

```
Account (Family / Couple)
│
├── Profiles (Human Layer)
│   ├── Parent / Owner
│   ├── Partner
│   ├── Child
│
├── Transactions (Event Layer)
│
├── Aggregation Engine (Logic Layer)
│
└── Account Dashboard (Decision Layer)
```

---

# 4. Core Entities

## 4.1 Account (Family Level)
Represents a single family or couple.

**Responsibilities:**
- Owns all financial data
- Controls billing/subscription
- Hosts the **Account Dashboard**
- Defines global categories & rules

**Accessible by:** Owner / Partner only

---

## 4.2 Profile (Human Level)
Represents a real person within the family.

**Attributes:**
- Identity: name, avatar
- Role: Parent / Partner / Child
- Budget scope
- Spending permissions
- Financial status indicator (🟢🟡🔴)

Profiles never display full family finances.

---

## 4.3 Transaction
Atomic financial event created within a profile.

**Minimum fields:**
- Amount
- Category
- Timestamp
- Profile ID

Transactions are immutable and feed the aggregation engine.

---

# 5. Functional Scope by Layer

## 5.1 Profile Layer (Personal UX)

**Primary goal:** Enable safe, low-friction personal spending awareness.

**Key features:**
- Assigned monthly budget (total + per category)
- Allowed spending categories
- Simple expense logging
- Financial status (🟢🟡🔴)
- Budget usage visualization
- Soft alerts & threshold warnings
- Optional personal goals

**Explicit exclusions:**
- No access to other profiles’ transactions
- No family-wide totals
- No advanced analytics

---

## 5.2 Account Layer (Family UX)

**Primary goal:** Provide a clear, actionable picture of the family’s financial health.

**Account Dashboard modules:**

### A. Cashflow Overview
- Total income (period)
- Total expense (period)
- Net cashflow
- Burn rate

### B. Expense Breakdown by Profile
- Aggregated spending by each profile
- Relative contribution (percentage)

### C. Expense Breakdown by Category
- Housing
- Food
- Children
- Personal
- Leisure
- Emergency / Savings

### D. Budget vs Reality
- Highlight over-budget categories
- Highlight over-budget profiles

### E. Short-term Forecast
- Projected end-of-month balance
- Risk warnings (cashflow negative)

---

# 6. Permission & Visibility Model

| Role | View Own | View Others | View Account | Edit Budgets |
|----|--------|------------|-------------|--------------|
| Owner | ✔ | Summary | ✔ | ✔ |
| Partner | ✔ | Status | ✔ | Limited |
| Child | ✔ | ✖ | ✖ | ✖ |

Visibility favors **status abstraction over numeric exposure**.

---

# 7. Data Flow (Logical)

```
User Action (Profile)
   ↓
Transaction Created
   ↓
Profile-Level Summary Update
   ↓
Aggregation Engine
   ↓
Account-Level Metrics
   ↓
Account Dashboard
```

---

# 8. UX Layout Strategy (High-level)

## Home Screen
- Profile cards (people-first)
- Financial status indicators

## Profile Screen
- Remaining budget
- Category usage
- Status explanation
- Minimal transaction list

## Account Dashboard
- One-screen overview
- No scrolling reports
- Red/yellow/green decision cues

---

# 9. MVP Scope (Strict)

**Included:**
1. Account with multiple profiles
2. Role-based permission system
3. Budget by profile & category
4. Financial status indicator
5. Account dashboard (single view)
6. Alerts & thresholds

**Excluded:**
- Bank syncing
- AI insights
- Receipt scanning
- Long-term analytics

---

# 10. Strategic Differentiation

| Typical Finance App | This System |
|--------------------|------------|
| Expense tracking | Financial visibility |
| User = wallet | User = human |
| Data-heavy | Decision-focused |
| Micro-control | Psychological safety |

---

# 11. Key Takeaway for Stakeholders

This product is a **financial coordination system**, not an accounting tool.

It solves:
- Family financial blindness
- Emotional friction around money
- Lack of shared financial direction

The technical architecture is intentionally layered to preserve privacy while enabling governance.

