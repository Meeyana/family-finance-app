import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator, Platform, DeviceEventEmitter, TouchableWithoutFeedback, Keyboard, useColorScheme, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../components/context/AuthContext';
import { getRecurring, addRecurring, deleteRecurring, updateRecurring, getFamilyCategories, checkAndProcessRecurring } from '../services/firestoreRepository';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import CurrencyText from '../components/CurrencyText';

export default function RecurringScreen({ navigation }) {
    const { user, profile } = useAuth();
    const theme = useColorScheme() || 'light';
    const colors = COLORS[theme];

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState('expense');
    const [unit, setUnit] = useState('MONTHLY');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [isForever, setIsForever] = useState(true);
    const [durationCount, setDurationCount] = useState('');
    const [editingItem, setEditingItem] = useState(null);

    // Dynamic Color
    const activeColor = type === 'income' ? colors.success : colors.error;

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
        setDescription('');
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
        setDescription(item.description || '');
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
                description,
                amount: Number(amount),
                type,
                frequency: unit,
                startDate,
                endDate,
                profileId: profile.id,
                category: selectedCategory.name,
                categoryData: selectedCategory
            };

            if (editingItem) {
                await updateRecurring(user.uid, editingItem.id, payload);
                Alert.alert('Success', 'Updated subscription');
            } else {
                await addRecurring(user.uid, payload);
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

    const renderItem = ({ item }) => {
        const isExpense = item.type === 'expense';
        return (
            <TouchableOpacity
                style={[styles.itemContainer, { borderBottomColor: colors.divider }]}
                onPress={() => handleEdit(item)}
                activeOpacity={0.7}
            >
                {/* Left: Icon & Info */}
                <View style={styles.itemLeft}>
                    <View style={[styles.iconBox, { backgroundColor: colors.surface }]}>
                        <Text style={{ fontSize: 20 }}>{item.categoryData?.icon || '📅'}</Text>
                    </View>
                    <View>
                        <Text style={[styles.itemName, { color: colors.primaryText }]}>{item.name}</Text>
                        <Text style={[styles.itemSub, { color: colors.secondaryText }]}>
                            {item.description ? item.description + ' • ' : ''}{item.frequency} • Next: {item.nextDueDate}
                        </Text>
                    </View>
                </View>

                {/* Right: Amount & Delete */}
                <View style={styles.itemRight}>
                    <CurrencyText
                        amount={isExpense ? -item.amount : item.amount}
                        showSign={true}
                        style={[styles.itemAmount, { color: isExpense ? colors.primaryText : colors.success }]}
                    />
                    {/* Hidden delete context or explicit? Minimalist list usually swipes. 
                         For now, no delete button to clutter. User taps to edit/delete. */}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
            <View style={[styles.header, { borderBottomColor: colors.divider }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.primaryText }]}>Subscriptions</Text>
                <TouchableOpacity onPress={() => { resetForm(); setModalVisible(true); }}>
                    <Ionicons name="add" size={28} color={colors.primaryAction} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={items}
                renderItem={renderItem}
                keyExtractor={i => i.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={!loading && <Text style={[styles.empty, { color: colors.secondaryText }]}>No subscriptions found.</Text>}
            />

            {/* Modal - Full Screen Style or Bottom Sheet Style */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setModalVisible(false)}
            >
                <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    {/* NEW HEADER: Close | Segment | Trash */}
                    <View style={[styles.modalHeader, { backgroundColor: colors.background, paddingVertical: SPACING.s }]}>
                        <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="close" size={28} color={colors.primaryText} />
                        </TouchableOpacity>

                        {/* Segmented Control Moved Here */}
                        <View style={[styles.segmentContainer, { backgroundColor: colors.surface, marginBottom: 0 }]}>
                            <TouchableOpacity
                                style={[styles.segmentBtn, type === 'expense' && { backgroundColor: colors.background, shadowOpacity: 0.1 }]}
                                onPress={() => setType('expense')}
                            >
                                <Text style={[styles.segmentText, { color: type === 'expense' ? colors.error : colors.secondaryText }]}>Expense</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.segmentBtn, type === 'income' && { backgroundColor: colors.background, shadowOpacity: 0.1 }]}
                                onPress={() => setType('income')}
                            >
                                <Text style={[styles.segmentText, { color: type === 'income' ? colors.success : colors.secondaryText }]}>Income</Text>
                            </TouchableOpacity>
                        </View>

                        {editingItem ? (
                            <TouchableOpacity onPress={() => handleDelete(editingItem.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Ionicons name="trash-outline" size={24} color={colors.error} />
                            </TouchableOpacity>
                        ) : (
                            <View style={{ width: 24 }} />
                        )}
                    </View>

                    <ScrollView
                        contentContainerStyle={styles.form}
                        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Type Switcher Removed from here */}

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.secondaryText }]}>NAME</Text>
                            <TextInput
                                style={[styles.input, { color: colors.primaryText, backgroundColor: colors.surface }]}
                                value={name}
                                onChangeText={setName}
                                placeholder="e.g. Netflix"
                                placeholderTextColor={colors.secondaryText}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.secondaryText }]}>DESCRIPTION</Text>
                            <TextInput
                                style={[styles.input, { color: colors.primaryText, backgroundColor: colors.surface }]}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Optional description..."
                                placeholderTextColor={colors.secondaryText}
                            />
                        </View>

                        {/* HERO AMOUNT INPUT */}
                        <View style={styles.heroInputContainer}>
                            <Text style={[styles.currencySymbol, { color: activeColor }]}>₫</Text>
                            <TextInput
                                style={[styles.heroInput, { color: activeColor }]}
                                placeholder="0"
                                placeholderTextColor={colors.divider}
                                keyboardType="numeric"
                                value={amount}
                                onChangeText={setAmount}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.secondaryText }]}>CATEGORY</Text>
                            <FlatList
                                data={categories.filter(c => (c.type || 'expense') === type)}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={{ marginHorizontal: -16 }}
                                contentContainerStyle={{ paddingHorizontal: 16 }}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.catChip,
                                            { borderColor: selectedCategory?.id === item.id ? activeColor : colors.divider, backgroundColor: colors.surface }
                                        ]}
                                        onPress={() => setSelectedCategory(item)}>
                                        <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                                        <Text style={[styles.catName, { color: selectedCategory?.id === item.id ? activeColor : colors.primaryText }]}>{item.name}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.secondaryText }]}>REPEAT</Text>
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                {['MONTHLY', 'YEARLY'].map(opt => (
                                    <TouchableOpacity
                                        key={opt}
                                        style={[styles.freqChip, unit === opt && { backgroundColor: colors.primaryAction }]}
                                        onPress={() => setUnit(opt)}
                                    >
                                        <Text style={[styles.freqText, { color: unit === opt ? colors.background : colors.secondaryText }]}>{opt}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.secondaryText }]}>DURATION</Text>

                            <View style={[styles.segmentContainer, { backgroundColor: colors.surface, marginBottom: 12 }]}>
                                <TouchableOpacity
                                    style={[styles.segmentBtn, isForever && { backgroundColor: colors.background, shadowOpacity: 0.1 }]}
                                    onPress={() => setIsForever(true)}
                                >
                                    <Text style={[styles.segmentText, { color: isForever ? colors.primaryText : colors.secondaryText }]}>Forever</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.segmentBtn, !isForever && { backgroundColor: colors.background, shadowOpacity: 0.1 }]}
                                    onPress={() => setIsForever(false)}
                                >
                                    <Text style={[styles.segmentText, { color: !isForever ? colors.primaryText : colors.secondaryText }]}>Fixed</Text>
                                </TouchableOpacity>
                            </View>

                            {!isForever && (
                                <TextInput
                                    style={[styles.input, { color: colors.primaryText, backgroundColor: colors.surface }]}
                                    value={durationCount}
                                    onChangeText={setDurationCount}
                                    placeholder={`Number of ${unit === 'MONTHLY' ? 'Months' : 'Years'}`}
                                    keyboardType="numeric"
                                    placeholderTextColor={colors.secondaryText}
                                />
                            )}
                        </View>

                        {/* Delete Button Removed from here */}

                    </ScrollView>

                    {/* FOOTER CTA */}
                    <View style={[styles.footer, { borderTopColor: colors.divider }]}>
                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: activeColor }]}
                            onPress={handleSave}
                        >
                            <Text style={styles.saveButtonText}>
                                {editingItem ? 'Update Subscription' : 'Save Subscription'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                </SafeAreaView>
            </Modal>
        </SafeAreaView >
    );

}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.screenPadding,
        paddingVertical: SPACING.m,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.size.h2,
        fontWeight: TYPOGRAPHY.weight.bold,
    },
    list: {
        // No padding needed for flat list items usually, internal padding
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.m,
        paddingHorizontal: SPACING.screenPadding,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.m,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemName: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: TYPOGRAPHY.weight.medium,
    },
    itemSub: {
        fontSize: TYPOGRAPHY.size.caption,
        marginTop: 2,
    },
    itemAmount: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: TYPOGRAPHY.weight.semiBold,
        textAlign: 'right',
    },
    empty: {
        textAlign: 'center',
        marginTop: 60,
    },

    // Modal
    modalContainer: { flex: 1 },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.screenPadding,
        paddingVertical: SPACING.m,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: TYPOGRAPHY.weight.bold,
    },
    closeText: { fontSize: TYPOGRAPHY.size.body },
    saveTextTop: { fontSize: TYPOGRAPHY.size.body, fontWeight: 'bold' },
    form: { padding: SPACING.screenPadding },

    segmentContainer: {
        flexDirection: 'row',
        borderRadius: 8,
        padding: 4,
        flex: 1,
        maxWidth: 200,
        marginHorizontal: SPACING.m,
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 6,
        alignItems: 'center',
        borderRadius: 6,
    },
    segmentText: {
        fontSize: TYPOGRAPHY.size.caption,
        fontWeight: '600',
    },

    inputGroup: { marginBottom: SPACING.l },
    label: {
        fontSize: TYPOGRAPHY.size.small,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        padding: 12,
        borderRadius: 8,
        fontSize: TYPOGRAPHY.size.body,
        letterSpacing: 0, // Explicitly set to 0 for iOS placeholder fix
    },
    catChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
        gap: 6,
    },
    catName: {
        fontSize: TYPOGRAPHY.size.caption,
        fontWeight: '500',
    },
    freqChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#eee', // fallback
    },
    freqText: { fontSize: TYPOGRAPHY.size.caption, fontWeight: '600' },
    deleteButton: {
        alignItems: 'center',
        padding: 16,
        borderWidth: 1,
        borderRadius: 12,
        marginBottom: 40,
        marginTop: 20,
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
    heroInputContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        marginBottom: SPACING.l,
        marginTop: SPACING.s,
    },
    currencySymbol: {
        fontSize: TYPOGRAPHY.size.h2,
        fontWeight: TYPOGRAPHY.weight.regular,
        marginRight: 4,
        marginTop: 8,
    },
    heroInput: {
        fontSize: 48,
        fontWeight: TYPOGRAPHY.weight.bold,
        minWidth: 100,
        textAlign: 'center',
    },
});
