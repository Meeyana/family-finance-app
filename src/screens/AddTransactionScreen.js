// Purpose: Input form for new transactions
// Connected Flow: PROFILE_SPENDING_FLOW (Add_Expense)

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, DeviceEventEmitter, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { auth } from '../services/firebase';
import { addTransaction, updateTransaction, deleteTransaction, getFamilyCategories } from '../services/firestoreRepository';
import { validateTransaction } from '../services/transactionService';
import { useAuth } from '../components/context/AuthContext'; // Import useAuth

// ------------------------------------------------------------------
// Screen: Add/Edit Transaction
// Flow: PROFILE_SPENDING_FLOW
// Purpose: Allows a profile to Create OR Edit a Transaction.
// ------------------------------------------------------------------

export default function AddTransactionScreen({ route, navigation }) {
    const { profile: authProfile } = useAuth(); // Get auth profile

    // INPUT: Passed from ProfileDashboard OR Fallback
    const params = route.params || {};
    const profile = params.profile || authProfile || { name: 'Unknown', id: '0' };
    const transaction = params.transaction;
    const isEditing = !!transaction;

    // STATE: Form Fields
    const [type, setType] = useState(transaction?.type || 'expense');
    const [amount, setAmount] = useState(transaction ? transaction.amount.toString() : '');
    const [category, setCategory] = useState(transaction ? transaction.category : '');
    const [note, setNote] = useState(transaction ? transaction.note : '');
    const [date, setDate] = useState(transaction ? transaction.date : new Date().toISOString().split('T')[0]);

    const themeColor = type === 'income' ? '#34c759' : '#ff3b30';

    // ... existing state ...
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [confirmation, setConfirmation] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // SIDE EFFECT: Fetch categories
    useEffect(() => {
        const fetchCats = async () => {
            try {
                if (auth.currentUser) {
                    console.log('Fetching cats for profile:', profile.id);
                    const cats = await getFamilyCategories(auth.currentUser.uid, profile.id, profile.role);
                    setCategories(cats);
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchCats();
    }, [profile.id]);

    // Filter categories based on selected Type
    const filteredCategories = categories.filter(c => (c.type || 'expense') === type);

    // Auto-select first category if current selection is invalid for type
    useEffect(() => {
        const currentCat = filteredCategories.find(c => c.name === category);
        if (!currentCat && filteredCategories.length > 0) {
            setCategory(filteredCategories[0].name);
        }
    }, [type, categories]);

    const onDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || new Date(date);
        // On Android, the picker dismisses itself, but we need to toggle state
        setShowDatePicker(Platform.OS === 'ios');

        // Format to YYYY-MM-DD
        const formattedDate = currentDate.toISOString().split('T')[0];
        setDate(formattedDate);
    };

    const handleSave = async () => {
        if (!amount || isNaN(amount)) {
            Alert.alert('Error', 'Invalid amount');
            return;
        }

        const numAmount = parseFloat(amount);
        setLoading(true);

        try {
            if (type === 'income') {
                await executeSave(numAmount);
            } else {
                const validation = await validateTransaction(profile.id, numAmount);
                if (validation.status !== 'ALLOWED') {
                    setConfirmation({
                        title: validation.status === 'CRITICAL' ? 'Over Budget!' : 'Budget Warning',
                        message: validation.message,
                        onConfirm: () => executeSave(numAmount)
                    });
                    setLoading(false);
                } else {
                    await executeSave(numAmount);
                }
            }
        } catch (error) {
            await executeSave(numAmount);
        }
    };

    const executeSave = async (numAmount) => {
        try {
            setLoading(true);
            if (!auth.currentUser) throw new Error("Not authenticated");
            const uid = auth.currentUser.uid;

            const selectedCatObj = categories.find(c => c.name === category);

            const transactionData = {
                profileId: profile.id,
                amount: numAmount,
                category,
                categoryIcon: selectedCatObj?.icon || '🏷️',
                note,
                date: date,
                type
            };

            // ... rest of save logic
            if (isEditing) {
                await updateTransaction(uid, transaction.id, transaction, transactionData);
            } else {
                await addTransaction(uid, transactionData);
            }

            DeviceEventEmitter.emit('refresh_profile_dashboard');
            navigation.goBack();

        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to save');
        } finally {
            setLoading(false);
            setConfirmation(null);
        }
    };

    const handleDelete = async () => {
        Alert.alert("Delete", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        setLoading(true);
                        if (!auth.currentUser) return;
                        await deleteTransaction(auth.currentUser.uid, transaction.id, transaction);
                        DeviceEventEmitter.emit('refresh_profile_dashboard');
                        navigation.goBack();
                    } catch (err) {
                        console.error(err);
                        Alert.alert('Delete Failed', err.message);
                    }
                }
            }
        ]);
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <SafeAreaView style={styles.container}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <MaterialCommunityIcons name="close" size={28} color="#666" />
                        </TouchableOpacity>
                        <Text style={styles.title}>{isEditing ? 'Edit Transaction' : 'New Transaction'}</Text>
                        {isEditing ? (
                            <TouchableOpacity onPress={handleDelete}>
                                <MaterialCommunityIcons name="delete" size={24} color="red" />
                            </TouchableOpacity>
                        ) : (
                            <View style={{ width: 28 }} />
                        )}
                    </View>

                    <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
                        {/* Type Toggle */}
                        <View style={styles.toggleContainer}>
                            <TouchableOpacity
                                style={[styles.toggleButton, type === 'expense' && { backgroundColor: '#ff3b30' }]}
                                onPress={() => setType('expense')}
                            >
                                <Text style={[styles.toggleText, type === 'expense' && styles.toggleTextSelected]}>💸 Expense</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.toggleButton, type === 'income' && { backgroundColor: '#34c759' }]}
                                onPress={() => setType('income')}
                            >
                                <Text style={[styles.toggleText, type === 'income' && styles.toggleTextSelected]}>💰 Income</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Amount (VND)</Text>
                        <TextInput
                            style={[styles.inputLarge, { color: themeColor }]}
                            placeholder="0"
                            placeholderTextColor="#ccc"
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                        />

                        {/* ... Date Picker ... */}
                        <Text style={styles.label}>Date</Text>
                        {Platform.OS === 'ios' ? (
                            <View style={{ alignSelf: 'flex-start' }}>
                                <DateTimePicker
                                    testID="dateTimePicker"
                                    value={new Date(date)}
                                    mode="date"
                                    display="compact"
                                    onChange={onDateChange}
                                />
                            </View>
                        ) : Platform.OS === 'android' ? (
                            <>
                                <TouchableOpacity
                                    style={styles.dateButton}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Text style={styles.dateText}>{date}</Text>
                                </TouchableOpacity>

                                {showDatePicker && (
                                    <DateTimePicker
                                        testID="dateTimePicker"
                                        value={new Date(date)}
                                        mode="date"
                                        is24Hour={true}
                                        display="default"
                                        onChange={onDateChange}
                                    />
                                )}
                            </>
                        ) : (
                            <TextInput
                                style={styles.input}
                                placeholder="YYYY-MM-DD"
                                value={date}
                                onChangeText={setDate}
                            />
                        )}

                        <Text style={styles.label}>Category</Text>
                        <View style={styles.categoryContainer}>
                            {filteredCategories.map((cat) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.categoryButton,
                                        category === cat.name && { backgroundColor: type === 'income' ? '#e8f5e9' : '#ffebee', borderColor: themeColor }
                                    ]}
                                    onPress={() => setCategory(cat.name)}
                                >
                                    <Text style={[
                                        styles.categoryText,
                                        category === cat.name && { color: themeColor, fontWeight: 'bold' }
                                    ]}>
                                        {cat.icon} {cat.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Note (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="What is this for?"
                            value={note}
                            onChangeText={setNote}
                        />

                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: themeColor }]}
                            onPress={handleSave}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.saveText}>{isEditing ? 'Update' : 'Save'} {type === 'income' ? 'Income' : 'Expense'}</Text>}
                        </TouchableOpacity>

                        <View style={{ height: 40 }} />
                    </ScrollView>

                    {/* Custom Confirmation Modal/Overlay */}
                    {confirmation && (
                        <View style={styles.overlay}>
                            <View style={styles.modal}>
                                <Text style={styles.modalTitle}>{confirmation.title}</Text>
                                <Text style={styles.modalMessage}>{confirmation.message}</Text>
                                <View style={styles.modalButtons}>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.cancelButton]}
                                        onPress={() => setConfirmation(null)}
                                    >
                                        <Text style={styles.cancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.confirmButton]}
                                        onPress={confirmation.onConfirm}
                                    >
                                        <Text style={styles.confirmButtonText}>Yes, Save</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    )}
                </KeyboardAvoidingView>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backText: {
        fontSize: 16,
        color: '#666',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    form: {
        padding: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginTop: 20,
        marginBottom: 8,
    },
    inputLarge: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#007AFF',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        paddingVertical: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    dateButton: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
    },
    dateText: {
        fontSize: 16,
        color: '#333',
    },
    categoryContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    categoryButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    categorySelected: {
        backgroundColor: '#e3f2fd',
        borderColor: '#007AFF',
    },
    categoryText: {
        fontSize: 14,
        color: '#666',
    },
    categoryTextSelected: {
        color: '#007AFF',
        fontWeight: '600',
    },
    saveButton: {
        marginTop: 40,
        backgroundColor: '#007AFF',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modal: {
        width: '80%',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#dc2626',
    },
    modalMessage: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        color: '#333',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f3f4f6',
    },
    confirmButton: {
        backgroundColor: '#dc2626',
    },
    cancelButtonText: {
        color: '#333',
        fontWeight: '600',
    },
    confirmButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#f1f1f1',
        borderRadius: 8,
        padding: 4,
        marginBottom: 20,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    toggleTextSelected: {
        color: 'white',
    },
});
