// Purpose: Handle all Firestore interactions
// Collection Structure:
// artifacts/quan-ly-chi-tieu-family/users/{uid}
//   - global settings (totalLimit, ownerName)
//   - /profiles/{pid} (name, role, limit, spent)
//   - /transactions/{tid} (amount, category, date, profileId)

import { db } from './firebase';
import { doc, getDoc, setDoc, collection, getDocs, addDoc, updateDoc, increment } from 'firebase/firestore';

const APP_ID = 'quan-ly-chi-tieu-family';

const getFamilyRef = (uid) => doc(db, 'artifacts', APP_ID, 'users', uid);

const DEFAULT_PROFILES = [
    { id: 'dad', name: 'Dad', role: 'Owner', limit: 20000000, spent: 0 },
    { id: 'mom', name: 'Mom', role: 'Partner', limit: 3000000, spent: 0 },
    { id: 'child', name: 'Kid', role: 'Child', limit: 500000, spent: 0 }
];

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
            await setDoc(doc(profilesCol, p.id), p);
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

/**
 * Add a transaction and update running totals
 */
export const addTransaction = async (uid, transaction) => {
    const familyRef = getFamilyRef(uid);
    const transactionsCol = collection(familyRef, 'transactions');
    const profileRef = doc(familyRef, 'profiles', transaction.profileId);

    // 1. Add Transaction Record
    const docRef = await addDoc(transactionsCol, {
        ...transaction,
        createdAt: new Date().toISOString()
    });

    // 2. Update Profile Spent (Atomic Increment)
    await updateDoc(profileRef, {
        spent: increment(transaction.amount)
    });

    return docRef.id;
};

/**
 * Get transactions (optional limit, optional date range)
 */
export const getTransactions = async (uid, profileId = null, startDate = null, endDate = null) => {
    const familyRef = getFamilyRef(uid);
    const transactionsCol = collection(familyRef, 'transactions');

    // For MVP, simplistic fetch.
    const snapshot = await getDocs(transactionsCol);
    let txs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    if (profileId) {
        txs = txs.filter(t => t.profileId === profileId);
    }

    // Client Side Date Filtering
    if (startDate && endDate) {
        txs = txs.filter(t => {
            return t.date >= startDate && t.date <= endDate;
        });
    }

    // Sort client side
    return txs.sort((a, b) => new Date(b.date) - new Date(a.date));
};

/**
 * Update Profile settings (Name, Limit)
 */
export const updateProfile = async (uid, profileId, data) => {
    const familyRef = getFamilyRef(uid);
    const profileRef = doc(familyRef, 'profiles', profileId);

    await updateDoc(profileRef, data);
    return true;
};
