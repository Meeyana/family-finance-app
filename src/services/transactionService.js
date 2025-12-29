// Purpose: Handle Transaction Logic (Validation, Persistence)
// Connected Flow: PROFILE_SPENDING_FLOW
// Uses: Firestore Repository

import { auth } from './firebase';
import { getFamilyProfiles, addTransaction as addTxToFirestore } from './firestoreRepository';

/**
 * Validate if a transaction can be added based on budget limits.
 * NOW ASYNC to fetch real data
 * @param {string} profileId 
 * @param {number} amount 
 * @returns {Promise<object>} { status: 'ALLOWED' | 'WARNING' | 'BLOCKED', message: string }
 */
export const validateTransaction = async (profileId, amount) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return { status: 'ALLOWED', message: 'No user. Skipping validation.' };

    try {
        const profiles = await getFamilyProfiles(uid);
        const profile = profiles.find(p => p.id === profileId);

        if (!profile) return { status: 'ALLOWED', message: 'Profile not found.' };
        if (!profile.limit || profile.limit <= 0) return { status: 'ALLOWED', message: 'No budget limit.' };

        const newTotal = (profile.spent || 0) + amount;
        const usage = newTotal / profile.limit;

        if (usage >= 1.0) {
            return {
                status: 'CRITICAL',
                message: `⚠️ Critical: This exceeds the budget! (${Math.round(usage * 100)}%)`
            };
        } else if (usage >= 0.7) {
            return {
                status: 'WARNING',
                message: `⚠️ Warning: Budget usage will be ${Math.round(usage * 100)}%`
            };
        }

        return { status: 'ALLOWED', message: 'Transaction within budget.' };
    } catch (e) {
        console.warn("Validation failed to fetch data, allowing.", e);
        return { status: 'ALLOWED', message: 'Validation skipped.' };
    }
};

/**
 * Save transaction to data store
 * @param {object} transaction { profileId, amount, category, date, note }
 */
export const saveTransaction = async (transaction) => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("No User Logged In");

    // Save to Firestore
    await addTxToFirestore(uid, transaction);

    return true;
};
