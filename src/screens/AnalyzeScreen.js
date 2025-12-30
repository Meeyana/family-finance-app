// Purpose: Detailed Analysis View (Charts, Budget vs Actual)
// Connected Flow: ACCOUNT_ANALYSIS_FLOW
// Access: Owner/Partner Only

import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAccountData } from '../services/dataService';
import { useAuth } from '../components/context/AuthContext';
import ExpensePieChart from '../components/ExpensePieChart';
import MonthPicker from '../components/MonthPicker';
import BudgetProgressBar from '../components/BudgetProgressBar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import { LinearGradient } from 'expo-linear-gradient';

import IncomeExpenseBarChart from '../components/IncomeExpenseBarChart';
import MonthlyTrendLineChart from '../components/MonthlyTrendLineChart';

export default function AnalyzeScreen({ navigation }) {
    const { userProfiles } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Filters (Multi-Select)
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedProfileIds, setSelectedProfileIds] = useState([]);

    useEffect(() => {
        loadData();
    }, [selectedDate]);

    const loadData = async () => {
        try {
            setLoading(true);
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

    // MEMOIZED VIEW DATA (2-Layer Multi-Select Filter)
    const viewData = useMemo(() => {
        if (!data) return null;

        let filteredTxs = data.transactions;

        // Layer 1: Profile Filter (Multi-Select)
        if (selectedProfileIds.length > 0) {
            filteredTxs = filteredTxs.filter(t => selectedProfileIds.includes(t.profileId));
        }

        // Layer 2: Category Filter (Multi-Select)
        if (selectedCategories.length > 0) {
            filteredTxs = filteredTxs.filter(t => selectedCategories.includes(t.category));
        }

        // Recalculate Totals
        const income = filteredTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const expense = filteredTxs.filter(t => (t.type || 'expense') === 'expense').reduce((acc, t) => acc + t.amount, 0);

        // Limit Logic: Sum limits of selected profiles OR Global
        let limit = 0;
        if (selectedProfileIds.length > 0) {
            selectedProfileIds.forEach(pid => {
                if (data.budgets?.profiles?.[pid]) {
                    limit += data.budgets.profiles[pid].limit;
                }
            });
        } else {
            // Default to Global Family Limit
            limit = data.totalLimit;
        }

        return {
            ...data,
            transactions: filteredTxs,
            totalIncome: income,
            totalSpent: expense,
            totalLimit: limit,
            netCashflow: income - expense,
            projectedSpend: (expense / Math.max(new Date().getDate(), 1)) * 30
        };
    }, [data, selectedProfileIds, selectedCategories]);

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

    // Prepare Options for Dropdowns
    const allCategories = data ? [...new Set(data.transactions
        .filter(t => (t.type || 'expense') === 'expense')
        .map(t => t.category))] : [];

    const categoryOptions = allCategories.map(c => ({ id: c, name: c }));
    const profileOptions = userProfiles.map(p => ({ id: p.id, name: p.name }));

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView>
                <View style={styles.header}>
                    <Text style={styles.title}>Detailed Analysis</Text>
                </View>

                <MonthPicker date={selectedDate} onMonthChange={setSelectedDate} />

                {/* Filters Row */}
                <View style={styles.filterRow}>
                    <MultiSelectDropdown
                        label="Profile"
                        options={profileOptions}
                        selectedValues={selectedProfileIds}
                        onSelectionChange={setSelectedProfileIds}
                    />
                    <MultiSelectDropdown
                        label="Category"
                        options={categoryOptions}
                        selectedValues={selectedCategories}
                        onSelectionChange={setSelectedCategories}
                    />
                </View>

                {/* Black Snapshot Card (Filtered View) */}
                <LinearGradient
                    colors={['#1a1a1a', '#2d2d2d']}
                    style={styles.summaryCard}
                >
                    <Text style={styles.cardLabel}>
                        Analysis ({selectedProfileIds.length > 0 ? `${selectedProfileIds.length} Profiles` : 'Family'})
                    </Text>

                    <View style={styles.statsRow}>
                        <View>
                            <Text style={styles.statLabel}>Income</Text>
                            <Text style={styles.incomeText}>+{viewData?.totalIncome?.toLocaleString()} đ</Text>
                        </View>
                        <View>
                            <Text style={styles.statLabel}>Expenses</Text>
                            <Text style={styles.expenseText}>-{viewData?.totalSpent?.toLocaleString()} đ</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.netRow}>
                        <Text style={styles.statLabel}>Net Cashflow</Text>
                        <Text style={[styles.netText, { color: viewData?.netCashflow >= 0 ? '#34c759' : '#ff3b30' }]}>
                            {viewData?.netCashflow > 0 ? '+' : ''}{viewData?.netCashflow?.toLocaleString()} đ
                        </Text>
                    </View>

                    <View style={{ height: 20 }} />

                    <Text style={styles.cardLabel}>Budget Usage</Text>
                    <View style={styles.limitBar}>
                        <View
                            style={[
                                styles.limitFill,
                                { width: `${Math.min((viewData?.totalSpent / viewData?.totalLimit) * 100, 100)}%` }
                            ]}
                        />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={styles.limitText}>
                            Spent: {viewData?.totalSpent?.toLocaleString()}
                        </Text>
                        <Text style={styles.limitText}>
                            Limit: {viewData?.totalLimit?.toLocaleString()}
                        </Text>
                    </View>

                    {/* Analytics Section */}
                    <View style={{ marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#444' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <View>
                                <Text style={styles.limitText}>🔥 Burn Rate</Text>
                                <Text style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: 16 }}>
                                    {Math.round((viewData?.totalSpent || 0) / Math.max(new Date().getDate(), 1)).toLocaleString()} đ/day
                                </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.limitText}>🔮 Month Forecast</Text>
                                <Text style={{ color: (viewData?.projectedSpend > viewData?.totalLimit) ? '#ff3b30' : '#34c759', fontWeight: 'bold', fontSize: 16 }}>
                                    {Math.round(viewData?.projectedSpend || 0).toLocaleString()} đ
                                </Text>
                            </View>
                        </View>
                    </View>

                    <Text style={styles.healthTag}>Health: {viewData?.financialStatus || 'N/A'}</Text>
                </LinearGradient>

                <View style={[styles.section, { paddingTop: 0 }]}>
                    {selectedCategories.length === 0 && (
                        <>
                            <Text style={styles.sectionTitle}>Income vs Expense</Text>
                            {viewData && (
                                <IncomeExpenseBarChart
                                    income={viewData.totalIncome}
                                    expense={viewData.totalSpent}
                                />
                            )}
                        </>
                    )}

                    <Text style={styles.sectionTitle}>Monthly Trend</Text>
                    {viewData && (
                        <MonthlyTrendLineChart
                            data={viewData.transactions}
                            currentMonth={selectedDate}
                            filterCategory={selectedCategories.length === 1 ? selectedCategories[0] : null}
                        />
                    )}
                </View>

                {selectedCategories.length === 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Expense By Category</Text>
                        {viewData && <ExpensePieChart data={viewData} />}
                    </View>
                )}

                <View style={[styles.section, { paddingTop: 0 }]}>
                    <Text style={styles.sectionTitle}>Budget vs Actual (By Profile)</Text>
                    {data && Object.keys(data.budgets.profiles)
                        .filter(pid => selectedProfileIds.length === 0 || selectedProfileIds.includes(pid))
                        .map(pid => {
                            const pBudget = data.budgets.profiles[pid];
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
                        })
                    }
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
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
        color: '#1a1a1a',
    },
    errorText: {
        color: '#dc2626',
        fontSize: 18,
        fontWeight: 'bold',
    },
    filterRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    // Black Card Styles
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
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    statLabel: {
        color: '#999',
        fontSize: 14,
        marginBottom: 4,
    },
    incomeText: {
        color: '#34c759',
        fontSize: 20,
        fontWeight: 'bold',
    },
    expenseText: {
        color: '#ff3b30',
        fontSize: 20,
        fontWeight: 'bold',
    },
    divider: {
        height: 1,
        backgroundColor: '#444',
        marginBottom: 16,
    },
    netRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    netText: {
        fontSize: 24,
        fontWeight: 'bold',
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
        backgroundColor: '#10b981',
    },
    limitText: {
        color: '#999',
        fontSize: 12,
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
});
