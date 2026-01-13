import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, RefreshControl, DeviceEventEmitter, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
        if (transactions.length === 0) setLoading(true);

        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const startDate = `${year}-${month}-01`;
        const lastDayNode = new Date(year, selectedDate.getMonth() + 1, 0);
        const endDay = String(lastDayNode.getDate()).padStart(2, '0');
        const endDate = `${year}-${month}-${endDay}`;

        try {
            const data = await getTransactions(user.uid, profile.id, startDate, endDate);
            setTransactions(data);
        } catch (error) {
            console.error("Failed to load transactions", error);
        }
        setLoading(false);
        setIsRefreshing(false);
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

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.divider }]}>

                {/* DATE FILTER */}
                <View style={{ marginBottom: SPACING.m, width: '60%', alignSelf: 'center' }}>
                    <SwipeDateFilter date={selectedDate} onMonthChange={setSelectedDate} />
                </View>

                {/* Search / Filter Row */}
                <View style={styles.filterRow}>
                    <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
                        <Ionicons name="search" size={16} color={colors.secondaryText} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.primaryText }]}
                            placeholder="Search..."
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
                    <View style={{ flex: 1, marginLeft: 8 }}>
                        <MultiSelectDropdown
                            label="Filter"
                            options={categories.map(c => ({ id: c.name, name: c.name }))}
                            selectedValues={selectedCategoryIds}
                            onSelectionChange={setSelectedCategoryIds}
                            compact={true} // New prop hint
                        />
                    </View>
                </View>

                {/* 1. Add Transaction Button (In-Page) - MOVED BELOW */}
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.primaryAction, marginTop: 12, marginBottom: 0 }]}
                    onPress={() => navigation.navigate('AddTransaction')}
                >
                    <Ionicons name="add" size={20} color={colors.background} style={{ marginRight: 8 }} />
                    <Text style={[styles.addButtonText, { color: colors.background }]}>Add New Transaction</Text>
                </TouchableOpacity>
            </View>

            {/* List */}
            <SectionList
                sections={sections}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                stickySectionHeadersEnabled={true}
                contentContainerStyle={{ paddingBottom: 100 }} // Space for TabBar
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

            {/* FAB for Add is NOT needed because it is in the Tab Bar. 
                However, if user scrolls down, maybe we want one? 
                For now, rely on Tab Bar "+" button.
            */}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingTop: SPACING.m, // Added padding top
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
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 8, // Increased against 6 to match Dropdown
        borderWidth: 1,
        flex: 1.5,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: TYPOGRAPHY.size.body,
        paddingVertical: 0,
        letterSpacing: -0.5, // Tighten font on iOS to match Android
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
