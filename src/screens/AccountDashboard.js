// Purpose: Aggregated Account View
// Connected Flow: ACCOUNT_ANALYSIS_FLOW
// Access: Owner/Partner Only

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAccountData } from '../services/dataService';
import { useAuth } from '../components/context/AuthContext';
// import ExpensePieChart from '../components/ExpensePieChart';
import { LinearGradient } from 'expo-linear-gradient';
import MonthPicker from '../components/MonthPicker';
import BudgetProgressBar from '../components/BudgetProgressBar';

export default function AccountDashboard({ navigation }) {
    const { userProfiles } = useAuth();
    // Assuming the user is "Dad" (Owner) for this simulation if context is generic
    // In real app, we check the CURRENT user's role.
    // For now, let's assume valid access if we made it here, but perform load check.
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date());

    useEffect(() => {
        loadData();
    }, [selectedDate]); // Reload on date change

    const loadData = async () => {
        try {
            setLoading(true);
            // Mocking the check: pass 'Owner' to simulate success
            // In real app: pass userProfile.role
            const result = await getAccountData('Owner', selectedDate);
            setData(result);
        } catch (err) {
            console.error(err);
            setError(err.message);
            Alert.alert("Access Denied", err.message, [
                { text: "Go Back", onPress: () => navigation.goBack() }
            ]);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator size="large" color="#007AFF" />
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={styles.center}>
                <Text style={styles.errorText}>Access Denied</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Text style={styles.backText}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Family Account</Text>

                    <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.settingsButton}>
                        <Text style={{ fontSize: 24 }}>⚙️</Text>
                    </TouchableOpacity>
                </View>

                <MonthPicker date={selectedDate} onMonthChange={setSelectedDate} />

                <LinearGradient
                    colors={['#1a1a1a', '#2d2d2d']}
                    style={styles.summaryCard}
                >
                    <Text style={styles.cardLabel}>Total Family Spending</Text>
                    <Text style={styles.totalAmount}>
                        {data?.totalSpent.toLocaleString()} <Text style={styles.currency}>VND</Text>
                    </Text>
                    <View style={styles.limitBar}>
                        <View
                            style={[
                                styles.limitFill,
                                { width: `${Math.min((data?.totalSpent / data?.totalLimit) * 100, 100)}%` }
                            ]}
                        />
                    </View>
                    <Text style={styles.limitText}>
                        Limit: {data?.totalLimit.toLocaleString()} VND
                    </Text>
                    <Text style={styles.healthTag}>Health: {data?.financialStatus}</Text>

                    <Text style={styles.forecastText}>
                        📅 Forecast: At this rate, projected ~{(data?.totalSpent * 1.2).toLocaleString()} VND
                    </Text>
                </LinearGradient>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Expense By Category</Text>
                    {/* {data && <ExpensePieChart data={data} />} */}
                    <Text style={{ color: 'gray' }}>Chart temporarily disabled due to build error</Text>
                </View>

                <View style={[styles.section, { paddingTop: 0 }]}>
                    <Text style={styles.sectionTitle}>Budget vs Actual (By Profile)</Text>
                    {data && Object.keys(data.budgets.profiles).map(pid => {
                        const pBudget = data.budgets.profiles[pid];
                        // Get profile name efficiently (mock lookup for now or from userProfiles)
                        const pName = userProfiles.find(p => p.id === pid)?.name || `Profile ${pid}`;

                        return (
                            <View key={pid} style={styles.card}>
                                <BudgetProgressBar
                                    label={pName}
                                    spent={pBudget.spent}
                                    limit={pBudget.limit}
                                />
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        paddingRight: 16,
    },
    backText: {
        fontSize: 16,
        color: '#007AFF',
    },
    settingsButton: {
        padding: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    summaryCard: {
        margin: 16,
        padding: 24,
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
    },
    cardLabel: {
        color: '#999',
        fontSize: 14,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    totalAmount: {
        color: 'white',
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    currency: {
        fontSize: 16,
        color: '#666',
    },
    limitBar: {
        height: 6,
        backgroundColor: '#333',
        borderRadius: 3,
        marginBottom: 8,
        overflow: 'hidden',
    },
    limitFill: {
        height: '100%',
        backgroundColor: '#10b981', // green-500
    },
    limitText: {
        color: '#999',
        fontSize: 12,
    },
    forecastText: {
        marginTop: 12,
        color: '#fbbf24', // amber-400
        fontSize: 12,
        fontStyle: 'italic',
    },
    healthTag: {
        position: 'absolute',
        top: 24,
        right: 24,
        color: '#10b981',
        fontWeight: 'bold',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
        color: '#1a1a1a',
    },
    row: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    rowLabel: {
        fontWeight: '500',
        color: '#1a1a1a',
    },
    errorText: {
        color: '#dc2626',
        fontSize: 18,
        fontWeight: 'bold',
    }
});
