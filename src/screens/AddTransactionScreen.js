// Purpose: Input form for new transactions
// Connected Flow: PROFILE_SPENDING_FLOW (Add_Expense)

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { validateTransaction, saveTransaction } from '../services/transactionService';

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Other'];

export default function AddTransactionScreen({ route, navigation }) {
    const profile = route.params?.profile;

    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [confirmation, setConfirmation] = useState(null); // { title, message, onConfirm }

    const handleSave = async () => {
        if (!amount || isNaN(amount)) {
            // Simple alert for validation is usually fine
            if (Platform.OS === 'web') {
                window.alert('Please enter a valid amount');
            } else {
                Alert.alert('Error', 'Please enter a valid amount');
            }
            return;
        }

        const numAmount = parseFloat(amount);
        setLoading(true);

        // 1. Validate
        try {
            const validation = await validateTransaction(profile.id, numAmount);

            if (validation.status !== 'ALLOWED') {
                // Show Custom Confirmation instead of Alert.alert
                setConfirmation({
                    title: validation.status === 'CRITICAL' ? 'Over Budget!' : 'Budget Warning',
                    message: validation.message,
                    onConfirm: () => executeSave(numAmount)
                });
                setLoading(false);
            } else {
                // No warning, just save
                await executeSave(numAmount);
            }
        } catch (error) {
            console.error("Validation Error", error);
            // Fallback to save if validation fails (or handle error)
            await executeSave(numAmount);
        }
    };

    const executeSave = async (numAmount) => {
        try {
            setLoading(true); // Ensure loading is shown
            await saveTransaction({
                profileId: profile.id,
                amount: numAmount,
                category,
                note,
                date: new Date().toISOString().split('T')[0]
            });

            // Navigate back immediately
            navigation.navigate('ProfileDashboard', { profile, refresh: Date.now() });

        } catch (error) {
            console.error(error);
            if (Platform.OS === 'web') alert('Failed to save');
            else Alert.alert('Error', 'Failed to save transaction');
        } finally {
            setLoading(false);
            setConfirmation(null);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Text style={styles.backText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>New Expense</Text>
                    <View style={{ width: 60 }} />
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Amount (VND)</Text>
                    <TextInput
                        style={styles.inputLarge}
                        placeholder="0"
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                    />

                    <Text style={styles.label}>Category</Text>
                    <View style={styles.categoryContainer}>
                        {CATEGORIES.map(cat => (
                            <TouchableOpacity
                                key={cat}
                                style={[styles.catChip, category === cat && styles.catChipSelected]}
                                onPress={() => setCategory(cat)}
                            >
                                <Text style={[styles.catText, category === cat && styles.catTextSelected]}>
                                    {cat}
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
                        style={styles.saveButton}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.saveText}>Save Expense</Text>}
                    </TouchableOpacity>
                </View>

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
    categoryContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    catChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    catChipSelected: {
        backgroundColor: '#e3f2fd',
        borderColor: '#007AFF',
    },
    catText: {
        fontSize: 14,
        color: '#666',
    },
    catTextSelected: {
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
});
