import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, DeviceEventEmitter } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getAccountData } from '../services/dataService';
import { useAuth } from '../components/context/AuthContext';
import MonthPicker from '../components/MonthPicker';
import BudgetProgressBar from '../components/BudgetProgressBar';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import IncomeExpenseBarChart from '../components/IncomeExpenseBarChart';
import MonthlyTrendLineChart from '../components/MonthlyTrendLineChart';
import CustomDateFilterModal from '../components/CustomDateFilterModal';
import CurrencyText from '../components/CurrencyText';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import { useTheme } from '../components/context/ThemeContext';

import ExpensePieChart from '../components/ExpensePieChart';

export default function AnalyzeScreen({ navigation }) {
    const { userProfiles, profile } = useAuth();
    const { theme } = useTheme();
    const colors = COLORS[theme];

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Date State
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [endDate, setEndDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));
    const [filterMode, setFilterMode] = useState('month');
    const [showDateFilter, setShowDateFilter] = useState(false);

    // Filters
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedProfileIds, setSelectedProfileIds] = useState([]);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        loadData();
        const subscription = DeviceEventEmitter.addListener('refresh_profile_dashboard', loadData);
        return () => subscription.remove();
    }, [startDate, endDate]);

    const loadData = async () => {
        try {
            setLoading(true);
            // Previous Range Logic
            let prevStart, prevEnd;
            if (filterMode === 'year') {
                prevStart = new Date(startDate);
                prevStart.setFullYear(prevStart.getFullYear() - 1);
                prevEnd = new Date(endDate);
                prevEnd.setFullYear(prevEnd.getFullYear() - 1);
            } else {
                prevStart = new Date(startDate);
                prevStart.setMonth(prevStart.getMonth() - 1);
                prevEnd = new Date(prevStart.getFullYear(), prevStart.getMonth() + 1, 0);
            }

            const [currentResult, prevResult] = await Promise.all([
                getAccountData('Owner', { startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0] }),
                getAccountData('Owner', { startDate: prevStart.toISOString().split('T')[0], endDate: prevEnd.toISOString().split('T')[0] })
            ]);

            setData({ current: currentResult, prev: prevResult });
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const viewData = useMemo(() => {
        if (!data || !data.current) return null;
        const { current, prev } = data;

        const processDataset = (dataset) => {
            if (!dataset) return { income: 0, expense: 0, net: 0, txs: [] };
            let filteredTxs = dataset.transactions || [];

            if (selectedProfileIds.length > 0) filteredTxs = filteredTxs.filter(t => selectedProfileIds.includes(t.profileId));
            if (selectedCategories.length > 0) filteredTxs = filteredTxs.filter(t => selectedCategories.includes(t.category));

            const isInternalTransfer = (t) => t.isTransfer || t.type === 'transfer' || t.category === 'Granted' || t.category === 'Present' || (t.note && t.note.includes('(Granted)'));
            const income = Math.round(filteredTxs.filter(t => t.type === 'income' && !isInternalTransfer(t)).reduce((acc, t) => acc + t.amount, 0));
            const expense = Math.round(filteredTxs.filter(t => (t.type || 'expense') === 'expense' && !isInternalTransfer(t)).reduce((acc, t) => acc + t.amount, 0));

            return { income, expense, net: income - expense, txs: filteredTxs };
        };

        const currentStats = processDataset(current);
        const prevStats = processDataset(prev);

        // Limit Logic
        let limit = 0;
        if (selectedProfileIds.length > 0) {
            selectedProfileIds.forEach(pid => {
                if (current.budgets?.profiles?.[pid]) limit += current.budgets.profiles[pid].limit;
            });
        } else {
            limit = current.totalLimit;
        }

        const netDiff = currentStats.net - prevStats.net;
        const incomeDiff = currentStats.income - prevStats.income;
        const expenseDiff = currentStats.expense - prevStats.expense;

        const calculatePercent = (diff, prevVal) => {
            if (prevVal === 0) return 0;
            return Math.round((diff / Math.abs(prevVal)) * 100);
        };

        return {
            ...current,
            transactions: currentStats.txs,
            totalIncome: currentStats.income,
            totalSpent: currentStats.expense,
            netCashflow: currentStats.net,
            totalLimit: limit,
            projectedSpend: (currentStats.expense / Math.max(new Date().getDate(), 1)) * 30,
            incomeDiff,
            expenseDiff,
            netDiff,
            netDiffPercent: calculatePercent(netDiff, prevStats.net),
            incomeDiffPercent: calculatePercent(incomeDiff, prevStats.income),
            expenseDiffPercent: calculatePercent(expenseDiff, prevStats.expense)
        };
    }, [data, selectedProfileIds, selectedCategories]);

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primaryAction} /></View>;
    if (error) return <View style={styles.center}><Text style={{ color: colors.error }}>{error}</Text></View>;

    const allCategories = (data?.current) ? [...new Set(data.current.transactions.filter(t => (t.type || 'expense') === 'expense').map(t => t.category))] : [];
    const categoryOptions = allCategories.map(c => ({ id: c, name: c }));
    const profileOptions = userProfiles.map(p => ({ id: p.id, name: p.name }));

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
            <ScrollView showsVerticalScrollIndicator={false}>



                {/* Page Title & Description (Restored) */}
                {/* Header */}
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: SPACING.screenPadding,
                    marginTop: SPACING.m,
                    marginBottom: SPACING.m
                }}>
                    <View style={{
                        width: 48, height: 48, borderRadius: 24,
                        backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.m
                    }}>
                        <Text style={{ fontSize: 24 }}>{profile?.avatar || '👤'}</Text>
                    </View>
                    <Text style={{ fontSize: TYPOGRAPHY.size.h2, fontWeight: TYPOGRAPHY.weight.bold, color: colors.primaryText }}>Analysis</Text>
                </View>

                {/* Date Selector & Filter Toggle Row */}
                <View style={[styles.header, { borderBottomColor: 'transparent', paddingVertical: 0, paddingBottom: SPACING.m, gap: 12 }]}>
                    {/* Date Selector (Flex 1) */}
                    <TouchableOpacity
                        onPress={() => setShowDateFilter(true)}
                        style={[styles.dateSelector, { flex: 1, marginVertical: 0, height: 48, justifyContent: 'center' }]}
                    >
                        <MaterialCommunityIcons name="calendar" size={20} color={colors.black} style={{ position: 'absolute', left: 16 }} />
                        <Text style={[styles.dateSelectorText, { color: colors.black, textAlign: 'center', flex: 1 }]}>
                            {filterMode === 'year' ? `Year ${startDate.getFullYear()}` : `Month ${startDate.getMonth() + 1}, ${startDate.getFullYear()}`}
                        </Text>
                        <MaterialCommunityIcons name="chevron-down" size={20} color={colors.black} style={{ position: 'absolute', right: 16 }} />
                    </TouchableOpacity>

                    {/* Filter Toggle Button */}
                    <TouchableOpacity
                        onPress={() => setShowFilters(!showFilters)}
                        style={{
                            width: 48, height: 48,
                            borderRadius: 16,
                            backgroundColor: showFilters ? '#6ca749' : '#F3F4F6', // Active Green, Inactive Light Gray
                            justifyContent: 'center', alignItems: 'center',
                        }}
                    >
                        <MaterialCommunityIcons name="tune" size={24} color={showFilters ? "#FFFFFF" : colors.black} />
                    </TouchableOpacity>
                </View>

                {/* Collapsible Filter Panel */}
                {showFilters && (
                    <View style={{
                        marginHorizontal: SPACING.screenPadding,
                        marginBottom: SPACING.m,
                        padding: SPACING.m,
                        backgroundColor: colors.surface,
                        borderRadius: 16,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        elevation: 3
                    }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.m }}>
                            <Text style={{ fontSize: TYPOGRAPHY.size.h4, fontWeight: 'bold', color: colors.primaryText }}>Filters</Text>
                            <TouchableOpacity onPress={() => setShowFilters(false)}>
                                <MaterialCommunityIcons name="close" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        <View style={{ gap: SPACING.m }}>
                            <MultiSelectDropdown
                                label="Profile" options={profileOptions}
                                selectedValues={selectedProfileIds} onSelectionChange={setSelectedProfileIds} compact={false}
                            />
                            <MultiSelectDropdown
                                label="Category" options={categoryOptions}
                                selectedValues={selectedCategories} onSelectionChange={setSelectedCategories} compact={false}
                            />
                        </View>
                    </View>
                )}

                {/* 1. Header Card: Net Cashflow (Biggest) */}
                <LinearGradient
                    colors={['#101828', '#1e3c72', '#2a5298']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={[styles.summaryCard, { paddingVertical: 24, paddingHorizontal: SPACING.l, alignItems: 'center', justifyContent: 'center' }]}
                >
                    <View style={{ alignItems: 'center', width: '100%' }}>
                        <Text style={[styles.cardLabel, { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 8, textAlign: 'center' }]}>NET CASHFLOW FOR FAMILY</Text>
                        <CurrencyText
                            amount={viewData?.netCashflow}
                            showSign={false}
                            style={[styles.netText, { color: '#FFFFFF', fontSize: 36, textAlign: 'center' }]}
                        />

                        {/* Comparison Pill */}
                        {viewData?.netDiff !== 0 && (
                            <View style={{
                                backgroundColor: 'rgba(255,255,255,0.15)',
                                alignSelf: 'center',
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 8,
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginTop: 12
                            }}>
                                <Text style={{ color: viewData?.netDiff >= 0 ? '#A0E8AF' : '#FFCDD2', fontSize: 13, fontWeight: '600' }}>
                                    {viewData?.netDiff >= 0 ? '▲' : '▼'} {Math.abs(viewData?.netDiff || 0).toLocaleString()} <Text style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '400' }}>vs last {filterMode}</Text>
                                </Text>
                            </View>
                        )}
                    </View>
                </LinearGradient>

                {/* 2. Secondary Cards List */}
                <View style={{ paddingHorizontal: SPACING.screenPadding, marginTop: -SPACING.s, gap: SPACING.m }}>

                    {/* Monthly Income */}
                    <View style={styles.listCard}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.listCardLabel}>TOTAL INCOME</Text>
                            <CurrencyText
                                amount={viewData?.totalIncome}
                                showSign={false}
                                style={styles.listCardValue}
                            />
                            {viewData?.incomeDiffPercent !== 0 && (
                                <Text style={{ fontSize: 13, fontWeight: '600', color: viewData?.incomeDiffPercent >= 0 ? '#2E7D32' : '#C62828', marginTop: 4 }}>
                                    {viewData?.incomeDiffPercent >= 0 ? '▲' : '▼'} {Math.abs(viewData?.incomeDiffPercent || 0)}%
                                </Text>
                            )}
                        </View>
                        <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
                            <MaterialCommunityIcons name="currency-usd" size={24} color="#2E7D32" />
                        </View>
                    </View>

                    {/* Expense */}
                    <View style={styles.listCard}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.listCardLabel}>TOTAL EXPENSE</Text>
                            <CurrencyText
                                amount={-viewData?.totalSpent}
                                showSign={false}
                                style={styles.listCardValue}
                            />
                            {viewData?.expenseDiffPercent !== 0 && (
                                <Text style={{ fontSize: 13, fontWeight: '600', color: viewData?.expenseDiffPercent > 0 ? '#C62828' : '#2E7D32', marginTop: 4 }}>
                                    {viewData?.expenseDiffPercent > 0 ? '▲' : '▼'} {Math.abs(viewData?.expenseDiffPercent || 0)}%
                                </Text>
                            )}
                        </View>
                        <View style={[styles.iconBox, { backgroundColor: '#FFEBEE' }]}>
                            <MaterialCommunityIcons name="chart-line-variant" size={24} color="#C62828" />
                        </View>
                    </View>

                    {/* Burn Rate */}
                    <View style={styles.listCard}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.listCardLabel}>DAILY BURN RATE</Text>
                            {/* Fix: use style prop on CurrencyText directly if possible, or ensure wrapping Text doesn't constrain it unexpectedly. 
                                 However, previous issue was CurrencyText inside Text inheriting styles but maybe CurrencyText default size overriding?
                                 I'll just apply style directly to CurrencyText and remove wrapper if CurrencyText supports it (it does).
                             */}
                            <CurrencyText
                                amount={Math.round((viewData?.totalSpent || 0) / Math.max(new Date().getDate(), 1))}
                                style={styles.listCardValue}
                            />
                        </View>
                        <View style={[styles.iconBox, { backgroundColor: '#FFF3E0' }]}>
                            <MaterialCommunityIcons name="fire" size={24} color="#EF6C00" />
                        </View>
                    </View>

                    {/* Forecast */}
                    <View style={styles.listCard}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.listCardLabel}>MONTHLY FORECAST</Text>
                            <CurrencyText
                                amount={viewData?.projectedSpend}
                                style={styles.listCardValue}
                            />
                        </View>
                        <View style={[styles.iconBox, { backgroundColor: '#EDE7F6' }]}>
                            <MaterialCommunityIcons name="crystal-ball" size={24} color="#673AB7" />
                        </View>
                    </View>

                </View>

                <View style={{ height: SPACING.l }} />

                {/* Chart Section: Trends */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Monthly Trend</Text>
                    {viewData && (
                        <MonthlyTrendLineChart
                            data={viewData.transactions}
                            startDate={startDate}
                            endDate={endDate}
                            filterCategory={selectedCategories.length === 1 ? selectedCategories[0] : null}
                        />
                    )}
                </View>

                {/* Chart Section: Income vs Expense */}
                {selectedCategories.length === 0 && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Income vs Expense</Text>
                        {viewData && (
                            <IncomeExpenseBarChart
                                income={viewData.totalIncome}
                                expense={viewData.totalSpent}
                            />
                        )}
                    </View>
                )}

                {/* RESTORED: Pie Chart */}
                {selectedCategories.length === 0 && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Expense By Category</Text>
                        {viewData && <ExpensePieChart data={viewData} />}
                    </View>
                )}

                {/* Budget Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Budgets</Text>
                    {data && data.current && data.current.budgets && Object.keys(data.current.budgets.profiles)
                        .filter(pid => selectedProfileIds.length === 0 || selectedProfileIds.includes(pid))
                        .map(pid => {
                            const pBudget = data.current.budgets.profiles[pid];
                            const pName = userProfiles.find(p => p.id === pid)?.name || `Profile ${pid}`;

                            return (
                                <BudgetProgressBar
                                    key={pid}
                                    label={pName}
                                    spent={pBudget.spent}
                                    limit={pBudget.limit}
                                    boxed={true}
                                />
                            );
                        })
                    }
                </View>

                <View style={{ height: 40 }} />

            </ScrollView>

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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: SPACING.screenPadding,
        borderBottomWidth: 1,
    },
    screenTitle: {
        fontSize: TYPOGRAPHY.size.h2,
        fontWeight: TYPOGRAPHY.weight.bold,
        fontFamily: TYPOGRAPHY.fontFamily.bold,
    },
    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6', // Match inactive button
        paddingHorizontal: 12,
        borderRadius: 16, // Match button
    },
    dateSelectorText: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: '400', // Not bold
        fontFamily: TYPOGRAPHY.fontFamily.regular,
    },
    filterRow: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.screenPadding,
        paddingTop: SPACING.m,
        paddingBottom: SPACING.s,
    },
    summaryCard: {
        margin: SPACING.screenPadding,
        padding: SPACING.l,
        borderRadius: SPACING.cardBorderRadius,
    },
    cardLabel: {
        fontSize: TYPOGRAPHY.size.small,
        fontWeight: TYPOGRAPHY.weight.bold,
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    netText: {
        fontSize: TYPOGRAPHY.size.h1,
        fontWeight: TYPOGRAPHY.weight.bold,
        letterSpacing: -1,
        marginBottom: 4,
    },
    diffText: {
        fontSize: TYPOGRAPHY.size.caption,
        fontWeight: TYPOGRAPHY.weight.medium,
        marginBottom: SPACING.m,
    },
    divider: {
        height: 1,
        width: '100%',
        marginVertical: SPACING.m,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statLabel: {
        fontSize: TYPOGRAPHY.size.small,
        fontWeight: TYPOGRAPHY.weight.bold,
        letterSpacing: 0.5,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    statValue: {
        fontSize: TYPOGRAPHY.size.h3,
        fontWeight: TYPOGRAPHY.weight.semiBold,
        fontVariant: ['tabular-nums'],
    },
    section: {
        paddingHorizontal: SPACING.screenPadding,
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        fontSize: TYPOGRAPHY.size.h3,
        fontWeight: TYPOGRAPHY.weight.bold,
        marginBottom: SPACING.m,
        letterSpacing: -0.5,
    },
    glassCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    listCard: {
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.l,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    listCardLabel: {
        fontSize: TYPOGRAPHY.size.small,
        color: '#9CA3AF',
        fontWeight: 'bold',
        marginBottom: 4,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    listCardValue: {
        fontSize: TYPOGRAPHY.size.h3,
        fontWeight: 'bold',
        color: '#111111',
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
