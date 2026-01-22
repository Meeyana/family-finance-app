import React from 'react';
import { View, ActivityIndicator, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../components/context/AuthContext';
import { useTheme } from '../components/context/ThemeContext';
import { COLORS } from '../constants/theme';

import LoginScreen from '../screens/LoginScreen';
import OnboardingProfileScreen from '../screens/OnboardingProfileScreen';
import HomeScreen from '../screens/HomeScreen'; // Profile Selector
import AccountDashboard from '../screens/AccountDashboard';
import TransactionListScreen from '../screens/TransactionListScreen';
import ProfileDashboard from '../screens/ProfileDashboard';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import ManageCategoriesScreen from '../screens/ManageCategoriesScreen';
import MoreMenuScreen from '../screens/MoreMenuScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ManageProfilesScreen from '../screens/ManageProfilesScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import AnalyzeScreen from '../screens/AnalyzeScreen';
import MoneyRequestScreen from '../screens/MoneyRequestScreen';
import RequestListScreen from '../screens/RequestListScreen';
import GrantMoneyScreen from '../screens/GrantMoneyScreen';
import RecurringScreen from '../screens/RecurringScreen';
import GoalScreen from '../screens/GoalScreen';
import GoalDetailScreen from '../screens/GoalDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const CustomTabBarButton = ({ children, onPress, theme }) => {
    const colors = COLORS[theme];
    return (
        <TouchableOpacity
            style={{
                top: -20,
                justifyContent: 'center',
                alignItems: 'center',
                ...styles.shadow
            }}
            onPress={onPress}
        >
            <View style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: colors.primaryAction,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 4,
                borderColor: colors.background
            }}>
                {children}
            </View>
        </TouchableOpacity>
    );
};

const { width } = Dimensions.get('window');
const TAB_WIDTH = width / 5;

const NavIcon = ({ name, focused, color, size }) => {
    const { theme } = useTheme();
    const colors = COLORS[theme];

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center', width: TAB_WIDTH }}>
            <View style={{
                position: 'absolute',
                top: -8,
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: colors.divider,
            }} />

            {focused && (
                <View style={{
                    position: 'absolute',
                    top: -8,
                    width: 40,
                    height: 4,
                    backgroundColor: color,
                    borderBottomLeftRadius: 4,
                    borderBottomRightRadius: 4,
                    zIndex: 10,
                }} />
            )}
            <Ionicons name={name} size={size - 2} color={color} />
        </View>
    );
};

function DashboardTabs() {
    const { theme } = useTheme();
    const colors = COLORS[theme];

    const screenOptions = {
        headerShown: false,
        tabBarStyle: {
            backgroundColor: colors.background,
            borderTopWidth: 0,
            elevation: 0,
            height: 88,
            paddingTop: 8,
            paddingBottom: 30,
            shadowOpacity: 0,
        },
        tabBarActiveTintColor: colors.primaryAction,
        tabBarInactiveTintColor: '#c0c0c0',
        tabBarShowLabel: true,
        tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '500',
            marginTop: 4,
            marginBottom: 0,
            zIndex: 50,
        }
    };

    return (
        <Tab.Navigator screenOptions={screenOptions}>
            <Tab.Screen
                name="Dashboard"
                component={AccountDashboard}
                options={{
                    tabBarIcon: ({ color, size, focused }) => <NavIcon name="apps" size={size} color={color} focused={focused} />,
                    title: 'Overview'
                }}
            />
            <Tab.Screen
                name="Transactions"
                component={TransactionListScreen}
                options={{
                    tabBarIcon: ({ color, size, focused }) => <NavIcon name="list" size={size} color={color} focused={focused} />,
                    title: 'Transactions'
                }}
            />
            <Tab.Screen
                name="Add"
                component={View}
                listeners={({ navigation }) => ({
                    tabPress: (e) => {
                        e.preventDefault();
                        navigation.navigate('AddTransaction');
                    },
                })}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <Ionicons name="add" size={32} color={colors.background} />
                    ),
                    tabBarButton: (props) => (
                        <CustomTabBarButton {...props} theme={theme} />
                    ),
                    tabBarLabel: () => null
                }}
            />
            <Tab.Screen
                name="Analysis"
                component={AnalyzeScreen}
                options={{
                    tabBarIcon: ({ color, size, focused }) => <NavIcon name="pie-chart" size={size} color={color} focused={focused} />,
                    title: 'Analysis'
                }}
            />
            <Tab.Screen
                name="More"
                component={MoreMenuScreen}
                options={{
                    tabBarIcon: ({ color, size, focused }) => <NavIcon name="menu" size={size} color={color} focused={focused} />,
                    title: 'More'
                }}
            />
        </Tab.Navigator>
    );
}

