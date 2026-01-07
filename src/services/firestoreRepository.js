// ------------------------------------------------------------------
// Service: Firestore Repository
// Purpose: Centralizes all direct interactions with Firebase Firestore.
// Role: Data Access Layer (DAL) for "artifacts/quan-ly-chi-tieu-family"
//
// Structure:
// - users/{uid} (Family Root)
//   - profiles/ (Collection)
//   - transactions/ (Collection)
//   - categories/ (Collection) [NEW: Phase 2.1]
//
// Rules:
// - All data is scoped to specific user UID
// - Returns plain objects, not Firestore snapshots
// ------------------------------------------------------------------

import { db } from './firebase';
import { doc, getDoc, setDoc, collection, getDocs, addDoc, updateDoc, increment, deleteDoc, writeBatch } from 'firebase/firestore';

const APP_ID = 'quan-ly-chi-tieu-family';

const getFamilyRef = (uid) => doc(db, 'artifacts', APP_ID, 'users', uid);

// IMPLEMENTED: Default data seeding
const DEFAULT_PROFILES = [
    { id: 'dad', name: 'Dad', role: 'Owner', limit: 20000000, spent: 0 },
    { id: 'mom', name: 'Mom', role: 'Partner', limit: 3000000, spent: 0 },
    { id: 'child', name: 'Kid', role: 'Child', limit: 500000, spent: 0 }
];

const DEFAULT_CATEGORIES = [
    { id: 'food', name: 'Food', icon: '🍔', type: 'expense' },
    { id: 'transport', name: 'Transport', icon: '🚕', type: 'expense' },
    { id: 'utilities', name: 'Utilities', icon: '💡', type: 'expense' },
    { id: 'entertainment', name: 'Entertainment', icon: '🎬', type: 'expense' },
    { id: 'shopping', name: 'Shopping', icon: '🛍️', type: 'expense' },
    // Income Defaults
    { id: 'salary', name: 'Salary', icon: '💰', type: 'income' },
    { id: 'bonus', name: 'Bonus', icon: '🎁', type: 'income' },
    { id: 'investment', name: 'Investment', icon: '📈', type: 'income' }
];

// ------------------------------------------------------------------
// Core Family & Profile Management
// ------------------------------------------------------------------

/**
 * Initialize family data for a new user
 */
export const initializeFamily = async (uid, email) => {
    const familyRef = getFamilyRef(uid);
    const familySnap = await getDoc(familyRef);

    if (!familySnap.exists()) {
        console.log('🔥 Initializing new Family for:', uid);

        // 1. Create Root Family Document (Global Budget)
        await setDoc(familyRef, {
            ownerEmail: email,
            totalLimit: 30000000, // Default 30M
            createdAt: new Date().toISOString()
        });

        // 2. Create Default Profiles
        const profilesCol = collection(familyRef, 'profiles');
        for (const p of DEFAULT_PROFILES) {
            await setDoc(doc(profilesCol, p.id), { ...p, earned: 0 });
        }
        return true;
    }
    return false; // Already exists
};

/**
 * Get all profiles for the family
 */
