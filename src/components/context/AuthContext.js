// Purpose: Provide global auth state and user profile data
// Connected Flow: GLOBAL_FLOW
// Wraps: RootNavigator

import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { initializeFamily, getFamilyProfiles, initializeCategories } from '../../services/firestoreRepository';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userProfiles, setUserProfiles] = useState([]);
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            // LOG: Auth state change detected
            console.log(`🔐 AuthContext: Auth State Changed. User: ${u ? u.email : 'None'}`);

            setUser(u);

            if (u) {
                try {
                    // IMPLEMENTED: Auto-init family structure
                    await initializeFamily(u.uid, u.email || 'anon');

                    // IMPLEMENTED: Auto-init categories (Phase 2.1)
                    await initializeCategories(u.uid);

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
                setProfile(null);
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

            if (profile) {
                const found = profiles.find(p => p.id === profile.id);
                if (found) {
                    setProfile(found);
                }
            }
        }
    };

    const selectProfile = (p) => {
        console.log(`👤 AuthContext: Selected Profile ${p.id} (${p.role})`);
        setProfile(p);
    };

    const switchProfile = () => {
        console.log("👤 AuthContext: Switching Profile (clearing selection)");
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{ user, userProfiles, profile, selectProfile, switchProfile, loading, refreshProfiles }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
