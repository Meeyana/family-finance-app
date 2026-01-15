import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, Modal, KeyboardAvoidingView, Platform, FlatList, DeviceEventEmitter, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../components/context/AuthContext';
import { getTransactions, contributeToGoal, withdrawFromGoal, getFamilyProfiles, updateGoal, deleteGoal, getGoal, updateTransaction } from '../services/firestoreRepository';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import { formatMoney, parseMoney } from '../utils/formatting';
import CurrencyText from '../components/CurrencyText';
import { useColorScheme } from 'react-native';

const COMMON_EMOJIS = [
    '💰', '💵', '💳', '🏦', '🪙', '🧧',
    '🏡', '🚗', '✈️', '💍', '💻', '🚲',
    '👶', '🎓', '🎁', '🐶', '🐱', '🏥',
    '🍔', '🍕', '🍣', '🍱', '🍜', '☕',
    '👕', '👗', '👟', '💊', '💇', '💅',
    '🎬', '🎮', '🎫', '🎵', '🎲', '📚',
    '🎯', '🏆', '⭐', '🔥', '💧', '⚡'
];

export default function GoalDetailScreen({ navigation, route }) {
    const { goal } = route.params; // Initial goal data
    const { user, profile } = useAuth();
    const theme = useColorScheme() || 'light';
    const colors = COLORS[theme];

    const [currentGoal, setCurrentGoal] = useState(goal);
    const [transactions, setTransactions] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [actionType, setActionType] = useState('deposit'); // 'deposit' or 'withdraw'
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // Edit Modal State
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editEmojiPickerVisible, setEditEmojiPickerVisible] = useState(false);
    const [editName, setEditName] = useState('');
    const [editTarget, setEditTarget] = useState('');
    const [editIcon, setEditIcon] = useState('🎯');
    const [editSharedWith, setEditSharedWith] = useState([]);
    const [updating, setUpdating] = useState(false);

    // Transaction Edit Modal
    const [txEditModalVisible, setTxEditModalVisible] = useState(false);
    const [editingTx, setEditingTx] = useState(null);
    const [editTxAmount, setEditTxAmount] = useState('');

    useLayoutEffect(() => {
        navigation.setOptions({ headerShown: false });
    }, [navigation]);

    useEffect(() => {
        if (user && profile) {
            loadHistory();
            getFamilyProfiles(user.uid).then(setProfiles).catch(console.error);
        }
    }, [profile, user]);

    const loadHistory = async () => {
        if (!process?.id && !profile?.id) return;
        try {
            setLoading(true);
            const [allTxs, refreshedGoal] = await Promise.all([
                getTransactions(user.uid, null),
                getGoal(user.uid, goal.id)
            ]);

            // Update Goal State with fresh data
            if (refreshedGoal) {
                setCurrentGoal(refreshedGoal);
            }

            // Filter client side for this goal
            const goalTxs = allTxs.filter(t => t.goalId === goal.id);
            setTransactions(goalTxs);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = (type) => {
        setActionType(type);
        setAmount('');
        setNote('');
        setModalVisible(true);
    };

    const submitAction = async () => {
        const numericAmount = parseMoney(amount);
        if (!numericAmount || isNaN(numericAmount) || numericAmount <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid positive amount');
            return;
        }

        try {
            setActionLoading(true);
            const val = numericAmount;

            if (actionType === 'deposit') {
                await contributeToGoal(user.uid, goal.id, val, note, profile.id, currentGoal.name);
                // Optimistic update
                setCurrentGoal(prev => ({ ...prev, currentAmount: prev.currentAmount + val }));
            } else {
                if (val > currentGoal.currentAmount) {
                    Alert.alert('Error', 'Insufficient funds in goal');
                    setActionLoading(false);
                    return;
                }
                await withdrawFromGoal(user.uid, goal.id, val, note, profile.id, currentGoal.name);
                // Optimistic update
                setCurrentGoal(prev => ({ ...prev, currentAmount: prev.currentAmount - val }));
            }
            DeviceEventEmitter.emit('refresh_profile_dashboard');
            setModalVisible(false);
            loadHistory(); // Reload history to see new item
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Transaction failed');
        } finally {
            setActionLoading(false);
        }
    };

    // --- Edit / Delete Logic ---
    const handleMenuPress = () => {
        handleEdit();
    };

    const handleEdit = () => {
        setEditName(currentGoal.name);
        setEditTarget(formatMoney(currentGoal.targetAmount));
        setEditIcon(currentGoal.icon || '🎯');
        setEditSharedWith(currentGoal.sharedWith || []);
        setEditModalVisible(true);
    };

    const submitEdit = async () => {
        if (!editName.trim()) {
            Alert.alert('Required', 'Goal name is required');
            return;
        }
        const numericTarget = parseMoney(editTarget);
        if (!numericTarget || isNaN(numericTarget) || numericTarget <= 0) {
            Alert.alert('Required', 'Valid target amount is required');
            return;
        }

        try {
            setUpdating(true);
            const updatedData = {
                name: editName.trim(),
                targetAmount: numericTarget,
                icon: editIcon,
                sharedWith: editSharedWith
            };

            await updateGoal(user.uid, goal.id, updatedData);

            setCurrentGoal(prev => ({ ...prev, ...updatedData }));
            DeviceEventEmitter.emit('refresh_profile_dashboard');
            setEditModalVisible(false);
            Alert.alert('Success', 'Goal updated successfully');
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to update goal');
        } finally {
            setUpdating(false);
        }
    };

    const confirmDelete = () => {
        Alert.alert(
            'Delete Goal?',
            'This action cannot be undone. All contribution history will remain but the goal itself will be removed.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: handleDelete }
            ]
        );
    };

    const handleDelete = async () => {
        try {
            setLoading(true);
            await deleteGoal(user.uid, goal.id);
            DeviceEventEmitter.emit('refresh_profile_dashboard');
            navigation.goBack();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to delete goal');
            setLoading(false);
        }
    };

    // --- Transaction Edit Logic ---
    const handleEditTx = (tx) => {
        setEditingTx(tx);
        setEditTxAmount(formatMoney(tx.amount));
        setTxEditModalVisible(true);
    };

    const submitTxEdit = async () => {
        const numericAmount = parseMoney(editTxAmount);
        if (!numericAmount || isNaN(numericAmount) || numericAmount <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount');
            return;
        }

        try {
            setUpdating(true);
            const newAmount = numericAmount;

            // Call generic updateTransaction (which now handles goal updates)
            await updateTransaction(user.uid, editingTx.id, editingTx, {
                ...editingTx,
                amount: newAmount
            });

            DeviceEventEmitter.emit('refresh_profile_dashboard');
            setTxEditModalVisible(false);
            loadHistory(); // Reload to see updated goal total
            Alert.alert('Success', 'Transaction updated');
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to update transaction');
        } finally {
            setUpdating(false);
        }
    };

    const renderHeader = () => {
        const percent = currentGoal.targetAmount > 0
            ? Math.min(100, (currentGoal.currentAmount / currentGoal.targetAmount) * 100)
            : 0;

        // Calculate Contributions
        const contributions = {};
        transactions.forEach(t => {
            const pid = t.profileId;
            // Expense = Deposit into goal, Income = Withdraw from goal
            const val = t.type === 'expense' ? t.amount : -t.amount;
            contributions[pid] = (contributions[pid] || 0) + val;
        });

        const totalContributed = Object.values(contributions).reduce((a, b) => a + b, 0);

        return (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
                {/* ... existing header ... */}
                <View style={{ alignItems: 'center', marginBottom: SPACING.l }}>
                    <View style={[styles.bigIcon, { backgroundColor: colors.background }]}>
                        <Text style={{ fontSize: 40 }}>{currentGoal.icon || '🎯'}</Text>
                    </View>
                    <Text style={[styles.title, { color: colors.primaryText }]}>{currentGoal.name}</Text>
                    <CurrencyText
                        amount={currentGoal.currentAmount}
                        style={[styles.bigAmount, { color: colors.primaryText }]}
                    />
                    <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
                        of <CurrencyText amount={currentGoal.targetAmount} /> goal
                    </Text>
                </View>

                {/* Progress Bar */}
                <View style={[styles.progressTrack, { backgroundColor: colors.background }]}>
                    <View
                        style={[
                            styles.progressBar,
                            {
                                width: `${percent}%`,
                                backgroundColor: percent >= 100 ? colors.success : colors.primaryAction
                            }
                        ]}
                    />
                </View>
                <Text style={[styles.percentLabel, { color: colors.secondaryText }]}>{percent.toFixed(0)}% Complete</Text>

                {/* Contributors Section */}
                {Object.keys(contributions).length > 0 && (
                    <View style={{ marginTop: SPACING.l, paddingTop: SPACING.l, borderTopWidth: 1, borderTopColor: colors.divider }}>
                        <Text style={[styles.sectionTitle, { color: colors.secondaryText, marginBottom: SPACING.s }]}>CONTRIBUTIONS</Text>
                        {Object.entries(contributions).map(([pid, amount]) => {
                            const pName = profiles.find(p => p.id === pid)?.name || 'Unknown';
                            const share = totalContributed > 0 ? (amount / totalContributed) * 100 : 0;
                            return (
                                <View key={pid} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <Text style={{ color: colors.primaryText }}>{pName}</Text>
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <Text style={{ color: colors.secondaryText }}>{share.toFixed(0)}%</Text>
                                        <CurrencyText amount={amount} style={{ color: colors.primaryText, fontWeight: '600' }} />
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Actions */}
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.primaryAction }]}
                        onPress={() => handleAction('deposit')}
                    >
                        <Ionicons name="add" size={24} color={'white'} />
                        <Text style={styles.actionText}>Add Money</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.divider }]}
                        onPress={() => handleAction('withdraw')}
                    >
                        <Ionicons name="remove" size={24} color={colors.primaryText} />
                        <Text style={[styles.actionText, { color: colors.primaryText }]}>Withdraw</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderTxItem = ({ item }) => {
        const profileName = profiles.find(p => p.id === item.profileId)?.name || 'Unknown';
        const isOwner = currentGoal.ownerId === profile.id;

        return (
            <TouchableOpacity
                style={[styles.txItem, { borderBottomColor: colors.divider }]}
                onPress={() => {
                    if (isOwner) {
                        handleEditTx(item);
                    } else {
                        Alert.alert('Permission Denied', 'Only the goal creator can edit transactions.');
                    }
                }}
            >
                <View style={[styles.txIcon, { backgroundColor: item.type === 'expense' ? colors.success + '20' : colors.error + '20' }]}>
                    <Ionicons
                        name={item.type === 'expense' ? 'arrow-down' : 'arrow-up'}
                        size={20}
                        color={item.type === 'expense' ? colors.success : colors.error}
                    />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.txTitle, { color: colors.primaryText }]}>
                        {item.type === 'expense' ? 'Deposit' : 'Withdrawal'}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.secondaryText, marginTop: 2 }}>
                        by {profileName} • {item.date}
                    </Text>
                </View>
                <CurrencyText
                    amount={item.type === 'expense' ? item.amount : -item.amount}
                    style={[
                        styles.txAmount,
                        { color: item.type === 'expense' ? colors.success : colors.primaryText }
                    ]}
                    showSign
                />
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.navHeader, { borderBottomColor: colors.divider }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
                </TouchableOpacity>
                {currentGoal.ownerId === profile.id && (
                    <TouchableOpacity onPress={handleMenuPress}>
                        <Ionicons name="ellipsis-horizontal" size={24} color={colors.primaryText} />
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={transactions}
                renderItem={renderTxItem}
                keyExtractor={i => i.id}
                ListHeaderComponent={() => (
                    <>
                        {renderHeader()}
                        <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>History</Text>
                    </>
                )}
                contentContainerStyle={styles.content}
            />

            {/* Action Modal */}
            <Modal
                transparent
                visible={modalVisible}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.modalTitle, { color: colors.primaryText }]}>
                            {actionType === 'deposit' ? 'Add to Goal' : 'Withdraw from Goal'}
                        </Text>
                        <Text style={[styles.modalSub, { color: colors.secondaryText }]}>
                            {actionType === 'deposit' ? 'Transfer from wallet to this goal' : 'Return money to wallet'}
                        </Text>

                        <TextInput
                            style={[styles.input, { color: colors.primaryText, backgroundColor: colors.background }]}
                            placeholder="Amount"
                            placeholderTextColor={colors.secondaryText}
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={(text) => setAmount(formatMoney(text))}
                            autoFocus
                        />
                        <TextInput
                            style={[styles.input, { color: colors.primaryText, backgroundColor: colors.background, marginTop: 12 }]}
                            placeholder="Note (Optional)"
                            placeholderTextColor={colors.secondaryText}
                            value={note}
                            onChangeText={setNote}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={{ padding: 16 }} onPress={() => setModalVisible(false)}>
                                <Text style={{ color: colors.secondaryText, fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmBtn, { backgroundColor: colors.primaryAction }]}
                                onPress={submitAction}
                                disabled={actionLoading}
                            >
                                <Text style={{ color: 'white', fontWeight: 'bold' }}>
                                    {actionLoading ? 'Processing...' : 'Confirm'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Edit Goal Modal */}
            <Modal
                visible={editModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setEditModalVisible(false)}
            >
                <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: colors.divider, backgroundColor: colors.background }]}>
                        <TouchableOpacity onPress={() => setEditModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Text style={{ color: colors.primaryAction, fontSize: 17 }}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={[styles.modalTitle, { color: colors.primaryText }]}>Edit Goal</Text>
                        <View style={{ width: 50 }} />
                    </View>

                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{ flex: 1 }}
                    >
                        <ScrollView contentContainerStyle={styles.form}>
                            {/* Icon Picker (Round) */}
                            <View style={{ alignItems: 'center', marginVertical: SPACING.m }}>
                                <TouchableOpacity
                                    style={[styles.iconPickerBtn, { borderColor: colors.primaryAction, backgroundColor: colors.surface }]}
                                    onPress={() => setEditEmojiPickerVisible(true)}
                                >
                                    <Text style={{ fontSize: 40 }}>{editIcon}</Text>
                                </TouchableOpacity>
                                <Text style={[styles.itemSub, { marginTop: 8, color: colors.secondaryText }]}>Tap to change icon</Text>
                            </View>

                            {/* Hero Input for Target Amount */}
                            <View style={styles.heroInputContainer}>
                                <Text style={[styles.currencySymbol, { color: colors.primaryAction }]}>₫</Text>
                                <TextInput
                                    style={[styles.heroInput, { color: colors.primaryAction }]}
                                    placeholder="0"
                                    placeholderTextColor={colors.divider}
                                    keyboardType="numeric"
                                    value={editTarget}
                                    onChangeText={(text) => setEditTarget(formatMoney(text))}
                                    autoFocus={false}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.secondaryText }]}>GOAL NAME</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.primaryText, backgroundColor: colors.surface }]}
                                    value={editName}
                                    onChangeText={setEditName}
                                    placeholderTextColor={colors.secondaryText}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.secondaryText }]}>SHARE WITH (OPTIONAL)</Text>
                                <MultiSelectDropdown
                                    label="Select Family Members"
                                    options={profiles.filter(p => p.id !== profile.id).map(p => ({ id: p.id, name: p.name }))}
                                    selectedValues={editSharedWith}
                                    onSelectionChange={setEditSharedWith}
                                    emptyLabel="Only Me (Private)"
                                />
                            </View>

                            <TouchableOpacity
                                style={{
                                    marginTop: 20,
                                    padding: 16,
                                    backgroundColor: colors.error + '15',
                                    borderRadius: 12,
                                    alignItems: 'center',
                                    borderWidth: 1,
                                    borderColor: colors.error + '50'
                                }}
                                onPress={confirmDelete}
                            >
                                <Text style={{ color: colors.error, fontWeight: 'bold', fontSize: 16 }}>Delete Goal</Text>
                            </TouchableOpacity>
                        </ScrollView>

                        {/* Footer CTA */}
                        <View style={[styles.footer, { borderTopColor: colors.divider }]}>
                            <TouchableOpacity
                                style={[styles.saveButton, { backgroundColor: colors.primaryAction, opacity: updating ? 0.7 : 1 }]}
                                onPress={submitEdit}
                                disabled={updating}
                            >
                                <Text style={styles.saveButtonText}>
                                    {updating ? 'Saving...' : 'Save Changes'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>

                    {/* Emoji Picker Modal */}
                    <Modal
                        visible={editEmojiPickerVisible}
                        transparent={true}
                        animationType="slide"
                        onRequestClose={() => setEditEmojiPickerVisible(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <TouchableWithoutFeedback onPress={() => setEditEmojiPickerVisible(false)}>
                                <View style={{ flex: 1 }} />
                            </TouchableWithoutFeedback>
                            <View style={[styles.emojiContent, { backgroundColor: colors.background }]}>
                                <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
                                    <Text style={[styles.modalTitle, { color: colors.primaryText }]}>Choose Icon</Text>
                                    <TouchableOpacity onPress={() => setEditEmojiPickerVisible(false)}>
                                        <Ionicons name="close" size={24} color={colors.primaryText} />
                                    </TouchableOpacity>
                                </View>
                                <ScrollView contentContainerStyle={styles.emojiGrid}>
                                    {COMMON_EMOJIS.map((e, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.emojiItem}
                                            onPress={() => {
                                                setEditIcon(e);
                                                setEditEmojiPickerVisible(false);
                                            }}
                                        >
                                            <Text style={{ fontSize: 32 }}>{e}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>
                    </Modal>
                </SafeAreaView>
            </Modal>

            {/* Edit Transaction Modal */}
            <Modal
                visible={txEditModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setTxEditModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.modalTitle, { color: colors.primaryText }]}>Edit Transaction</Text>
                        <Text style={[styles.modalSub, { color: colors.secondaryText }]}>Update the amount</Text>

                        <TextInput
                            style={[styles.input, { color: colors.primaryText, backgroundColor: colors.background }]}
                            placeholder="Amount"
                            placeholderTextColor={colors.secondaryText}
                            keyboardType="numeric"
                            value={editTxAmount}
                            onChangeText={(text) => setEditTxAmount(formatMoney(text))}
                            autoFocus
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={{ padding: 16 }} onPress={() => setTxEditModalVisible(false)}>
                                <Text style={{ color: colors.secondaryText, fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmBtn, { backgroundColor: colors.primaryAction }]}
                                onPress={submitTxEdit}
                                disabled={updating}
                            >
                                <Text style={{ color: 'white', fontWeight: 'bold' }}>
                                    {updating ? 'Saving...' : 'Save'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    navHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.screenPadding,
        paddingVertical: SPACING.m,
    },
    content: {
        padding: SPACING.screenPadding,
    },
    card: {
        padding: SPACING.l,
        borderRadius: SPACING.cardBorderRadius * 1.5,
        marginBottom: SPACING.xl,
    },
    bigIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.m,
    },
    title: {
        fontSize: TYPOGRAPHY.size.h3,
        fontWeight: TYPOGRAPHY.weight.bold,
        marginBottom: 4,
    },
    bigAmount: {
        fontSize: 32,
        fontWeight: TYPOGRAPHY.weight.bold,
        marginVertical: 4,
    },
    subtitle: {
        fontSize: TYPOGRAPHY.size.body,
    },
    progressTrack: {
        height: 10,
        borderRadius: 5,
        width: '100%',
        overflow: 'hidden',
        marginTop: SPACING.m,
    },
    progressBar: {
        height: '100%',
        borderRadius: 5,
    },
    percentLabel: {
        textAlign: 'right',
        marginTop: 8,
        fontSize: TYPOGRAPHY.size.small,
        fontWeight: '600',
    },
    actionRow: {
        flexDirection: 'row',
        gap: SPACING.m,
        marginTop: SPACING.xl,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    actionText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: TYPOGRAPHY.size.body,
    },
    sectionTitle: {
        fontSize: TYPOGRAPHY.size.small,
        fontWeight: '600',
        uppercase: 'uppercase',
        marginBottom: SPACING.m,
        letterSpacing: 1,
    },
    txItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.m,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: SPACING.m,
    },
    txIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    txTitle: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: '600',
    },
    txDate: {
        fontSize: TYPOGRAPHY.size.small,
    },
    txAmount: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: SPACING.xl,
    },
    modalContent: {
        borderRadius: 20,
        padding: SPACING.l,
    },
    modalTitle: {
        fontSize: TYPOGRAPHY.size.h3,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    modalSub: {
        fontSize: TYPOGRAPHY.size.body,
        textAlign: 'center',
        marginTop: 4,
        marginBottom: SPACING.l,
    },
    input: {
        padding: 16,
        borderRadius: 12,
        fontSize: 18,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: SPACING.l,
        gap: SPACING.m,
    },
    confirmBtn: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
    },

    // Edit Modal Styles
    modalContainer: { flex: 1 },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.m,
        borderBottomWidth: 1,
    },
    form: {
        padding: SPACING.screenPadding,
    },
    inputGroup: {
        marginBottom: SPACING.l,
    },
    label: {
        fontSize: TYPOGRAPHY.size.caption,
        fontWeight: '600',
        marginBottom: 8,
    },
    itemSub: {
        fontSize: TYPOGRAPHY.size.caption,
    },

    // Icon Picker
    iconPickerBtn: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
    emojiRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: SPACING.l,
        justifyContent: 'center',
    },
    emojiBtn: {
        padding: 10,
        borderRadius: 24,
    },

    // Hero Input
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
        marginTop: 8,
    },
    heroInput: {
        fontSize: 48,
        fontWeight: TYPOGRAPHY.weight.bold,
        minWidth: 100,
        textAlign: 'center',
    },

    // Footer
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

    // Emoji Modal
    emojiContent: {
        height: '50%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    emojiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        padding: 16,
    },
    emojiItem: {
        padding: 10,
    },
});
