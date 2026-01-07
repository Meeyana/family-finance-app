import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Alert, ActivityIndicator, Modal, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth } from '../services/firebase';
import { getFamilyCategories, addCategory, deleteCategory, updateCategory } from '../services/firestoreRepository';
import { useAuth } from '../components/context/AuthContext';

// Common Emojis grouped by usage
const COMMON_EMOJIS = [
    // Income/Money
    '💰', '💵', '💳', '🏦', '🪙', '🧧',
    // Food & Drink
    '🍔', '🍕', '🍣', '🍱', '🍜', '☕', '🍺', '🍷', '🍎', '🥕', '🥖', '🛒',
    // Transport
    '🚗', '🚕', '🚌', '🚆', '✈️', '⛽', '🅿️', '⚓',
    // Housing/Utilities
    '🏠', '💡', '💧', '⚡', '🛜', '📺', '🛋️', '🧹',
    // Personal/Health
    '👕', '👗', '👟', '💊', '🏥', '💇', '💅', '🏋️',
    // Entertainment
    '🎬', '🎮', '🎫', '🎵', '🎲', '📚',
    // Family/Education
    '👶', '🎓', '🎁', '🐶', '🐱', '🏫',
    // Others
    '🏷️', '🔒', '🔧', '⚙️', '📝', '📅'
];

