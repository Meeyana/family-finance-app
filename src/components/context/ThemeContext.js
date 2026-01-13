import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const systemScheme = useColorScheme();
    const [themeMode, setThemeMode] = useState('system'); // 'light', 'dark' or 'system'
    const [theme, setResolvedTheme] = useState('light');

    useEffect(() => {
        if (themeMode === 'system') {
            setResolvedTheme(systemScheme || 'light');
        } else {
            setResolvedTheme(themeMode);
        }
    }, [themeMode, systemScheme]);

    const setTheme = (mode) => {
        setThemeMode(mode);
    };

    return (
        <ThemeContext.Provider value={{ theme, themeMode, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
