import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

const VisibilityContext = createContext();

export const VisibilityProvider = ({ children }) => {
    const [isValuesHidden, setIsValuesHidden] = useState(false);
    const { profile } = useAuth();

    // Key depends on profile. If no profile (e.g. login screen), use generic or temp.
    // Actually if no profile, we might default to visible or separate pre-login state.
    // For now, if no profile, we just use 'visibility_default' or generic.
    const storageKey = profile ? `visibility_hidden_${profile.id}` : 'visibility_hidden_default';

    useEffect(() => {
        const loadState = async () => {
            try {
                const stored = await AsyncStorage.getItem(storageKey);
                if (stored !== null) {
                    setIsValuesHidden(JSON.parse(stored));
                } else {
                    // Default to false if not set
                    setIsValuesHidden(false);
                }
            } catch (error) {
                console.error('Failed to load visibility state:', error);
            }
        };
        loadState();
    }, [storageKey]);

    const toggleVisibility = () => {
        setIsValuesHidden(prev => {
            const newValue = !prev;
            AsyncStorage.setItem(storageKey, JSON.stringify(newValue)).catch(console.error);
            return newValue;
        });
    };

    return (
        <VisibilityContext.Provider value={{ isValuesHidden, toggleVisibility }}>
            {children}
        </VisibilityContext.Provider>
    );
};

export const useVisibility = () => {
    const context = useContext(VisibilityContext);
    if (!context) {
        throw new Error('useVisibility must be used within a VisibilityProvider');
    }
    return context;
};
