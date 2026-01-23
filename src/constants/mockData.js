// Purpose: Define mock data for development and "Demo User" flow
// Used by: AuthContext, HomeScreen

export const MOCK_PROFILES = [
    { id: '1', name: 'Dad', role: 'Owner', avatar: '👨' },
    { id: '2', name: 'Mom', role: 'Partner', avatar: '👩' },
    { id: '3', name: 'Kid', role: 'Basic', avatar: '👶' },
];

export const MOCK_USER_DATA = {
    uid: 'demo_user_123',
    email: 'demo@quanlychitieu.com',
    profiles: MOCK_PROFILES
};

export const MOCK_BUDGETS = {
    global: { limit: 10000000, currency: 'VND' },
    profiles: {
        '1': { limit: 5000000, spent: 2500000 }, // Dad
        '2': { limit: 3000000, spent: 2800000 }, // Mom
        '3': { limit: 500000, spent: 100000 },   // Kid
    }
};

export const MOCK_TRANSACTIONS = [
    { id: 't1', profileId: '1', amount: 50000, category: 'Food', date: '2025-10-25' },
    { id: 't2', profileId: '2', amount: 500000, category: 'Shopping', date: '2025-10-26' },
    { id: 't3', profileId: '3', amount: 20000, category: 'Toys', date: '2025-10-27' },
    { id: 't4', profileId: '1', amount: 1000000, category: 'Bills', date: '2025-10-28' },
];