export default function ManageCategoriesScreen({ navigation }) {
    const { profile, userProfiles } = useAuth();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryIcon, setNewCategoryIcon] = useState('🏷️');
    const [sharedWith, setSharedWith] = useState([]);

    const [selectedType, setSelectedType] = useState('expense');
    const themeColor = selectedType === 'income' ? '#34c759' : '#ff3b30';

    const [isAdding, setIsAdding] = useState(false);
    const [isEmojiPickerVisible, setEmojiPickerVisible] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);

    const filteredCategories = categories.filter(c => (c.type || 'expense') === selectedType);

    useEffect(() => {
        if (profile) loadCategories();
    }, [profile]);

    const loadCategories = async () => {
        try {
            console.log(`🔍 ManageCategories: Loading for ${profile?.name} (${profile?.role})`);
            if (auth.currentUser && profile) {
                const cats = await getFamilyCategories(auth.currentUser.uid, profile.id, profile.role);
                console.log(`✅ ManageCategories: Loaded ${cats.length} categories.`);
                cats.forEach(c => console.log(`   - ${c.name} (${c.type}) [Owner: ${c.ownerId}]`));
                setCategories(cats);
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load categories');
        } finally {
            setLoading(false);
        }
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

    const handleAdd = async () => {
        if (!newCategoryName.trim()) {
            Alert.alert('Required', 'Please enter a category name');
            return;
        }

        try {
            setLoading(true);

            if (editingCategory) {
                // Update existing
                await updateCategory(auth.currentUser.uid, editingCategory.id, {
                    name: newCategoryName.trim(),
                    icon: newCategoryIcon,
                    type: selectedType,
                    sharedWith
                });
                setEditingCategory(null);
            } else {
                // Add new
                await addCategory(auth.currentUser.uid, newCategoryName.trim(), newCategoryIcon, selectedType, profile.id, sharedWith);
            }

            setNewCategoryName('');
            setNewCategoryIcon('🏷️');
            setSharedWith([]);
            setIsAdding(false);
            await loadCategories();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to save category');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (category) => {
        setNewCategoryName(category.name);
        setNewCategoryIcon(category.icon);
        setSelectedType(category.type || 'expense');

        // Handle migration Logic
        let initialShared = category.sharedWith || [];
        if (!category.sharedWith && (category.isShared === true || !category.ownerId)) {
            initialShared = ['ALL'];
        }
        setSharedWith(initialShared);

        setEditingCategory(category);
        setIsAdding(true);
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

    const handleCancel = () => {
        setIsAdding(false);
        setEditingCategory(null);
        setNewCategoryName('');
        setNewCategoryIcon('🏷️');
        setSharedWith([]);
    };

    const renderEmojiPicker = () => (
        <Modal
            visible={isEmojiPickerVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setEmojiPickerVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Choose Icon</Text>
                        <TouchableOpacity onPress={() => setEmojiPickerVisible(false)}>
                            <Text style={styles.closeText}>Close</Text>
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
                                <Text style={styles.emojiTextLarge}>{emoji}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Categories</Text>
                <TouchableOpacity onPress={() => { setIsAdding(!isAdding); setEditingCategory(null); setNewCategoryName(''); setNewCategoryIcon('🏷️'); setSharedWith([]); }} style={styles.addButton}>
                    <Text style={[styles.addText, { color: themeColor }]}>{isAdding ? 'Close' : 'Add New'}</Text>
                </TouchableOpacity>
            </View>

            {/* Type Toggle - Refined */}
            <View style={styles.toggleContainer}>
                <TouchableOpacity
                    style={[styles.toggleButton, selectedType === 'expense' && styles.toggleActive]}
                    onPress={() => setSelectedType('expense')}
                >
                    <Text style={[styles.toggleText, selectedType === 'expense' && styles.toggleTextActive]}>Expense</Text>
                </TouchableOpacity>
                <View style={{ width: 1, backgroundColor: '#ddd', height: 20 }} />
                <TouchableOpacity
                    style={[styles.toggleButton, selectedType === 'income' && styles.toggleActive]}
                    onPress={() => setSelectedType('income')}
                >
                    <Text style={[styles.toggleText, selectedType === 'income' && styles.toggleTextActive]}>Income</Text>
                </TouchableOpacity>
            </View>

            {isAdding && (
                <View style={styles.addForm}>
                    <Text style={styles.formTitle}>
                        {editingCategory ? 'Edit Category' : `New ${selectedType === 'income' ? 'Income' : 'Expense'} Category`}
                    </Text>
                    <View style={styles.inputRow}>
                        <TouchableOpacity
                            style={styles.emojiButton}
                            onPress={() => setEmojiPickerVisible(true)}
                        >
                            <Text style={styles.emojiText}>{newCategoryIcon}</Text>
                        </TouchableOpacity>

                        <TextInput
                            style={styles.nameInput}
                            value={newCategoryName}
                            onChangeText={setNewCategoryName}
                            placeholder="Category Name"
                        />
                    </View>

                    <View style={{ marginBottom: 20 }}>
                        <View style={[styles.inputRow, { alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }]}>
                            <Text style={{ fontSize: 16, color: '#333', fontWeight: 'bold' }}>Share with Everyone</Text>
                            <Switch
                                value={sharedWith.includes('ALL')}
                                onValueChange={toggleShareAll}
                                trackColor={{ false: "#767577", true: themeColor }}
                            />
                        </View>

                        {!sharedWith.includes('ALL') && (
                            <View style={{ marginTop: 5, paddingLeft: 5 }}>
                                <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>Or share with specific people:</Text>
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
                                                color={sharedWith.includes(p.id) ? themeColor : "#999"}
                                            />
                                            <Text style={{ marginLeft: 8, fontSize: 16 }}>{p.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                            </View>
                        )}
                    </View>

                    <TouchableOpacity style={[styles.createButton, { backgroundColor: themeColor }]} onPress={handleAdd}>
                        <Text style={styles.createText}>{editingCategory ? 'Update Category' : 'Create Category'}</Text>
                    </TouchableOpacity>
                    {editingCategory && (
                        <TouchableOpacity style={[styles.createButton, { backgroundColor: '#999', marginTop: 8 }]} onPress={handleCancel}>
                            <Text style={styles.createText}>Cancel Edit</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {loading ? (
                <ActivityIndicator style={{ marginTop: 20 }} size="large" />
            ) : (
                <FlatList
                    data={filteredCategories}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => {
                        const isSystem = !item.ownerId;
                        const sharedWith = item.sharedWith;

                        let isAll = false;
                        let label = 'Private';

                        if (Array.isArray(sharedWith)) {
                            // Explicit permissions exist
                            isAll = sharedWith.includes('ALL');
                            if (isAll) label = 'Shared (Everyone)';
                            else if (sharedWith.length > 0) label = 'Shared (Restricted)';
                            else label = 'Private';
                        } else {
                            // Legacy/Default Fallback
                            const isLegacyShared = item.isShared === true;
                            isAll = isSystem || isLegacyShared;

                            if (isAll) label = 'Shared (Everyone)';
                            else label = 'Private';
                        }

                        const isMine = item.ownerId === profile.id;
                        const canEdit = profile.role === 'Owner' || isMine;

                        return (
                            <View style={styles.row}>
                                <View style={styles.catInfo}>
                                    <Text style={styles.catIcon}>{item.icon}</Text>
                                    <View>
                                        <Text style={styles.catName}>{item.name}</Text>
                                        <Text style={{ fontSize: 11, color: '#999' }}>
                                            {label}
                                        </Text>
                                    </View>
                                </View>
                                {canEdit && (
                                    <View style={{ flexDirection: 'row', gap: 16 }}>
                                        <TouchableOpacity onPress={() => handleEdit(item)}>
                                            <MaterialCommunityIcons name="pencil" size={22} color="#007AFF" />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleDelete(item)}>
                                            <MaterialCommunityIcons name="delete" size={22} color="#dc2626" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        );
                    }}
                    contentContainerStyle={styles.list}
                />
            )}

            {renderEmojiPicker()}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f7fa' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backText: { fontSize: 16, color: '#666' },
    title: { fontSize: 18, fontWeight: 'bold' },
    addText: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
    list: { padding: 16 },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    catInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    catIcon: { fontSize: 24 },
    catName: { fontSize: 16, fontWeight: '500' },
    deleteText: { color: '#dc2626', fontWeight: '500' },

    // Add Form
    addForm: {
        backgroundColor: 'white',
        padding: 16,
        marginBottom: 1,
    },
    formTitle: {
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#333'
    },
    inputRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    emojiButton: {
        width: 60,
        height: 50,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9f9f9',
    },
    emojiText: {
        fontSize: 28,
    },
    nameInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    createButton: {
        backgroundColor: '#007AFF',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    createText: {
        color: 'white',
        fontWeight: 'bold',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '50%',
        padding: 16,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeText: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: '600',
    },
    emojiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    emojiItem: {
        width: '18%', // 5 columns roughly
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    emojiTextLarge: {
        fontSize: 32,
    },
    toggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    toggleActive: {
        backgroundColor: '#f8f9fa',
    },
    toggleText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#999',
    },
    toggleTextActive: {
        color: '#1a1a1a',
        fontWeight: 'bold',
    },
});
