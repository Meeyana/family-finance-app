import { auth } from './firebase'; // Access current user
import { getFamilyProfiles, getFamilySettings, getTransactions } from './firestoreRepository';
import { canViewAccountDashboard } from './permissionService';

const getMonthRange = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const startDate = `${year}-${month}-01`;

    // Simple trick to get last day: Day 0 of next month
    const lastDayNode = new Date(year, date.getMonth() + 1, 0);
    const endDay = String(lastDayNode.getDate()).padStart(2, '0');
    const endDate = `${year}-${month}-${endDay}`;

    return { startDate, endDate };
};

/**
 * Flow 3: Get Global Account Data (Owner/Partner Only)
 */
export const getAccountData = async (userRole, selectedMonth = new Date()) => {
    // 1. Check Permission
    if (!canViewAccountDashboard(userRole)) {
        throw new Error("ACCESS_DENIED: Account Dashboard is restricted to Owner/Partner.");
    }

    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("No User Logged In");

    const { startDate, endDate } = getMonthRange(selectedMonth);

    // 2. Fetch Data Parallel
    const [settings, profiles, transactions] = await Promise.all([
        getFamilySettings(uid),
        getFamilyProfiles(uid),
        getTransactions(uid, null, startDate, endDate) // Filtered by Month
    ]);

    // 3. Aggregate Data (Dynamic Sum for Month)
    // We cannot use profile.spent directly as that is All-Time.
    // We must sum the fetched transactions.

    const profilesDict = {};
    profiles.forEach(p => {
        profilesDict[p.id] = { ...p, spent: 0 }; // Reset spent for calculation
    });

    let totalSpent = 0;
    transactions.forEach(t => {
        totalSpent += t.amount || 0;
        if (profilesDict[t.profileId]) {
            profilesDict[t.profileId].spent += t.amount || 0;
        }
    });

    const totalLimit = settings?.totalLimit || 0;

    // Calculate Financial Status
    let financialStatus = '🟢 Healthy';
    if (totalLimit > 0) {
        const ratio = totalSpent / totalLimit;
        if (ratio >= 1.0) financialStatus = '🔴 Critical';
        else if (ratio >= 0.8) financialStatus = '🟡 Warning';
    }

    return {
        totalSpent,
        totalLimit,
        financialStatus,
        budgets: { profiles: profilesDict },
        transactions // For Chart
    };
};

/**
 * Flow 2: Get Profile Specific Data (Public to Family)
 */
export const getProfileData = async (profileId, selectedMonth = new Date()) => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("No User Logged In");

    const { startDate, endDate } = getMonthRange(selectedMonth);

    const [profiles, allTransactions] = await Promise.all([
        getFamilyProfiles(uid),
        getTransactions(uid, profileId, startDate, endDate)
    ]);

    const profile = profiles.find(p => p.id === profileId);
    if (!profile) throw new Error("Profile not found");

    // Dynamic Calc
    const monthlySpent = allTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

    // Calculate Status
    let statusIndicator = '🟢 Healthy';
    if (profile.limit > 0) {
        const ratio = monthlySpent / profile.limit;
        if (ratio >= 1.0) statusIndicator = '🔴 Over Budget';
        else if (ratio >= 0.7) statusIndicator = '🟡 Caution';
    }

    return {
        statusIndicator,
        budget: {
            limit: profile.limit,
            spent: monthlySpent
        },
        transactions: allTransactions.slice(0, 50) // More for history
    };
};
