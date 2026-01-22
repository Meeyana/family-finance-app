import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, DeviceEventEmitter, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../components/context/AuthContext';
import { getGoals, addGoal, getFamilyProfiles } from '../services/firestoreRepository';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import { formatMoney, parseMoney } from '../utils/formatting';
import CurrencyText from '../components/CurrencyText';
import { useTheme } from '../components/context/ThemeContext';
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

export default function GoalScreen({ navigation }) {
    const { user, profile } = useAuth();
    const { theme } = useTheme();
    const colors = COLORS[theme];

    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
    const [name, setName] = useState('');
    const [target, setTarget] = useState('');
    const [icon, setIcon] = useState('🎯');

    const [profiles, setProfiles] = useState([]);
    const [sharedWith, setSharedWith] = useState([]);
    const [creating, setCreating] = useState(false);

    useLayoutEffect(() => {
        navigation.setOptions({ headerShown: false });
    }, [navigation]);

    useEffect(() => {
        if (user && profile) {
            loadGoals();
            getFamilyProfiles(user.uid).then(setProfiles).catch(console.error);

            const refreshListener = DeviceEventEmitter.addListener('refresh_profile_dashboard', () => {
                console.log('🔄 GoalScreen: Refreshing goals...');
                loadGoals();
            });

            return () => {
                refreshListener.remove();
            };
        }
    }, [profile, user]);

    const loadGoals = async () => {
        try {
            setLoading(true);
            const data = await getGoals(user.uid, profile?.id);
            setGoals(data);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to load goals");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!name.trim()) {
            Alert.alert('Required', 'Please enter a goal name');
            return;
        }
        const numericTarget = parseMoney(target);
        if (!numericTarget || isNaN(numericTarget) || numericTarget <= 0) {
            Alert.alert('Required', 'Please enter a valid target amount');
            return;
        }

        try {
            setCreating(true);
            await addGoal(user.uid, {
                name: name.trim(),
                targetAmount: numericTarget,
                icon,
                ownerId: profile.id, // Private by default in this version
                sharedWith
            });
            DeviceEventEmitter.emit('refresh_profile_dashboard');
            setModalVisible(false);
            resetForm();
            loadGoals();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to create goal');
        } finally {
            setCreating(false);
        }
    };

    const resetForm = () => {
        setTarget('');
        setIcon('🎯');
        setSharedWith([]);
    };

    const renderItem = ({ item }) => {
        const percent = item.targetAmount > 0
            ? Math.min(100, (item.currentAmount / item.targetAmount) * 100)
            : 0;

        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.cardBackground }]}
                onPress={() => navigation.navigate('GoalDetail', { goal: item })}
            >
                <View style={styles.cardHeader}>
                    <View style={[styles.iconBox, { backgroundColor: colors.iconBackground }]}>
                        <Text style={{ fontSize: 24 }}>{item.icon || '🎯'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.goalName, { color: colors.primaryText }]}>{item.name}</Text>
                        <Text style={[styles.goalTarget, { color: colors.secondaryText }]}>
                            Target: <CurrencyText amount={item.targetAmount} style={{ color: colors.secondaryText }} />
                        </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <CurrencyText
                            amount={item.currentAmount}
                            style={[styles.currentAmount, { color: colors.primaryText }]}
                        />
                        <Text style={[styles.percentText, { color: colors.primaryAction }]}>
                            {percent.toFixed(0)}%
                        </Text>
                    </View>
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
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.divider }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.primaryText }]}>Savings Goals</Text>
                <TouchableOpacity onPress={() => setModalVisible(true)}>
                    <Ionicons name="add" size={28} color={colors.primaryAction} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={goals}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadGoals} tintColor={colors.primaryText} />}
                ListEmptyComponent={
                    !loading && (
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No goals yet. Start saving!</Text>
                        </View>
                    )
                }
            />

            {/* Create Goal Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setModalVisible(false)}
            >
                <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: colors.divider, backgroundColor: colors.background }]}>
                        <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="close" size={28} color={colors.primaryAction} />
                        </TouchableOpacity>
                        <Text style={[styles.modalTitle, { color: colors.primaryText }]}>New Goal</Text>
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
                                    style={[styles.iconPickerBtn, { borderColor: colors.primaryAction, backgroundColor: colors.inputBackground }]}
                                    onPress={() => setEmojiPickerVisible(true)}
                                >
                                    <Text style={{ fontSize: 40 }}>{icon}</Text>
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
                                    value={target}
                                    onChangeText={(text) => setTarget(formatMoney(text))}
                                    autoFocus={false}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.secondaryText }]}>GOAL NAME</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.primaryText, backgroundColor: colors.inputBackground }]}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="e.g. New Bike"
                                    placeholderTextColor={colors.secondaryText}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.secondaryText }]}>SHARE WITH (OPTIONAL)</Text>
                                <MultiSelectDropdown
                                    label="Select Family Members"
                                    options={profiles.filter(p => p.id !== profile.id).map(p => ({ id: p.id, name: p.name }))}
                                    selectedValues={sharedWith}
                                    onSelectionChange={setSharedWith}
                                    emptyLabel="Only Me (Private)"
                                />
                            </View>
                        </ScrollView>

                        {/* Footer CTA */}
                        <View style={[styles.footer, { borderTopColor: colors.divider }]}>
                            <TouchableOpacity
                                style={[styles.saveButton, { backgroundColor: colors.primaryAction, opacity: creating ? 0.7 : 1 }]}
                                onPress={handleCreate}
                                disabled={creating}
                            >
                                <Text style={styles.saveButtonText}>
                                    {creating ? 'Creating...' : 'Create Goal'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>

                    {/* Emoji Picker Modal */}
                    <Modal
                        visible={emojiPickerVisible}
                        transparent={true}
                        animationType="slide"
                        onRequestClose={() => setEmojiPickerVisible(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <TouchableWithoutFeedback onPress={() => setEmojiPickerVisible(false)}>
                                <View style={{ flex: 1 }} />
                            </TouchableWithoutFeedback>
                            <View style={[styles.emojiContent, { backgroundColor: colors.background }]}>
                                <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
                                    <Text style={[styles.modalTitle, { color: colors.primaryText }]}>Choose Icon</Text>
                                    <TouchableOpacity onPress={() => setEmojiPickerVisible(false)}>
                                        <Ionicons name="close" size={24} color={colors.primaryText} />
                                    </TouchableOpacity>
                                </View>
                                <ScrollView contentContainerStyle={styles.emojiGrid}>
                                    {COMMON_EMOJIS.map((e, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.emojiItem}
                                            onPress={() => {
                                                setIcon(e);
                                                setEmojiPickerVisible(false);
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
        </SafeAreaView>
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
        fontSize: TYPOGRAPHY.size.h3,
        fontWeight: TYPOGRAPHY.weight.bold,
    },
    list: {
        padding: SPACING.screenPadding,
    },
    card: {
        borderRadius: SPACING.cardBorderRadius,
        padding: SPACING.m,
        marginBottom: SPACING.m,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.m,
        gap: SPACING.m,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    goalName: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: TYPOGRAPHY.weight.bold,
    },
    goalTarget: {
        fontSize: TYPOGRAPHY.size.caption,
        marginTop: 2,
    },
    currentAmount: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: TYPOGRAPHY.weight.bold,
    },
    percentText: {
        fontSize: TYPOGRAPHY.size.small,
        fontWeight: TYPOGRAPHY.weight.semiBold,
        marginTop: 2,
    },
    progressTrack: {
        height: 8,
        borderRadius: 4,
        width: '100%',
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 4,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: SPACING.xl * 2,
    },
    emptyText: {
        fontSize: TYPOGRAPHY.size.body,
    },

    // Modal
    modalContainer: { flex: 1 },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.m,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: 'bold',
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
    input: {
        padding: 16,
        borderRadius: 12,
        fontSize: TYPOGRAPHY.size.body,
        letterSpacing: 0,
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
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
