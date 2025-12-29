// Purpose: Profile specific budget and transaction view
// Connected Flow: PROFILE_SPENDING_FLOW
// Input: route.params.profile

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProfileData } from '../services/dataService';
import BudgetProgressBar from '../components/BudgetProgressBar';
import MonthPicker from '../components/MonthPicker';

export default function ProfileDashboard({ route, navigation }) {
    const profile = route.params?.profile || { name: 'Unknown', id: '0' };
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());

    useEffect(() => {
        loadData();
    }, [profile, route.params?.refresh, selectedDate]); // Reload when profile, refresh param, or DATE changes

    const loadData = async () => {
        try {
            setLoading(true);
            console.log(`👤 ProfileDashboard: Loading data for ${profile.name} in ${selectedDate.toDateString()}`);
            const result = await getProfileData(profile.id, selectedDate);
            setData(result);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddExpense = () => {
        navigation.navigate('AddTransaction', { profile });
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator size="large" color="#007AFF" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>{profile.name}'s Budget</Text>
                <TouchableOpacity onPress={handleAddExpense} style={styles.addButton}>
                    <Text style={styles.addText}>+ Add</Text>
                </TouchableOpacity>
            </View>

            <MonthPicker date={selectedDate} onMonthChange={setSelectedDate} />

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Financial Status</Text>
                <Text style={styles.statusText}>{data?.statusIndicator}</Text>

                {data?.budget && (
                    <BudgetProgressBar
                        label="Monthly Budget"
                        spent={data.budget.spent}
                        limit={data.budget.limit}
                    />
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Transactions</Text>
                <FlatList
                    data={data?.transactions}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <View style={styles.transactionRow}>
                            <View>
                                <Text style={styles.txCategory}>{item.category}</Text>
                                <Text style={styles.txDate}>{new Date(item.date).toLocaleDateString()}</Text>
                            </View>
                            <Text style={styles.amount}>-{item.amount.toLocaleString()} VND</Text>
                        </View>
                    )}
                    ListEmptyComponent={<Text style={styles.emptyText}>No expenses for this month.</Text>}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        paddingRight: 16,
    },
    backText: {
        fontSize: 16,
        color: '#007AFF',
    },
    addButton: {
        backgroundColor: '#1a1a1a',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    addText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    card: {
        margin: 16,
        padding: 24,
        backgroundColor: 'white',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    statusText: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    section: {
        flex: 1,
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
        color: '#1a1a1a',
    },
    transactionRow: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    txCategory: {
        fontWeight: '500',
        color: '#1a1a1a',
    },
    txDate: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    amount: {
        fontWeight: '600',
        color: '#dc2626',
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        marginTop: 20,
    }
});
