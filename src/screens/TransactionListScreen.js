import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, DeviceEventEmitter, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../components/context/AuthContext';
import { getTransactions, getFamilyCategories } from '../services/firestoreRepository';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import MonthPicker from '../components/MonthPicker';

export default function TransactionListScreen({ navigation }) {
    const { user, profile } = useAuth();
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

    const filteredTransactions = transactions.filter(t => {
        const matchesCategory = selectedCategoryIds.length === 0 || selectedCategoryIds.includes(t.category);
        const matchesSearch = searchText.length < 3 || (t.note && t.note.toLowerCase().includes(searchText.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

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

    const renderItem = ({ item }) => {
        const isTransfer = item.type === 'transfer';
        const isExpense = (item.type || 'expense') === 'expense';

        let color = isExpense ? '#FF3B30' : '#4CD964';
        let sign = isExpense ? '-' : '+';

        if (isTransfer) {
            color = '#007AFF'; // Blue for neutral transfers
            sign = ''; // No sign for neutral
        }

        const date = new Date(item.date).toLocaleDateString('vi-VN');

        // Lookup Icon dynamically for consistency
        const catObj = categories.find(c => c.name === item.category);
        const icon = catObj?.icon || item.categoryIcon || item.emoji || (isExpense ? '💸' : '💰');

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('AddTransaction', { transaction: item })}
            >
                <View style={[styles.iconBox, { backgroundColor: isExpense ? '#FFF0F0' : '#F0FFF4' }]}>
                    <Text style={{ fontSize: 24 }}>{icon}</Text>
                </View>
                <View style={styles.details}>
                    <Text style={styles.category}>{item.category || 'Mục khác'}</Text>
                    <Text style={styles.note}>{item.note || 'Không có ghi chú'} • {date}</Text>
                </View>
                <Text style={[styles.amount, { color }]}>
                    {sign}{item.amount?.toLocaleString()} ₫
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#4c669f', '#3b5998', '#192f6a']} style={styles.header}>
                <Text style={styles.headerTitle}>All Transactions</Text>
                <View style={{ marginTop: 12 }}>
                    <MonthPicker date={selectedDate} onMonthChange={setSelectedDate} />
                </View>
            </LinearGradient>

            <FlatList
                data={filteredTransactions}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListHeaderComponent={
                    <View style={{ marginBottom: 16 }}>
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => navigation.navigate('AddTransaction')}
                        >
                            <Ionicons name="add-circle" size={24} color="white" style={{ marginRight: 8 }} />
                            <Text style={styles.addButtonText}>Add Transaction</Text>
                        </TouchableOpacity>

                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color="#999" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search by note..."
                                value={searchText}
                                onChangeText={setSearchText}
                                placeholderTextColor="#999"
                            />
                            {searchText.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchText('')}>
                                    <Ionicons name="close-circle" size={20} color="#ccc" />
                                </TouchableOpacity>
                            )}
                        </View>

                        <MultiSelectDropdown
                            label="Filter Category"
                            options={categories.map(c => ({ id: c.name, name: c.name }))}
                            selectedValues={selectedCategoryIds}
                            onSelectionChange={setSelectedCategoryIds}
                        />
                    </View>
                }
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#3b5998" />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No transactions yet</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, justifyContent: 'center' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
    list: { padding: 16 },
    card: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    details: { flex: 1 },
    category: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
    note: { fontSize: 13, color: '#666' },
    amount: { fontSize: 16, fontWeight: 'bold' },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { color: '#999', fontSize: 16 },
    addButton: {
        backgroundColor: '#007AFF',
        borderRadius: 12,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        // Shadow
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    addButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#eee',
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: '#333',
        paddingVertical: 4,
    }
});
