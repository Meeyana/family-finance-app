import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Modal, Switch, TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../components/context/ThemeContext';
import { useAuth } from '../components/context/AuthContext';
import { useSettings } from '../components/context/SettingsContext';
import { addProfile, initializeCategories, getFamilyCategories, updateCategory, initializeFamily, initializeUserLicense, addCategory, DEFAULT_CATEGORIES, updateFamilySettings } from '../services/firestoreRepository';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

// Common Emojis (Reused)
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

export default function OnboardingProfileScreen() {
    const { user, refreshProfiles } = useAuth();
    const { theme } = useTheme();
    const { updateCurrency, updateLanguage, currency: globalCurrency } = useSettings();
    const colors = COLORS[theme];

    // Flow Control
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Step 1: Language
    const [selectedLang, setSelectedLang] = useState('en');

    // Step 2: Currency
    const [selectedCurrency, setSelectedCurrency] = useState('VND');

    // Step 3: Owner
    const [ownerName, setOwnerName] = useState('');
    const [ownerBudget, setOwnerBudget] = useState('');

    // Step 4: Categories
    const [categories, setCategories] = useState([]);
    const [loadingCats, setLoadingCats] = useState(false);
    const [catTab, setCatTab] = useState('expense'); // 'expense' | 'income'

    // Category Edit/Add State
    const [catModalVisible, setCatModalVisible] = useState(false);
    const [editingCat, setEditingCat] = useState(null); // null if adding
    const [catName, setCatName] = useState('');
    const [catIcon, setCatIcon] = useState('🏷️');
    const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);

    // Step 5: Family Members
    // Step 5: Family Members
    const [members, setMembers] = useState([{ name: '', role: 'Partner', limit: '' }]);


    // ------------------------------------------------------------------
    // STEP 1: Language
    // ------------------------------------------------------------------
    // ------------------------------------------------------------------
    // NAVIGATION HELPERS
    // ------------------------------------------------------------------
    const handleNext = () => setStep(step + 1);
    const handleBack = () => setStep(step - 1);

    // ------------------------------------------------------------------
    // STEP 1: Language
    // ------------------------------------------------------------------
    const handleStep1 = async () => {
        // Just move to next step, save at end
        setStep(2);
    };

    // ------------------------------------------------------------------
    // STEP 2: Currency
    // ------------------------------------------------------------------
    const handleStep2 = async () => {
        setStep(3);
    };

    // ------------------------------------------------------------------
    // STEP 3: Owner Profile
    // ------------------------------------------------------------------
    const handleStep3 = async () => {
        if (!ownerName.trim()) {
            Alert.alert('Required', 'Please enter your name');
            return;
        }

        const b = parseFloat(ownerBudget.replace(/[^0-9.]/g, ''));
        if (ownerBudget && isNaN(b)) {
            Alert.alert('Invalid', 'Please enter a valid number');
            return;
        }

        setStep(4);
    };

    // ------------------------------------------------------------------
    // STEP 4: Categories
    // ------------------------------------------------------------------
    // ------------------------------------------------------------------
    // STEP 4: Categories
    // ------------------------------------------------------------------
    useEffect(() => {
        // Initialize local categories from DEFAULTs if empty
        if (categories.length === 0) {
            // Deep copy to allow local editing
            setCategories(JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)));
        }
    }, [step]); // Run when entering this step

    const handleOpenCatModal = (cat = null) => {
        if (cat) {
            setEditingCat(cat);
            setCatName(cat.name);
            setCatIcon(cat.icon);
        } else {
            setEditingCat(null);
            setCatName('');
            setCatIcon('🏷️');
        }
        setCatModalVisible(true);
    };

    const handleSaveCategory = async () => {
        if (!catName.trim()) {
            Alert.alert("Required", "Please enter a name");
            return;
        }

        const newCats = [...categories];

        if (editingCat) {
            // Update existing in local list
            const idx = newCats.findIndex(c => c.id === editingCat.id);
            if (idx > -1) {
                newCats[idx] = { ...newCats[idx], name: catName.trim(), icon: catIcon };
            }
        } else {
            // Add new to local list
            // Generate a random ID for local tracking
            const newId = 'custom_' + Date.now();
            newCats.push({
                id: newId,
                name: catName.trim(),
                icon: catIcon,
                type: catTab,
                isCustom: true
            });
        }

        setCategories(newCats);
        setCatModalVisible(false);
    };

    const handleStep4 = () => {
        setStep(5);
    };

    // ------------------------------------------------------------------
    // STEP 5: Family Members
    // ------------------------------------------------------------------
    const addMemberCard = () => {
        setMembers([...members, { name: '', role: 'Partner', limit: '' }]);
    };

    const updateMember = (index, field, value) => {
        const newMembers = [...members];
        newMembers[index][field] = value;
        setMembers(newMembers);
    };

    const removeMember = (index) => {
        const newMembers = [...members];
        newMembers.splice(index, 1);
        setMembers(newMembers);
    };

    const handleStep5 = async () => {
        // Just validate empty names if needed, but we filter them later anyway
        const validMembers = members.filter(m => m.name.trim().length > 0);
        // if (validMembers.length === 0) ... (Optional warning)
        setStep(6);
    };


    // ------------------------------------------------------------------
    // STEP 6: Completion (BATCH WRITE)
    // ------------------------------------------------------------------
    const handleFinish = async () => {
        setLoading(true);
        try {
            console.log("🚀 Starting Onboarding Batch Save...");

            // 1. Initialize Family Root & License
            // 0. Ensure Family Root Exists (Fix for "Missing Permissions" if parent missing)
            try {
                await initializeUserLicense(user.uid, user.email || 'unknown');
                await initializeFamily(user.uid, user.email || 'unknown');
            } catch (initErr) {
                console.warn("Auto-Init Family failed (likely permissions):", initErr);
            }

            // 2. Save Settings
            await updateLanguage(selectedLang);
            await updateCurrency(selectedCurrency);
            // Also update family settings doc
            await updateFamilySettings(user.uid, {
                currency: selectedCurrency,
                language: selectedLang
            });

            // 3. Save Owner Profile
            const ownerLimit = parseFloat(ownerBudget.replace(/[^0-9.]/g, '')) || 0;
            await addProfile(user.uid, {
                name: ownerName.trim(),
                role: 'Owner',
                limit: ownerLimit,
                avatarId: null,
                spent: 0,
                earned: 0
            });

            // 4. Save Family Members
            const validMembers = members.filter(m => m.name.trim().length > 0);
            for (const m of validMembers) {
                const b = parseFloat(m.limit.toString().replace(/[^0-9.]/g, '')) || 0;
                await addProfile(user.uid, {
                    name: m.name.trim(),
                    role: m.role,
                    limit: b,
                    avatarId: null,
                    spent: 0,
                    earned: 0
                });
            }

            // 5. Save Categories (Default + Custom)
            for (const c of categories) {
                await addCategory(user.uid, c.name, c.icon, c.type || 'expense', c.id, true);
            }

            console.log("✅ Onboarding Batch Save Complete!");
            await refreshProfiles();

        } catch (e) {
            console.error("🔥 Onboarding Save Failed:", e);
            Alert.alert("Error", "Failed to setup your account. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // ------------------------------------------------------------------
    // RENDER HELPERS
    // ------------------------------------------------------------------
    const renderHeader = (title, sub, hasBack = false) => (
        <View style={[styles.header, { borderBottomColor: colors.divider }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {hasBack && (
                        <TouchableOpacity onPress={handleBack}>
                            <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
                        </TouchableOpacity>
                    )}
                    <Text style={[styles.stepIndicator, { color: colors.primaryAction, marginBottom: 0 }]}>Step {step} of 5</Text>
                </View>
            </View>
            <Text style={[styles.title, { color: colors.primaryText, marginTop: 8 }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: colors.secondaryText }]}>{sub}</Text>
        </View>
    );

    const renderStep1 = () => (
        <View style={styles.content}>
            {renderHeader("Choose Language", "Select your preferred language.", false)}
            <TouchableOpacity
                style={[styles.optionCard, selectedLang === 'en' && { borderColor: '#6ca749', borderWidth: 2 }]}
                onPress={() => setSelectedLang('en')}
            >
                <Text style={{ fontSize: 32, marginRight: 16 }}>🇺🇸</Text>
                <Text style={[styles.optionText, { color: colors.primaryText }]}>English</Text>
                {selectedLang === 'en' && <Ionicons name="checkmark-circle" size={24} color="#6ca749" />}
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.optionCard, selectedLang === 'vi' && { borderColor: '#6ca749', borderWidth: 2 }]}
                onPress={() => setSelectedLang('vi')}
            >
                <Text style={{ fontSize: 32, marginRight: 16 }}>🇻🇳</Text>
                <Text style={[styles.optionText, { color: colors.primaryText }]}>Vietnamese (Tiếng Việt)</Text>
                {selectedLang === 'vi' && <Ionicons name="checkmark-circle" size={24} color="#6ca749" />}
            </TouchableOpacity>

            <View style={{ flex: 1 }} />
            <TouchableOpacity style={[styles.button, { backgroundColor: '#6ca749' }]} onPress={handleStep1} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Next</Text>}
            </TouchableOpacity>
        </View>
    );

    const renderStep2 = () => (
        <View style={styles.content}>
            {renderHeader("Choose Currency", "Select your default currency.", true)}
            <TouchableOpacity
                style={[styles.optionCard, { backgroundColor: colors.cardBackground }, selectedCurrency === 'VND' && { borderColor: '#6ca749', borderWidth: 2 }]}
                onPress={() => setSelectedCurrency('VND')}
            >
                <Text style={{ fontSize: 32, marginRight: 16, color: colors.primaryText }}>₫</Text>
                <Text style={[styles.optionText, { color: colors.primaryText }]}>VND (Vietnamese Dong)</Text>
                {selectedCurrency === 'VND' && <Ionicons name="checkmark-circle" size={24} color="#6ca749" />}
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.optionCard, { backgroundColor: colors.cardBackground }, selectedCurrency === 'USD' && { borderColor: '#6ca749', borderWidth: 2 }]}
                onPress={() => setSelectedCurrency('USD')}
            >
                <Text style={{ fontSize: 32, marginRight: 16, color: colors.primaryText }}>$</Text>
                <Text style={[styles.optionText, { color: colors.primaryText }]}>USD (US Dollar)</Text>
                {selectedCurrency === 'USD' && <Ionicons name="checkmark-circle" size={24} color="#6ca749" />}
            </TouchableOpacity>

            <View style={{ flex: 1 }} />
            <TouchableOpacity style={[styles.button, { backgroundColor: '#6ca749' }]} onPress={handleStep2} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Next</Text>}
            </TouchableOpacity>
        </View>
    );

    const renderStep3 = () => (
        <View style={styles.content}>
            {renderHeader("Create Your Profile", "Set up the main owner profile.", true)}
            <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.secondaryText }]}>YOUR NAME</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.primaryText, borderColor: colors.divider }]}
                    placeholder="e.g. Dad"
                    value={ownerName}
                    onChangeText={setOwnerName}
                />
            </View>
            <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.secondaryText }]}>MONTHLY BUDGET ({selectedCurrency})</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.primaryText, borderColor: colors.divider }]}
                    placeholder="0"
                    value={ownerBudget}
                    onChangeText={setOwnerBudget}
                    keyboardType="numeric"
                />
            </View>
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={[styles.button, { backgroundColor: '#6ca749' }]} onPress={handleStep3} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Next</Text>}
            </TouchableOpacity>
        </View>
    );

    // ------------------------------------------------------------------
    // Step 4 (Updated)
    // ------------------------------------------------------------------
    const renderStep4 = () => {
        const filteredCats = categories.filter(c => (c.type || 'expense') === catTab);
        const activeColor = catTab === 'income' ? colors.success : colors.error;

        return (
            <View style={styles.content}>
                {renderHeader("Customize Categories", "Tap to edit. Switch tabs to see Income/Expense.", true)}

                {/* Tabs */}
                <View style={[styles.segmentContainer, { backgroundColor: colors.inputBackground, marginBottom: 20 }]}>
                    <TouchableOpacity
                        style={[styles.segmentBtn, catTab === 'expense' && { backgroundColor: colors.background }]}
                        onPress={() => setCatTab('expense')}
                    >
                        <Text style={[styles.segmentText, { color: catTab === 'expense' ? colors.error : colors.secondaryText }]}>Expense</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.segmentBtn, catTab === 'income' && { backgroundColor: colors.background }]}
                        onPress={() => setCatTab('income')}
                    >
                        <Text style={[styles.segmentText, { color: catTab === 'income' ? colors.success : colors.secondaryText }]}>Income</Text>
                    </TouchableOpacity>
                </View>

                {/* List */}
                <ScrollView style={{ flex: 1, marginBottom: 20 }}>
                    {loadingCats ? <ActivityIndicator /> : (
                        <View>
                            {filteredCats.map((cat, idx) => (
                                <TouchableOpacity
                                    key={cat.id || idx}
                                    style={[styles.catItem, { borderBottomColor: colors.divider }]}
                                    onPress={() => handleOpenCatModal(cat)}
                                >
                                    <View style={[styles.iconBox, { backgroundColor: colors.iconBackground }]}>
                                        <Text style={{ fontSize: 24 }}>{cat.icon}</Text>
                                    </View>
                                    <Text style={[styles.catName, { color: colors.primaryText }]}>{cat.name}</Text>
                                    <Ionicons name="pencil" size={16} color={colors.secondaryText} />
                                </TouchableOpacity>
                            ))}

                            <TouchableOpacity
                                style={[styles.addCatRow, { borderStyle: 'dashed', borderColor: colors.divider }]}
                                onPress={() => handleOpenCatModal(null)}
                            >
                                <Ionicons name="add-circle" size={24} color={activeColor} />
                                <Text style={{ color: activeColor, fontWeight: 'bold' }}>Add {catTab === 'income' ? 'Income' : 'Expense'} Category</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>

                <TouchableOpacity style={[styles.button, { backgroundColor: '#6ca749' }]} onPress={handleStep4}>
                    <Text style={styles.buttonText}>Looks Good</Text>
                </TouchableOpacity>

                {/* EDIT/ADD MODAL */}
                <Modal visible={catModalVisible} animationType="slide" transparent>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalCard, { backgroundColor: colors.background }]}>
                            <Text style={[styles.modalTitle, { color: colors.primaryText }]}>
                                {editingCat ? 'Edit Category' : 'New Category'}
                            </Text>

                            <View style={{ alignItems: 'center', marginVertical: 20 }}>
                                <TouchableOpacity
                                    style={[styles.iconPickerBtn, { borderColor: activeColor, backgroundColor: colors.inputBackground }]}
                                    onPress={() => setEmojiPickerVisible(true)}
                                >
                                    <Text style={{ fontSize: 40 }}>{catIcon}</Text>
                                </TouchableOpacity>
                                <Text style={{ color: colors.secondaryText, fontSize: 12, marginTop: 8 }}>Tap to change icon</Text>
                            </View>

                            <TextInput
                                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.primaryText, borderColor: colors.divider, marginBottom: 20 }]}
                                placeholder="Category Name"
                                value={catName}
                                onChangeText={setCatName}
                            />

                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity
                                    style={[styles.button, { backgroundColor: colors.surface, flex: 1, borderWidth: 1, borderColor: colors.divider }]}
                                    onPress={() => setCatModalVisible(false)}
                                >
                                    <Text style={[styles.buttonText, { color: colors.primaryText }]}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.button, { backgroundColor: activeColor, flex: 1 }]}
                                    onPress={handleSaveCategory}
                                >
                                    <Text style={styles.buttonText}>Save</Text>
                                </TouchableOpacity>
                            </View>

                            {/* EMOJI PICKER MODAL (Nested) */}
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
                                            {COMMON_EMOJIS.map((emoji, index) => (
                                                <TouchableOpacity
                                                    key={index}
                                                    style={styles.emojiItem}
                                                    onPress={() => {
                                                        setCatIcon(emoji);
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
                        </View>
                    </View>
                </Modal>
            </View>
        );
    };

    const renderStep5 = () => (
        <View style={styles.content}>
            {renderHeader("Add Family", "Add partners or children (Optional).", true)}

            <ScrollView style={{ flex: 1, marginBottom: 20 }}>
                {members.map((member, index) => (
                    <View key={index} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.divider, marginBottom: 16 }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                            <Text style={{ fontWeight: 'bold', color: colors.secondaryText }}>Member {index + 1}</Text>
                            {members.length > 1 && (
                                <TouchableOpacity onPress={() => removeMember(index)}>
                                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                                </TouchableOpacity>
                            )}
                        </View>

                        <TextInput
                            style={[styles.smallInput, { backgroundColor: colors.inputBackground, color: colors.primaryText, borderColor: colors.divider }]}
                            placeholder="Name"
                            value={member.name}
                            onChangeText={(text) => updateMember(index, 'name', text)}
                        />
                        <View style={styles.roleRow}>
                            <TouchableOpacity
                                style={[styles.roleButton, member.role === 'Partner' && { backgroundColor: '#6ca749' }, { borderColor: colors.divider }]}
                                onPress={() => updateMember(index, 'role', 'Partner')}
                            >
                                <Text style={[styles.roleText, member.role === 'Partner' && { color: '#fff' }, member.role !== 'Partner' && { color: colors.secondaryText }]}>Partner</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.roleButton, member.role === 'Child' && { backgroundColor: '#6ca749' }, { borderColor: colors.divider }]}
                                onPress={() => updateMember(index, 'role', 'Child')}
                            >
                                <Text style={[styles.roleText, member.role === 'Child' && { color: '#fff' }, member.role !== 'Child' && { color: colors.secondaryText }]}>Child</Text>
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={[styles.smallInput, { backgroundColor: colors.inputBackground, color: colors.primaryText, borderColor: colors.divider }]}
                            placeholder="Budget Limit"
                            value={member.limit}
                            onChangeText={(text) => updateMember(index, 'limit', text)}
                            keyboardType="numeric"
                        />
                    </View>
                ))}

                <TouchableOpacity
                    onPress={addMemberCard}
                    style={{ alignItems: 'center', padding: 15, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.divider, borderRadius: 12 }}
                >
                    <Text style={{ color: '#6ca749', fontWeight: 'bold' }}>+ Add Another Member</Text>
                </TouchableOpacity>

                {/* Spacer for ScrollView */}
                <View style={{ height: 40 }} />
            </ScrollView>

            <TouchableOpacity style={[styles.button, { backgroundColor: '#6ca749' }]} onPress={handleStep5}>
                <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
        </View>
    );

    const renderStep6 = () => (
        <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="checkmark-circle" size={120} color="#6ca749" />
            <Text style={[styles.title, { textAlign: 'center', marginTop: 24, color: colors.primaryText }]}>All Set!</Text>
            <Text style={[styles.subtitle, { textAlign: 'center', color: colors.secondaryText }]}>
                Your family finance space is ready.
            </Text>
            <View style={{ height: 60 }} />
            <TouchableOpacity style={[styles.button, { backgroundColor: '#6ca749', width: '100%' }]} onPress={handleFinish} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Go to Overview</Text>}
            </TouchableOpacity>
        </View>
    );

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                    {step === 4 && renderStep4()}
                    {step === 5 && renderStep5()}
                    {step === 6 && renderStep6()}
                </KeyboardAvoidingView>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1, padding: SPACING.l },
    header: { marginBottom: SPACING.xl, paddingBottom: SPACING.m, borderBottomWidth: 1 },
    title: { fontSize: TYPOGRAPHY.size.h1, fontWeight: 'bold', marginBottom: 8 },
    subtitle: { fontSize: TYPOGRAPHY.size.body },
    stepIndicator: { fontSize: 12, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' },

    optionCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 16, marginBottom: 16 },
    optionText: { fontSize: 18, fontWeight: '600', flex: 1 },

    inputContainer: { marginBottom: 20 },
    label: { fontSize: 12, fontWeight: 'bold', marginBottom: 8, letterSpacing: 1 },
    input: { height: 56, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, fontSize: 16 },

    // Lists & Tabs for Step 4
    segmentContainer: { flexDirection: 'row', borderRadius: 8, padding: 4 },
    segmentBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
    segmentText: { fontWeight: '600', fontSize: 12 },

    catItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
    iconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    catName: { flex: 1, fontSize: 16, fontWeight: '500' },
    addCatRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, marginTop: 10, borderWidth: 1, borderRadius: 12, gap: 8 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalCard: { borderRadius: 20, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
    iconPickerBtn: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },

    emojiContent: { height: '50%', borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: 'auto' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
    emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', padding: 16 },
    emojiItem: { padding: 10 },

    // Step 5
    card: { borderWidth: 1, borderRadius: 16, padding: 16 },
    smallInput: { height: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, marginBottom: 12 },
    roleRow: { flexDirection: 'row', marginBottom: 12, gap: 10 },
    roleButton: { flex: 1, height: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderRadius: 8 },
    roleText: { fontWeight: '600' },
    addedItem: { padding: 12, borderRadius: 8, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' },

    button: { height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
