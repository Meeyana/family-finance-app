# Purpose
This file defines **all core application flows** in a **machine‑readable, AI‑friendly format**.

Goals:
- AI can parse, reason, and regenerate diagrams / UX / logic
- Humans can read without ambiguity
- Can be converted to Mermaid, BPMN, or sequence diagrams

Format choice:
- **YAML‑style structured text** (LLMs parse this best)
- Explicit nodes, actions, decisions, transitions
- No UI decoration, no emojis

---

# Global Definitions

actors:
  - User
  - Profile
  - Account
  - AggregationEngine

entities:
  - Transaction
  - Budget
  - Category
  - Status

---

# Flow 1: Account ↔ Profile ↔ Transaction (Global Flow)

flow_id: GLOBAL_FLOW
start: User_Login

nodes:
  User_Login:
    type: action
    actor: User
    next: Select_Account

  Select_Account:
    type: action
    actor: User
    next: Home_Screen

  Home_Screen:
    type: view
    actor: User
    options:
      - Select_Profile
      - Open_Account_Dashboard

  Select_Profile:
    type: navigation
    condition: User selects own profile
    next: Profile_Dashboard

  Open_Account_Dashboard:
    type: navigation
    condition: Role is Owner or Partner
    next: Account_Dashboard

  Profile_Dashboard:
    type: view
    actor: Profile
    next: Create_Transaction

  Create_Transaction:
    type: action
    actor: Profile
    output: Transaction
    next: Validate_Spending_Rules

  Validate_Spending_Rules:
    type: decision
    actor: System
    rules:
      - Budget_Limit
      - Category_Permission
    outcomes:
      Allowed: Save_Transaction
      Blocked: Show_Warning

  Show_Warning:
    type: feedback
    actor: System
    end: true

  Save_Transaction:
    type: persistence
    actor: System
    next: Update_Profile_Summary

  Update_Profile_Summary:
    type: computation
    actor: System
    updates:
      - Budget_Usage
      - Status
    next: Trigger_Alerts

  Trigger_Alerts:
    type: event
    actor: System
    next: Aggregate_Transaction

  Aggregate_Transaction:
    type: computation
    actor: AggregationEngine
    next: Update_Account_Metrics

  Update_Account_Metrics:
    type: computation
    actor: System
    next: Account_Dashboard

  Account_Dashboard:
    type: view
    actor: Account
    components:
      - Cashflow_Overview
      - Expense_By_Profile
      - Expense_By_Category
      - Budget_vs_Actual
      - Forecast
    end: true

---

# Flow 2: Profile Spending Flow (Detailed)

flow_id: PROFILE_SPENDING_FLOW
start: Open_Profile

nodes:
  Open_Profile:
    type: view
    actor: Profile
    next: View_Budget_Status

  View_Budget_Status:
    type: view
    data:
      - Remaining_Budget
      - Category_Usage
      - Current_Status
    next: Add_Expense

  Add_Expense:
    type: action
    actor: Profile
    input:
      - Amount
      - Category
    next: Evaluate_Threshold

  Evaluate_Threshold:
    type: decision
    actor: System
    thresholds:
      normal: usage < 70%
      warning: 70% <= usage < 100%
      critical: usage >= 100%
    outcomes:
      normal: Save_Transaction
      warning: Save_With_Warning
      critical: Block_or_Allow_By_Rule

  Save_With_Warning:
    type: feedback
    actor: System
    next: Save_Transaction

  Block_or_Allow_By_Rule:
    type: decision
    actor: System
    rule: OverBudgetPolicy
    outcomes:
      allow: Save_Transaction
      block: Show_Block_Message

  Show_Block_Message:
    type: feedback
    end: true

---

# Flow 3: Account Dashboard Analysis Flow

flow_id: ACCOUNT_ANALYSIS_FLOW
start: Open_Account_Dashboard

nodes:
  Open_Account_Dashboard:
    type: view
    actor: Account
    next: Load_Aggregated_Data

  Load_Aggregated_Data:
    type: data_fetch
    sources:
      - Transactions
      - Budgets
      - Profiles
    next: Compute_Metrics

  Compute_Metrics:
    type: computation
    outputs:
      - Total_Income
      - Total_Expense
      - Net_Cashflow
      - Burn_Rate
    next: Render_Dashboard

  Render_Dashboard:
    type: view
    components:
      - Expense_By_Profile
      - Expense_By_Category
      - Budget_Comparison
      - Forecast_End_Period
    end: true

---

# Permission Model (Machine‑Readable)

permissions:
  Owner:
    view:
      - All_Profiles_Summary
      - Account_Dashboard
    edit:
      - Budgets
      - Categories
      - Rules

  Partner:
    view:
      - Own_Profile
      - Account_Dashboard
    edit:
      - Own_Profile

  Child:
    view:
      - Own_Profile
    edit:
      - Own_Transactions

---

# Notes for AI / Automation

- Each `flow_id` is independent and composable
- Nodes are deterministic and referenceable
- Can be auto‑converted to:
  - Mermaid flowchart
  - Sequence diagram
  - API contract
  - UX wireframe steps

This file is the **single source of truth** for product, UX, and backend logic.

