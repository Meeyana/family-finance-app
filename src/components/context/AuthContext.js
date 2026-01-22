// Purpose: Provide global auth state and user profile data
// Connected Flow: GLOBAL_FLOW
// Wraps: RootNavigator

import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { doc } from 'firebase/firestore';
import { initializeFamily, getFamilyProfiles, initializeCategories, checkAndProcessRecurring } from '../../services/firestoreRepository';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userProfiles, setUserProfiles] = useState([]);
    const [profile, setProfile] = useState(null);
    const [pendingRequestCount, setPendingRequestCount] = useState(0);

    // Initial Processing
    useEffect(() => {
        const process = async () => {
            if (user) {
                await checkAndProcessRecurring(user.uid);
            }
        };
        process();
    }, [user]); // Run when user logs in

    // Listen for Pending Requests (Real-time)
    useEffect(() => {
        if (!user || !profile) {
            setPendingRequestCount(0);
            return;
        }

        // Only Admins care about ALL pending requests
        // Users care about THEIR pending requests (optional, but let's just count for Admin for now)
        const isAdmin = profile.role === 'Owner' || profile.role === 'Partner';

        if (isAdmin) {
            const familyRef = doc(db, 'artifacts', 'quan-ly-chi-tieu-family', 'users', user.uid);
            const requestsCol = collection(familyRef, 'requests');
            const q = query(requestsCol, where('status', '==', 'PENDING'));

            const unsubscribe = onSnapshot(q, (snapshot) => {
                setPendingRequestCount(snapshot.size);
            }, (error) => {
                console.log("Error listening to requests:", error);
            });

            return () => unsubscribe();
        } else {
            setPendingRequestCount(0);
        }
    }, [user, profile]);

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

                    // Restore last profile
                    try {
                        const lastId = await AsyncStorage.getItem('last_profile_id');
                        if (lastId) {
                            const found = profiles.find(p => p.id === lastId);
                            if (found) {
                                console.log(`🔄 Restoring Profile: ${found.name}`);
                                setProfile(found);
                            }
                        }
                    } catch (e) {
                        console.error('Failed to restore profile', e);
                    }

                } catch (error) {
                    console.error("🔥 AuthContext Error:", error);
                    setUserProfiles([]);
                }
            } else {
                console.log("👤 AuthContext: User logged out");
                setUserProfiles([]);
                setProfile(null);
                AsyncStorage.removeItem('last_profile_id').catch(console.error);
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
        AsyncStorage.setItem('last_profile_id', p.id).catch(console.error);
    };

    const switchProfile = () => {
        console.log("👤 AuthContext: Switching Profile (clearing selection)");
        setProfile(null);
        AsyncStorage.removeItem('last_profile_id').catch(console.error);
    };

    return (
        <AuthContext.Provider value={{ user, userProfiles, profile, selectProfile, switchProfile, loading, refreshProfiles, pendingRequestCount }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
