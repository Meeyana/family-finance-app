import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../components/context/AuthContext';
import { addRequest, getFamilyCategories } from '../services/firestoreRepository';

export default function MoneyRequestScreen({ navigation }) {
    const { user, profile } = useAuth();
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState({ name: 'General', icon: '🏷️' });

    useEffect(() => {
        const loadCats = async () => {
            if (user) {
                const cats = await getFamilyCategories(user.uid, profile.id, profile.role);
                // Show all categories (Income + Expense) so users can request for "Commissions" etc.
                setCategories(cats);
                if (cats.length > 0) setSelectedCategory(cats[0]);
            }
        };
        loadCats();
    }, [user, profile]);

    const handleSubmit = async () => {
        if (!amount || !reason) {
            Alert.alert('Missing Info', 'Please enter an amount and a reason.');
            return;
        }

        const numAmount = parseInt(amount.replace(/[^0-9]/g, ''));
        if (isNaN(numAmount) || numAmount <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount.');
            return;
        }

        setLoading(true);
        try {
            await addRequest(user.uid, {
                createdByProfileId: profile.id,
                createdByName: profile.name,
                amount: numAmount,
                reason: reason.trim(),
                categoryData: selectedCategory, // Save full object
                category: selectedCategory.name // Fallback/Display
            });
            Alert.alert('Success', 'Request sent to admin!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to send request. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Request Money</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.content}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Amount</Text>
                        <View style={styles.amountWrapper}>
                            <Text style={styles.currency}>₫</Text>
                            <TextInput
                                style={styles.amountInput}
                                value={amount}
                                onChangeText={setAmount}
                                placeholder="0"
                                keyboardType="numeric"
                                autoFocus
                            />
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Category</Text>
                        <View style={styles.categoryRow}>
                            {categories.map(cat => (
                                <TouchableOpacity
                                    key={cat.id || cat.name}
                                    style={[
                                        styles.categoryChip,
                                        selectedCategory.name === cat.name && styles.categoryChipSelected
                                    ]}
                                    onPress={() => setSelectedCategory(cat)}
                                >
                                    <Text style={[
                                        styles.categoryText,
                                        selectedCategory.name === cat.name && styles.categoryTextSelected
                                    ]}>
                                        {cat.icon} {cat.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Reason</Text>
                        <TextInput
                            style={styles.reasonInput}
                            value={reason}
                            onChangeText={setReason}
                            placeholder="What is this for?"
                            multiline
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, loading && styles.disabledButton]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.submitText}>Send Request</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0'
    },
    backButton: { padding: 4 },
    title: { fontSize: 20, fontWeight: 'bold' },
    content: { padding: 24, flex: 1 },
    inputContainer: { marginBottom: 24 },
    categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    categoryChip: {
        paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 20, backgroundColor: '#f0f0f0',
        borderWidth: 1, borderColor: 'transparent'
    },
    categoryChipSelected: { backgroundColor: '#e3f2fd', borderColor: '#007AFF' },
    categoryText: { fontSize: 14, color: '#666' },
    categoryTextSelected: { color: '#007AFF', fontWeight: 'bold' },
    label: { fontSize: 14, color: '#666', marginBottom: 8, textTransform: 'uppercase', fontWeight: '600' },
    amountWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: '#007AFF', // Blue
        paddingBottom: 8
    },
    currency: { fontSize: 32, fontWeight: 'bold', color: '#1a1a1a', marginRight: 8 },
    amountInput: {
        flex: 1,
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1a1a1a'
    },
    reasonInput: {
        fontSize: 18,
        color: '#1a1a1a',
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        padding: 16,
        height: 120,
        textAlignVertical: 'top'
    },
    submitButton: {
        backgroundColor: '#007AFF',
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
        marginTop: 'auto',
        elevation: 2
    },
    disabledButton: { opacity: 0.7 },
    submitText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});
