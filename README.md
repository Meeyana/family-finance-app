# Family Finance App (Quan Ly Chi Tieu Family)

A comprehensive React Native mobile application for managing family finances with role-based access control. Designed for families to track spending, analyze trends, and manage budgets collaboratively.

Built with **Expo** (SDK 52), **React Native**, and **Firebase Firestore**.

## ✨ Key Features

### 🔐 Authentication & Family Roles
- **Secure Login**: Google / Email Authentication via Firebase.
- **Auto-Initialization**: New accounts automatically generate a default family structure.
- **Role-Based Access Control (RBAC)**:
    - **Owner (Dad)**: Full access to all family data, settings, and category management.
    - **Partner (Mom)**: View access to family dashboards and analytics.
    - **Child**: Restricted access to only their own personal transactions and limits.

### 💰 Transaction Management
- **Add/Edit Transactions**: log expenses and income with ease.
- **Smart Filtering**:
    - **Search**: Find transactions instantly by searching notes (3+ characters).
    - **Category Filter**: Multi-select dropdown to filter specific categories.
    - **Date Picker**: Filter transactions by specific months.
- **Contextual Emojis**: Categories display simplified, consistent emojis across the app.

### 📊 Powerful Analytics
- **My Overview (Personal Dashboard)**:
    - **Net Cashflow**: Instant view of Income - Expense.
    - **Health Status**: Visual indicators (Healthy 🟢, Caution 🟡, Over Budget 🔴).
    - **Spending by Category**: Breakdown of expenses with percentage and specific category icons.
- **Detailed Analysis (Family/Owner)**:
    - **Monthly Trends**: Line charts visualizing spending over time.
    - **Income vs Expense**: Bar charts comparing inflow vs outflow.
    - **Category Breakdown**: Detailed visualization of where the money goes.

### 🛠️ Customization
- **Manage Categories**:
    - Add, Edit, Delete custom categories.
    - Toggle between **Expense** and **Income** types.
    - Assign unique icons to categories.
- **Profile Management**: Update names and monthly spending limits.

### 👨‍👩‍👧‍👦 Family Features
- **Money Requests**: Children can request funds with a reason and category.
- **Grant/Reject**: Parents receive requests and can approve or deny them instantly.
- **Request History**: A unified list showing the status of all past requests.

### 🎯 Savings Goals (Shared)
- **Visual Goals**: Set targets with progress bars and icons.
- **Collaboration**: Share goals with specific family members (e.g., "Holiday Fund" shared with Partner).
- **Contribution Tracking**:
    - See exactly who saved how much (percentage and amount).
    - Withdrawals are tracked and attributed to the user.
- **Editing**: Owners can modify goal details, sharing settings, or delete goals.

### 🔄 Recurring Transactions (Refined)
- **Subscription Manager**: Track Netflix, Rent, Salary, etc.
- **Flexible Durations**:
    - **Forever**: Infinite subscriptions (hidden deadlines for cleaner UI).
    - **Fixed**: Set duration (e.g., 12 months) with auto-calculated end dates ("Ends: Dec 2025").
- **Smart Logic**: Auto-generates transactions on the due date.

### 🩺 Financial Health Logic
- **Deficit Detection**: Smart logic detects if **Expenses > Income**.
- **Visual Status**:
    - **🟢 Healthy**: Under budget and positive cashflow.
    - **🟡 Caution**: Approaching budget limit.
    - **🟠 Deficit**: Spend > Income (Cashflow Negative).
    - **🔴 Critical/Over**: Exceeded budget limit.
- **Profile-Level Insight**: Immediate health status shown on the "Who is spending?" screen.

## 📱 Tech Stack
- **Frontend**: React Native, Expo, React Navigation 7.
- **Backend Service**: Firebase (Firestore Database, Authentication).
- **UI/UX**: `react-native-safe-area-context`, `expo-linear-gradient`, `react-native-gifted-charts`, `vector-icons`.
- **State Management**: React Context API (`AuthContext`) + DeviceEventEmitter for real-time refresh.

## 🚀 Setup Instructions

1.  **Clone & Install**
    ```bash
    git clone <repo-url>
    cd mobile
    npm install
    ```

2.  **Configuration (.env)**
    Create a `.env` file in the root directory (do not commit this file):
    ```env
    EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
    EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
    ```

3.  **Run the App**
    ```bash
    npx expo start --clear
    ```
    - Press `a` for Android (Emulator/Device).
    - Press `i` for iOS (Simulator).

## 📂 Project Structure
- `src/screens`:
    - `AccountDashboard`: Main overview of financial health.
    - `TransactionListScreen`: List, Search, and Filter transactions.
    - `AnalyzeScreen`: Charts and deep dive analytics.
    - `ManageCategoriesScreen`: Custom category configuration.
- `src/services`:
    - `firestoreRepository.js`: Central data access layer for Firebase.
    - `dataService.js`: Business logic aggregation.
- `src/components`: Reusable UI widgets (Charts, Pickers, Dropdowns).
