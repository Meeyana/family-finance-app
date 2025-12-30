// Purpose: Aggregated Account View (Scorecard Only)
// Access: Owner/Partner Only

import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, DeviceEventEmitter } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProfileData } from '../services/dataService';
import { getFamilyCategories } from '../services/firestoreRepository';
import { auth } from '../services/firebase';
import { useAuth } from '../components/context/AuthContext';
import MonthPicker from '../components/MonthPicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AccountDashboard({ navigation }) {
    const { profile } = useAuth();
    const [data, setData] = useState(null);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date());

    useEffect(() => {
        loadData();
        if (auth.currentUser && profile) {
            getFamilyCategories(auth.currentUser.uid, profile.id, profile.role).then(setCategories).catch(console.error);
        }

        const subscription = DeviceEventEmitter.addListener('refresh_profile_dashboard', loadData);
        return () => {
            subscription.remove();
        };
    }, [selectedDate, profile]);

    const loadData = async () => {
        try {
            setLoading(true);
            if (!profile?.id) return;

            const result = await getProfileData(profile.id, selectedDate);
            setData(result);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // MEMOIZED VIEW DATA (My Personal Snapshot)
    const viewData = useMemo(() => {
        if (!data) return null;

        const filteredTxs = data.transactions || [];
        const income = filteredTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);

        const expenseTxs = filteredTxs.filter(t => (t.type || 'expense') === 'expense');
        const expense = expenseTxs.reduce((acc, t) => acc + t.amount, 0);

        // Calculate Category Breakdown
        const categoryMap = {};
        expenseTxs.forEach(t => {
            const catName = t.category || 'Uncategorized';
            if (!categoryMap[catName]) categoryMap[catName] = 0;
            categoryMap[catName] += t.amount;
        });

        const categoryBreakdown = Object.keys(categoryMap).map(catName => {
            const catObj = categories.find(c => c.name === catName);
            const emoji = catObj?.icon || '🏷️'; // Default fallback

            return {
                name: catName,
                emoji,
                amount: categoryMap[catName],
                percent: expense > 0 ? (categoryMap[catName] / expense) * 100 : 0
            };
        }).sort((a, b) => b.amount - a.amount);

        return {
            ...data,
            transactions: filteredTxs,
            categoryBreakdown,
            totalIncome: income,
            totalSpent: expense,
            totalLimit: data.totalLimit || 0,
            netCashflow: income - expense,
            projectedSpend: (expense / Math.max(new Date().getDate(), 1)) * 30
        };
    }, [data, categories]); // Added categories to dependency

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
                <Text style={styles.errorText}>Could not load data</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView>
                <View style={styles.header}>
                    <Text style={styles.title}>My Overview</Text>
                </View>

                <MonthPicker date={selectedDate} onMonthChange={setSelectedDate} />

                {/* Scorecard Layout */}
                <Text style={styles.sectionHeader}>Overview (My Snapshot)</Text>

                {/* Hero Card: Net Cashflow & Health */}
                <View style={[styles.card, styles.heroCard]}>
                    <View>
                        <Text style={styles.heroLabel}>Net Cashflow</Text>
                        <Text style={[styles.heroValue, { color: viewData?.netCashflow >= 0 ? '#34c759' : '#ff3b30' }]}>
                            {viewData?.netCashflow > 0 ? '+' : ''}{viewData?.netCashflow?.toLocaleString()} ₫
                        </Text>
                    </View>
                    <View style={[styles.healthBadge, { backgroundColor: viewData?.netCashflow >= 0 ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)' }]}>
                        <Text style={[styles.healthText, { color: viewData?.netCashflow >= 0 ? '#34c759' : '#ff3b30' }]}>
                            {viewData?.financialStatus || 'Healthy'}
                        </Text>
                    </View>
                </View>

                {/* KPI Grid */}
                <View style={styles.gridContainer}>
                    {/* Row 1: Income & Expense */}
                    <View style={styles.gridRow}>
                        <View style={[styles.card, styles.gridCard]}>
                            <View style={[styles.iconCircle, { backgroundColor: 'rgba(52, 199, 89, 0.1)' }]}>
                                <MaterialCommunityIcons name="arrow-down-circle" size={24} color="#34c759" />
                            </View>
                            <Text style={styles.gridLabel}>Income</Text>
                            <Text style={[styles.gridValue, { color: '#34c759' }]}>
                                +{viewData?.totalIncome?.toLocaleString()}
                            </Text>
                        </View>
                        <View style={[styles.card, styles.gridCard]}>
                            <View style={[styles.iconCircle, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
                                <MaterialCommunityIcons name="arrow-up-circle" size={24} color="#ff3b30" />
                            </View>
                            <Text style={styles.gridLabel}>Expense</Text>
                            <Text style={[styles.gridValue, { color: '#ff3b30' }]}>
                                -{viewData?.totalSpent?.toLocaleString()}
                            </Text>
                        </View>
                    </View>

                    {/* Row 2: Budget & Forecast */}
                    <View style={styles.gridRow}>
                        <View style={[styles.card, styles.gridCard]}>
                            <View style={[styles.iconCircle, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}>
                                <MaterialCommunityIcons name="chart-arc" size={24} color="#007AFF" />
                            </View>
                            <Text style={styles.gridLabel}>Budget Used</Text>
                            <Text style={styles.gridValue}>
                                {Math.min((viewData?.totalSpent / viewData?.totalLimit) * 100, 100).toFixed(0)}%
                            </Text>
                            <View style={styles.miniProgressBar}>
                                <View style={[styles.miniProgressFill, { width: `${Math.min((viewData?.totalSpent / viewData?.totalLimit) * 100, 100)}%`, backgroundColor: (viewData?.totalSpent > viewData?.totalLimit) ? '#ff3b30' : '#007AFF' }]} />
                            </View>
                        </View>

                        <View style={[styles.card, styles.gridCard]}>
                            <View style={[styles.iconCircle, { backgroundColor: 'rgba(251, 191, 36, 0.1)' }]}>
                                <MaterialCommunityIcons name="crystal-ball" size={24} color="#fbbf24" />
                            </View>
                            <Text style={styles.gridLabel}>Forecast</Text>
                            <Text style={[styles.gridValue, { color: (viewData?.projectedSpend > viewData?.totalLimit) ? '#ff3b30' : '#333' }]}>
                                {Math.round(viewData?.projectedSpend || 0).toLocaleString()}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Category Breakdown */}
                <Text style={styles.sectionHeader}>Spending by Category</Text>
                <View style={styles.categoryList}>
                    {viewData?.categoryBreakdown?.map((cat, index) => (
                        <View key={index} style={styles.categoryRow}>
                            <View style={styles.categoryInfo}>
                                <Text style={styles.categoryName}>{cat.emoji} {cat.name}</Text>
                                <Text style={styles.categoryPercent}>{cat.percent.toFixed(1)}%</Text>
                            </View>
                            <View style={styles.progressBarBg}>
                                <View style={[styles.progressBarFill, { width: `${cat.percent}%`, backgroundColor: '#ff3b30' }]} />
                            </View>
                            <Text style={styles.categoryAmount}>{cat.amount.toLocaleString()} ₫</Text>
                        </View>
                    ))}
                    {(!viewData?.categoryBreakdown || viewData.categoryBreakdown.length === 0) && (
                        <Text style={styles.emptyText}>No expenses this month</Text>
                    )}
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
        justifyContent: 'center',
    },
    backButton: {
        paddingRight: 16,
    },
    settingsButton: {
        padding: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    heroCard: {
        marginHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 24,
    },
    heroLabel: {
        fontSize: 14,
        color: '#666',
        textTransform: 'uppercase',
        fontWeight: '600',
        marginBottom: 4,
    },
    heroValue: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    healthBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    healthText: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    gridContainer: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    gridRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
        justifyContent: 'space-between'
    },
    gridCard: {
        flex: 1,
        marginBottom: 0,
        paddingVertical: 20,
        alignItems: 'center',
        marginHorizontal: 0,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    gridLabel: {
        fontSize: 13,
        color: '#666',
        marginBottom: 4,
        fontWeight: '500',
    },
    gridValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    miniProgressBar: {
        width: '80%',
        height: 4,
        backgroundColor: '#f5f5f5',
        borderRadius: 2,
        marginTop: 8,
    },
    miniProgressFill: {
        height: '100%',
        borderRadius: 2,
    },
    sectionHeader: {
        fontSize: 12,
        color: '#999',
        marginLeft: 16,
        marginTop: 8,
        textTransform: 'uppercase',
        fontWeight: '600'
    },
    errorText: {
        color: '#dc2626',
        fontSize: 18,
        fontWeight: 'bold',
    },
    categoryList: {
        marginHorizontal: 16,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginTop: 8,
        marginBottom: 20
    },
    categoryRow: {
        marginBottom: 16,
    },
    categoryInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    categoryName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    categoryPercent: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#f5f5f5',
        borderRadius: 3,
        marginBottom: 4,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    categoryAmount: {
        fontSize: 12,
        color: '#999',
        textAlign: 'right',
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        padding: 10
    },
});
