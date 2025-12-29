import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../components/context/AuthContext';

// Screens
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileDashboard from '../screens/ProfileDashboard';
import AccountDashboard from '../screens/AccountDashboard';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ManageProfilesScreen from '../screens/ManageProfilesScreen';
import EditProfileScreen from '../screens/EditProfileScreen';

const Stack = createNativeStackNavigator();

export default function AppStack() {
    const { user, loading } = useAuth();

    if (loading) {
        return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;
    }

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {user ? (
                <>
                    <Stack.Group>
                        <Stack.Screen name="Home" component={HomeScreen} />
                        <Stack.Screen name="ProfileDashboard" component={ProfileDashboard} />
                        <Stack.Screen name="AccountDashboard" component={AccountDashboard} />
                        <Stack.Screen name="Settings" component={SettingsScreen} />
                        <Stack.Screen name="ManageProfiles" component={ManageProfilesScreen} />
                        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
                    </Stack.Group>
                    <Stack.Group screenOptions={{ presentation: 'modal' }}>
                        <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
                    </Stack.Group>
                </>
            ) : (
                <Stack.Screen name="Login" component={LoginScreen} />
            )}
        </Stack.Navigator>
    );
}
