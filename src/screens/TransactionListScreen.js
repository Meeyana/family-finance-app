import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, RefreshControl, DeviceEventEmitter, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../components/context/AuthContext';
import { getTransactions, getFamilyCategories } from '../services/firestoreRepository';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import { useTheme } from '../components/context/ThemeContext';
import SwipeDateFilter from '../components/SwipeDateFilter';
import TransactionRow from '../components/TransactionRow';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';

export default function TransactionListScreen({ navigation }) {
    const { user, profile } = useAuth();
    const { theme } = useTheme();
    const colors = COLORS[theme];

    // Data State
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Filter State
    const [categories, setCategories] = useState([]);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        if (profile) {
            getFamilyCategories(user.uid, profile.id, profile.role).then(setCategories).catch(console.error);
        }
    }, [profile]);

    useFocusEffect(
        useCallback(() => {
            loadTransactions();
            const subscription = DeviceEventEmitter.addListener('refresh_profile_dashboard', loadTransactions);
            return () => {
                subscription.remove();
            };
        }, [user, profile, selectedDate])
    );

    const loadTransactions = async () => {
        if (!user || !profile) return;
        setLoading(true);

        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const startDate = `${year}-${month}-01`;
        const lastDayNode = new Date(year, selectedDate.getMonth() + 1, 0);
        const endDay = String(lastDayNode.getDate()).padStart(2, '0');
        const endDate = `${year}-${month}-${endDay}`;

        try {
            const [txs, cats] = await Promise.all([
                getTransactions(user.uid, profile.id, startDate, endDate),
                getFamilyCategories(user.uid, profile.id, profile.role)
            ]);
            setTransactions(txs);
            setCategories(cats);
        } catch (error) {
            console.error("Failed to load transactions", error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    const onRefresh = () => {
        setIsRefreshing(true);
        loadTransactions();
    };

    // Filter Logic
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const matchesCategory = selectedCategoryIds.length === 0 || selectedCategoryIds.includes(t.category);
            const matchesSearch = searchText.length < 3 || (t.note && t.note.toLowerCase().includes(searchText.toLowerCase()));
            return matchesCategory && matchesSearch;
        });
    }, [transactions, selectedCategoryIds, searchText]);

    // Grouping Logic for SectionList
    const sections = useMemo(() => {
        const groups = {};
        filteredTransactions.forEach(t => {
            // Assume t.date is YYYY-MM-DD
            if (!groups[t.date]) groups[t.date] = [];
            groups[t.date].push(t);
        });

        // Sort dates descending
        const sortedDates = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a));

        return sortedDates.map(date => ({
            title: date,
            data: groups[date]
        }));
    }, [filteredTransactions]);

    // Format Date Title (e.g. "Today", "Yesterday", "Mon, Oct 24")
    const formatDateTitle = (dateStr) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        if (dateStr === today.toISOString().split('T')[0]) return 'Today';
        if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';

        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const renderItem = ({ item }) => {
        // Resolve icon from category list if missing
        const catObj = categories.find(c => c.name === item.category);
        const resolvedItem = {
            ...item,
            icon: catObj?.icon || item.categoryIcon || item.emoji
        };

        return (
            <TransactionRow
                item={resolvedItem}
                onPress={() => navigation.navigate('AddTransaction', { transaction: item })}
            />
        );
    };

    const renderSectionHeader = ({ section: { title } }) => (
        <View style={[styles.sectionHeader, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>
                {formatDateTitle(title)}
            </Text>
        </View>
    );

    const renderHeader = () => (
        <View style={{ backgroundColor: colors.background }}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.divider }]}>
                {/* Standard App Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.m }}>
                    <View style={{
                        width: 48, height: 48, borderRadius: 24,
                        backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.m
                    }}>
                        <Text style={{ fontSize: 24 }}>{profile?.avatar || '👤'}</Text>
                    </View>
                    <Text style={{ fontSize: TYPOGRAPHY.size.h2, fontWeight: TYPOGRAPHY.weight.bold, color: colors.primaryText }}>Transactions</Text>
                </View>

                {/* Date Filter & Toggle Row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: SPACING.s }}>
                    {/* Swipe Date Filter (Flex 1) */}
                    <View style={{ flex: 1 }}>
                        <SwipeDateFilter date={selectedDate} onMonthChange={setSelectedDate} />
                    </View>

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
            </View>

            {/* Collapsible Filter Panel - Sibling */}
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
                            label="Category"
                            options={categories.map(c => ({ id: c.name, name: c.name }))}
                            selectedValues={selectedCategoryIds}
                            onSelectionChange={setSelectedCategoryIds}
                            compact={false}
                        />
                    </View>
                </View>
            )}

            {/* Search Box - Sibling */}
            <View style={[styles.searchContainer, {
                backgroundColor: '#F3F4F6',
                borderColor: 'transparent',
                marginBottom: SPACING.s,
                marginHorizontal: SPACING.screenPadding,
            }]}>
                <Ionicons name="search" size={16} color={colors.secondaryText} />
                <TextInput
                    style={[styles.searchInput, { color: colors.primaryText }]}
                    placeholder="Search transactions..."
                    placeholderTextColor={colors.secondaryText}
                    value={searchText}
                    onChangeText={setSearchText}
                />
                {searchText.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchText('')}>
                        <Ionicons name="close-circle" size={16} color={colors.secondaryText} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Add Transaction Button - Sibling */}
            <TouchableOpacity
                style={[styles.addButton, {
                    backgroundColor: colors.primaryAction,
                    marginTop: 12,
                    marginBottom: SPACING.m,
                    marginHorizontal: SPACING.screenPadding
                }]}
                onPress={() => navigation.navigate('AddTransaction')}
            >
                <Ionicons name="add" size={20} color={colors.background} style={{ marginRight: 8 }} />
                <Text style={[styles.addButtonText, { color: colors.background }]}>Add New Transaction</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
            <SectionList
                sections={sections}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                ListHeaderComponent={renderHeader}
                stickySectionHeadersEnabled={true}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primaryAction} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
                            {loading ? 'Loading...' : 'No transactions found'}
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingTop: SPACING.m,
        paddingHorizontal: SPACING.screenPadding,
        paddingBottom: SPACING.m,
        borderBottomWidth: 1,
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 48,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: TYPOGRAPHY.size.body,
        paddingVertical: 0,
        letterSpacing: -0.5,
    },
    sectionHeader: {
        paddingVertical: 6,
        paddingHorizontal: SPACING.screenPadding,
    },
    sectionTitle: {
        fontSize: TYPOGRAPHY.size.small,
        fontWeight: TYPOGRAPHY.weight.semiBold,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60
    },
    emptyText: {
        fontSize: TYPOGRAPHY.size.body
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        marginBottom: SPACING.m,
    },
    addButtonText: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: TYPOGRAPHY.weight.bold,
    },
});
