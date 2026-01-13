import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, DeviceEventEmitter } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
    const { userProfiles } = useAuth();
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

        return {
            ...current,
            transactions: currentStats.txs,
            totalIncome: currentStats.income,
            totalSpent: currentStats.expense,
            netCashflow: currentStats.net,
            totalLimit: limit,
            projectedSpend: (currentStats.expense / Math.max(new Date().getDate(), 1)) * 30,
            incomeDiff: currentStats.income - prevStats.income,
            expenseDiff: currentStats.expense - prevStats.expense,
            netDiff: currentStats.net - prevStats.net
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
                <View style={{ paddingHorizontal: SPACING.screenPadding, paddingTop: SPACING.m, paddingBottom: SPACING.s }}>
                    <Text style={{
                        fontSize: TYPOGRAPHY.size.h1,
                        fontWeight: TYPOGRAPHY.weight.bold,
                        color: colors.primaryText,
                        fontFamily: TYPOGRAPHY.fontFamily.bold,
                        marginBottom: 4
                    }}>
                        Financial Insights
                    </Text>
                    <Text style={{
                        fontSize: TYPOGRAPHY.size.body,
                        color: colors.secondaryText,
                        fontFamily: TYPOGRAPHY.fontFamily.regular,
                        lineHeight: 22
                    }}>
                        Deep dive into your income, expenses, and budget health.
                    </Text>
                </View>

                {/* Date Selector Header */}
                <View style={[styles.header, { borderBottomColor: colors.divider }]}>
                    <TouchableOpacity onPress={() => setShowDateFilter(true)} style={styles.dateSelector}>
                        <Text style={[styles.dateSelectorText, { color: colors.primaryAction }]}>
                            {filterMode === 'year' ? `Year ${startDate.getFullYear()}` : `Month ${startDate.getMonth() + 1}, ${startDate.getFullYear()}`}
                        </Text>
                        <MaterialCommunityIcons name="chevron-down" size={20} color={colors.primaryAction} />
                    </TouchableOpacity>
                </View>

                {/* Filters */}
                <View style={styles.filterRow}>
                    <MultiSelectDropdown
                        label="Profile" options={profileOptions}
                        selectedValues={selectedProfileIds} onSelectionChange={setSelectedProfileIds} compact={true}
                    />
                    <View style={{ width: 12 }} />
                    <MultiSelectDropdown
                        label="Category" options={categoryOptions}
                        selectedValues={selectedCategories} onSelectionChange={setSelectedCategories} compact={true}
                    />
                </View>

                {/* Main Stats Card (B&W High Contrast) */}
                <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View>
                            <Text style={[styles.cardLabel, { color: colors.secondaryText }]}>NET CASHFLOW</Text>
                            <CurrencyText
                                amount={viewData?.netCashflow}
                                showSign={true}
                                style={[styles.netText, { color: viewData?.netCashflow >= 0 ? colors.success : colors.primaryText }]}
                            />
                        </View>

                        {/* Health Status Badge */}
                        {viewData && (
                            <View style={{
                                backgroundColor: (viewData.financialStatus?.includes('Healthy') ? colors.success : colors.error) + '20',
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 12
                            }}>
                                <Text style={{
                                    color: viewData.financialStatus?.includes('Healthy') ? colors.success : colors.error,
                                    fontWeight: 'bold',
                                    fontSize: 12
                                }}>
                                    {viewData.financialStatus || (viewData.netCashflow >= 0 ? '🟢 Healthy' : '🟠 Deficit')}
                                </Text>
                            </View>
                        )}
                    </View>

                    <Text style={[styles.diffText, { color: viewData?.netDiff >= 0 ? colors.success : colors.error }]}>
                        {viewData?.netDiff >= 0 ? '▲' : '▼'} <CurrencyText amount={Math.abs(viewData?.netDiff || 0)} /> vs last {filterMode}
                    </Text>

                    <View style={[styles.divider, { backgroundColor: colors.divider }]} />

                    <View style={styles.statsRow}>
                        <View>
                            <Text style={[styles.statLabel, { color: colors.secondaryText }]}>INCOME</Text>
                            <CurrencyText
                                amount={viewData?.totalIncome}
                                showSign={true}
                                style={[styles.statValue, { color: colors.success }]}
                            />
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.statLabel, { color: colors.secondaryText }]}>EXPENSE</Text>
                            <CurrencyText
                                amount={-viewData?.totalSpent}
                                showSign={true}
                                style={[styles.statValue, { color: colors.error }]}
                            />
                            <Text style={[styles.diffText, { color: viewData?.expenseDiff <= 0 ? colors.success : colors.error, textAlign: 'right', marginTop: 2 }]}>
                                {viewData?.expenseDiff > 0 ? '▲' : '▼'} <CurrencyText amount={Math.abs(viewData?.expenseDiff || 0)} />
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.divider }]} />

                    {/* Analytics Section */}
                    <View style={styles.statsRow}>
                        <View>
                            <Text style={[styles.statLabel, { color: colors.secondaryText }]}>🔥 BURN RATE</Text>
                            <Text style={[styles.statValue, { color: '#F59E0B' }]}>
                                <CurrencyText amount={Math.round((viewData?.totalSpent || 0) / Math.max(new Date().getDate(), 1))} /> /day
                            </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.statLabel, { color: colors.secondaryText }]}>🔮 FORECAST</Text>
                            <CurrencyText
                                amount={viewData?.projectedSpend}
                                style={[styles.statValue, {
                                    color: (viewData?.projectedSpend > viewData?.totalLimit) ? colors.error : colors.success
                                }]}
                            />
                        </View>
                    </View>
                </View>

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
        backgroundColor: 'rgba(0,0,0,0.05)', // Subtle background like MonthPicker button?
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20, // Rounded pill shape
    },
    dateSelectorText: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: TYPOGRAPHY.weight.medium,
        marginRight: 4,
        fontFamily: TYPOGRAPHY.fontFamily.medium,
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
});
