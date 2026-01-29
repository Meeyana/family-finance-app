import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, RefreshControl, DeviceEventEmitter, TextInput, Modal, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../components/context/AuthContext';
import { getTransactions, getFamilyCategories } from '../services/firestoreRepository';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import { useTheme } from '../components/context/ThemeContext';
import ExpandableCalendar from '../components/ExpandableCalendar';
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

    // Day Filter State
    const [filterDate, setFilterDate] = useState(null);

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

            let matchesDate = true;
            if (filterDate) {
                const year = filterDate.getFullYear();
                const month = String(filterDate.getMonth() + 1).padStart(2, '0');
                const day = String(filterDate.getDate()).padStart(2, '0');
                const filterStr = `${year}-${month}-${day}`;
                matchesDate = (t.date === filterStr);
            }

            return matchesCategory && matchesSearch && matchesDate;
        });
    }, [transactions, selectedCategoryIds, searchText, filterDate]);

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
        <View>
            <View style={{ backgroundColor: colors.headerBackground, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingBottom: 16 }}>
                {/* Header Row */}
                <View style={[styles.header, { borderBottomWidth: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                    {/* Left: Avatar + Title */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Avatar
                            name={profile?.name}
                            avatarId={profile?.avatarId}
                            size={44}
                            backgroundColor={colors.cardBackground}
                            textColor={colors.headerText}
                            style={styles.avatar}
                        />
                        <Text style={{ fontSize: 18, fontWeight: '900', color: colors.headerText }}>Transactions</Text>
                    </View>

                    {/* Right: Actions */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {/* Date Filter Icon */}
                        <TouchableOpacity
                            onPress={() => setShowDateFilter(true)}
                            style={{
                                width: 36, height: 36,
                                borderRadius: 12,
                                backgroundColor: colors.iconBackground,
                                justifyContent: 'center', alignItems: 'center',
                            }}
                        >
                            <MaterialCommunityIcons name="calendar" size={18} color={colors.headerIcon} />
                        </TouchableOpacity>

                        {/* Filter Icon */}
                        <TouchableOpacity
                            onPress={() => setShowFilters(!showFilters)}
                            style={{
                                width: 36, height: 36,
                                borderRadius: 12,
                                backgroundColor: colors.iconBackground,
                                justifyContent: 'center', alignItems: 'center',
                            }}
                        >
                            <MaterialCommunityIcons name="tune" size={18} color={showFilters ? colors.primaryAction : colors.headerIcon} />
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

                {/* Category Filter Modal */}
                <Modal visible={showFilters} animationType="slide" transparent={true} onRequestClose={() => setShowFilters(false)}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                        <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '70%', padding: 20 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.divider, paddingBottom: 15 }}>
                                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primaryText }}>Filter by Category</Text>
                                <TouchableOpacity onPress={() => setShowFilters(false)}>
                                    <MaterialCommunityIcons name="close" size={24} color={colors.primaryText} />
                                </TouchableOpacity>
                            </View>

                            <View style={{ flex: 1 }}>
                                <TouchableOpacity
                                    style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider, flexDirection: 'row', justifyContent: 'space-between' }}
                                    onPress={() => setSelectedCategoryIds([])}
                                >
                                    <Text style={{ fontSize: 16, color: selectedCategoryIds.length === 0 ? colors.primaryAction : colors.primaryText, fontWeight: selectedCategoryIds.length === 0 ? 'bold' : 'normal' }}>All Categories</Text>
                                    {selectedCategoryIds.length === 0 && <MaterialCommunityIcons name="check" size={20} color={colors.primaryAction} />}
                                </TouchableOpacity>

                                <FlatList
                                    data={categories}
                                    keyExtractor={item => item.name}
                                    renderItem={({ item }) => {
                                        const isSelected = selectedCategoryIds.includes(item.name);
                                        return (
                                            <TouchableOpacity
                                                style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                                                onPress={() => {
                                                    if (isSelected) {
                                                        setSelectedCategoryIds(prev => prev.filter(id => id !== item.name));
                                                    } else {
                                                        setSelectedCategoryIds(prev => [...prev, item.name]);
                                                    }
                                                }}
                                            >
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                                    <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                                                    <Text style={{ fontSize: 16, color: isSelected ? colors.primaryText : colors.primaryText, fontWeight: isSelected ? 'bold' : 'normal' }}>{item.name}</Text>
                                                </View>
                                                {isSelected && <MaterialCommunityIcons name="check" size={20} color={colors.primaryAction} />}
                                            </TouchableOpacity>
                                        );
                                    }}
                                />
                            </View>

                            <View style={{ flexDirection: 'row', marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.divider, gap: 12 }}>
                                <TouchableOpacity
                                    style={{ flex: 1, padding: 14, alignItems: 'center', borderRadius: 12, backgroundColor: colors.surface }}
                                    onPress={() => setSelectedCategoryIds([])}
                                >
                                    <Text style={{ fontWeight: '600', color: colors.secondaryText }}>Clear</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{ flex: 2, padding: 14, alignItems: 'center', borderRadius: 12, backgroundColor: colors.primaryAction }}
                                    onPress={() => setShowFilters(false)}
                                >
                                    <Text style={{ fontWeight: 'bold', color: 'white' }}>Apply</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Expandable Calendar - Wrapped in zIndex to overlap siblings */}
                <View style={{ zIndex: 100, elevation: 10 }}>
                    <ExpandableCalendar
                        baseDate={selectedDate}
                        selectedDate={filterDate}
                        onSelectDate={(date) => {
                            if (filterDate && date.getTime() === filterDate.getTime()) {
                                // Deselect if same date clicked
                                setFilterDate(null);
                            } else {
                                setFilterDate(date);
                            }
                        }}
                        transactions={transactions}
                    />
                </View>

                {/* Search Box */}
                <View style={[styles.searchContainer, {
                    backgroundColor: colors.inputBackground, // Changed from cardBackground for better contrast
                    borderColor: 'transparent',
                    marginBottom: SPACING.s,
                    marginHorizontal: SPACING.screenPadding,
                }]}>
                    <Ionicons name="search" size={18} color={colors.headerIcon} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.primaryText }]}
                        placeholder="Search transactions..."
                        placeholderTextColor={colors.placeholderText}
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchText('')}>
                            <Ionicons name="close-circle" size={16} color={colors.headerIcon} />
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

            {/* Current Month Label - Outside colored header */}
            <Text style={{
                marginHorizontal: SPACING.screenPadding,
                marginTop: 12,
                marginBottom: 16,
                fontSize: 18,
                fontWeight: 'bold',
                color: colors.primaryText,
                textTransform: 'capitalize'
            }}>
                {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ backgroundColor: colors.headerBackground }}>
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
    // Removed duplicate addButtonText definition
    avatar: {
        // No border for consistency
    }
});
