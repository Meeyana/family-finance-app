import React from 'react';
import { View, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../components/context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen'; // Profile Selector
import AccountDashboard from '../screens/AccountDashboard';
import TransactionListScreen from '../screens/TransactionListScreen';
import ProfileDashboard from '../screens/ProfileDashboard';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import ManageCategoriesScreen from '../screens/ManageCategoriesScreen';
import MoreMenuScreen from '../screens/MoreMenuScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ManageProfilesScreen from '../screens/ManageProfilesScreen'; // Import
import EditProfileScreen from '../screens/EditProfileScreen';
import AnalyzeScreen from '../screens/AnalyzeScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const CustomTabBarButton = ({ children, onPress }) => (
    <TouchableOpacity
        style={{
            top: -20, // Elevate
            justifyContent: 'center',
            alignItems: 'center',
            ...styles.shadow
        }}
        onPress={onPress}
    >
        <View style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: '#FFC107', // Yellow/Gold
            justifyContent: 'center',
            alignItems: 'center',
        }}>
            {children}
        </View>
    </TouchableOpacity>
);

const commonTabOptions = {
    headerShown: false,
    tabBarStyle: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        height: 60,
        paddingBottom: 8,
    },
    tabBarActiveTintColor: '#007AFF',
    tabBarInactiveTintColor: '#999',
};

// 1. Adult Tabs (Owner/Partner)
function DashboardTabs() {
    return (
        <Tab.Navigator screenOptions={commonTabOptions}>
            <Tab.Screen
                name="Dashboard"
                component={AccountDashboard}
                options={{
                    tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" size={size} color={color} />,
                    title: 'Overview'
                }}
            />
            <Tab.Screen
                name="Transactions"
                component={TransactionListScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
                    title: 'Transactions'
                }}
            />
            <Tab.Screen
                name="Add"
                component={View} // Dummy component
                listeners={({ navigation }) => ({
                    tabPress: (e) => {
                        e.preventDefault();
                        navigation.navigate('AddTransaction');
                    },
                })}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <Ionicons name="add" size={32} color="white" />
                    ),
                    tabBarButton: (props) => (
                        <CustomTabBarButton {...props} />
                    ),
                    tabBarLabel: () => null // Hide label
                }}
            />
            <Tab.Screen
                name="Analysis"
                component={AnalyzeScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Ionicons name="pie-chart" size={size} color={color} />,
                    title: 'Analysis'
                }}
            />
            <Tab.Screen
                name="More"
                component={MoreMenuScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal" size={size} color={color} />,
                    title: 'More'
                }}
            />
        </Tab.Navigator>
    );
}

// 2. Child Tabs
function ChildTabs() {
    return (
        <Tab.Navigator screenOptions={commonTabOptions}>
            <Tab.Screen
                name="Transactions"
                component={TransactionListScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
                    title: 'My Spending'
                }}
            />
            <Tab.Screen
                name="Add"
                component={View} // Dummy component
                listeners={({ navigation }) => ({
                    tabPress: (e) => {
                        e.preventDefault();
                        navigation.navigate('AddTransaction');
                    },
                })}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <Ionicons name="add" size={32} color="white" />
                    ),
                    tabBarButton: (props) => (
                        <CustomTabBarButton {...props} />
                    ),
                    tabBarLabel: () => null // Hide label
                }}
            />
            <Tab.Screen
                name="More"
                component={MoreMenuScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal" size={size} color={color} />,
                    title: 'More'
                }}
            />
        </Tab.Navigator>
    );
}

export default function AppStack() {
    const { user, profile, loading } = useAuth();

    if (loading) {
        return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;
    }

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!user ? (
                // State 1: Not Logged In
                <Stack.Screen name="Login" component={LoginScreen} />
            ) : !profile ? (
                // State 2: Logged In, No Profile Selected
                <Stack.Screen name="ProfileSelection" component={HomeScreen} />
            ) : (
                // State 3: Profile Selected -> Check Role
                <>
                    {profile.role === 'Child' ? (
                        <Stack.Screen name="ChildTabs" component={ChildTabs} />
                    ) : (
                        <Stack.Screen name="MainTabs" component={DashboardTabs} />
                    )}

                    {/* Common Modals & Screens accessible from More Menu */}
                    <Stack.Screen name="ProfileDashboard" component={ProfileDashboard} />
                    <Stack.Screen name="Settings" component={SettingsScreen} />

                    <Stack.Screen
                        name="AddTransaction"
                        component={AddTransactionScreen}
                        options={{ presentation: 'modal' }}
                    />
                    <Stack.Screen
                        name="ManageCategories"
                        component={ManageCategoriesScreen}
                        options={{
                            headerShown: true,
                            title: 'Manage Categories',
                            headerStyle: { backgroundColor: '#f5f5f5' }
                        }}
                    />
                    <Stack.Screen
                        name="ManageProfiles"
                        component={ManageProfilesScreen}
                        options={{
                            headerShown: true,
                            title: 'Manage Profiles',
                            headerStyle: { backgroundColor: '#f5f5f5' }
                        }}
                    />
                    <Stack.Screen
                        name="EditProfile"
                        component={EditProfileScreen}
                        options={{
                            headerShown: true,
                            title: 'Edit Profile',
                            headerStyle: { backgroundColor: '#f5f5f5' }
                        }}
                    />
                    <Stack.Screen name="Analyze" component={AnalyzeScreen} options={{ headerShown: false }} />
                </>
            )}
        </Stack.Navigator>
    );
}

const styles = StyleSheet.create({
    shadow: {
        shadowColor: '#7F5DF0',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 3.5,
        elevation: 5
    }
});
