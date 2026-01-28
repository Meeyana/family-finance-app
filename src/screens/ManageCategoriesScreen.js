import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Alert, ActivityIndicator, Modal, ScrollView, Switch, TouchableWithoutFeedback, Keyboard, useColorScheme, Platform, DeviceEventEmitter } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { auth } from '../services/firebase';
import { getFamilyCategories, addCategory, deleteCategory, updateCategory } from '../services/firestoreRepository';
import { useAuth } from '../components/context/AuthContext';
import { useTheme } from '../components/context/ThemeContext';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';

// Common Emojis grouped by usage
const COMMON_EMOJIS = [
    '💰', '💵', '💳', '🏦', '🪙', '🧧',
    '🍔', '🍕', '🍣', '🍱', '🍜', '☕', '🍺', '🍷', '🍎', '🥕', '🥖', '🛒',
    '🚗', '🚕', '🚌', '🚆', '✈️', '⛽', '🅿️', '⚓',
    '🏠', '💡', '💧', '⚡', '🛜', '📺', '🛋️', '🧹',
    '👕', '👗', '👟', '💊', '🏥', '💇', '💅', '🏋️',
    '🎬', '🎮', '🎫', '🎵', '🎲', '📚',
    '👶', '🎓', '🎁', '🐶', '🐱', '🏫',
    '🏷️', '🔒', '🔧', '⚙️', '📝', '📅'
];

