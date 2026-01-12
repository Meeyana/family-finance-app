import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, DeviceEventEmitter, useColorScheme, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProfileData } from '../services/dataService';
import { getFamilyCategories } from '../services/firestoreRepository';
import { auth } from '../services/firebase';
import { useAuth } from '../components/context/AuthContext';
import MonthPicker from '../components/MonthPicker';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import CurrencyText from '../components/CurrencyText';

export default function AccountDashboard({ navigation }) {
    const { profile } = useAuth();
    const [data, setData] = useState(null);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date());

    const theme = useColorScheme() || 'light';
    const colors = COLORS[theme];

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

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
            const prevMonthDate = new Date(selectedDate);
            prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);

            const [currentResult, prevResult] = await Promise.all([
                getProfileData(profile.id, selectedDate),
                getProfileData(profile.id, prevMonthDate)
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
            if (!dataset) return { income: 0, expense: 0, given: 0, received: 0, net: 0, categoryMap: {}, txs: [] };
            const filteredTxs = dataset.transactions || [];

            const isInternalTransfer = (t) => t.isTransfer || t.type === 'transfer' || t.category === 'Granted' || t.category === 'Present' || (t.note && t.note.includes('(Granted)'));

            const income = filteredTxs.filter(t => t.type === 'income' && !isInternalTransfer(t)).reduce((acc, t) => acc + t.amount, 0);
            const expenseTxs = filteredTxs.filter(t => (t.type || 'expense') === 'expense' && !isInternalTransfer(t));
            const expense = expenseTxs.reduce((acc, t) => acc + t.amount, 0);

            let given = 0;
            let received = 0;
            filteredTxs.filter(isInternalTransfer).forEach(t => {
                const isGiven = (t.note && t.note.includes('Transfer to')) || t.category === 'Transfer Out' || t.categoryIcon === '💸';
                const isReceived = (t.note && t.note.includes('Received from')) || t.category === 'Allowance' || t.categoryIcon === '💰';
                if (isGiven) given += t.amount; else if (isReceived) received += t.amount; else given += t.amount;
            });

            const categoryMap = {};
            expenseTxs.forEach(t => {
                let catName = t.category || 'Uncategorized';
                if (catName === 'Granted') catName = 'Present';
                categoryMap[catName] = (categoryMap[catName] || 0) + t.amount;
            });

            return { income, expense, given, received, net: income - expense, categoryMap, txs: filteredTxs, expenseTxs };
        };

        const currentStats = processDataset(current);
        const prevStats = processDataset(prev);

        const categoryBreakdown = Object.keys(currentStats.categoryMap).map(catName => {
            const catObj = categories.find(c => c.name === catName);
            const emoji = catObj?.icon || (catName === 'Present' ? '🎁' : '🏷️');
            return {
                name: catName,
                emoji,
                amount: currentStats.categoryMap[catName],
                percent: currentStats.expense > 0 ? (currentStats.categoryMap[catName] / currentStats.expense) * 100 : 0
            };
        }).sort((a, b) => b.amount - a.amount);

        return {
            ...current,
            transactions: currentStats.txs,
            categoryBreakdown,
            totalIncome: currentStats.income,
            totalSpent: currentStats.expense,
            totalGiven: currentStats.given,
            totalReceived: currentStats.received,
            netCashflow: currentStats.net,
            projectedSpend: (currentStats.expense / Math.max(new Date().getDate(), 1)) * 30,
            incomeDiff: currentStats.income - prevStats.income,
            expenseDiff: currentStats.expense - prevStats.expense,
            netDiff: currentStats.net - prevStats.net,

            // PERCENTAGES
            incomeDiffPercent: prevStats.income > 0 ? ((currentStats.income - prevStats.income) / prevStats.income) * 100 : 0,
            expenseDiffPercent: prevStats.expense > 0 ? ((currentStats.expense - prevStats.expense) / prevStats.expense) * 100 : 0
        };
    }, [data, categories]);

    if (loading) return <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primaryAction} /></SafeAreaView>;
    if (error) return <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}><Text style={{ color: colors.error }}>Could not load data</Text></SafeAreaView>;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* HEADER */}
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.greeting, { color: colors.secondaryText }]}>{getGreeting()}</Text>
                        <Text style={[styles.username, { color: colors.primaryText }]}>{profile?.name || 'User'}</Text>
                    </View>
                    <MonthPicker date={selectedDate} onMonthChange={setSelectedDate} />
                </View>

                {/* HERO: NET CASHFLOW */}
                <View style={[styles.section, { marginTop: SPACING.xl }]}>
                    <Text style={[styles.label, { color: colors.secondaryText }]}>Net Cashflow</Text>
                    <View style={styles.heroRow}>
                        <CurrencyText
                            amount={viewData?.netCashflow}
                            showSign={true}
                            style={[styles.heroValue, { color: viewData?.netCashflow >= 0 ? colors.success : colors.error }]}
                            symbolStyle={[styles.currency, { color: viewData?.netCashflow >= 0 ? colors.success : colors.error }]}
                        />
                    </View>
                    <Text style={[styles.diffText, { color: colors.secondaryText }]}>
                        {viewData?.netDiff >= 0 ? '▲ Better' : '▼ Worse'} than last month by <CurrencyText amount={Math.abs(viewData.netDiff)} />
                    </Text>
                </View>

                {/* STATS GRID */}
                <View style={styles.grid}>
                    {/* Row 1: Income & Expense */}
                    <View style={styles.row}>
                        <View style={[styles.card, { backgroundColor: colors.surface, flex: 1 }]}>
                            <View style={styles.cardHeader}>
                                <MaterialCommunityIcons name="arrow-down-left" size={20} color={colors.success} />
                                <Text style={[styles.cardLabel, { color: colors.secondaryText }]}>Income</Text>
                            </View>
                            <CurrencyText
                                amount={viewData?.totalIncome}
                                showSign={true}
                                style={[styles.cardValue, { color: colors.primaryText }]}
                            />
                            {/* Income Percent Diff */}
                            {viewData?.incomeDiffPercent !== 0 && (
                                <Text style={[styles.tinyLabel, { color: viewData?.incomeDiffPercent >= 0 ? colors.success : colors.error }]}>
                                    {viewData?.incomeDiffPercent > 0 ? '▲' : '▼'} {Math.abs(viewData?.incomeDiffPercent || 0).toFixed(0)}% vs last month
                                </Text>
                            )}
                        </View>

                        <View style={[styles.card, { backgroundColor: colors.surface, flex: 1 }]}>
                            <View style={styles.cardHeader}>
                                <MaterialCommunityIcons name="arrow-up-right" size={20} color={colors.error} />
                                <Text style={[styles.cardLabel, { color: colors.secondaryText }]}>Expense</Text>
                            </View>
                            <CurrencyText
                                amount={-viewData?.totalSpent}
                                showSign={true}
                                style={[styles.cardValue, { color: colors.primaryText }]}
                            />
                            {/* Expense Percent Diff */}
                            {viewData?.expenseDiffPercent !== 0 && (
                                <Text style={[styles.tinyLabel, { color: viewData?.expenseDiffPercent > 0 ? colors.error : colors.success }]}>
                                    {viewData?.expenseDiffPercent > 0 ? '▲' : '▼'} {Math.abs(viewData?.expenseDiffPercent || 0).toFixed(0)}% vs last month
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Row 2: Allowance & Presents (Restored) */}
                    <View style={styles.row}>
                        <View style={[styles.card, { backgroundColor: colors.surface, flex: 1 }]}>
                            <View style={styles.cardHeader}>
                                <MaterialCommunityIcons name="gift-open" size={20} color={colors.success} />
                                <Text style={[styles.cardLabel, { color: colors.secondaryText }]}>Receive</Text>
                            </View>
                            <CurrencyText
                                amount={viewData?.totalReceived}
                                showSign={true}
                                style={[styles.cardValue, { color: colors.primaryText }]}
                            />
                        </View>

                        <View style={[styles.card, { backgroundColor: colors.surface, flex: 1 }]}>
                            <View style={styles.cardHeader}>
                                <MaterialCommunityIcons name="gift" size={20} color={colors.primaryText} />
                                <Text style={[styles.cardLabel, { color: colors.secondaryText }]}>Given</Text>
                            </View>
                            <CurrencyText
                                amount={-viewData?.totalGiven}
                                showSign={true}
                                style={[styles.cardValue, { color: colors.primaryText }]}
                            />
                        </View>
                    </View>

                    {/* Row 3: Forecast (Restored) */}
                    <View style={styles.row}>
                        <View style={[styles.card, { backgroundColor: colors.surface, flex: 1 }]}>
                            <View style={styles.cardHeader}>
                                <MaterialCommunityIcons name="crystal-ball" size={20} color={colors.secondaryText} />
                                <Text style={[styles.cardLabel, { color: colors.secondaryText }]}>Forecast</Text>
                            </View>
                            <CurrencyText
                                amount={-Math.round(viewData?.projectedSpend || 0)}
                                style={[styles.cardValue, { color: colors.primaryText }]}
                            />
                            <Text style={[styles.tinyLabel, { color: colors.secondaryText }]}>Est. Month End</Text>
                        </View>
                        <View style={{ flex: 1 }} />
                    </View>
                </View>

                {/* VISUAL BREAKDOWN (Restored) */}
                <View style={[styles.section, { marginTop: SPACING.xl }]}>
                    <Text style={[styles.sectionTitle, { color: colors.primaryText, marginBottom: SPACING.m }]}>Spending Breakdown</Text>

                    {viewData?.categoryBreakdown?.map((cat, index) => (
                        <View key={index} style={[styles.categoryRow, { backgroundColor: colors.surface }]}>
                            <View style={styles.categoryHeader}>
                                <Text style={[styles.categoryName, { color: colors.primaryText }]}>
                                    {cat.emoji} {cat.name}
                                </Text>
                                <CurrencyText
                                    amount={cat.amount}
                                    style={[styles.categoryAmount, { color: colors.primaryText }]}
                                />
                            </View>
                            <View style={styles.progressContainer}>
                                <View
                                    style={[
                                        styles.progressBar,
                                        {
                                            width: `${cat.percent}%`,
                                            backgroundColor: colors.primaryAction
                                        }
                                    ]}
                                />
                                <View
                                    style={[
                                        styles.progressBarTrack,
                                        {
                                            flex: 1,
                                            backgroundColor: colors.background // Darker/Lighter than surface to show track
                                        }
                                    ]}
                                />
                            </View>
                            <Text style={[styles.categoryPercent, { color: colors.secondaryText }]}>
                                {cat.percent.toFixed(1)}%
                            </Text>
                        </View>
                    ))}

                    {(!viewData?.categoryBreakdown || viewData.categoryBreakdown.length === 0) && (
                        <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No spending data to analyze.</Text>
                    )}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: SPACING.screenPadding,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.l,
    },
    greeting: {
        fontSize: TYPOGRAPHY.size.caption,
        fontWeight: TYPOGRAPHY.weight.medium,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    username: {
        fontSize: TYPOGRAPHY.size.h3,
        fontWeight: TYPOGRAPHY.weight.bold,
    },
    section: {
        marginBottom: SPACING.l,
    },
    label: {
        fontSize: TYPOGRAPHY.size.caption,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontWeight: TYPOGRAPHY.weight.medium,
        marginBottom: SPACING.xs,
    },
    heroRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    heroValue: {
        fontSize: TYPOGRAPHY.size.hero,
        fontWeight: TYPOGRAPHY.weight.bold,
        letterSpacing: -1,
    },
    currency: {
        fontSize: TYPOGRAPHY.size.h3,
        fontWeight: TYPOGRAPHY.weight.medium,
        marginLeft: 4,
    },
    diffText: {
        fontSize: TYPOGRAPHY.size.caption,
        marginTop: SPACING.s,
    },
    grid: {
        gap: SPACING.m,
    },
    row: {
        flexDirection: 'row',
        gap: SPACING.m,
    },
    card: {
        padding: SPACING.l,
        borderRadius: SPACING.cardBorderRadius,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.s,
        gap: SPACING.xs,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardLabel: {
        fontSize: TYPOGRAPHY.size.caption,
        fontWeight: TYPOGRAPHY.weight.medium,
    },
    cardValue: {
        fontSize: TYPOGRAPHY.size.h3,
        fontWeight: TYPOGRAPHY.weight.semiBold,
        letterSpacing: -0.5,
    },
    tinyLabel: {
        fontSize: TYPOGRAPHY.size.small,
        marginTop: 4,
    },
    categoryRow: {
        marginBottom: SPACING.m,
        padding: SPACING.m,
        borderRadius: SPACING.cardBorderRadius,
    },
    categoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.xs,
    },
    categoryName: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: TYPOGRAPHY.weight.medium,
    },
    categoryAmount: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: TYPOGRAPHY.weight.semiBold,
        fontVariant: ['tabular-nums'],
    },
    progressContainer: {
        flexDirection: 'row',
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 2,
    },
    progressBar: {
        height: '100%',
    },
    progressBarTrack: {
        height: '100%',
    },
    categoryPercent: {
        fontSize: TYPOGRAPHY.size.small,
        textAlign: 'right',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: SPACING.m,
    },
    sectionTitle: {
        fontSize: TYPOGRAPHY.size.h3,
        fontWeight: TYPOGRAPHY.weight.bold,
    },
    linkText: {
        fontSize: TYPOGRAPHY.size.caption,
        fontWeight: TYPOGRAPHY.weight.medium,
    },
    list: {
        // No background for list in minimal style, just clean rows
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.m,
    },
    categoryIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.m,
    },
    listContent: {
        flex: 1,
    },
    listTitle: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: TYPOGRAPHY.weight.medium,
    },
    listSubtitle: {
        fontSize: TYPOGRAPHY.size.caption,
        marginTop: 2,
    },
    listAmount: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: TYPOGRAPHY.weight.semiBold,
        fontVariant: ['tabular-nums'], // Tabular numbers rule
    },
    emptyText: {
        textAlign: 'center',
        marginTop: SPACING.xl,
    },
});