export const getFamilyProfiles = async (uid) => {
    const familyRef = getFamilyRef(uid);
    const profilesCol = collection(familyRef, 'profiles');
    const snapshot = await getDocs(profilesCol);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Get family global settings/budget
 */
export const getFamilySettings = async (uid) => {
    const familyRef = getFamilyRef(uid);
    const snap = await getDoc(familyRef);
    return snap.exists() ? snap.data() : null;
};

// ------------------------------------------------------------------
// Transaction Management
// ------------------------------------------------------------------

/**
 * Add a transaction and update running totals
 */
export const addTransaction = async (uid, transaction) => {
    const familyRef = getFamilyRef(uid);
    const transactionsCol = collection(familyRef, 'transactions');
    const profileRef = doc(familyRef, 'profiles', transaction.profileId);

    // Default to 'expense' if not specified
    const type = transaction.type || 'expense';

    // 1. Add Transaction Record
    const docRef = await addDoc(transactionsCol, {
        ...transaction,
        type,
        createdAt: new Date().toISOString()
    });

    // 2. Update Profile Totals based on Type
    if (type === 'income') {
        await updateDoc(profileRef, {
            earned: increment(transaction.amount)
        });
    } else {
        await updateDoc(profileRef, {
            spent: increment(transaction.amount)
        });
    }

    return docRef.id;
};

/**
 * Update an existing transaction
 */
export const updateTransaction = async (uid, transactionId, oldData, newData) => {
    const familyRef = getFamilyRef(uid);
    const transactionRef = doc(familyRef, 'transactions', transactionId);
    const profileRef = doc(familyRef, 'profiles', oldData.profileId);

    // 1. Calculate Amount Difference
    const amountDiff = newData.amount - oldData.amount;

    // 2. Update Transaction
    await updateDoc(transactionRef, newData);

    // 3. Update Profile Spent if amount changed logic
    // Logic: 
    // If expense -> expense: (+ new - old) to spent
    // If income -> income: (+ new - old) to earned
    // If switching types: complicated, but for MVP simplify:
    // We assume type doesn't change freely without logic, but let's handle simple amount updates for now.

    if (oldData.type === 'income') {
        await updateDoc(profileRef, { earned: increment(amountDiff) });
    } else {
        await updateDoc(profileRef, { spent: increment(amountDiff) });
    }
    return true;
};

/**
 * Delete a transaction
 */
export const deleteTransaction = async (uid, transactionId, oldData) => {
    const familyRef = getFamilyRef(uid);
    const transactionRef = doc(familyRef, 'transactions', transactionId);
    // Safeguard: Ensure profileId exists
    if (!oldData.profileId) {
        console.warn('⚠️ DeleteTransaction: Missing profileId, only deleting transaction doc.');
        batch.delete(transactionRef);
        await batch.commit();
        return true;
    }

    const profileRef = doc(familyRef, 'profiles', oldData.profileId);
    const batch = writeBatch(db);

    // 1. Delete Main Transaction
    batch.delete(transactionRef);

    // 2. Refund Main Profile
    // If type is 'transfer', we do NOTHING to the balance (since we didn't touch it on creation)
    if (oldData.type !== 'transfer') {
        const refundAmount = Number(oldData.amount) || 0;
        if (oldData.type === 'income') {
            batch.update(profileRef, { earned: increment(-refundAmount) });
        } else {
            batch.update(profileRef, { spent: increment(-refundAmount) });
        }
    }

    // 3. Handle Linked Transaction (if any)
    if (oldData.linkedTransferId) {
        console.log(`🔗 Deleting linked transaction: ${oldData.linkedTransferId}`);
        const linkedTxRef = doc(familyRef, 'transactions', oldData.linkedTransferId);
        try {
            const linkedTxSnap = await getDoc(linkedTxRef);
            if (linkedTxSnap.exists()) {
                const linkedData = linkedTxSnap.data();
                if (linkedData.profileId) {
                    const linkedProfileRef = doc(familyRef, 'profiles', linkedData.profileId);
                    const linkedRefund = Number(linkedData.amount) || 0;

                    // Delete Linked Tx
                    batch.delete(linkedTxRef);

                    // Refund Linked Profile
                    // Only refund if it was NOT a neutral transfer
                    if (linkedData.type !== 'transfer') {
                        if (linkedData.type === 'income') {
                            batch.update(linkedProfileRef, { earned: increment(-linkedRefund) });
                        } else {
                            batch.update(linkedProfileRef, { spent: increment(-linkedRefund) });
                        }
                    }
                }
            }
        } catch (linkErr) {
            console.warn('⚠️ Failed to fetch linked transaction, skipping link cleanup', linkErr);
        }
    } else if (oldData.isTransfer) {
        // Fallback: If this is a transfer but linkedTransferId is on the OTHER side (bi-directional check might be needed if not standardized)
        // For now, our processTransfer links the Income back to Expense.
        // If we strictly follow processTransfer, the Income has linkedTransferId.
        // The Expense (Sender) might not have it unless we update line 380ish to match.
        // Let's verify processTransfer again.
    }

    await batch.commit();
    return true;
};

/**
 * Get transactions
 */
export const getTransactions = async (uid, profileId = null, startDate = null, endDate = null) => {
    const familyRef = getFamilyRef(uid);
    const transactionsCol = collection(familyRef, 'transactions');

    const snapshot = await getDocs(transactionsCol);
    let txs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    if (profileId) {
        txs = txs.filter(t => t.profileId === profileId);
    }

    if (startDate && endDate) {
        txs = txs.filter(t => {
            return t.date >= startDate && t.date <= endDate;
        });
    }

    return txs.sort((a, b) => new Date(b.date) - new Date(a.date));
};

// ------------------------------------------------------------------
// Categories Management
// ------------------------------------------------------------------ 

/**
 * Fetch all available categories
 */
export const getFamilyCategories = async (uid, profileId = null, role = null) => {
    console.log(`📥 Repo: Fetching categories for ${uid}, profile: ${profileId}, role: ${role}`);
    const familyRef = getFamilyRef(uid);
    const categoriesCol = collection(familyRef, 'categories');

    const snapshot = await getDocs(categoriesCol);
    const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (profileId) {
        return categories.filter(c => {
            // Owner sees EVERYTHING to manage
            if (role && role.trim().toLowerCase() === 'owner') return true;

            const isMine = c.ownerId === profileId;

            // High Priority: Check explicit 'sharedWith' array
            // If the category has been migrated/edited to have sharedWith, we MUST respect it.
            // Even if it is a system category (!ownerId).
            if (Array.isArray(c.sharedWith)) {
                const isGlobal = c.sharedWith.includes('ALL');
                const isSharedWithMe = c.sharedWith.includes(profileId);
                return isMine || isGlobal || isSharedWithMe;
            }

            // Low Priority: Legacy Fallback
            // If no sharedWith array, we assume default behavior.
            const isSystem = !c.ownerId; // System defaults to visible
            const isLegacyShared = c.isShared === true;
            return isMine || isSystem || isLegacyShared;
        });
    }

    return categories;
};

export const initializeCategories = async (uid) => {
    console.log(`🛠️ Repo: Checking categories for ${uid}...`);
    const familyRef = getFamilyRef(uid);
    const categoriesCol = collection(familyRef, 'categories');

    const snapshot = await getDocs(categoriesCol);

    if (snapshot.empty) {
        console.log('🔥 Repo: Seeding DEFAULT_CATEGORIES...');
        // Defaults: ownerId=null (System), isShared=true implicitly
        await Promise.all(DEFAULT_CATEGORIES.map(cat =>
            setDoc(doc(categoriesCol, cat.id), { ...cat, isShared: true })
        ));
        return true;
    }
    return false;
};

// ...

export const addCategory = async (uid, name, icon = '🏷️', type = 'expense', ownerId = null, isShared = false) => {
    console.log(`📝 Repo: Adding category "${name}" (${type}) Owner:${ownerId} Shared:${isShared}`);
    const familyRef = getFamilyRef(uid);
    const categoriesCol = collection(familyRef, 'categories');

    // Use addDoc for auto-generated unique IDs to prevent name collisions
    const docRef = await addDoc(categoriesCol, {
        name,
        icon,
        type,
        ownerId,
        isShared,
        createdAt: new Date().toISOString()
    });

    return docRef.id;
};

/**
 * Delete a category
 * Used by: ManageCategoriesScreen
 */
export const deleteCategory = async (uid, categoryId) => {
    console.log(`🗑️ Repo: Deleting category "${categoryId}"`);
    const familyRef = getFamilyRef(uid);
    const categoryRef = doc(familyRef, 'categories', categoryId);
    await deleteDoc(categoryRef);
    return true;
};

export const updateCategory = async (uid, categoryId, data) => {
    console.log(`📝 Repo: Updating category "${categoryId}"`);
    const familyRef = getFamilyRef(uid);
    const categoryRef = doc(familyRef, 'categories', categoryId);
    await updateDoc(categoryRef, data);
    return true;
};

// ------------------------------------------------------------------
// Profile Management
// ------------------------------------------------------------------

export const updateProfile = async (uid, profileId, data) => {
    const familyRef = getFamilyRef(uid);
    const profileRef = doc(familyRef, 'profiles', profileId);

    await updateDoc(profileRef, data);
    return true;
};

export const addProfile = async (uid, profileData) => {
    console.log(`👤 Repo: Adding profile "${profileData.name}"`);
    const familyRef = getFamilyRef(uid);
    const profilesCol = collection(familyRef, 'profiles');

    // Generate simple ID
    const id = profileData.name.toLowerCase().replace(/\s+/g, '');

    await setDoc(doc(profilesCol, id), {
        id,
        ...profileData,
        spent: 0,
        earned: 0
    });
    return id;
};

export const deleteProfile = async (uid, profileId) => {
    console.log(`🔥 Repo: Deleting profile ${profileId} and ALL transactions`);
    const familyRef = getFamilyRef(uid);

    // 1. Delete all transactions for this profile
    const transactionsCol = collection(familyRef, 'transactions');
    const snapshot = await getDocs(transactionsCol);

    const deletePromises = [];
    snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (data.profileId === profileId) {
            deletePromises.push(deleteDoc(docSnap.ref));
        }
    });

    await Promise.all(deletePromises);
    console.log(`🗑️ Deleted ${deletePromises.length} transactions`);

    // 2. Delete the profile doc
    const profileRef = doc(familyRef, 'profiles', profileId);
    await deleteDoc(profileRef);

    return true;
};


