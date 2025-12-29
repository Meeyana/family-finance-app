# Family Finance App (Quan Ly Chi Tieu Family)

A React Native mobile application for managing family finances with role-based access control (Owner, Partner, Child).
Built with **Expo**, **React Native**, and **Firebase Firestore**.

## Features

### 🔐 Authentication & Roles
- **Google / Email Auth** (via Firebase).
- **Auto-Initialization**: New accounts automatically get a default family structure (Dad, Mom, Kid).
- **Role-Based Access**:
    - **Owner/Partner**: Can view the full "Account Dashboard" (Family Totals).
    - **Child**: Can only view their own "Profile Dashboard".

### 💰 Budgeting
- **Monthly Budgets**: Set limits for each family member for specific months.
- **Real-time Tracking**: "Spent" amounts update immediately after adding a transaction.
- **Status Indicators**:
    - 🟢 Healthy (< 70%)
    - 🟡 Caution (70-99%)
    - 🔴 Over Budget (>= 100%)

### 📊 Dashboards
- **Profile Dashboard**: View personal spending, recent transactions, and budget health for the selected month.
- **Account Dashboard**: View aggregate family spending, total limit, and "Budget vs Actual" for all members.
- **Date Filtering**: Navigate between months (e.g., "January 2025") to view historic data.

### ⚙️ Settings
- **Manage Profiles**: Rename profiles (e.g., "Dad" -> "John") and update monthly limits.
- **Logout**: Securely sign out.

## Tech Stack
- **Framework**: React Native (Expo SDK 52)
- **Backend**: Firebase Firestore (Data), Firebase Auth
- **Navigation**: React Navigation (Native Stack)
- **UI Components**: `react-native-safe-area-context`, `expo-linear-gradient`, Custom Modals.

## Setup Instructions

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Environment Variables**
    Create a `.env` file in the root directory with your Firebase config:
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
    - Press `w` for Web.
    - Press `a` for Android Emulator.
    - Press `i` for iOS Simulator.

## Project Structure
- `src/components`: Reusable UI components (MonthPicker, BudgetProgressBar).
- `src/screens`: Main application screens (Home, Dashboards, Settings).
- `src/services`: Business logic and Backend integrations (dataService, firestoreRepository).
- `src/navigation`: Navigation configuration (AppStack).
