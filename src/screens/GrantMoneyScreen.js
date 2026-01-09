import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, FlatList, DeviceEventEmitter, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../components/context/AuthContext';
import { processTransfer, getFamilyProfiles } from '../services/firestoreRepository';

export default function GrantMoneyScreen({ navigation }) {
    const { user, profile } = useAuth();
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [receivers, setReceivers] = useState([]);
    const [selectedReceiver, setSelectedReceiver] = useState(null);


    useEffect(() => {
        loadProfiles();
    }, []);

    const loadProfiles = async () => {
        try {
            const allProfiles = await getFamilyProfiles(user.uid);
            // Filter out self
            const others = allProfiles.filter(p => p.id !== profile.id);
            setReceivers(others);
            if (others.length > 0) setSelectedReceiver(others[0]);
        } catch (e) {
            console.error(e);
        }
    };

    const handleGrant = async () => {
        if (!amount || !reason || !selectedReceiver) {
            Alert.alert('Missing Info', 'Please enter amount, reason and select a receiver.');
            return;
        }

        const numAmount = parseInt(amount.replace(/[^0-9]/g, ''));
        if (isNaN(numAmount) || numAmount <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount.');
            return;
        }

        setLoading(true);
        try {
            await processTransfer(
                user.uid,
                profile.id, // From Admin
                selectedReceiver.id, // To Child
                numAmount,
                { name: 'Present', icon: '🎁', id: 'present' }, // Hardcoded Category
                reason,
                null // No linked request
            );

            // Trigger Dashboard Update
            DeviceEventEmitter.emit('refresh_profile_dashboard');

            Alert.alert('Success', `Sent ${numAmount.toLocaleString()} ₫ to ${selectedReceiver.name}!`, [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to grant money.');
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
                    <Text style={styles.title}>Grant Pocket Money</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.content}>

                    {/* Receiver Selector */}
                    <Text style={styles.label}>To Who?</Text>
                    <View style={styles.receiversRow}>
                        {receivers.map(p => (
                            <TouchableOpacity
                                key={p.id}
                                style={[
                                    styles.receiverChip,
                                    selectedReceiver?.id === p.id && styles.receiverChipSelected
                                ]}
                                onPress={() => setSelectedReceiver(p)}
                            >
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{p.name[0]}</Text>
                                </View>
                                <Text style={[
                                    styles.receiverName,
                                    selectedReceiver?.id === p.id && styles.receiverNameSelected
                                ]}>
                                    {p.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>


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
                            />
                        </View>
                    </View>

                    {/* Reason */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Reason/Message</Text>
                        <TextInput
                            style={styles.reasonInput}
                            value={reason}
                            onChangeText={setReason}
                            placeholder="Enjoy!"
                            multiline
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, loading && styles.disabledButton]}
                        onPress={handleGrant}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.submitText}>Send Money</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView >
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
    title: { fontSize: 20, fontWeight: 'bold' },
    content: { padding: 24, flex: 1 },

    label: { fontSize: 14, color: '#666', marginBottom: 12, textTransform: 'uppercase', fontWeight: '600' },

    receiversRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
    receiverChip: {
        flexDirection: 'row', alignItems: 'center',
        padding: 8, paddingRight: 16,
        backgroundColor: '#f5f5f5', borderRadius: 24,
        borderWidth: 1, borderColor: 'transparent'
    },
    receiverChipSelected: {
        backgroundColor: '#e3f2fd',
        borderColor: '#007AFF'
    },
    avatar: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center', marginRight: 8
    },
    avatarText: { fontWeight: 'bold', color: '#555' },
    receiverName: { fontWeight: '600', color: '#333' },
    receiverNameSelected: { color: '#007AFF' },

    inputContainer: { marginBottom: 32 },
    amountWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: '#28a745', // Green for money
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
        height: 100,
        textAlignVertical: 'top'
    },
    submitButton: {
        backgroundColor: '#28a745', // Green
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
        marginTop: 'auto',
        elevation: 2
    },
    disabledButton: { opacity: 0.7 },
    submitText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    categoryChip: {
        paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 20, backgroundColor: '#f0f0f0',
        borderWidth: 1, borderColor: 'transparent'
    },
    categoryChipSelected: { backgroundColor: '#e3f2fd', borderColor: '#007AFF' },
    categoryText: { fontSize: 14, color: '#666' },
    categoryTextSelected: { color: '#007AFF', fontWeight: 'bold' }
});
