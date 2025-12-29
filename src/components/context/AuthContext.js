// Purpose: Provide global auth state and user profile data
// Connected Flow: GLOBAL_FLOW
// Wraps: RootNavigator

import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { initializeFamily, getFamilyProfiles } from '../../services/firestoreRepository';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userProfiles, setUserProfiles] = useState([]);

    useEffect(() => {
        console.log("🔄 AuthContext: Subscribing to auth state");
        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            setUser(u);

            if (u) {
                console.log(`👤 AuthContext: User detected ${u.email}`);
                try {
                    // 1. Ensure DB is initialized for this user
                    await initializeFamily(u.uid, u.email || 'anon');

                    // 2. Fetch real profiles
                    const profiles = await getFamilyProfiles(u.uid);
                    console.log(`📂 AuthContext: Loaded ${profiles.length} profiles from Firestore`);
                    setUserProfiles(profiles);
                } catch (error) {
                    console.error("🔥 AuthContext Error:", error);
                    setUserProfiles([]);
                }
            } else {
                console.log("👤 AuthContext: User logged out");
                setUserProfiles([]);
            }

            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const refreshProfiles = async () => {
        if (user) {
            console.log("🔄 Refreshing Profiles...");
            const profiles = await getFamilyProfiles(user.uid);
            setUserProfiles(profiles);
        }
    };

    return (
        <AuthContext.Provider value={{ user, userProfiles, loading, refreshProfiles }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
