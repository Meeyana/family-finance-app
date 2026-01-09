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
        profilesDict[p.id] = { ...p, spent: 0, income: 0, financialStatus: '🟢 Healthy' }; // Reset spent for calculation
    });

    let totalSpent = 0;
    let totalIncome = 0;
    let totalGiven = 0;
    let totalReceived = 0;

    transactions.forEach(t => {
        const amount = t.amount || 0;

        // GLOBAL SNAPSHOT: Exclude internal transfers to avoid double counting
        // We check isTransfer flag, specific category names, OR the note signature
        const isInternalTransfer = t.isTransfer
            || t.category === 'Granted'
            || t.category === 'Present'
            || (t.note && t.note.includes('(Granted)'))
            || t.type === 'transfer'; // Explicitly check new type

        if (isInternalTransfer) {
            // Distinguish Direction based on Note keywords from processTransfer
            const isGiven = (t.note && t.note.includes('Transfer to')) || t.category === 'Transfer Out' || t.categoryIcon === '💸';
            const isReceived = (t.note && t.note.includes('Received from')) || t.category === 'Allowance' || t.categoryIcon === '💰';

            if (isGiven) {
                totalGiven += amount;
            } else if (isReceived) {
                totalReceived += amount;
            } else {
                // Fallback
                if (t.type === 'expense') totalGiven += amount;
                else if (t.type === 'income') totalReceived += amount;
                else totalGiven += amount;
            }
        } else {
            // NOT a transfer (Normal Income/Expense)
            if (t.type === 'income') {
                totalIncome += amount;
                if (profilesDict[t.profileId]) profilesDict[t.profileId].income += amount;
            } else {
                totalSpent += amount;
                if (profilesDict[t.profileId]) profilesDict[t.profileId].spent += amount;
            }
        }
    });

    const netCashflow = totalIncome - totalSpent;
    const totalLimit = settings?.totalLimit || 0;

    // --- Analytics ---
    const now = new Date();
    const isCurrentMonth = selectedMonth.getMonth() === now.getMonth() && selectedMonth.getFullYear() === now.getFullYear();
    const daysInMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();

    let daysPassed = daysInMonth;
    if (isCurrentMonth) daysPassed = Math.max(1, now.getDate());
    else if (selectedMonth > now) daysPassed = 0;

    const burnRate = daysPassed > 0 ? totalSpent / daysPassed : 0;
    const projectedSpend = isCurrentMonth ? burnRate * daysInMonth : totalSpent;

    // Calculate Financial Status
    let financialStatus = '🟢 Healthy';

    // Simple logic without limit: Warn if cashflow negative
    if (netCashflow < 0) {
        financialStatus = '🟠 Deficit';
    }

    // Calculate Financial Status for each profile
    Object.values(profilesDict).forEach(p => {
        if (p.limit > 0) {
            const ratio = p.spent / p.limit;
            if (ratio >= 1.0) p.financialStatus = '🔴 Over';
            else if (ratio >= 0.8) p.financialStatus = '🟡 Caution';
        }
        // Deficit Check
        if (p.financialStatus !== '🔴 Over' && (p.income - p.spent) < 0) {
            p.financialStatus = '🟠 Deficit';
        }
    });

    return {
        totalSpent,
        totalIncome,
        totalGiven,     // Family Volume Given
        totalReceived,  // Family Volume Received (should be same)
        netCashflow,
        financialStatus,
        burnRate,
        projectedSpend,
        budgets: { profiles: profilesDict },
        transactions
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
    let monthlySpent = 0;
    let monthlyIncome = 0;
    let totalGiven = 0;
    let totalReceived = 0;

    allTransactions.forEach(t => {
        const amount = t.amount || 0;

        // GLOBAL SNAPSHOT: Exclude internal transfers to avoid double counting
        const isInternalTransfer = t.isTransfer
            || t.category === 'Granted'
            || t.category === 'Present'
            || (t.note && t.note.includes('(Granted)'))
            || t.type === 'transfer';

        if (isInternalTransfer) {
            // Distinguish Direction based on Note keywords from processTransfer
            const isGiven = (t.note && t.note.includes('Transfer to')) || t.category === 'Transfer Out' || t.categoryIcon === '💸';
            const isReceived = (t.note && t.note.includes('Received from')) || t.category === 'Allowance' || t.categoryIcon === '💰';

            if (isGiven) {
                totalGiven += amount;
            } else if (isReceived) {
                totalReceived += amount;
            } else {
                // Fallback for older data
                if (t.type === 'expense') totalGiven += amount;
                else if (t.type === 'income') totalReceived += amount;
                else totalGiven += amount;
            }
        } else {
            if (t.type === 'income') {
                monthlyIncome += amount;
            } else {
                monthlySpent += amount;
            }
        }
    });

    // Calculate Status
    let statusIndicator = '🟢 Healthy';
    if (profile.limit > 0) {
        const ratio = monthlySpent / profile.limit;
        if (ratio >= 1.0) statusIndicator = '🔴 Over Budget';
        else if (ratio >= 0.7) statusIndicator = '🟡 Caution';
    }

    // Downgrade if Deficit
    if (statusIndicator !== '🔴 Over Budget' && (monthlyIncome - monthlySpent) < 0) {
        statusIndicator = '🟠 Deficit';
    }

    return {
        financialStatus: statusIndicator,
        totalLimit: profile.limit,
        totalSpent: monthlySpent,
        totalIncome: monthlyIncome,
        totalGiven,     // Presents I GAVE
        totalReceived,  // Presents I RECEIVED
        netCashflow: monthlyIncome - monthlySpent,
        transactions: allTransactions
    };
};
