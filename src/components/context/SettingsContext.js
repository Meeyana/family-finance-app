import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { updateFamilySettings, getFamilySettings } from '../../services/firestoreRepository';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
    const { user } = useAuth();

    // Default Settings
    const [currency, setCurrency] = useState('VND'); // 'VND' | 'USD'
    const [language, setLanguage] = useState('en'); // 'en' | 'vi'
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);

    // Storage Keys
    const SETTINGS_KEY = 'app_global_settings';

    // 1. Load Local Settings on startup
    useEffect(() => {
        const loadLocalSettings = async () => {
            try {
                const stored = await AsyncStorage.getItem(SETTINGS_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed.currency) setCurrency(parsed.currency);
                    if (parsed.language) setLanguage(parsed.language);
                }
            } catch (e) {
                console.error("Failed to load local settings", e);
            } finally {
                setIsLoadingSettings(false);
            }
        };
        loadLocalSettings();
    }, []);

    // 2. Sync with Firestore when user logs in
    useEffect(() => {
        const syncSettings = async () => {
            if (user) {
                try {
                    const cloudSettings = await getFamilySettings(user.uid);
                    if (cloudSettings) {
                        // Cloud overrides local if exists
                        if (cloudSettings.currency) updateStateAndLocal('currency', cloudSettings.currency);
                        if (cloudSettings.language) updateStateAndLocal('language', cloudSettings.language);
                    }
                } catch (e) {
                    console.warn("Failed to sync settings from cloud", e);
                }
            }
        };
        syncSettings();
    }, [user]);

    // Helper to update state and persistence
    const updateStateAndLocal = async (key, value) => {
        if (key === 'currency') setCurrency(value);
        if (key === 'language') setLanguage(value);

        try {
            const current = await AsyncStorage.getItem(SETTINGS_KEY);
            const parsed = current ? JSON.parse(current) : {};
            parsed[key] = value;
            await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
        } catch (e) {
            console.error("Failed to save local setting", e);
        }
    };

    // Public Actions
    const updateCurrency = async (newCurrency) => {
        // Always update local state first so UI works
        await updateStateAndLocal('currency', newCurrency);

        if (user) {
            // Persist to Cloud (Best Effort)
            try {
                await updateFamilySettings(user.uid, { currency: newCurrency });
            } catch (e) {
                console.warn("Ignored Cloud Settings Sync Error (Currency):", e);
            }
        }
    };

    const updateLanguage = async (newLang) => {
        await updateStateAndLocal('language', newLang);

        if (user) {
            // Persist to Cloud (Best Effort)
            try {
                await updateFamilySettings(user.uid, { language: newLang });
            } catch (e) {
                console.warn("Ignored Cloud Settings Sync Error (Language):", e);
            }
        }
    };

    return (
        <SettingsContext.Provider value={{
            currency,
            language,
            updateCurrency,
            updateLanguage,
            isLoadingSettings
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);
