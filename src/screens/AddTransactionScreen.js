import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, DeviceEventEmitter, TouchableWithoutFeedback, Keyboard, useColorScheme, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { auth } from '../services/firebase';
import { addTransaction, updateTransaction, deleteTransaction, getFamilyCategories } from '../services/firestoreRepository';
import { validateTransaction } from '../services/transactionService';
import { useAuth } from '../components/context/AuthContext';
import { useTheme } from '../components/context/ThemeContext';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import { formatMoney, parseMoney } from '../utils/formatting';

export default function AddTransactionScreen({ route, navigation }) {
    const { profile: authProfile } = useAuth();
    const { theme } = useTheme();
    const colors = COLORS[theme];

    // INPUT: Passed from ProfileDashboard OR Fallback
    const params = route.params || {};
    const profile = params.profile || authProfile || { name: 'Unknown', id: '0' };
    const transaction = params.transaction;
    const isEditing = !!transaction;

    // STATE: Form Fields
    const [type, setType] = useState(transaction?.type || 'expense');
    const [amount, setAmount] = useState(transaction ? formatMoney(transaction.amount) : '');
    const [category, setCategory] = useState(transaction ? transaction.category : '');
    const [note, setNote] = useState(transaction ? transaction.note : '');
    const [date, setDate] = useState(transaction ? transaction.date : new Date().toISOString().split('T')[0]);
    const [tempDate, setTempDate] = useState(new Date());

    // Active Color Theme
    const activeColor = type === 'income' ? colors.success : colors.error;

    // ... existing state ...
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // SIDE EFFECT: Fetch categories
    useEffect(() => {
        const fetchCats = async () => {
            try {
                if (auth.currentUser) {
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
        const currentDate = selectedDate || tempDate;
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
            setDate(currentDate.toISOString().split('T')[0]);
        } else {
            setTempDate(currentDate);
        }
    };

    const openDatePicker = () => {
        const [y, m, d] = date.split('-').map(Number);
        setTempDate(new Date(y, m - 1, d));
        setShowDatePicker(true);
    };

    const confirmIOSDate = () => {
        setDate(tempDate.toISOString().split('T')[0]);
        setShowDatePicker(false);
    };

    const setToday = () => {
        setTempDate(new Date());
    };

    const handleSave = async () => {
        const rawAmount = parseMoney(amount);
        if (!rawAmount || isNaN(rawAmount)) {
            Alert.alert('Error', 'Invalid amount');
            return;
        }
        const numAmount = Math.round(rawAmount);
        setLoading(true);

        try {
            if (type === 'income') {
                await executeSave(numAmount);
            } else {
                const validation = await validateTransaction(profile.id, numAmount);
                if (validation.status !== 'ALLOWED') {
                    // Simple alert for now, can be custom modal later
                    Alert.alert(
                        validation.status === 'CRITICAL' ? 'Over Budget!' : 'Budget Warning',
                        validation.message,
                        [
                            { text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
                            { text: 'Save Anyway', style: 'destructive', onPress: () => executeSave(numAmount) }
                        ]
                    );
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
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color={colors.primaryText} />
                    </TouchableOpacity>

                    {/* Segmented Control */}
                    <View style={[styles.segmentContainer, { backgroundColor: colors.inputBackground }]}>
                        <TouchableOpacity
                            style={[styles.segment, type === 'expense' && { backgroundColor: colors.background, shadowOpacity: 0.1 }]}
                            onPress={() => setType('expense')}
                        >
                            <Text style={[styles.segmentText, { color: type === 'expense' ? colors.primaryText : colors.secondaryText }]}>Expense</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.segment, type === 'income' && { backgroundColor: colors.background, shadowOpacity: 0.1 }]}
                            onPress={() => setType('income')}
                        >
                            <Text style={[styles.segmentText, { color: type === 'income' ? colors.primaryText : colors.secondaryText }]}>Income</Text>
                        </TouchableOpacity>
                    </View>

                    {isEditing ? (
                        <TouchableOpacity onPress={handleDelete}>
                            <Ionicons name="trash-outline" size={24} color={colors.error} />
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 24 }} />
                    )}
                </View>

                {/* Main Content */}
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={styles.content}>

                        {/* HERO INPUT */}
                        <View style={styles.heroInputContainer}>
                            <Text style={[styles.currencySymbol, { color: activeColor }]}>₫</Text>
                            <TextInput
                                style={[styles.heroInput, { color: activeColor }]}
                                placeholder="0"
                                placeholderTextColor={colors.placeholderText}
                                keyboardType="numeric"
                                value={amount}
                                onChangeText={(text) => setAmount(formatMoney(text))}
                                autoFocus={!isEditing}
                            />
                        </View>

                        {/* Category Selector (Horizontal) */}
                        <View style={styles.inputSection}>
                            <Text style={[styles.label, { color: colors.secondaryText }]}>Category</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                                {filteredCategories.map((cat) => {
                                    const isSelected = category === cat.name;
                                    return (
                                        <TouchableOpacity
                                            key={cat.id}
                                            style={[
                                                styles.categoryChip,
                                                { backgroundColor: isSelected ? activeColor : colors.surface }
                                            ]}
                                            onPress={() => setCategory(cat.name)}
                                        >
                                            <Text style={{ fontSize: 16, marginRight: 6 }}>{cat.icon}</Text>
                                            <Text style={[
                                                styles.categoryText,
                                                { color: isSelected ? '#fff' : colors.primaryText } // Contrast text
                                            ]}>
                                                {cat.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        {/* Details Grid */}
                        <View style={styles.detailsRow}>
                            {/* DATE */}
                            <View style={{ flex: 1, marginRight: SPACING.m }}>
                                <Text style={[styles.label, { color: colors.secondaryText }]}>Date</Text>
                                <TouchableOpacity
                                    style={[styles.inputBox, { backgroundColor: colors.inputBackground }]}
                                    onPress={openDatePicker}
                                >
                                    <Text style={{ color: colors.primaryText }}>{date}</Text>
                                </TouchableOpacity>
                            </View>

                            {/* NOTE */}
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.label, { color: colors.secondaryText }]}>Note</Text>
                                <TextInput
                                    style={[styles.inputBox, { backgroundColor: colors.inputBackground, color: colors.primaryText }]}
                                    placeholder="Optional"
                                    placeholderTextColor={colors.placeholderText}
                                    value={note}
                                    onChangeText={setNote}
                                />
                            </View>
                        </View>

                    </View>

                    {/* Footer Action */}
                    <View style={[styles.footer, { borderTopColor: colors.divider }]}>
                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: activeColor }]}
                            onPress={handleSave}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.saveButtonText}>
                                    {isEditing ? 'Update Transaction' : 'Save Transaction'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Date Picker Handling */}
                    {showDatePicker && (
                        Platform.OS === 'ios' ? (
                            <Modal
                                transparent={true}
                                animationType="fade"
                                visible={showDatePicker}
                                onRequestClose={() => setShowDatePicker(false)}
                            >
                                <TouchableOpacity
                                    style={styles.modalOverlay}
                                    activeOpacity={1}
                                    onPress={() => setShowDatePicker(false)}
                                >
                                    <View style={[styles.datePickerModalContent, { backgroundColor: colors.cardBackground }]}>
                                        <View style={styles.datePickerHeader}>
                                            <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                                <Text style={[styles.headerBtnText, { color: colors.secondaryText }]}>Cancel</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={setToday}>
                                                <Text style={[styles.headerBtnText, { color: colors.primaryText, fontWeight: '600' }]}>Today</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={confirmIOSDate}>
                                                <Text style={[styles.headerBtnText, { color: colors.primaryAction, fontWeight: 'bold' }]}>OK</Text>
                                            </TouchableOpacity>
                                        </View>
                                        <DateTimePicker
                                            value={tempDate}
                                            mode="date"
                                            display="spinner"
                                            onChange={onDateChange}
                                            style={{ height: 200 }}
                                            themeVariant={theme}
                                            textColor={colors.primaryText} // Important for spinner visibility
                                            accentColor={colors.primaryAction}
                                        />
                                    </View>
                                </TouchableOpacity>
                            </Modal>
                        ) : (
                            <DateTimePicker
                                value={new Date(date)}
                                mode="date"
                                display="default"
                                onChange={onDateChange}
                            />
                        )
                    )}

                </KeyboardAvoidingView>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.screenPadding,
        paddingTop: SPACING.s,
        marginBottom: SPACING.l,
    },
    segmentContainer: {
        flexDirection: 'row',
        borderRadius: 8,
        padding: 4,
        flex: 1, // Take available space
        maxWidth: 200,
        marginHorizontal: SPACING.m,
    },
    segment: {
        flex: 1,
        paddingVertical: 6,
        alignItems: 'center',
        borderRadius: 6,
    },
    segmentText: {
        fontSize: TYPOGRAPHY.size.caption,
        fontWeight: TYPOGRAPHY.weight.medium,
    },
    content: {
        flex: 1,
        paddingHorizontal: SPACING.screenPadding,
    },
    heroInputContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        marginBottom: SPACING.xl,
        marginTop: SPACING.m,
    },
    currencySymbol: {
        fontSize: TYPOGRAPHY.size.h2,
        fontWeight: TYPOGRAPHY.weight.regular,
        marginRight: 4,
        marginTop: 8, // Align baseline roughly
    },
    heroInput: {
        fontSize: 48, // HUGE
        fontWeight: TYPOGRAPHY.weight.bold,
        minWidth: 100,
        textAlign: 'center',
    },
    inputSection: {
        marginBottom: SPACING.xl,
    },
    label: {
        fontSize: TYPOGRAPHY.size.caption,
        fontWeight: TYPOGRAPHY.weight.medium,
        marginBottom: SPACING.s,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    categoryScroll: {
        paddingRight: SPACING.screenPadding,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        marginRight: SPACING.s,
    },
    categoryText: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: TYPOGRAPHY.weight.medium,
    },
    detailsRow: {
        flexDirection: 'row',
        marginBottom: SPACING.xl,
    },
    inputBox: {
        paddingHorizontal: SPACING.m,
        height: 50, // Fixed height for consistency
        justifyContent: 'center',
        borderRadius: 12,
        fontSize: TYPOGRAPHY.size.body,
    },
    footer: {
        padding: SPACING.screenPadding,
        borderTopWidth: 1,
    },
    saveButton: {
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    saveButtonText: {
        color: 'white',
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: TYPOGRAPHY.weight.bold,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    datePickerModalContent: {
        width: '100%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 40,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    datePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#333',
        marginBottom: 8,
    },
    headerBtnText: {
        fontSize: 16,
    },
});
