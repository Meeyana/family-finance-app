import React, { useState, useLayoutEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard, useColorScheme, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { updateProfile, addProfile, deleteProfile } from '../services/firestoreRepository';
import { auth } from '../services/firebase';
import { useAuth } from '../components/context/AuthContext';
import { useTheme } from '../components/context/ThemeContext';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import Avatar from '../components/Avatar';
import { AVAILABLE_AVATARS, getAvatarSource } from '../utils/avatars';

const formatNumber = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export default function EditProfileScreen({ route, navigation }) {
    const { profile, isNew } = route.params;
    const { refreshProfiles, profile: activeProfile } = useAuth();

    // Theme
    const { theme } = useTheme();
    const colors = COLORS[theme];

    useLayoutEffect(() => {
        navigation.setOptions({ headerShown: false });
    }, [navigation]);

    const [name, setName] = useState(profile?.name || '');
    const [limit, setLimit] = useState(formatNumber(profile?.limit || 0));
    const [role, setRole] = useState(profile?.role || 'Basic');
    const [pin, setPin] = useState(''); // Init empty for Blind Reset
    const [avatarId, setAvatarId] = useState(profile?.avatarId || null);
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const [loading, setLoading] = useState(false);

    // Has existing PIN?
    const hasPin = profile?.pin && profile.pin.length > 0;
    const isTargetOwner = profile?.role === 'Owner';
    const amIOwner = activeProfile?.role === 'Owner';

    const handleSave = async () => {
        if (isNew && !name.trim()) {
            Alert.alert("Error", "Name cannot be empty");
            return;
        }

        // Parse limit (remove commas)
        const numLimit = parseFloat(limit.replace(/,/g, ''));
        if (isNaN(numLimit) || numLimit < 0) {
            Alert.alert("Error", "Invalid Limit");
            return;
        }

        setLoading(true);
        try {
            if (isNew) {
                await addProfile(auth.currentUser.uid, {
                    name: name.trim(),
                    limit: numLimit,
                    role: role,
                    pin: pin.trim(), // Save PIN
                    avatarId: avatarId
                });
            } else {
                const updateData = {
                    limit: numLimit,
                    role: role,
                    avatarId: avatarId
                };
                if (pin.length > 0) {
                    updateData.pin = pin.trim();
                }
                await updateProfile(auth.currentUser.uid, profile.id, updateData);
            }

            await refreshProfiles();

            Alert.alert("Success", isNew ? "Profile created!" : "Profile updated!", [
                { text: "OK", onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to save profile");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete Profile",
            "Warning: This will permanently delete this profile and ALL associated transaction history. This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await deleteProfile(auth.currentUser.uid, profile.id);
                            await refreshProfiles();
                            navigation.goBack();
                        } catch (e) {
                            console.error(e);
                            Alert.alert("Error", "Failed to delete");
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: colors.background }}>
                    {/* Header */}
                    <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.divider, borderBottomWidth: 1 }]}>
                        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: colors.primaryText }]}>{isNew ? 'New Profile' : 'Edit Profile'}</Text>
                        <TouchableOpacity onPress={handleSave} disabled={loading}>
                            {loading ? <ActivityIndicator color={colors.primaryAction} /> : <Text style={[styles.saveText, { color: colors.primaryAction }]}>Save</Text>}
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps='handled'>
                        {/* Avatar Preview */}
                        <View style={{ alignItems: 'center', marginBottom: 24 }}>
                            <View>
                                <Avatar
                                    name={name || 'User'}
                                    avatarId={avatarId}
                                    size={80}
                                    backgroundColor={colors.surface}
                                    textColor={colors.primaryText}
                                    style={{ borderWidth: 1, borderColor: colors.divider }}
                                    fontSize={36}
                                />
                                {(!isNew && useAuth().profile?.id === profile?.id) && (
                                    <TouchableOpacity
                                        style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.primaryAction, borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#ffffff' }}
                                        onPress={() => setShowAvatarModal(true)}
                                    >
                                        <MaterialCommunityIcons name="pencil" size={12} color="#ffffff" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        <Modal
                            visible={showAvatarModal}
                            transparent={true}
                            animationType="slide"
                            onRequestClose={() => setShowAvatarModal(false)}
                        >
                            <View style={{ flex: 1, backgroundColor: colors.modalOverlay, justifyContent: 'flex-end' }}>
                                <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primaryText }}>Choose Avatar</Text>
                                        <TouchableOpacity onPress={() => setShowAvatarModal(false)}>
                                            <Ionicons name="close" size={24} color={colors.primaryText} />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={{ flexDirection: 'row', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                                        <TouchableOpacity onPress={() => { setAvatarId(null); setShowAvatarModal(false); }}>
                                            <Avatar
                                                name={name}
                                                size={64}
                                                backgroundColor={colors.surface}
                                                textColor={colors.primaryText}
                                                style={{ borderWidth: avatarId === null ? 2 : 0, borderColor: colors.primaryAction }}
                                            />
                                        </TouchableOpacity>

                                        {AVAILABLE_AVATARS.map(id => (
                                            <TouchableOpacity key={id} onPress={() => { setAvatarId(id); setShowAvatarModal(false); }}>
                                                <Image
                                                    source={getAvatarSource(id)}
                                                    style={{ width: 64, height: 64, borderRadius: 32, borderWidth: avatarId === id ? 2 : 0, borderColor: colors.primaryAction }}
                                                />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    <View style={{ height: 20 }} />
                                </View>
                            </View>
                        </Modal>

                        {/* Name Input */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.secondaryText }]}>NAME</Text>
                            {isNew ? (
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.primaryText, borderColor: colors.divider }]}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Enter Name"
                                    placeholderTextColor={colors.secondaryText}
                                />
                            ) : (
                                <View style={[styles.disabledInput, { backgroundColor: colors.background, borderColor: colors.divider }]}>
                                    <Text style={{ fontSize: TYPOGRAPHY.size.body, color: colors.primaryText, fontWeight: '600' }}>{name}</Text>
                                    <Text style={{ fontSize: TYPOGRAPHY.size.caption, color: colors.secondaryText }}>(Managed by user)</Text>
                                </View>
                            )}
                        </View>

                        {/* Limit Input */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.secondaryText }]}>MONTHLY LIMIT</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.primaryText, borderColor: colors.divider }]}
                                value={limit}
                                onChangeText={(text) => {
                                    // Strip non-numeric
                                    const cleaned = text.replace(/[^0-9]/g, '');
                                    // Remove leading zeros
                                    const number = cleaned.replace(/^0+/, '') || '0';
                                    // Format
                                    setLimit(number.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
                                }}
                                keyboardType="numeric"
                                placeholderTextColor={colors.secondaryText}
                            />
                        </View>

                        {/* Role Selector */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.secondaryText }]}>ROLE</Text>
                            {isTargetOwner ? (
                                <View style={[styles.disabledInput, { backgroundColor: colors.background, borderColor: colors.divider }]}>
                                    <Text style={{ color: colors.secondaryText }}>Owner (Cannot change)</Text>
                                    <MaterialCommunityIcons name="lock" size={16} color={colors.secondaryText} />
                                </View>
                            ) : (
                                <View style={[styles.segmentContainer, { backgroundColor: colors.inputBackground }]}>
                                    {['Partner', 'Basic'].map(r => (
                                        <TouchableOpacity
                                            key={r}
                                            style={[styles.segmentBtn, role === r && { backgroundColor: colors.primaryAction, shadowOpacity: 0.1 }]}
                                            onPress={() => {
                                                setRole(r);
                                            }}
                                        >
                                            <Text style={[styles.segmentText, { color: role === r ? 'white' : colors.secondaryText }]}>{r}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* PIN Section */}
                        <View style={styles.inputGroup}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={[styles.label, { color: colors.secondaryText, marginBottom: 0 }]}>PROFILE PIN</Text>
                                <Text style={[styles.helperText, { color: colors.secondaryText }]}>{hasPin ? "Enter new to reset" : "Optional"}</Text>
                            </View>
                            <TextInput
                                style={[styles.input, { marginTop: 8, backgroundColor: colors.inputBackground, color: colors.primaryText, borderColor: colors.divider }]}
                                value={pin}
                                onChangeText={setPin}
                                placeholder={hasPin ? "••••" : "Set a 4-digit PIN"}
                                placeholderTextColor={colors.secondaryText}
                                keyboardType="numeric"
                                secureTextEntry={true}
                                maxLength={4}
                            />
                        </View>

                        {/* Remove PIN Button */}
                        {hasPin && (
                            <TouchableOpacity
                                style={{ alignSelf: 'center', marginTop: 8, padding: 8 }}
                                onPress={async () => {
                                    setLoading(true);
                                    await updateProfile(auth.currentUser.uid, profile.id, { pin: '' });
                                    await refreshProfiles();
                                    setLoading(false);
                                    Alert.alert("Success", "PIN removed");
                                    navigation.goBack();
                                }}
                            >
                                <Text style={{ color: colors.primaryAction, fontSize: 12 }}>Remove PIN Requirement</Text>
                            </TouchableOpacity>
                        )}

                        {/* Delete Profile Button */}
                        {!isNew && amIOwner && !isTargetOwner && (
                            <TouchableOpacity style={{ alignSelf: 'center', marginTop: 24, padding: 8 }} onPress={handleDelete}>
                                <Text style={{ color: colors.error, fontSize: 12 }}>Delete Profile</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
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
        paddingVertical: SPACING.m,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.size.h3,
        fontWeight: TYPOGRAPHY.weight.bold,
    },
    saveText: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: TYPOGRAPHY.weight.bold,
    },
    form: { padding: SPACING.screenPadding },
    inputGroup: { marginBottom: SPACING.l },
    label: {
        fontSize: TYPOGRAPHY.size.small,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        fontSize: TYPOGRAPHY.size.body,
        letterSpacing: 0, // Fix iOS text spacing issue
    },
    disabledInput: {
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    helperText: {
        fontSize: TYPOGRAPHY.size.caption,
        marginLeft: 4,
    },

    // Segment Control
    segmentContainer: {
        flexDirection: 'row',
        borderRadius: 8,
        padding: 4,
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
    },
    segmentText: {
        fontSize: TYPOGRAPHY.size.caption,
        fontWeight: '600',
    },

    // Action Buttons
    actionButton: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        marginTop: 10,
    },
    actionText: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: TYPOGRAPHY.weight.mid,
    },
});
