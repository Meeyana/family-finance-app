import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, TouchableWithoutFeedback, Keyboard, useColorScheme, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../components/context/AuthContext';
import { addRequest, getFamilyCategories } from '../services/firestoreRepository';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import { CurrencyText } from '../components/CurrencyText';
import { formatMoney, parseMoney } from '../utils/formatting';

export default function MoneyRequestScreen({ navigation }) {
    const { user, profile } = useAuth();
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState({ name: 'General', icon: '🏷️' });

    const theme = useColorScheme() || 'light';
    const colors = COLORS[theme];

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
        const numAmount = parseMoney(amount);
        if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount.');
            return;
        }
        if (!reason.trim()) {
            Alert.alert('Missing Info', 'Please enter a reason.');
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
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: colors.primaryText }]}>Request Money</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.content}>
                    {/* Hero Input Section */}
                    <View style={styles.heroInputContainer}>
                        <Text style={[styles.currency, { color: colors.primaryAction }]}>₫</Text>
                        <TextInput
                            style={[styles.heroInput, { color: colors.primaryAction }]}
                            value={amount}
                            onChangeText={(text) => setAmount(formatMoney(text))}
                            placeholder="0"
                            placeholderTextColor={colors.divider}
                            keyboardType="numeric"
                            autoFocus
                        />
                    </View>

                    <View style={styles.inputSection}>
                        <Text style={[styles.label, { color: colors.secondaryText }]}>CATEGORY</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                            {categories.map(cat => (
                                <TouchableOpacity
                                    key={cat.id || cat.name}
                                    style={[
                                        styles.categoryChip,
                                        { backgroundColor: colors.surface, borderColor: colors.divider },
                                        selectedCategory.name === cat.name && { backgroundColor: colors.primaryAction + '15', borderColor: colors.primaryAction }
                                    ]}
                                    onPress={() => setSelectedCategory(cat)}
                                >
                                    <Text style={[
                                        styles.categoryText,
                                        { color: colors.secondaryText },
                                        selectedCategory.name === cat.name && { color: colors.primaryAction, fontWeight: 'bold' }
                                    ]}>
                                        {cat.icon} {cat.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <View style={styles.inputSection}>
                        <Text style={[styles.label, { color: colors.secondaryText }]}>REASON</Text>
                        <TextInput
                            style={[styles.reasonInput, { backgroundColor: colors.surface, color: colors.primaryText, borderColor: colors.divider }]}
                            value={reason}
                            onChangeText={setReason}
                            placeholder="What is this for?"
                            placeholderTextColor={colors.secondaryText}
                            multiline
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, { backgroundColor: colors.primaryAction }, loading && styles.disabledButton]}
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
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.screenPadding,
        paddingVertical: SPACING.m,
    },
    backButton: { padding: 4 },
    title: { fontSize: TYPOGRAPHY.size.h3, fontWeight: '600' },
    content: { padding: SPACING.screenPadding, flex: 1 },

    // Hero Input Styles
    heroInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: SPACING.xl * 1.5,
    },
    currency: {
        fontSize: 32,
        fontWeight: 'bold',
        marginRight: 4,
        alignSelf: 'center',
    },
    heroInput: {
        fontSize: 48, // HUGE like AddTransaction
        fontWeight: 'bold',
        minWidth: 100,
        textAlign: 'center',
    },

    inputSection: { marginBottom: SPACING.xl },
    label: {
        fontSize: TYPOGRAPHY.size.caption,
        marginBottom: SPACING.s,
        fontWeight: '600',
        letterSpacing: 1
    },
    categoryRow: {
        gap: SPACING.s
    },
    categoryChip: {
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.s,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: SPACING.s
    },
    categoryText: {
        fontSize: TYPOGRAPHY.size.body
    },
    reasonInput: {
        fontSize: TYPOGRAPHY.size.body,
        borderRadius: 12,
        padding: SPACING.m,
        height: 120,
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