// ------------------------------------------------------------------
// Money Requests & Transfers (Period 1)
// ------------------------------------------------------------------

/**
 * Process a transfer (Approve Request or Grant Money)
 * Atomic operation: Deduct from Sender -> Add to Receiver -> Update Request (optional)
 * 
 * @param {string} uid - User ID
 * @param {string} fromProfileId - Sender Profile ID (Admin)
 * @param {string} toProfileId - Receiver Profile ID (Child/Partner)
 * @param {number} amount - Amount to transfer
 * @param {object} categoryData - { id, name, icon } for the transaction record
 * @param {string} reason - Description/Note
 * @param {string} linkedRequestId - Optional: ID of the request being approved
 */
export const processTransfer = async (uid, fromProfileId, toProfileId, amount, categoryData, reason, linkedRequestId = null) => {
    console.log(`💸 Repo: Processing transfer ${amount} from ${fromProfileId} to ${toProfileId}`);
    const familyRef = getFamilyRef(uid);
    const batch = writeBatch(db);

    const timestamp = new Date().toISOString();
    const dateOnly = timestamp.split('T')[0]; // Matches app convention (YYYY-MM-DD)

    // 1. Create Expense for Sender (Transfer Out)
    // We create a reference first so we can link it
    // 1. Create References First (for bidirectional linking)
    const expenseRef = doc(collection(familyRef, 'transactions'));
    const incomeRef = doc(collection(familyRef, 'transactions'));

    // 2. Set Expense Side (Sender) -> Now just 'transfer'
    batch.set(expenseRef, {
        profileId: fromProfileId,
        amount: Number(amount),
        type: 'transfer', // Changed from 'expense'
        category: categoryData.name || 'Transfer Out',
        categoryId: categoryData.id || 'transfer_out',
        categoryIcon: categoryData.icon || '💸',
        date: dateOnly,
        note: `(Granted) Transfer to ${toProfileId}: ${reason}`,
        isTransfer: true,
        linkedTransferId: incomeRef.id,
        createdAt: timestamp
    });

    // 3. Set Income Side (Receiver) -> Now just 'transfer'
    batch.set(incomeRef, {
        profileId: toProfileId,
        amount: Number(amount),
        type: 'transfer', // Changed from 'income'
        category: categoryData.name || 'Allowance',
        categoryId: categoryData.id || 'allowance',
        categoryIcon: categoryData.icon || '💰',
        date: dateOnly,
        note: `(Granted) Received from ${fromProfileId}: ${reason}`,
        isTransfer: true,
        linkedTransferId: expenseRef.id,
        createdAt: timestamp
    });

    // 4. Update Profiles
    // USER REQUEST: Do NOT update 'spent' or 'earned' for internal transfers.
    // Confirmed: "Just a trade money for user?" -> Neutral operation.
    // We skip the profileRef increments here.

    // 5. Update Request Status (if linked)
    if (linkedRequestId) {
        console.log(`🔗 Repo: Linking to Request ${linkedRequestId}`);
        const requestRef = doc(familyRef, 'requests', linkedRequestId);
        batch.update(requestRef, {
            status: 'APPROVED',
            approvedBy: fromProfileId,
            updatedAt: timestamp
        });
    }

    await batch.commit();
    console.log('✅ Transfer processed successfully');
    return { expenseId: expenseRef.id, incomeId: incomeRef.id };
};

