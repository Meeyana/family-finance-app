import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, DeviceEventEmitter, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProfileData } from '../services/dataService';
import { getTransactions, getFamilyCategories, getLatestTransactions } from '../services/firestoreRepository';
import { useFocusEffect } from '@react-navigation/native';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { auth } from '../services/firebase';
import { useAuth } from '../components/context/AuthContext';
import SwipeDateFilter from '../components/SwipeDateFilter';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/context/ThemeContext';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import CurrencyText from '../components/CurrencyText';
import TransactionRow from '../components/TransactionRow';
import { useVisibility } from '../components/context/VisibilityContext';
import Avatar from '../components/Avatar';
import { registerForPushNotificationsAsync } from '../services/notificationService';

const { width } = Dimensions.get('window');



export default function AccountDashboard({ navigation }) {
    const { user, profile } = useAuth();
    const [data, setData] = useState(null);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [notifEnabled, setNotifEnabled] = useState(false);

    // Check notification status whenever screen is focused
    useFocusEffect(
        useCallback(() => {
            checkNotifStatus();
        }, [user, profile])
    );

    const checkNotifStatus = async () => {
        if (!auth.currentUser || !profile) return;
        try {
            // Check specific PROFILE subcollection
            const profileDoc = await getDoc(doc(db, 'users', auth.currentUser.uid, 'profiles', profile.id));
            if (profileDoc.exists()) {
                const d = profileDoc.data();
                setNotifEnabled(d.notificationsEnabled === true && !!d.pushToken);
            }
        } catch (e) {
            console.log("Notif check error", e);
        }
    };

    const [recentTransactions, setRecentTransactions] = useState([]);

    const { theme } = useTheme();
    const colors = COLORS[theme];
    const { isValuesHidden, toggleVisibility } = useVisibility();

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

        try {
            const cats = await getFamilyCategories(user.uid, profile.id, profile.role);
            setCategories(cats);

            // Fetch Latest 4 (Global)
            const latestTxs = await getLatestTransactions(user.uid, profile.id, 4);
            setRecentTransactions(latestTxs);

            // Existing logic for prev month data for comparison
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

            let income = 0;
            let expense = 0;

            filteredTxs.forEach(t => {
                const isGiven = (t.note && (t.note.includes('Transfer to') || t.note.startsWith('To '))) || t.category === 'Transfer Out' || t.categoryIcon === '💸';
                const isReceived = (t.note && (t.note.includes('Received from') || t.note.startsWith('From '))) || t.category === 'Allowance' || t.categoryIcon === '💰';

                if (isReceived) {
                    income += t.amount;
                } else if (isGiven) {
                    expense += t.amount;
                }
                else if (t.type === 'income') {
                    income += t.amount;
                }
                else if ((t.type || 'expense') === 'expense' && !isInternalTransfer(t)) {
                    expense += t.amount;
                }
                else if (isInternalTransfer(t)) {
                    expense += t.amount;
                }
                else {
                    expense += t.amount;
                }
            });

            const expenseTxs = filteredTxs.filter(t => {
                const isGiven = (t.note && (t.note.includes('Transfer to') || t.note.startsWith('To '))) || t.category === 'Transfer Out' || t.categoryIcon === '💸';
                const isReceived = (t.note && (t.note.includes('Received from') || t.note.startsWith('From '))) || t.category === 'Allowance' || t.categoryIcon === '💰';

                if (isReceived) return false;
                if (isGiven) return true;
                if (t.type === 'income') return false;
                return true;
            });

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
            incomeDiffPercent: prevStats.income > 0 ? ((currentStats.income - prevStats.income) / prevStats.income) * 100 : 0,
            expenseDiffPercent: prevStats.expense > 0 ? ((currentStats.expense - prevStats.expense) / prevStats.expense) * 100 : 0
        };
    }, [data, categories]);



    if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primaryAction} /></View>;
    if (error) return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={{ color: colors.error }}>Could not load data</Text></View>;

    // Dynamic Safe Area Background
    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ backgroundColor: colors.headerBackground }}>
                <SafeAreaView edges={['top', 'left', 'right']} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>

                {/* TOP SECTION: BEIGE BACKGROUND */}
                <View style={[styles.topSection, { backgroundColor: colors.headerBackground }]}>
                    {/* HEADER */}
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
                                {/* Greeting */}
                                <Text style={[styles.greeting, { color: colors.headerIcon }]}>Hello,</Text>
                                <Text style={[styles.username, { color: colors.headerText }]}>{profile?.name || 'User'}</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.iconButton,
                                { backgroundColor: notifEnabled ? colors.primaryAction + '20' : colors.iconBackground, marginLeft: 8 }
                            ]}
                            onPress={async () => {
                                if (notifEnabled) {
                                    // Already enabled -> Go to settings to manage
                                    navigation.navigate('NotificationSettings');
                                } else {
                                    // Not enabled -> Quick enable
                                    const token = await registerForPushNotificationsAsync(user.uid, profile.id);
                                    if (token) {
                                        setNotifEnabled(true);
                                    } else {
                                        // If failed/denied, go to settings guide
                                        navigation.navigate('NotificationSettings');
                                    }
                                }
                            }}
                        >
                            <Ionicons
                                name={notifEnabled ? "notifications" : "notifications-outline"}
                                size={20}
                                color={notifEnabled ? colors.primaryAction : colors.headerIcon}
                            />
                            {/* Show red dot only if DISABLED (to prompt user) or maybe for unread in future */}
                            {!notifEnabled && (
                                <View style={[styles.notificationBadge, { backgroundColor: colors.error }]} />
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.balanceContainer}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <Ionicons name="wallet-outline" size={14} color={colors.headerIcon} />
                            <Text style={{ color: colors.headerIcon, fontSize: 11, letterSpacing: 1, fontWeight: '800', textTransform: 'uppercase' }}>Total Assets</Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <CurrencyText
                                amount={viewData?.netCashflow}
                                showSign={false}
                                hideable={true}
                                style={{ color: '#6ca749', fontSize: 30, fontWeight: 'bold' }}
                                symbolStyle={{ color: colors.primaryAction, fontSize: 30, fontWeight: 'bold', textDecorationLine: 'none' }}
                            />
                            <TouchableOpacity onPress={toggleVisibility}>
                                <Ionicons name={isValuesHidden ? "eye-off-outline" : "eye-outline"} size={18} color={colors.headerIcon} />
                            </TouchableOpacity>
                        </View>

                        <View style={{ opacity: 0.8, transform: [{ scale: 0.85 }], marginBottom: 12 }}>
                            <SwipeDateFilter
                                date={selectedDate}
                                onMonthChange={setSelectedDate}
                                themeColor={colors.headerIcon}
                            />
                        </View>
                    </View>

                    {/* MERGED UNIFIED CARD */}
                    <View style={styles.statsRow}>
                        <View style={[styles.unifiedCard, { backgroundColor: colors.cardBackground }]}>

                            {/* TOP HALF: STATS */}
                            <View style={styles.statsContent}>
                                {/* Income */}
                                <View style={styles.statItem}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 4 }}>
                                        <Text style={{ color: colors.secondaryText, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>Income</Text>
                                        <View style={{ backgroundColor: colors.success + '20', padding: 2, borderRadius: 8 }}>
                                            <Ionicons name="trending-up" size={12} color={colors.success} />
                                        </View>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                        <CurrencyText
                                            amount={viewData?.totalIncome}
                                            showSign={false}
                                            hideable={true}
                                            style={{ color: colors.primaryText, fontSize: 18, fontWeight: 'bold' }}
                                        />
                                        {viewData?.incomeDiffPercent !== 0 && (
                                            <Text style={{ color: viewData?.incomeDiffPercent > 0 ? '#4CAF50' : '#F44336', fontSize: 11, marginLeft: 4, fontWeight: '500' }}>
                                                {viewData?.incomeDiffPercent > 0 ? '▲' : '▼'} {Math.abs(viewData?.incomeDiffPercent || 0).toFixed(0)}%
                                            </Text>
                                        )}
                                    </View>
                                </View>

                                {/* Divider */}
                                <View style={styles.verticalDivider} />

                                {/* Expense */}
                                <View style={styles.statItem}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 4 }}>
                                        <Text style={{ color: colors.secondaryText, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>Expense</Text>
                                        <View style={{ backgroundColor: colors.error + '20', padding: 2, borderRadius: 8 }}>
                                            <Ionicons name="trending-down" size={12} color={colors.error} />
                                        </View>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                        <CurrencyText
                                            amount={-viewData?.totalSpent}
                                            showSign={false}
                                            hideable={true}
                                            style={{ color: colors.primaryText, fontSize: 18, fontWeight: 'bold' }}
                                        />
                                        {viewData?.expenseDiffPercent !== 0 && (
                                            <Text style={{ color: viewData?.expenseDiffPercent > 0 ? '#F44336' : '#4CAF50', fontSize: 11, marginLeft: 4, fontWeight: '500' }}>
                                                {viewData?.expenseDiffPercent > 0 ? '▲' : '▼'} {Math.abs(viewData?.expenseDiffPercent || 0).toFixed(0)}%
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            </View>

                            {/* BOTTOM HALF: LINK */}
                            <TouchableOpacity style={[styles.financeCenterButton, { backgroundColor: colors.primaryAction + '20' }]} onPress={() => navigation.navigate('Analysis')}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <MaterialCommunityIcons name="finance" size={20} color={colors.primaryAction} />
                                    <Text style={[styles.financeCenterText, { color: colors.primaryAction }]}>Your family financial center</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={colors.primaryAction} />
                            </TouchableOpacity>

                        </View>
                    </View>
                </View>

                {/* BOTTOM SECTION: WHITE/CONTENT */}
                <View style={[styles.bottomSection, { backgroundColor: colors.background }]}>



                    {/* RECENT TRANSACTIONS */}
                    <View style={[styles.sectionHeaderRow, { marginTop: SPACING.xl, paddingHorizontal: 0, marginBottom: 8 }]}>
                        <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Recent Transactions</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
                            <Text style={[styles.seeAllText, { color: colors.primaryAction }]}>See all</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.section}>
                        {recentTransactions.map((item, index) => (
                            <View key={item.id} style={[styles.transactionCard, { backgroundColor: colors.surface, borderRadius: 16, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }]}>
                                <TransactionRow
                                    item={{
                                        ...item,
                                        icon: categories ? categories.find(c => c.name === item.category)?.icon : (item.category === 'Savings' ? '🐷' : item.categoryIcon)
                                    }}
                                    iconBackgroundColor={colors.background}
                                    onPress={() => navigation.navigate('AddTransaction', { transaction: item })}
                                    showDate={true}
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
                    <View style={[styles.section, { marginTop: SPACING.l }]}>
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
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <CurrencyText
                                            amount={cat.amount}
                                            style={[styles.categoryAmount, { color: colors.primaryText }]}
                                        />
                                        <Text style={{ fontSize: 12, color: colors.secondaryText, fontWeight: '500' }}>
                                            {cat.percent.toFixed(1)}%
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.progressContainer}>
                                    <View style={[styles.progressBar, { width: `${cat.percent}%`, backgroundColor: colors.primaryAction }]} />
                                    <View style={[styles.progressBarTrack, { flex: 1, backgroundColor: colors.background }]} />
                                </View>
                            </View>
                        ))}
                    </View>

                </View>
            </ScrollView>
        </View>
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
        paddingBottom: 40,
    },
    topSection: {
        backgroundColor: '#f7ede2', // fallback
        paddingHorizontal: SPACING.screenPadding,
        paddingBottom: 50, // Reduced from 60
        borderBottomLeftRadius: 36,
        borderBottomRightRadius: 36,
        paddingTop: 4, // Reduced from 10
        zIndex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.l, // Reduced from xl
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.m,
        flex: 1,
    },
    avatarContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationBadge: {
        position: 'absolute',
        top: 10,
        right: 12,
        width: 8,
        height: 8,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#FFFFFF',
    },
    greeting: {
        fontSize: 13,
        fontWeight: '500',
    },
    username: {
        fontSize: 18,
        fontWeight: '900',
    },
    balanceContainer: {
        alignItems: 'center',
        marginBottom: 10, // Reduced from 20
    },

    // NEW UNIFIED CARD STYLES
    statsRow: {
        position: 'absolute',
        bottom: -50, // Floating position
        left: SPACING.screenPadding,
        right: SPACING.screenPadding,
    },
    unifiedCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 6,
    },
    statsContent: {
        flexDirection: 'row',
        paddingVertical: 12, // Reduced padding
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    verticalDivider: {
        width: 1,
        height: '80%', // Not full height
        backgroundColor: '#EEEEEE',
        marginHorizontal: 12,
    },
    financeCenterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#E8F5E9', // Light Green
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    financeCenterText: {
        color: '#6ca749',
        fontSize: 14,
        fontWeight: '600',
    },

    bottomSection: {
        paddingTop: 80, // Increased to clear the taller card
        paddingHorizontal: SPACING.screenPadding,
        backgroundColor: '#ffffff', // fallback
        minHeight: 500,
    },

    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.m,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    seeAllText: {
        fontSize: 14,
        fontWeight: '600',
    },
    transactionCard: {
        marginVertical: 4,
    },
    categoryRow: {
        marginBottom: SPACING.m,
        paddingVertical: 12,
        paddingHorizontal: SPACING.screenPadding,
        borderRadius: 16,
    },
    categoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    categoryName: {
        fontSize: 15,
        fontWeight: '600',
    },
    categoryAmount: {
        fontSize: 15,
        fontWeight: '600',
        fontVariant: ['tabular-nums'],
    },
    progressContainer: {
        flexDirection: 'row',
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        marginTop: 4,
    },
    progressBar: {
        height: '100%',
        borderRadius: 3,
    },
    progressBarTrack: {
        height: '100%',
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        marginTop: 20,
        textAlign: 'center',
    },
    section: {
        marginBottom: SPACING.l,
    }
});
