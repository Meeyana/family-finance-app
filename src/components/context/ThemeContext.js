import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const { profile } = useAuth();
    const systemScheme = useColorScheme();
    const [themeMode, setThemeMode] = useState('system'); // 'light', 'dark' or 'system'
    const [theme, setResolvedTheme] = useState('light');

    // Storage Key
    const storageKey = profile ? `theme_mode_${profile.id}` : 'theme_mode_default';

    // Load Saved Preference
    useEffect(() => {
        const loadTheme = async () => {
            try {
                const savedMode = await AsyncStorage.getItem(storageKey);
                if (savedMode) {
                    setThemeMode(savedMode);
                } else {
                    setThemeMode('system');
                }
            } catch (error) {
                console.error('Failed to load theme:', error);
            }
        };
        loadTheme();
    }, [storageKey]);

    // Resolve Theme
    useEffect(() => {
        if (themeMode === 'system') {
            setResolvedTheme(systemScheme || 'light');
        } else {
            setResolvedTheme(themeMode);
        }
    }, [themeMode, systemScheme]);

    const setTheme = async (mode) => {
        setThemeMode(mode);
        try {
            await AsyncStorage.setItem(storageKey, mode);
        } catch (error) {
            console.error('Failed to save theme:', error);
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, themeMode, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