/**
 * Create a new Money Request
 */
export const addRequest = async (uid, requestData) => {
    console.log(`🙏 Repo: Adding request for ${requestData.amount} by ${requestData.createdByProfileId}`);
    const familyRef = getFamilyRef(uid);
    const requestsCol = collection(familyRef, 'requests');

    const docRef = await addDoc(requestsCol, {
        ...requestData,
        status: 'PENDING',
        createdAt: new Date().toISOString()
    });
    return docRef.id;
};

/**
 * Get Requests with optional filtering
 */
export const getRequests = async (uid, profileId = null, role = null) => {
    const familyRef = getFamilyRef(uid);
    const requestsCol = collection(familyRef, 'requests');
    const profilesCol = collection(familyRef, 'profiles');

    const [reqSnapshot, profSnapshot] = await Promise.all([
        getDocs(requestsCol),
        getDocs(profilesCol)
    ]);

    const profilesMap = {};
    profSnapshot.docs.forEach(d => {
        profilesMap[d.id] = d.data().name;
    });

    let requests = reqSnapshot.docs.map(d => {
        const data = d.data();
        return {
            id: d.id,
            ...data,
            approvedByName: data.approvedBy ? (profilesMap[data.approvedBy] || 'Admin') : null
        };
    });

    const isAdmin = role === 'Owner' || role === 'Partner';

    if (!isAdmin && profileId) {
        // Non-admins see only their own
        requests = requests.filter(r => r.createdByProfileId === profileId);
    }
    // Admins see all

    return requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

/**
 * Reject a Request
 */
export const rejectRequest = async (uid, requestId, reason) => {
    console.log(`❌ Repo: Rejecting request ${requestId}`);
    const familyRef = getFamilyRef(uid);
    const requestRef = doc(familyRef, 'requests', requestId);

    await updateDoc(requestRef, {
        status: 'REJECTED',
        rejectionReason: reason || null,
        rejectedAt: new Date().toISOString()
    });
    return true;
};
