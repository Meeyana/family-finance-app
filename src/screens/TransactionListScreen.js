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
import SimpleDateFilterModal from '../components/SimpleDateFilterModal';
import TransactionRow from '../components/TransactionRow';
import Avatar from '../components/Avatar';
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
    const [showDateFilter, setShowDateFilter] = useState(false);

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
            // Failed to load transactions
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

    const handleDateApply = (start, end, mode) => {
        setSelectedDate(start);
        setShowDateFilter(false);
    };

    const formatDateButton = (date) => {
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    const renderHeader = () => (
        <View style={{ backgroundColor: '#f7ede2', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingBottom: 16 }}>
            {/* Header Row */}
            <View style={[styles.header, { borderBottomWidth: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                {/* Left: Avatar + Title */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Avatar
                        name={profile?.name}
                        avatarId={profile?.avatarId}
                        size={44}
                        backgroundColor="#ffffff"
                        textColor="#3e2723"
                        style={styles.avatar}
                    />
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#3e2723' }}>Transactions</Text>
                </View>

                {/* Right: Actions */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {/* Date Filter Icon */}
                    <TouchableOpacity
                        onPress={() => setShowDateFilter(true)}
                        style={{
                            width: 36, height: 36,
                            borderRadius: 12,
                            backgroundColor: 'rgba(255,255,255,0.6)',
                            justifyContent: 'center', alignItems: 'center',
                        }}
                    >
                        <MaterialCommunityIcons name="calendar" size={18} color="#8d6e63" />
                    </TouchableOpacity>

                    {/* Filter Icon */}
                    <TouchableOpacity
                        onPress={() => setShowFilters(!showFilters)}
                        style={{
                            width: 36, height: 36,
                            borderRadius: 12,
                            backgroundColor: 'rgba(255,255,255,0.6)',
                            justifyContent: 'center', alignItems: 'center',
                        }}
                    >
                        <MaterialCommunityIcons name="tune" size={18} color={showFilters ? "#6ca749" : "#8d6e63"} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Simple Date Modal */}
            <SimpleDateFilterModal
                visible={showDateFilter}
                onClose={() => setShowDateFilter(false)}
                onApply={handleDateApply}
                initialDate={selectedDate}
            />

            {/* Collapsible Filter Panel - Sibling */}
            {showFilters && (
                <View style={{
                    marginHorizontal: SPACING.screenPadding,
                    marginBottom: SPACING.m,
                    padding: SPACING.m,
                    backgroundColor: colors.surface,
                    borderRadius: 16,
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

            {/* Search Box */}
            <View style={[styles.searchContainer, {
                backgroundColor: '#ffffff',
                borderColor: 'transparent',
                marginBottom: SPACING.s,
                marginHorizontal: SPACING.screenPadding,
            }]}>
                <Ionicons name="search" size={18} color="#8d6e63" />
                <TextInput
                    style={[styles.searchInput, { color: '#3e2723' }]}
                    placeholder="Search transactions..."
                    placeholderTextColor="#bcaaa4"
                    value={searchText}
                    onChangeText={setSearchText}
                />
                {searchText.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchText('')}>
                        <Ionicons name="close-circle" size={16} color="#8d6e63" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Add Transaction Button */}
            <TouchableOpacity
                style={[styles.addButton, {
                    backgroundColor: '#6ca749',
                    marginTop: 8,
                    marginBottom: 0,
                    marginHorizontal: SPACING.screenPadding
                }]}
                onPress={() => navigation.navigate('AddTransaction')}
            >
                <Ionicons name="add" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={[styles.addButtonText, { color: '#ffffff' }]}>Add New Transaction</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
            <View style={{ backgroundColor: '#f7ede2' }}>
                <SafeAreaView edges={['top', 'left', 'right']} />
            </View>
            <SectionList
                sections={sections}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                ListHeaderComponent={renderHeader()}
                stickySectionHeadersEnabled={true}
                contentContainerStyle={{ paddingBottom: 100 }}
                overScrollMode="never"
                showsVerticalScrollIndicator={false}
                bounces={false}
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
        </View>
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
    addButtonText: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: TYPOGRAPHY.weight.bold,
    },
    avatar: {
        borderWidth: 1,
        borderColor: '#eeeeee'
    }
});
