import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, DeviceEventEmitter, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { getAccountData } from '../services/dataService';
import { useAuth } from '../components/context/AuthContext';
import BudgetProgressBar from '../components/BudgetProgressBar';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import IncomeExpenseBarChart from '../components/IncomeExpenseBarChart';
import MonthlyTrendLineChart from '../components/MonthlyTrendLineChart';
import CustomDateFilterModal from '../components/CustomDateFilterModal';
import CurrencyText from '../components/CurrencyText';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import { useTheme } from '../components/context/ThemeContext';
import ExpensePieChart from '../components/ExpensePieChart';
import { useVisibility } from '../components/context/VisibilityContext';
import Avatar from '../components/Avatar';

export default function AnalyzeScreen({ navigation }) {
    const { userProfiles, profile } = useAuth();
    const { theme } = useTheme();
    const colors = COLORS[theme];
    const { isValuesHidden, toggleVisibility } = useVisibility();

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

        const calculatePercent = (curr, previous) => {
            if (!previous || previous === 0) return curr === 0 ? 0 : 100;
            return ((curr - previous) / previous) * 100;
        };

        const incomeDiffPercent = calculatePercent(currentStats.income, prevStats.income);
        const expenseDiffPercent = calculatePercent(currentStats.expense, prevStats.expense);
        const netDiff = currentStats.net - prevStats.net;
        const netDiffPercent = calculatePercent(currentStats.net, prevStats.net);

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
            netDiff,
            netDiffPercent,
            incomeDiffPercent,
            expenseDiffPercent,
            totalLimit: limit,
            projectedSpend: (currentStats.expense / Math.max(new Date().getDate(), 1)) * 30,
        };
    }, [data, selectedProfileIds, selectedCategories]);

    if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primaryAction} /></View>;
    if (error) return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={{ color: colors.error }}>{error}</Text></View>;

    const allCategories = (data?.current) ? [...new Set(data.current.transactions.filter(t => (t.type || 'expense') === 'expense').map(t => t.category))] : [];
    const categoryOptions = allCategories.map(c => ({ id: c, name: c }));
    const profileOptions = userProfiles.map(p => ({ id: p.id, name: p.name }));

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ backgroundColor: colors.headerBackground }}>
                <SafeAreaView edges={['top', 'left', 'right']} style={{ backgroundColor: colors.headerBackground }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                bounces={false}
                overScrollMode="never"
            >

                {/* TOP SECTION (Beige) */}
                <View style={[styles.topSection, { backgroundColor: colors.headerBackground }]}>

                    {/* Header Row - Matching Overview Structure */}
                    <View style={[styles.header, { marginTop: 10 }]}>
                        <View style={styles.headerLeft}>
                            <Avatar
                                name={profile?.name}
                                avatarId={profile?.avatarId}
                                size={44}
                                backgroundColor={colors.cardBackground}
                                textColor={colors.headerText}
                                style={{ borderWidth: 1, borderColor: colors.divider }}
                            />
                            <View>
                                <Text style={[styles.screenTitle, { color: colors.headerText }]}>Analysis</Text>
                            </View>
                        </View>

                        {/* Filter & Date Row */}
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity onPress={() => setShowDateFilter(true)} style={[styles.headerButton, { backgroundColor: colors.iconBackground }]}>
                                <MaterialCommunityIcons name="calendar" size={18} color={colors.headerIcon} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={[styles.headerButton, { backgroundColor: colors.iconBackground }]}>
                                <MaterialCommunityIcons name="tune" size={18} color={showFilters ? colors.primaryAction : colors.headerIcon} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Hero Title */}
                    <View style={{ marginBottom: 20 }}>
                        <Text style={{ fontSize: 28, fontWeight: '900', color: colors.headerText, lineHeight: 40 }}>
                            My <Text style={{ color: colors.primaryAction }}>Family</Text> Financial
                        </Text>
                    </View>

                    <View style={{ height: 10 }} />
                </View>

                {/* FLOATING MAIN CARD */}
                <View style={styles.mainCardContainer}>
                    {/* Filter Panel - MOVED HERE */}
                    {showFilters && (
                        <View style={[styles.filterPanel, { backgroundColor: colors.cardBackground }]}>
                            <MultiSelectDropdown
                                label="Profile"
                                options={profileOptions}
                                selectedValues={selectedProfileIds}
                                onSelectionChange={setSelectedProfileIds}
                                compact={false}
                            />
                            <View style={{ height: 12 }} />
                            <MultiSelectDropdown
                                label="Category"
                                options={categoryOptions}
                                selectedValues={selectedCategories}
                                onSelectionChange={setSelectedCategories}
                                theme={theme}
                                compact={false}
                            />
                        </View>
                    )}

                    <View style={[styles.mainCard, { backgroundColor: colors.cardBackground, shadowColor: colors.shadow }]}>
                        {/* Top: Net Cashflow */}
                        <View style={{ padding: 14, paddingBottom: 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                <View style={{ backgroundColor: '#E8F5E9', padding: 4, borderRadius: 6 }}>
                                    <Ionicons name="wallet-outline" size={14} color="#4CAF50" />
                                </View>
                                <Text style={{ color: colors.secondaryText, fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>NET CASHFLOW</Text>
                                <TouchableOpacity onPress={toggleVisibility} style={{ marginLeft: 'auto' }}>
                                    <Ionicons name={isValuesHidden ? "eye-off-outline" : "eye-outline"} size={18} color={colors.secondaryText} />
                                </TouchableOpacity>
                            </View>

                            <CurrencyText
                                amount={viewData?.netCashflow}
                                showSign={false}
                                hideable={true}
                                style={{ fontSize: 26, fontWeight: '700', color: (viewData?.netCashflow || 0) < 0 ? colors.error : colors.primaryAction, marginVertical: 4 }}
                                symbolStyle={{ fontSize: 26, fontWeight: '700', color: (viewData?.netCashflow || 0) < 0 ? colors.error : colors.primaryAction }}
                            />
                            {/* Comparison Text */}
                            {viewData?.netDiff !== undefined && (
                                <Text style={{ fontSize: 12, color: '#9e9e9e', fontWeight: '500' }}>
                                    {viewData.netDiff > 0 ? '+' : ''}
                                    <CurrencyText amount={viewData.netDiff} showSign={false} style={{ color: viewData.netDiff >= 0 ? '#4CAF50' : '#F44336' }} />
                                    {' '}vs previous {filterMode}
                                </Text>
                            )}
                        </View>

                        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

                        {/* Bottom: Income vs Expense */}
                        <View style={{ flexDirection: 'row', padding: 14, paddingTop: 10 }}>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                                    <Text style={{ fontSize: 14, color: colors.secondaryText }}>Total Income</Text>
                                    <View style={{ backgroundColor: colors.success + '20', padding: 2, borderRadius: 8 }}>
                                        <Ionicons name="trending-up" size={12} color={colors.success} />
                                    </View>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                                    <CurrencyText amount={viewData?.totalIncome} showSign={false} hideable={true} style={{ fontSize: 18, fontWeight: '600', color: colors.primaryText }} />
                                    {viewData?.incomeDiffPercent !== undefined && viewData.incomeDiffPercent !== 0 && (
                                        <Text style={{ fontSize: 11, fontWeight: '600', color: viewData.incomeDiffPercent >= 0 ? '#4CAF50' : '#F44336' }}>
                                            {viewData.incomeDiffPercent > 0 ? '▲' : '▼'}{Math.abs(viewData.incomeDiffPercent).toFixed(0)}%
                                        </Text>
                                    )}
                                </View>
                            </View>
                            <View style={{ width: 1, backgroundColor: colors.divider, marginHorizontal: 16 }} />
                            <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                                    <Text style={{ fontSize: 14, color: colors.secondaryText }}>Total Expense</Text>
                                    <View style={{ backgroundColor: colors.error + '20', padding: 2, borderRadius: 8 }}>
                                        <Ionicons name="trending-down" size={12} color={colors.error} />
                                    </View>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, justifyContent: 'flex-end' }}>
                                    <CurrencyText amount={Math.abs(viewData?.totalSpent || 0)} showSign={false} hideable={true} style={{ fontSize: 18, fontWeight: '600', color: colors.primaryText }} />
                                    {viewData?.expenseDiffPercent !== undefined && viewData.expenseDiffPercent !== 0 && (
                                        <Text style={{ fontSize: 11, fontWeight: '600', color: viewData.expenseDiffPercent <= 0 ? colors.success : colors.error }}>
                                            {viewData.expenseDiffPercent > 0 ? '▲' : '▼'}{Math.abs(viewData.expenseDiffPercent).toFixed(0)}%
                                        </Text>
                                    )}
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* BOTTOM CONTENT */}
                <View style={[styles.bottomSection, { backgroundColor: colors.background }]}>



                    {/* SECONDARY CARDS (Compact) */}
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24, marginTop: 8 }}>
                        <View style={[styles.secondaryCard, { backgroundColor: colors.inputBackground }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Text style={[styles.secondaryLabel, { color: colors.secondaryText }]}>DAILY AVG</Text>
                                <View style={[styles.miniIconBox, { backgroundColor: colors.cardBackground }]}><MaterialCommunityIcons name="chart-timeline-variant" size={12} color={colors.primaryAction} /></View>
                            </View>
                            <CurrencyText
                                amount={Math.round((viewData?.totalSpent || 0) / Math.max(new Date().getDate(), 1))}
                                style={{ fontSize: 18, fontWeight: '600', color: colors.primaryText }}
                                symbolStyle={{ fontSize: 12, color: colors.primaryText, verticalAlign: 'top', lineHeight: 22 }}
                            />
                            <View style={styles.decorativeCurve} />
                        </View>

                        <View style={[styles.secondaryCard, { backgroundColor: colors.inputBackground }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Text style={[styles.secondaryLabel, { color: colors.secondaryText }]}>FORECAST</Text>
                                <View style={[styles.miniIconBox, { backgroundColor: colors.cardBackground }]}><MaterialCommunityIcons name="flash" size={12} color="#FF9800" /></View>
                            </View>
                            <CurrencyText
                                amount={viewData?.projectedSpend}
                                style={{ fontSize: 18, fontWeight: '600', color: colors.primaryText }}
                                symbolStyle={{ fontSize: 12, color: colors.primaryText, verticalAlign: 'top', lineHeight: 22 }}
                            />
                            <View style={styles.decorativeCurve} />
                        </View>
                    </View>

                    {/* Charts */}
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

                    {selectedCategories.length === 0 && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Income vs Expense</Text>
                            {viewData && <IncomeExpenseBarChart income={viewData.totalIncome} expense={viewData.totalSpent} />}
                        </View>
                    )}

                    {selectedCategories.length === 0 && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Expense By Category</Text>
                            {viewData && <ExpensePieChart data={viewData} />}
                        </View>
                    )}

                    {/* Budgets */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Budgets</Text>
                        {data && data.current && data.current.budgets && Object.keys(data.current.budgets.profiles)
                            .filter(pid => selectedProfileIds.length === 0 || selectedProfileIds.includes(pid))
                            .map(pid => {
                                const profile = userProfiles.find(p => p.id === pid);
                                const pName = profile?.name || `Profile ${pid}`;
                                const pBudget = data.current.budgets.profiles[pid];
                                return (
                                    <BudgetProgressBar
                                        key={pid}
                                        label={pName}
                                        avatarId={profile?.avatarId}
                                        spent={pBudget.spent}
                                        limit={pBudget.limit}
                                        boxed={true}
                                    />
                                );
                            })
                        }
                    </View>

                    <View style={{ height: 40 }} />
                </View>
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingBottom: 40 },

    topSection: {
        backgroundColor: '#f7ede2', // fallback
        paddingHorizontal: SPACING.screenPadding,
        paddingBottom: 60,
        borderBottomLeftRadius: 36,
        borderBottomRightRadius: 36,
        paddingTop: 4,
        zIndex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.l,
        marginTop: 10,
    },
    headerLeft: {
        flexDirection: 'row', alignItems: 'center', gap: 12
    },
    avatarContainer: {
        width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center'
    },
    greeting: { fontSize: 13, fontWeight: '500' },
    screenTitle: { fontSize: 18, fontWeight: '900' },
    headerButton: {
        width: 36, height: 36, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.6)',
        justifyContent: 'center', alignItems: 'center'
    },

    // Main Card
    mainCardContainer: {
        paddingHorizontal: SPACING.screenPadding,
        marginTop: -60, // Overlap
        marginBottom: 20,
        zIndex: 2,
    },
    mainCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 4,
    },
    divider: {
        height: 1, backgroundColor: '#f5f5f5', width: '100%'
    },

    // Secondary Cards
    secondaryCard: {
        flex: 1,
        backgroundColor: '#e5ece4', // Light Green
        borderRadius: 18,
        padding: 12,
        height: 74, // Reduced from 80
        // justifyContent: 'space-between', // Removed
        gap: 4,
        overflow: 'hidden'
    },
    secondaryLabel: {
        fontSize: 14, fontWeight: '700', color: '#546E7A', textTransform: 'uppercase'
    },
    miniIconBox: {
        backgroundColor: '#ffffff', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center'
    },
    decorativeCurve: {
        position: 'absolute', bottom: 0, right: 0, left: 0, height: 16, backgroundColor: 'rgba(255,255,255,0.3)', borderTopLeftRadius: 20, borderTopRightRadius: 20
    },

    bottomSection: {
        paddingHorizontal: SPACING.screenPadding,
        backgroundColor: '#ffffff', // fallback handled in component
        minHeight: 500,
    },
    filterPanel: {
        marginBottom: 20, backgroundColor: '#ffffff', padding: 16, borderRadius: 20,
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2
    },

    section: {
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: SPACING.m,
    },
});
