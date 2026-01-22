import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Platform, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/components/context/AuthContext';

if (Platform.OS === 'web') {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('accessibilityHint')) return;
    originalConsoleError(...args);
  };
}

import { ThemeProvider, useTheme } from './src/components/context/ThemeContext';
import { VisibilityProvider } from './src/components/context/VisibilityContext';
import { SettingsProvider } from './src/components/context/SettingsContext';

const AppContent = () => {
  const { theme } = useTheme();
  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <RootNavigator />
    </>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <SettingsProvider>
            <VisibilityProvider>
              <AppContent />
            </VisibilityProvider>
          </SettingsProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
