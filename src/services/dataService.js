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
 * Helper: Process Transactions for Dashboard
 */
const processTransactionsForDashboard = (transactions, settings, profiles) => {
    const profilesDict = {};
    profiles.forEach(p => {
        profilesDict[p.id] = { ...p, spent: 0, income: 0, financialStatus: '🟢 Healthy' };
    });

    let totalSpent = 0;
    let totalIncome = 0;
    let totalGiven = 0;
    let totalReceived = 0;

    transactions.forEach(t => {
        const amount = t.amount || 0;
        const isInternalTransfer = t.isTransfer
            || t.category === 'Granted'
            || t.category === 'Present'
            || (t.note && t.note.includes('(Granted)'))
            || t.type === 'transfer';

        if (isInternalTransfer) {
            const isGiven = (t.note && t.note.includes('Transfer to')) || t.category === 'Transfer Out' || t.categoryIcon === '💸';
            const isReceived = (t.note && t.note.includes('Received from')) || t.category === 'Allowance' || t.categoryIcon === '💰';

            if (isGiven) totalGiven += amount;
            else if (isReceived) totalReceived += amount;
            else {
                if (t.type === 'expense') totalGiven += amount;
                else if (t.type === 'income') totalReceived += amount;
                else totalGiven += amount;
            }
        } else {
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

    return {
        totalSpent: Math.round(totalSpent),
        totalIncome: Math.round(totalIncome),
        netCashflow: Math.round(netCashflow),
        totalGiven: Math.round(totalGiven),
        totalReceived: Math.round(totalReceived),
        profilesDict
    };
};

/**
 * Flow 3: Get Global Account Data (Owner/Partner Only)
 * Supports Single Month OR Custom Range
 */
export const getAccountData = async (userRole, dateOrRange) => {
    if (!canViewAccountDashboard(userRole)) {
        throw new Error("ACCESS_DENIED");
    }

    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("No User Logged In");

    let startDate, endDate;
    let isRange = false;

    // Detect if input is Date (Standard Month) or Object (Range)
    if (dateOrRange instanceof Date) {
        const range = getMonthRange(dateOrRange);
        startDate = range.startDate;
        endDate = range.endDate;
    } else {
        startDate = dateOrRange.startDate;
        endDate = dateOrRange.endDate;
        isRange = true;
    }

    // 2. Fetch Data Parallel
    const [settings, profiles, transactions] = await Promise.all([
        getFamilySettings(uid),
        getFamilyProfiles(uid),
        getTransactions(uid, null, startDate, endDate)
    ]);

    // 3. Aggregate Data
    const { totalSpent, totalIncome, netCashflow, totalGiven, totalReceived, profilesDict } = processTransactionsForDashboard(transactions, settings, profiles);

    // --- Analytics ---
    const now = new Date();
    // Simplified Burn Rate logic for ranges: just average per day in range
    const startObj = new Date(startDate);
    const endObj = new Date(endDate);
    const msPerDay = 1000 * 60 * 60 * 24;
    const totalDays = Math.ceil((endObj - startObj) / msPerDay) + 1;

    // For current month, we only count days passed. For ranges, we count total days (historical)
    // or days passed if range includes today?
    // Let's keep it simple: Burn Rate = Total / Total Days in Range
    const burnRate = totalDays > 0 ? totalSpent / totalDays : 0;

    // Projected only meaningful for CURRENT SINGLE MONTH usually.
    // If range, projected = totalSpent (historical).
    const projectedSpend = totalSpent;

    // Calculate Financial Status for each profile
    Object.values(profilesDict).forEach(p => {
        if (p.limit > 0) {
            // If Range, Scale Limit? Profile Limit is Monthly.
            // If viewing 1 Year, Limit should be *12?
            // Complex. For MVP, if Range > 35 days, maybe hide limit status or scale it?
            // Let's scale limit by months
            const monthsInRange = Math.max(1, totalDays / 30);
            const scaledLimit = p.limit * monthsInRange;

            const ratio = p.spent / scaledLimit;
            if (ratio >= 1.0) p.financialStatus = '🔴 Over';
            else if (ratio >= 0.8) p.financialStatus = '🟡 Caution';
        }
        if (p.financialStatus !== '🔴 Over' && (p.income - p.spent) < 0) {
            p.financialStatus = '🟠 Deficit';
        }
    });

    let overallStatus = '🟢 Healthy';
    if (netCashflow < 0) overallStatus = '🟠 Deficit';

    return {
        totalSpent,
        totalIncome,
        totalGiven,
        totalReceived,
        netCashflow,
        financialStatus: overallStatus,
        burnRate,
        projectedSpend,
        budgets: { profiles: profilesDict },
        transactions,
        totalLimit: (settings?.totalLimit || 0) * (totalDays / 30) // Scale global limit too
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
        totalSpent: Math.round(monthlySpent),
        totalIncome: Math.round(monthlyIncome),
        totalGiven: Math.round(totalGiven),     // Presents I GAVE
        totalReceived: Math.round(totalReceived),  // Presents I RECEIVED
        netCashflow: Math.round(monthlyIncome - monthlySpent),
        transactions: allTransactions
    };
};
