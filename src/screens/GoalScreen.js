import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, DeviceEventEmitter } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../components/context/AuthContext';
import { getGoals, addGoal, getFamilyProfiles } from '../services/firestoreRepository';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import CurrencyText from '../components/CurrencyText';
import { useColorScheme } from 'react-native';

const COMMON_EMOJIS = ['🎯', '🏡', '🚗', '✈️', '🎓', '💍', '💻', '🚲', '🐶', '👶', '🏥', '💰'];

export default function GoalScreen({ navigation }) {
    const { user, profile } = useAuth();
    const theme = useColorScheme() || 'light';
    const colors = COLORS[theme];

    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
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
        if (!target || isNaN(target) || Number(target) <= 0) {
            Alert.alert('Required', 'Please enter a valid target amount');
            return;
        }

        try {
            setCreating(true);
            await addGoal(user.uid, {
                name: name.trim(),
                targetAmount: Number(target),
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
                style={[styles.card, { backgroundColor: colors.surface }]}
                onPress={() => navigation.navigate('GoalDetail', { goal: item })}
            >
                <View style={styles.cardHeader}>
                    <View style={[styles.iconBox, { backgroundColor: colors.background }]}>
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
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Text style={{ color: colors.primaryAction, fontSize: 17 }}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={[styles.modalTitle, { color: colors.primaryText }]}>New Goal</Text>
                        <TouchableOpacity onPress={handleCreate} disabled={creating}>
                            <Text style={{ color: creating ? colors.secondaryText : colors.primaryAction, fontWeight: 'bold', fontSize: 17 }}>Create</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.form}>
                        {/* Icon Picker */}
                        <View style={styles.emojiRow}>
                            {COMMON_EMOJIS.map(e => (
                                <TouchableOpacity
                                    key={e}
                                    style={[styles.emojiBtn, icon === e && { backgroundColor: colors.surface, borderColor: colors.primaryAction, borderWidth: 1 }]}
                                    onPress={() => setIcon(e)}
                                >
                                    <Text style={{ fontSize: 28 }}>{e}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.secondaryText }]}>GOAL NAME</Text>
                            <TextInput
                                style={[styles.input, { color: colors.primaryText, backgroundColor: colors.surface }]}
                                value={name}
                                onChangeText={setName}
                                placeholder="e.g. New Bike"
                                placeholderTextColor={colors.secondaryText}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.secondaryText }]}>TARGET AMOUNT</Text>
                            <TextInput
                                style={[styles.input, { color: colors.primaryText, backgroundColor: colors.surface }]}
                                value={target}
                                onChangeText={setTarget}
                                placeholder="0"
                                placeholderTextColor={colors.secondaryText}
                                keyboardType="numeric"
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
                </View>
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
        fontSize: TYPOGRAPHY.size.h3,
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
});