export default function ManageCategoriesScreen({ navigation, route }) {
    const { profile, userProfiles } = useAuth();
    const { theme } = useTheme();
    const colors = COLORS[theme];

    // Role Check
    const strRole = profile?.role?.toLowerCase() || '';
    const isAdmin = strRole === 'owner' || strRole === 'partner';

    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryIcon, setNewCategoryIcon] = useState('🏷️');
    const [sharedWith, setSharedWith] = useState([]);
    const [selectedType, setSelectedType] = useState('expense');

    // Modal Form Type
    const [formType, setFormType] = useState('expense');

    const [editingCategory, setEditingCategory] = useState(null);

    // Quick Add Mode: Init from params to avoid flash
    const initialOpen = route.params?.openAddModal || false;
    const [isQuickAdd, setIsQuickAdd] = useState(initialOpen);
    const [modalVisible, setModalVisible] = useState(initialOpen);

    const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);

    // Dynamic Color
    const activeColor = selectedType === 'income' ? colors.success : colors.error;
    const formActiveColor = formType === 'income' ? colors.success : colors.error;

    useLayoutEffect(() => {
        navigation.setOptions({ headerShown: false });
    }, [navigation]);

    useEffect(() => {
        if (profile) loadCategories();
    }, [profile]);

    useEffect(() => {
        if (route.params?.openAddModal) {
            // Already handled by initial state, just clear param to prevent re-trigger
            navigation.setParams({ openAddModal: undefined });
        }
    }, [route.params?.openAddModal]);

    const loadCategories = async () => {
        try {
            setLoading(true);
            if (auth.currentUser && profile) {
                const cats = await getFamilyCategories(auth.currentUser.uid, profile.id, profile.role);
                setCategories(cats);
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load categories');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setNewCategoryName('');
        setNewCategoryIcon('🏷️');
        setSharedWith(['ALL']); // Default share with everyone
        setEditingCategory(null);
        setFormType(selectedType); // Default to current list type
    };

    const handleAdd = () => {
        if (!isAdmin) {
            if (Platform.OS === 'web') {
                window.alert('Permission Denied\nPlease contact the admin (owner) to add new category.');
            } else {
                Alert.alert('Permission Denied', 'Please contact the admin (owner) to add new category.');
            }
            return;
        }
        resetForm();
        setModalVisible(true);
    };

    const handleEdit = (category) => {
        if (!isAdmin) return; // Guard for non-admins

        setNewCategoryName(category.name);
        setNewCategoryIcon(category.icon);
        setFormType(category.type || 'expense');

        let initialShared = category.sharedWith || [];
        if (!category.sharedWith && (category.isShared === true || !category.ownerId)) {
            initialShared = ['ALL'];
        }
        setSharedWith(initialShared);

        setEditingCategory(category);
        setModalVisible(true);
    };

    // ... (rest of functions)

    const handleSave = async () => {
        if (!newCategoryName.trim()) {
            Alert.alert('Required', 'Please enter a category name');
            return;
        }

        try {
            setLoading(true);
            if (editingCategory) {
                await updateCategory(auth.currentUser.uid, editingCategory.id, {
                    name: newCategoryName.trim(),
                    icon: newCategoryIcon,
                    type: formType,
                    sharedWith
                });
            } else {
                await addCategory(auth.currentUser.uid, newCategoryName.trim(), newCategoryIcon, formType, profile.id, sharedWith);
            }
            DeviceEventEmitter.emit('refresh_profile_dashboard');
            setModalVisible(false);
            loadCategories();
            if (isQuickAdd) navigation.goBack();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to save category');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (category) => {
        Alert.alert(
            "Delete Category",
            `Are you sure you want to delete "${category.name}"?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await deleteCategory(auth.currentUser.uid, category.id);
                            DeviceEventEmitter.emit('refresh_profile_dashboard');
                            setModalVisible(false); // Close if open
                            await loadCategories();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete category');
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const toggleShareAll = (val) => {
        setSharedWith(val ? ['ALL'] : []);
    };

    const toggleUserShare = (userId) => {
        setSharedWith(prev => {
            if (prev.includes('ALL')) return [userId];
            if (prev.includes(userId)) return prev.filter(id => id !== userId);
            return [...prev, userId];
        });
    };

    const filteredCategories = categories.filter(c => (c.type || 'expense') === selectedType);

    const renderItem = ({ item }) => {
        const isSystem = !item.ownerId;
        const sharedWithList = item.sharedWith;
        let isAll = false;
        let label = 'Private';

        if (Array.isArray(sharedWithList)) {
            isAll = sharedWithList.includes('ALL');
            if (isAll) label = 'Shared (Everyone)';
            else if (sharedWithList.length > 0) label = 'Shared (Restricted)';
        } else {
            const isLegacyShared = item.isShared === true;
            isAll = isSystem || isLegacyShared;
            if (isAll) label = 'Shared (Everyone)';
        }

        return (
            <TouchableOpacity
                style={[styles.itemContainer, { borderBottomColor: colors.divider }]}
                onPress={() => handleEdit(item)}
                disabled={!isAdmin}
            >
                <View style={styles.itemLeft}>
                    <View style={[styles.iconBox, { backgroundColor: colors.iconBackground }]}>
                        <Text style={{ fontSize: 24 }}>{item.icon}</Text>
                    </View>
                    <View>
                        <Text style={[styles.itemName, { color: colors.primaryText }]}>{item.name}</Text>
                        {isAdmin && <Text style={[styles.itemSub, { color: colors.secondaryText }]}>{label}</Text>}
                    </View>
                </View>
                {isAdmin && <Ionicons name="chevron-forward" size={20} color={colors.divider} />}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.divider }]}>
                {/* Center Title */}
                <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: -1 }}>
                    <Text style={[styles.headerTitle, { color: colors.primaryText }]}>Categories</Text>
                </View>

                <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAdd}>
                    <Ionicons name="add" size={28} color={colors.primaryAction} />
                </TouchableOpacity>
            </View>

            {/* Segmented Control */}
            <View style={{ alignItems: 'center', marginVertical: SPACING.m }}>
                <View style={[styles.segmentContainer, { backgroundColor: colors.inputBackground }]}>
                    <TouchableOpacity
                        style={[styles.segmentBtn, selectedType === 'expense' && { backgroundColor: colors.background, shadowOpacity: 0.1 }]}
                        onPress={() => setSelectedType('expense')}
                    >
                        <Text style={[styles.segmentText, { color: selectedType === 'expense' ? colors.error : colors.secondaryText }]}>Expense</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.segmentBtn, selectedType === 'income' && { backgroundColor: colors.background, shadowOpacity: 0.1 }]}
                        onPress={() => setSelectedType('income')}
                    >
                        <Text style={[styles.segmentText, { color: selectedType === 'income' ? colors.success : colors.secondaryText }]}>Income</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {!isQuickAdd && (
                <FlatList
                    data={filteredCategories}
                    renderItem={renderItem}
                    keyExtractor={i => i.id}
                    contentContainerStyle={styles.list}
                />
            )}

            {/* ADD / EDIT MODAL */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setModalVisible(false)}
            >
                <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: colors.divider, backgroundColor: colors.background }]}>
                        <TouchableOpacity
                            onPress={() => {
                                setModalVisible(false);
                                if (isQuickAdd) navigation.goBack();
                            }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="close" size={28} color={colors.primaryText} />
                        </TouchableOpacity>
                        <Text style={[styles.modalTitle, { color: colors.primaryText }]}>{editingCategory ? 'Edit Category' : 'New Category'}</Text>
                        {editingCategory ? (
                            <TouchableOpacity onPress={() => handleDelete(editingCategory)}>
                                <Ionicons name="trash-outline" size={24} color={colors.error} />
                            </TouchableOpacity>
                        ) : <View style={{ width: 24 }} />}
                    </View>

                    <ScrollView
                        contentContainerStyle={styles.form}
                        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                    >
                        {/* MODAL TYPE TOGGLE */}
                        <View style={{ alignItems: 'center', marginBottom: SPACING.l }}>
                            <View style={[styles.segmentContainer, { backgroundColor: colors.inputBackground }]}>
                                <TouchableOpacity
                                    style={[styles.segmentBtn, formType === 'expense' && { backgroundColor: colors.background, shadowOpacity: 0.1 }]}
                                    onPress={() => setFormType('expense')}
                                >
                                    <Text style={[styles.segmentText, { color: formType === 'expense' ? colors.error : colors.secondaryText }]}>Expense</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.segmentBtn, formType === 'income' && { backgroundColor: colors.background, shadowOpacity: 0.1 }]}
                                    onPress={() => setFormType('income')}
                                >
                                    <Text style={[styles.segmentText, { color: formType === 'income' ? colors.success : colors.secondaryText }]}>Income</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Icon Picker Button */}
                        <View style={{ alignItems: 'center', marginVertical: SPACING.m }}>
                            <TouchableOpacity
                                style={[styles.iconPickerBtn, { borderColor: formActiveColor, backgroundColor: colors.inputBackground }]}
                                onPress={() => setEmojiPickerVisible(true)}
                            >
                                <Text style={{ fontSize: 40 }}>{newCategoryIcon}</Text>
                            </TouchableOpacity>
                            <Text style={[styles.itemSub, { marginTop: 8, color: colors.secondaryText }]}>Tap to change icon</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.secondaryText }]}>NAME</Text>
                            <TextInput
                                style={[styles.input, { color: colors.primaryText, backgroundColor: colors.inputBackground }]}
                                value={newCategoryName}
                                onChangeText={setNewCategoryName}
                                placeholder="e.g. Shopping"
                                placeholderTextColor={colors.secondaryText}
                            />
                        </View>

                        {/* Sharing Section */}
                        <View style={[styles.inputGroup, { marginTop: SPACING.m }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <Text style={[styles.label, { color: colors.secondaryText, marginBottom: 0 }]}>SHARE WITH EVERYONE</Text>
                                <Switch
                                    value={sharedWith.includes('ALL')}
                                    onValueChange={toggleShareAll}
                                    trackColor={{ false: colors.divider, true: formActiveColor }}
                                />
                            </View>

                            {!sharedWith.includes('ALL') && (
                                <View style={{ paddingLeft: 8 }}>
                                    <Text style={[styles.itemSub, { marginBottom: 12, color: colors.secondaryText }]}>Or select specific people:</Text>
                                    {userProfiles
                                        .filter(p => p.id !== profile.id)
                                        .map(p => (
                                            <TouchableOpacity
                                                key={p.id}
                                                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}
                                                onPress={() => toggleUserShare(p.id)}
                                            >
                                                <MaterialCommunityIcons
                                                    name={sharedWith.includes(p.id) ? "checkbox-marked" : "checkbox-blank-outline"}
                                                    size={24}
                                                    color={sharedWith.includes(p.id) ? formActiveColor : colors.divider}
                                                />
                                                <Text style={{ marginLeft: 8, fontSize: TYPOGRAPHY.size.body, color: colors.primaryText }}>{p.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                </View>
                            )}
                        </View>
                    </ScrollView>

                    {/* Footer CTA */}
                    <View style={[styles.footer, { borderTopColor: colors.divider }]}>
                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: formActiveColor }]}
                            onPress={handleSave}
                        >
                            <Text style={styles.saveButtonText}>
                                {editingCategory ? 'Update Category' : 'Create Category'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>

                {/* Emoji Modal */}
                <Modal
                    visible={emojiPickerVisible}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setEmojiPickerVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback onPress={() => setEmojiPickerVisible(false)}><View style={{ flex: 1 }} /></TouchableWithoutFeedback>
                        <View style={[styles.emojiContent, { backgroundColor: colors.background }]}>
                            <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
                                <Text style={[styles.modalTitle, { color: colors.primaryText }]}>Choose Icon</Text>
                                <TouchableOpacity onPress={() => setEmojiPickerVisible(false)}>
                                    <Ionicons name="close" size={24} color={colors.primaryText} />
                                </TouchableOpacity>
                            </View>
                            <ScrollView contentContainerStyle={styles.emojiGrid}>
                                {COMMON_EMOJIS.map((emoji, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.emojiItem}
                                        onPress={() => {
                                            setNewCategoryIcon(emoji);
                                            setEmojiPickerVisible(false);
                                        }}
                                    >
                                        <Text style={{ fontSize: 32 }}>{emoji}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
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
    segmentContainer: {
        flexDirection: 'row',
        borderRadius: 8,
        padding: 4,
        width: 200,
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
    list: { paddingBottom: 100 },
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
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemName: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: TYPOGRAPHY.weight.medium,
    },
    itemSub: {
        fontSize: TYPOGRAPHY.size.caption,
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
    form: { padding: SPACING.screenPadding },

    iconPickerBtn: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
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
        letterSpacing: 0, // Fix iOS text spacing issue
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
