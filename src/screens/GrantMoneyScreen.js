import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, FlatList, DeviceEventEmitter, TouchableWithoutFeedback, Keyboard, useColorScheme, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../components/context/AuthContext';
import { processTransfer, getFamilyProfiles } from '../services/firestoreRepository';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';

export default function GrantMoneyScreen({ navigation }) {
    const { user, profile } = useAuth();
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [receivers, setReceivers] = useState([]);
    const [selectedReceiver, setSelectedReceiver] = useState(null);

    const theme = useColorScheme() || 'light';
    const colors = COLORS[theme];

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

    const formatCurrencyInput = (value) => {
        // Remove non-digits
        const number = value.replace(/[^0-9]/g, '');
        // Format with thousand separators
        return number.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    const handleAmountChange = (text) => {
        setAmount(formatCurrencyInput(text));
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={[styles.header, { borderBottomColor: colors.divider }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: colors.primaryText }]}>Grant Money</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.content}>

                    {/* Receiver Selector */}
                    <View style={styles.inputSection}>
                        <Text style={[styles.label, { color: colors.secondaryText }]}>TO WHO?</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.receiversRow}>
                            {receivers.map(p => (
                                <TouchableOpacity
                                    key={p.id}
                                    style={[
                                        styles.receiverChip,
                                        { backgroundColor: colors.surface, borderColor: colors.divider },
                                        selectedReceiver?.id === p.id && { backgroundColor: colors.primaryAction + '15', borderColor: colors.primaryAction }
                                    ]}
                                    onPress={() => setSelectedReceiver(p)}
                                >
                                    <View style={[styles.avatar, { backgroundColor: colors.background }]}>
                                        <Text style={[styles.avatarText, { color: colors.primaryText }]}>{p.name[0]}</Text>
                                    </View>
                                    <Text style={[
                                        styles.receiverName,
                                        { color: colors.secondaryText },
                                        selectedReceiver?.id === p.id && { color: colors.primaryAction, fontWeight: 'bold' }
                                    ]}>
                                        {p.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <View style={styles.inputSection}>
                        <Text style={[styles.label, { color: colors.secondaryText }]}>AMOUNT</Text>
                        <View style={[styles.amountWrapper, { borderBottomColor: colors.primaryAction }]}>
                            <Text style={[styles.currency, { color: colors.primaryText }]}>₫</Text>
                            <TextInput
                                style={[styles.amountInput, { color: colors.primaryText }]}
                                value={amount}
                                onChangeText={handleAmountChange}
                                placeholder="0"
                                placeholderTextColor={colors.secondaryText}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    {/* Reason */}
                    <View style={styles.inputSection}>
                        <Text style={[styles.label, { color: colors.secondaryText }]}>REASON</Text>
                        <TextInput
                            style={[styles.reasonInput, { backgroundColor: colors.surface, color: colors.primaryText, borderColor: colors.divider }]}
                            value={reason}
                            onChangeText={setReason}
                            placeholder="Reason or Message..."
                            placeholderTextColor={colors.secondaryText}
                            multiline
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, { backgroundColor: colors.primaryAction }, loading && styles.disabledButton]}
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
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.screenPadding,
        paddingVertical: SPACING.m,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backButton: { padding: 4 },
    title: { fontSize: TYPOGRAPHY.size.h3, fontWeight: '600' },
    content: { padding: SPACING.screenPadding, flex: 1 },
    inputSection: { marginBottom: SPACING.xl },
    label: {
        fontSize: TYPOGRAPHY.size.caption,
        marginBottom: SPACING.s,
        fontWeight: '600',
        letterSpacing: 1
    },
    receiversRow: {
        gap: SPACING.s
    },
    receiverChip: {
        flexDirection: 'row', alignItems: 'center',
        padding: SPACING.xs, paddingRight: SPACING.m,
        borderRadius: 24,
        borderWidth: 1,
        marginRight: SPACING.s
    },
    avatar: {
        width: 32, height: 32, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center', marginRight: SPACING.xs
    },
    avatarText: { fontWeight: 'bold' },
    receiverName: {
        fontSize: TYPOGRAPHY.size.body
    },
    amountWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 2,
        paddingBottom: SPACING.xs
    },
    currency: {
        fontSize: TYPOGRAPHY.size.h1,
        fontWeight: 'bold',
        marginRight: SPACING.xs
    },
    amountInput: {
        flex: 1,
        fontSize: TYPOGRAPHY.size.h1,
        fontWeight: 'bold',
    },
    reasonInput: {
        fontSize: TYPOGRAPHY.size.body,
        borderRadius: 12,
        padding: SPACING.m,
        height: 100,
        textAlignVertical: 'top',
        borderWidth: 1,
    },
    submitButton: {
        borderRadius: 16,
        padding: SPACING.l,
        alignItems: 'center',
        marginTop: 'auto',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    disabledButton: { opacity: 0.7 },
    submitText: { color: 'white', fontSize: TYPOGRAPHY.size.body, fontWeight: 'bold' }
});
