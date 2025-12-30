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
import { doc, getDoc, setDoc, collection, getDocs, addDoc, updateDoc, increment, deleteDoc } from 'firebase/firestore';

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
    const profileRef = doc(familyRef, 'profiles', oldData.profileId);

    // 1. Delete Transaction
    await deleteDoc(transactionRef);

    // 2. Refund Profile Spent/Earned
    if (oldData.type === 'income') {
        await updateDoc(profileRef, { earned: increment(-oldData.amount) });
    } else {
        await updateDoc(profileRef, { spent: increment(-oldData.amount) });
    }
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

