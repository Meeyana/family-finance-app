import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator, Platform, DeviceEventEmitter, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../components/context/AuthContext';
import { getRecurring, addRecurring, deleteRecurring, updateRecurring, getFamilyCategories, checkAndProcessRecurring } from '../services/firestoreRepository';

export default function RecurringScreen({ navigation }) {
    const { user, profile } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState('expense');

    // Unit State (Replaces Frequency)
    const [unit, setUnit] = useState('MONTHLY');

    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);

    // Duration State
    const [isForever, setIsForever] = useState(true);
    const [durationCount, setDurationCount] = useState('');

    const [editingItem, setEditingItem] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await getRecurring(user.uid, profile.id);
            setItems(data);

            const cats = await getFamilyCategories(user.uid, profile.id, profile.role);
            setCategories(cats);
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setName('');
        setAmount('');
        setType('expense');
        setUnit('MONTHLY');
        setSelectedCategory(null);
        setIsForever(true);
        setDurationCount('');
        setEditingItem(null);
    };

    const handleEdit = (item) => {
        setName(item.name);
        setAmount(item.amount.toString());
        setType(item.type);
        setUnit(item.frequency === 'YEARLY' ? 'YEARLY' : 'MONTHLY');
        setStartDate(item.startDate);
        setSelectedCategory(item.categoryData || categories.find(c => c.name === item.category));
        setIsForever(!item.endDate);
        setDurationCount('');
        setEditingItem(item);
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!name || !amount || !selectedCategory) {
            Alert.alert('Missing Info', 'Please fill name, amount and category');
            return;
        }

        if (!isForever && !durationCount) {
            Alert.alert('Missing Info', 'Please enter duration count');
            return;
        }

        try {
            setLoading(true);

            // Calculate End Date
            let endDate = null;
            if (!isForever) {
                const count = parseInt(durationCount);
                if (isNaN(count) || count <= 0) {
                    Alert.alert('Invalid', 'Duration must be a positive number');
                    return;
                }
                const start = new Date(startDate);
                const end = new Date(start);

                switch (unit) {
                    case 'MONTHLY': end.setMonth(end.getMonth() + (count - 1)); break;
                    case 'YEARLY': end.setFullYear(end.getFullYear() + (count - 1)); break;
                }
                endDate = end.toISOString().split('T')[0];
            }

            const payload = {
                name,
                amount: Number(amount),
                type,
                frequency: unit, // Unit IS the frequency
                startDate,
                endDate,
                profileId: profile.id,
                category: selectedCategory.name,
                categoryData: selectedCategory
            };

            if (editingItem) {
                // Update
                await updateRecurring(user.uid, editingItem.id, payload);
                Alert.alert('Success', 'Updated subscription');
            } else {
                // Add
                await addRecurring(user.uid, payload);

                // TRIGGER IMMEDIATE PROCESSING
                console.log("⚡ Triggering immediate processing...");
                await checkAndProcessRecurring(user.uid);
                DeviceEventEmitter.emit('refresh_profile_dashboard');

                Alert.alert('Success', 'Recurring transaction set up!');
            }

            setModalVisible(false);
            resetForm();
            loadData();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to save');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id) => {
        const executeDelete = async () => {
            await deleteRecurring(user.uid, id);
            loadData();
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Delete this subscription?')) executeDelete();
        } else {
            Alert.alert('Delete?', 'Stop this recurring transaction?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: executeDelete }
            ]);
        }
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => handleEdit(item)}
            activeOpacity={0.7}
        >
            <View style={styles.cardLeft}>
                <View style={[styles.iconBox, { backgroundColor: item.type === 'income' ? '#E8F5E9' : '#FFVkE9' }]}>
                    <Text style={{ fontSize: 20 }}>{item.categoryData?.icon || '📅'}</Text>
                </View>
                <View>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemSub}>{item.frequency} • Next: {item.nextDueDate}</Text>
                </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.amount, { color: item.type === 'income' ? '#34C759' : '#FF3B30' }]}>
                    {item.amount.toLocaleString()} ₫
                </Text>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ marginTop: 8 }}>
                    <Ionicons name="trash-outline" size={20} color="#999" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>Recurring Transactions</Text>
                <TouchableOpacity onPress={() => { resetForm(); setModalVisible(true); }}>
                    <Ionicons name="add-circle" size={32} color="#007AFF" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={items}
                renderItem={renderItem}
                keyExtractor={i => i.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={!loading && <Text style={styles.empty}>No subscriptions found.</Text>}
            />

            <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <SafeAreaView style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingItem ? 'Edit Recurring' : 'New Recurring'}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Text style={styles.closeText}>Close</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.form}>
                            <Text style={styles.label}>Name (e.g. Netflix)</Text>
                            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Title" />

                            <Text style={styles.label}>Amount</Text>
                            <TextInput style={styles.input} value={amount} onChangeText={setAmount} placeholder="0" keyboardType="numeric" />

                            <View style={styles.row}>
                                <TouchableOpacity
                                    style={[styles.typeBtn, type === 'expense' && styles.expenseActive]}
                                    onPress={() => setType('expense')}>
                                    <Text style={[styles.typeText, type === 'expense' && { color: 'white' }]}>Expense</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.typeBtn, type === 'income' && styles.incomeActive]}
                                    onPress={() => setType('income')}>
                                    <Text style={[styles.typeText, type === 'income' && { color: 'white' }]}>Income</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.label}>Duration</Text>
                            <View style={styles.row}>
                                <TouchableOpacity
                                    style={[styles.typeBtn, isForever && styles.freqActive]}
                                    onPress={() => setIsForever(true)}>
                                    <Text style={[styles.typeText, isForever && { color: 'white' }]}>Forever</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.typeBtn, !isForever && styles.freqActive]}
                                    onPress={() => setIsForever(false)}>
                                    <Text style={[styles.typeText, !isForever && { color: 'white' }]}>Fixed</Text>
                                </TouchableOpacity>
                            </View>

                            {!isForever && (
                                <View style={{ marginTop: 12 }}>
                                    <Text style={styles.label}>Run for...</Text>
                                    <View style={styles.row}>
                                        <TextInput
                                            style={[styles.input, { flex: 0.4 }]}
                                            value={durationCount}
                                            onChangeText={setDurationCount}
                                            placeholder="Num"
                                            keyboardType="numeric"
                                        />
                                        <TouchableOpacity
                                            style={[styles.typeBtn, unit === 'MONTHLY' && styles.freqActive, { flex: 0.3 }]}
                                            onPress={() => setUnit('MONTHLY')}>
                                            <Text style={[styles.typeText, unit === 'MONTHLY' && { color: 'white' }]}>Months</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.typeBtn, unit === 'YEARLY' && styles.freqActive, { flex: 0.3 }]}
                                            onPress={() => setUnit('YEARLY')}>
                                            <Text style={[styles.typeText, unit === 'YEARLY' && { color: 'white' }]}>Years</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            <Text style={styles.label}>Category</Text>
                            <FlatList
                                data={categories.filter(c => (c.type || 'expense') === type)}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={{ maxHeight: 60 }}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[styles.catChip, selectedCategory?.id === item.id && styles.catActive]}
                                        onPress={() => setSelectedCategory(item)}>
                                        <Text>{item.icon} {item.name}</Text>
                                    </TouchableOpacity>
                                )}
                            />

                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                                <Text style={styles.saveText}>{editingItem ? 'Update Subscription' : 'Save Subscription'}</Text>
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </TouchableWithoutFeedback>
            </Modal>
        </SafeAreaView>
    );

}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff' },
    title: { fontSize: 20, fontWeight: 'bold' },
    list: { padding: 16 },
    card: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12 },
    cardLeft: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    iconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eee' },
    itemName: { fontWeight: '600', fontSize: 16 },
    itemSub: { color: '#666', fontSize: 12, marginTop: 2 },
    amount: { fontWeight: 'bold', fontSize: 16 },
    empty: { textAlign: 'center', marginTop: 50, color: '#999' },

    // Modal
    modalContainer: { flex: 1, backgroundColor: '#fff' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    closeText: { color: '#007AFF', fontSize: 16 },
    form: { padding: 20 },
    label: { color: '#666', marginBottom: 8, marginTop: 12, fontWeight: '600' },
    input: { backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8, fontSize: 16 },
    row: { flexDirection: 'row', gap: 12 },
    typeBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#f5f5f5', alignItems: 'center' },
    expenseActive: { backgroundColor: '#FF3B30' },
    incomeActive: { backgroundColor: '#34C759' },
    typeText: { fontWeight: '600', color: '#666' },
    freqBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f5f5f5', marginRight: 8 },
    freqActive: { backgroundColor: '#007AFF' },
    freqText: { fontSize: 12, fontWeight: '600', color: '#666' },
    saveBtn: { backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 30 },
    saveText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    catChip: { padding: 10, backgroundColor: '#f5f5f5', borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
    catActive: { borderColor: '#007AFF', backgroundColor: '#E3F2FD' }

});
