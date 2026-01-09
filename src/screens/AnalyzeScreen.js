// Purpose: Detailed Analysis View (Charts, Budget vs Actual)
// Connected Flow: ACCOUNT_ANALYSIS_FLOW
// Access: Owner/Partner Only

import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, DeviceEventEmitter } from 'react-native';
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
import CustomDateFilterModal from '../components/CustomDateFilterModal';

export default function AnalyzeScreen({ navigation }) {
    const { userProfiles } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Date State
    const [selectedDate, setSelectedDate] = useState(new Date()); // For display reference
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [endDate, setEndDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));
    const [filterMode, setFilterMode] = useState('month'); // 'month' | 'year'
    const [showDateFilter, setShowDateFilter] = useState(false);

    // Filters (Multi-Select)
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedProfileIds, setSelectedProfileIds] = useState([]);

    useEffect(() => {
        loadData();
        const subscription = DeviceEventEmitter.addListener('refresh_profile_dashboard', loadData);
        return () => {
            subscription.remove();
        };
    }, [selectedDate, startDate, endDate]); // Added startDate, endDate to dependencies

    const loadData = async () => {
        try {
            setLoading(true);

            // Calculate Previous Range
            let prevStart, prevEnd;
            if (filterMode === 'year') {
                prevStart = new Date(startDate);
                prevStart.setFullYear(prevStart.getFullYear() - 1);
                prevEnd = new Date(endDate);
                prevEnd.setFullYear(prevEnd.getFullYear() - 1);
            } else {
                // Month Mode
                prevStart = new Date(startDate);
                prevStart.setMonth(prevStart.getMonth() - 1);
                // Handle Month End logic
                prevEnd = new Date(prevStart.getFullYear(), prevStart.getMonth() + 1, 0);
            }

            // Fetch Both Comparisons in Parallel
            const [currentResult, prevResult] = await Promise.all([
                getAccountData('Owner', {
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0]
                }),
                getAccountData('Owner', {
                    startDate: prevStart.toISOString().split('T')[0],
                    endDate: prevEnd.toISOString().split('T')[0]
                })
            ]);

            setData({ current: currentResult, prev: prevResult });
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

    // MEMOIZED VIEW DATA (2-Layer Multi-Select Filter + Comparison)
    const viewData = useMemo(() => {
        if (!data || !data.current) return null;

        const { current, prev } = data;

        // --- Helper to process a dataset ---
        const processDataset = (dataset) => {
            if (!dataset) return { income: 0, expense: 0, net: 0, txs: [] };
            let filteredTxs = dataset.transactions || [];

            // Layer 1: Profile Filter
            if (selectedProfileIds.length > 0) {
                filteredTxs = filteredTxs.filter(t => selectedProfileIds.includes(t.profileId));
            }

            // Layer 2: Category Filter
            if (selectedCategories.length > 0) {
                filteredTxs = filteredTxs.filter(t => selectedCategories.includes(t.category));
            }

            // Exclusion Filter (Internal Transfers)
            const isInternalTransfer = (t) => t.isTransfer
                || t.type === 'transfer'
                || t.category === 'Granted'
                || t.category === 'Present'
                || (t.note && t.note.includes('(Granted)'));

            const income = Math.round(filteredTxs.filter(t => t.type === 'income' && !isInternalTransfer(t)).reduce((acc, t) => acc + t.amount, 0));
            const expense = Math.round(filteredTxs.filter(t => (t.type || 'expense') === 'expense' && !isInternalTransfer(t)).reduce((acc, t) => acc + t.amount, 0));

            return {
                income,
                expense,
                net: income - expense,
                txs: filteredTxs
            };
        };

        const currentStats = processDataset(current);
        const prevStats = processDataset(prev);

        // Limit Logic (Current Only)
        let limit = 0;
        if (selectedProfileIds.length > 0) {
            selectedProfileIds.forEach(pid => {
                if (current.budgets?.profiles?.[pid]) {
                    limit += current.budgets.profiles[pid].limit;
                }
            });
        } else {
            limit = current.totalLimit;
        }

        return {
            ...current, // Default to current structure for downstream
            transactions: currentStats.txs,
            totalIncome: currentStats.income,
            totalSpent: currentStats.expense,
            netCashflow: currentStats.net,
            totalLimit: limit,
            projectedSpend: (currentStats.expense / Math.max(new Date().getDate(), 1)) * 30,

            // Diffs
            incomeDiff: currentStats.income - prevStats.income,
            expenseDiff: currentStats.expense - prevStats.expense,
            netDiff: currentStats.net - prevStats.net
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
    // Prepare Options for Dropdowns
    const allCategories = (data && data.current) ? [...new Set(data.current.transactions
        .filter(t => (t.type || 'expense') === 'expense')
        .map(t => t.category))] : [];

    const categoryOptions = allCategories.map(c => ({ id: c, name: c }));
    const profileOptions = userProfiles.map(p => ({ id: p.id, name: p.name }));

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView>
                <View style={styles.header}>
                    <Text style={styles.title}>Family Financial Overview</Text>
                    <TouchableOpacity onPress={() => setShowDateFilter(true)} style={styles.dateSelector}>
                        <Text style={styles.dateSelectorText}>
                            {filterMode === 'year'
                                ? `Year ${startDate.getFullYear()}`
                                : `Month ${startDate.getMonth() + 1}, ${startDate.getFullYear()}`
                            }
                        </Text>
                        <MaterialCommunityIcons name="chevron-down" size={20} color="#007AFF" />
                    </TouchableOpacity>
                </View>

                <CustomDateFilterModal
                    visible={showDateFilter}
                    onClose={() => setShowDateFilter(false)}
                    initialDate={startDate}
                    initialMode={filterMode}
                    onApply={(start, end, mode) => {
                        setStartDate(start);
                        setEndDate(end);
                        setFilterMode(mode);
                        setShowDateFilter(false);
                    }}
                />

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
                            <Text style={[styles.diffText, { color: viewData?.incomeDiff >= 0 ? '#34c759' : '#ff3b30' }]}>
                                {viewData?.incomeDiff >= 0 ? '▲' : '▼'} {Math.abs(viewData?.incomeDiff || 0).toLocaleString()}
                            </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.statLabel}>Expenses</Text>
                            <Text style={styles.expenseText}>-{viewData?.totalSpent?.toLocaleString()} đ</Text>
                            <Text style={[styles.diffText, { color: viewData?.expenseDiff <= 0 ? '#34c759' : '#ff3b30' }]}>
                                {viewData?.expenseDiff > 0 ? '▲' : '▼'} {Math.abs(viewData?.expenseDiff || 0).toLocaleString()}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.netRow}>
                        <Text style={styles.statLabel}>Net Cashflow</Text>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.netText, { color: viewData?.netCashflow >= 0 ? '#34c759' : '#ff3b30' }]}>
                                {viewData?.netCashflow > 0 ? '+' : ''}{viewData?.netCashflow?.toLocaleString()} đ
                            </Text>
                            <Text style={[styles.diffText, { color: viewData?.netDiff >= 0 ? '#34c759' : '#ff3b30', fontSize: 14 }]}>
                                {viewData?.netDiff >= 0 ? '▲ Better' : '▼ Worse'} {Math.abs(viewData?.netDiff || 0).toLocaleString()}
                            </Text>
                        </View>
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

                    <View style={styles.sectionTitleRow}>
                        <Text style={styles.sectionTitle}>Monthly Trend</Text>
                    </View>
                    {viewData && (
                        <MonthlyTrendLineChart
                            data={viewData.transactions}
                            startDate={startDate} // Pass Range Bounds
                            endDate={endDate}
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
                    {data && data.current && data.current.budgets && Object.keys(data.current.budgets.profiles)
                        .filter(pid => selectedProfileIds.length === 0 || selectedProfileIds.includes(pid))
                        .map(pid => {
                            const pBudget = data.current.budgets.profiles[pid];
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
        paddingTop: 12,
        paddingBottom: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    backButton: {
        paddingRight: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1a1a1a',
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
    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#f0f9ff',
        borderRadius: 20
    },
    dateSelectorText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#007AFF',
        marginRight: 4
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
    diffText: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2
    },
});