function ChildTabs() {
    const { theme } = useTheme();
    const colors = COLORS[theme];

    const screenOptions = {
        headerShown: false,
        tabBarStyle: {
            backgroundColor: colors.background,
            borderTopWidth: 0,
            height: 88,
            paddingTop: 8,
            paddingBottom: 30,
            elevation: 0,
            shadowOpacity: 0,
        },
        tabBarActiveTintColor: colors.primaryAction,
        tabBarInactiveTintColor: '#c0c0c0',
        tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '500',
            marginTop: 4,
            marginBottom: 0,
            zIndex: 50,
        }
    };

    return (
        <Tab.Navigator screenOptions={screenOptions}>
            <Tab.Screen
                name="Dashboard"
                component={AccountDashboard}
                options={{
                    tabBarIcon: ({ color, size, focused }) => <NavIcon name="apps" size={size} color={color} focused={focused} />,
                    title: 'Overview'
                }}
            />
            <Tab.Screen
                name="Transactions"
                component={TransactionListScreen}
                options={{
                    tabBarIcon: ({ color, size, focused }) => <NavIcon name="list" size={size} color={color} focused={focused} />,
                    title: 'Spending'
                }}
            />
            <Tab.Screen
                name="Add"
                component={View}
                listeners={({ navigation }) => ({
                    tabPress: (e) => {
                        e.preventDefault();
                        navigation.navigate('AddTransaction');
                    },
                })}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <Ionicons name="add" size={32} color={colors.background} />
                    ),
                    tabBarButton: (props) => (
                        <CustomTabBarButton {...props} theme={theme} />
                    ),
                    tabBarLabel: () => null
                }}
            />
            <Tab.Screen
                name="Requests"
                component={RequestListScreen}
                options={{
                    tabBarIcon: ({ color, size, focused }) => <NavIcon name="hand-right" size={size} color={color} focused={focused} />,
                    title: 'Requests'
                }}
            />
            <Tab.Screen
                name="More"
                component={MoreMenuScreen}
                options={{
                    tabBarIcon: ({ color, size, focused }) => <NavIcon name="menu" size={size} color={color} focused={focused} />,
                    title: 'More'
                }}
            />
        </Tab.Navigator>
    );
}

export default function AppStack() {
    const { user, userProfiles, profile, loading } = useAuth();
    const { theme } = useTheme();

    if (loading) {
        return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;
    }

    return (
        <Stack.Navigator screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: COLORS[theme].background }
        }}>
            {!user ? (
                <Stack.Screen name="Login" component={LoginScreen} />
            ) : (!userProfiles || userProfiles.length === 0) ? (
                <Stack.Screen name="OnboardingProfile" component={OnboardingProfileScreen} />
            ) : !profile ? (
                <Stack.Screen name="ProfileSelection" component={HomeScreen} />
            ) : (
                <>
                    {profile.role === 'Child' ? (
                        <Stack.Screen name="ChildTabs" component={ChildTabs} />
                    ) : (
                        <Stack.Screen name="MainTabs" component={DashboardTabs} />
                    )}

                    <Stack.Screen name="ProfileDashboard" component={ProfileDashboard} />
                    <Stack.Screen name="Settings" component={SettingsScreen} />
                    <Stack.Screen
                        name="AddTransaction"
                        component={AddTransactionScreen}
                        options={{ presentation: 'modal' }}
                    />
                    <Stack.Screen name="ManageCategories" component={ManageCategoriesScreen} options={{ headerShown: true, title: 'Manage Categories' }} />
                    <Stack.Screen name="ManageProfiles" component={ManageProfilesScreen} options={{ headerShown: true, title: 'Manage Profiles' }} />
                    <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: true, title: 'Edit Profile' }} />
                    <Stack.Screen name="Analyze" component={AnalyzeScreen} />
                    <Stack.Screen name="MoneyRequest" component={MoneyRequestScreen} />
                    <Stack.Screen name="RequestList" component={RequestListScreen} />
                    <Stack.Screen name="GrantMoney" component={GrantMoneyScreen} />
                    <Stack.Screen name="Recurring" component={RecurringScreen} options={{ headerShown: false }} />
                    <Stack.Screen name="Goals" component={GoalScreen} options={{ headerShown: true, title: 'Savings Goals' }} />
                    <Stack.Screen name="GoalDetail" component={GoalDetailScreen} options={{ headerShown: true, title: 'Goal Details' }} />
                </>
            )}
        </Stack.Navigator>
    );
}

const styles = StyleSheet.create({
    shadow: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2
    }
});
