import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, DeviceEventEmitter, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProfileData } from '../services/dataService';
import { getTransactions, getFamilyCategories, getLatestTransactions } from '../services/firestoreRepository';
import { auth } from '../services/firebase';
import { useAuth } from '../components/context/AuthContext';
import SwipeDateFilter from '../components/SwipeDateFilter';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../components/context/ThemeContext';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import CurrencyText from '../components/CurrencyText';
import TransactionRow from '../components/TransactionRow';

export default function AccountDashboard({ navigation }) {
    const { user, profile } = useAuth();
    const [data, setData] = useState(null);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date());

    const [recentTransactions, setRecentTransactions] = useState([]);

    const { theme } = useTheme();
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
    }, [selectedDate, profile, user]);

    const loadData = async () => {
        if (!user || !profile) return;
        setLoading(true);

        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const startDate = `${year}-${month}-01`;

        // Calculate end date based on actual days in month
        const lastDayNode = new Date(year, selectedDate.getMonth() + 1, 0);
        const endDay = String(lastDayNode.getDate()).padStart(2, '0');
        const endDate = `${year}-${month}-${endDay}`;

        try {
            // 1. Fetch Month Data for Stats (Implicitly fetched via getProfileData below)
            // const txs = await getTransactions(user.uid, profile.id, startDate, endDate);
            // setTransactions(txs); 


            const cats = await getFamilyCategories(user.uid, profile.id, profile.role);
            setCategories(cats);

            // 2. Fetch Latest 4 (Global) for New Section - IGNORING DATE FILTER
            const latestTxs = await getLatestTransactions(user.uid, profile.id, 4);
            setRecentTransactions(latestTxs);

            // Existing logic for prev month data for comparison
            const prevMonthDate = new Date(selectedDate);
            prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
            const prevMonthYear = prevMonthDate.getFullYear();
            const prevMonth = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
            const prevMonthStartDate = `${prevMonthYear}-${prevMonth}-01`;
            const prevMonthLastDayNode = new Date(prevMonthYear, prevMonthDate.getMonth() + 1, 0);
            const prevMonthEndDay = String(prevMonthLastDayNode.getDate()).padStart(2, '0');
            const prevMonthEndDate = `${prevMonthYear}-${prevMonth}-${prevMonthEndDay}`;

            const [currentResult, prevResult] = await Promise.all([
                getProfileData(profile.id, selectedDate), // This still uses dataService, which might be different from getTransactions
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

            // MODIFIED LOGIC: Merge Received into Income, Given into Expense
            const isInternalTransfer = (t) => t.isTransfer || t.type === 'transfer' || t.category === 'Granted' || t.category === 'Present' || (t.note && t.note.includes('(Granted)'));

            let income = 0;
            let expense = 0;

            filteredTxs.forEach(t => {
                const isGiven = (t.note && t.note.includes('Transfer to')) || t.category === 'Transfer Out' || t.categoryIcon === '💸';
                const isReceived = (t.note && t.note.includes('Received from')) || t.category === 'Allowance' || t.categoryIcon === '💰';

                // PRIORITY 1: Explicit Transfer Directions
                if (isReceived) {
                    income += t.amount;
                } else if (isGiven) {
                    expense += t.amount;
                }
                // PRIORITY 2: Explicit Types
                else if (t.type === 'income') {
                    income += t.amount;
                }
                else if ((t.type || 'expense') === 'expense' && !isInternalTransfer(t)) {
                    // Normal expense
                    expense += t.amount;
                }
                // PRIORITY 3: Fallback for other Internal Transfers (Default to Expense/Given)
                else if (isInternalTransfer(t)) {
                    // If it's internal but not caught by isReceived (which is above), it treats as Given (Expense)
                    expense += t.amount;
                }
                else {
                    // Default uncategorized to expense
                    expense += t.amount;
                }
            });

            const expenseTxs = filteredTxs.filter(t => {
                const isGiven = (t.note && t.note.includes('Transfer to')) || t.category === 'Transfer Out' || t.categoryIcon === '💸';
                const isReceived = (t.note && t.note.includes('Received from')) || t.category === 'Allowance' || t.categoryIcon === '💰';

                if (isReceived) return false; // Counts as income
                if (isGiven) return true; // Counts as expense
                if (t.type === 'income') return false;
                return true; // Catch-all expense
            });

            // DEBUG LOGS
            console.log('--- DASHBOARD CALC DEBUG (STRICT) ---');
            console.log(`Total Txs: ${filteredTxs.length}`);
            console.log(`Final Income: ${income}`);
            console.log(`Final Expense: ${expense}`);
            console.log(`Net: ${income - expense}`);

            const categoryMap = {};
            expenseTxs.forEach(t => {
                let catName = t.category || 'Uncategorized';
                if (catName === 'Granted') catName = 'Present';
                categoryMap[catName] = (categoryMap[catName] || 0) + t.amount;
            });

            return { income, expense, given: 0, received: 0, net: income - expense, categoryMap, txs: filteredTxs, expenseTxs };
        };

        const currentStats = processDataset(current);
        const prevStats = processDataset(prev);

        const categoryBreakdown = Object.keys(currentStats.categoryMap).map(catName => {
            const catObj = categories.find(c => c.name === catName);
            const emoji = catObj?.icon || (catName === 'Present' ? '🎁' : (catName === 'Savings' ? '🐷' : '🏷️'));
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
                    <View style={styles.headerLeft}>
                        <View style={[styles.avatarContainer, { backgroundColor: colors.surface }]}>
                            <Text style={{ fontSize: 24 }}>{profile?.avatar || '👤'}</Text>
                        </View>
                        <View>
                            <Text style={[styles.greeting, { color: colors.secondaryText }]}>{getGreeting()}</Text>
                            <Text style={[styles.username, { color: colors.primaryText }]}>{profile?.name || 'User'}</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.surface }]}>
                        <Ionicons name="notifications-outline" size={24} color={colors.primaryText} />
                        <View style={[styles.notificationBadge, { backgroundColor: colors.error }]} />
                    </TouchableOpacity>
                </View>

                {/* DATE FILTER */}
                <View style={{ marginBottom: 0, width: '60%', alignSelf: 'center' }}>
                    <SwipeDateFilter date={selectedDate} onMonthChange={setSelectedDate} />
                </View>

                {/* MONTHLY SNAPSHOT (UNIFIED - GRADIENT) */}
                <View style={[styles.section, { marginTop: SPACING.m }]}>

                    <LinearGradient
                        colors={['#101828', '#1e3c72', '#2a5298']} // Deep Dark Blue -> Blue Gradient
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.card, { padding: SPACING.l, borderRadius: 24 }]} // Increased radius
                    >
                        {/* 1. Net Cashflow (Top, Centered) */}
                        <View style={{ alignItems: 'center', marginBottom: SPACING.l }}>
                            <Text style={{ color: '#E0E0E0', fontSize: TYPOGRAPHY.size.body, marginBottom: 4 }}>Total Actual Balance</Text>
                            <CurrencyText
                                amount={viewData?.netCashflow}
                                showSign={false}
                                style={{ color: '#FFFFFF', fontSize: 36, fontWeight: 'bold' }} // Big White Text
                                symbolStyle={{ color: '#FFFFFF', fontSize: 28, textDecorationLine: 'underline' }}
                            />
                            <Text style={{ color: '#B0BEC5', fontSize: TYPOGRAPHY.size.caption, marginTop: 4 }}>
                                {viewData?.netDiff >= 0 ? '▲ Better' : '▼ Worse'} than last month by <CurrencyText amount={Math.abs(viewData.netDiff)} style={{ color: '#B0BEC5' }} symbolStyle={{ color: '#B0BEC5' }} />
                            </Text>
                        </View>

                        {/* 2. Income & Expense Row (Glassmorphism) */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.m }}>
                            {/* Income */}
                            <View style={{
                                flex: 1,
                                backgroundColor: 'rgba(255, 255, 255, 0.1)', // Glass effect
                                borderRadius: 16,
                                padding: SPACING.m,
                                alignItems: 'flex-start'
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 }}>
                                    <View style={{ backgroundColor: 'rgba(76, 175, 80, 0.2)', padding: 4, borderRadius: 8 }}>
                                        {/* Green tint icon bg */}
                                        <MaterialCommunityIcons name="arrow-down-left" size={16} color="#4CAF50" />
                                    </View>
                                    <Text style={{ color: '#A0E8AF', fontSize: TYPOGRAPHY.size.small, fontWeight: '600' }}>Income</Text>
                                </View>
                                <CurrencyText
                                    amount={viewData?.totalIncome}
                                    showSign={false}
                                    style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' }}
                                />
                                {viewData?.incomeDiffPercent !== 0 && (
                                    <Text style={{ color: '#A0E8AF', fontSize: 11, marginTop: 4, fontWeight: '500' }}>
                                        {viewData?.incomeDiffPercent > 0 ? '▲' : '▼'} {Math.abs(viewData?.incomeDiffPercent || 0).toFixed(0)}%
                                    </Text>
                                )}
                            </View>

                            {/* Expense */}
                            <View style={{
                                flex: 1,
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                borderRadius: 16,
                                padding: SPACING.m,
                                alignItems: 'flex-start'
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 }}>
                                    <View style={{ backgroundColor: 'rgba(244, 67, 54, 0.2)', padding: 4, borderRadius: 8 }}>
                                        {/* Red tint icon bg */}
                                        <MaterialCommunityIcons name="arrow-up-right" size={16} color="#F44336" />
                                    </View>
                                    <Text style={{ color: '#FFCDD2', fontSize: TYPOGRAPHY.size.small, fontWeight: '600' }}>Expense</Text>
                                </View>
                                <CurrencyText
                                    amount={-viewData?.totalSpent}
                                    showSign={false}
                                    style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' }}
                                />
                                {viewData?.expenseDiffPercent !== 0 && (
                                    <Text style={{ color: '#FFCDD2', fontSize: 11, marginTop: 4, fontWeight: '500' }}>
                                        {viewData?.expenseDiffPercent > 0 ? '▲' : '▼'} {Math.abs(viewData?.expenseDiffPercent || 0).toFixed(0)}%
                                    </Text>
                                )}
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* RECENT TRANSACTIONS (New Section) */}
                <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Recent Transactions</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
                        <Text style={[styles.seeAllText, { color: colors.primaryAction }]}>See all</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    {recentTransactions.map((item, index) => (
                        <View key={item.id} style={[styles.transactionCard, { backgroundColor: colors.surface }]}>
                            <TransactionRow
                                item={{
                                    ...item,
                                    icon: categories ? categories.find(c => c.name === item.category)?.icon : (item.category === 'Savings' ? '🐷' : item.categoryIcon)
                                }}
                                iconBackgroundColor={colors.background}
                                onPress={() => navigation.navigate('AddTransaction', { transaction: item })}
                            />
                        </View>
                    ))}
                    {recentTransactions.length === 0 && (
                        <Text style={[styles.emptyText, { color: colors.secondaryText, padding: SPACING.m, textAlign: 'center' }]}>
                            No recent activity
                        </Text>
                    )}
                </View>

                {/* SPENDING BREAKDOWN */}
                <View style={[styles.section, { marginTop: SPACING.xl }]}>
                    <Text style={[styles.sectionTitle, { color: colors.primaryText, marginBottom: SPACING.m }]}>Spending Breakdown</Text>

                    {viewData?.categoryBreakdown?.map((cat, index) => (
                        <View key={index} style={[styles.categoryRow, { backgroundColor: colors.surface }]}>
                            <View style={styles.categoryHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.s }}>
                                    <View style={[styles.iconBox, { backgroundColor: colors.background }]}>
                                        <Text style={{ fontSize: 20 }}>{cat.emoji}</Text>
                                    </View>
                                    <Text style={[styles.categoryName, { color: colors.primaryText }]}>
                                        {cat.name}
                                    </Text>
                                </View>
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
                                            backgroundColor: colors.background
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
        </SafeAreaView >
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
        marginBottom: SPACING.m, // Reduced margin since filter is below
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.m,
    },
    avatarContainer: {
        width: 48,
        height: 48,
        borderRadius: 24, // Circle
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationBadge: {
        position: 'absolute',
        top: 12,
        right: 14,
        width: 8,
        height: 8,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#FFFFFF', // White border to separate from icon
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
        fontSize: 10,
        marginTop: 4
    },
    // New Styles
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: SPACING.xl,
        marginBottom: SPACING.s,
    },
    seeAllText: {
        fontSize: TYPOGRAPHY.size.caption,
        fontWeight: 'bold',
    },
    transactionCard: {
        marginBottom: SPACING.m,
        borderRadius: SPACING.cardBorderRadius,
        overflow: 'hidden', // Ensures ripple effect stays inside
    },
    recentTxContainer: {
        // borderRadius: 16,
        // paddingVertical: 4, 
        // overflow: 'hidden'
    },
    categoryRow: {
        marginBottom: SPACING.m,
        paddingVertical: 12, // Matches TransactionRow
        paddingHorizontal: SPACING.screenPadding, // Matches TransactionRow (16)
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
