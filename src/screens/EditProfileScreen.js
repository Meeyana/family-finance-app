import React, { useState, useLayoutEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { updateProfile, addProfile, deleteProfile } from '../services/firestoreRepository';
import { auth } from '../services/firebase';
import { useAuth } from '../components/context/AuthContext';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';

export default function EditProfileScreen({ route, navigation }) {
    const { profile, isNew } = route.params;
    const { refreshProfiles } = useAuth();

    // Theme
    const theme = useColorScheme() || 'light';
    const colors = COLORS[theme];

    useLayoutEffect(() => {
        navigation.setOptions({ headerShown: false });
    }, [navigation]);

    const [name, setName] = useState(profile?.name || '');
    const [limit, setLimit] = useState(String(profile?.limit || 0));
    const [role, setRole] = useState(profile?.role || 'Child');
    const [pin, setPin] = useState(''); // Init empty for Blind Reset
    const [loading, setLoading] = useState(false);

    // Has existing PIN?
    const hasPin = profile?.pin && profile.pin.length > 0;
    const isOwner = profile?.role === 'Owner';

    const handleSave = async () => {
        if (isNew && !name.trim()) {
            Alert.alert("Error", "Name cannot be empty");
            return;
        }

        const numLimit = parseFloat(limit);
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
                    pin: pin.trim() // Save PIN
                });
            } else {
                const updateData = {
                    limit: numLimit,
                    role: role
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
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: colors.divider }]}>
                        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: colors.primaryText }]}>{isNew ? 'New Profile' : 'Edit Profile'}</Text>
                        <TouchableOpacity onPress={handleSave} disabled={loading}>
                            {loading ? <ActivityIndicator color={colors.primaryAction} /> : <Text style={[styles.saveText, { color: colors.primaryAction }]}>Save</Text>}
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps='handled'>
                        {/* Name Input */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.secondaryText }]}>NAME</Text>
                            {isNew ? (
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.surface, color: colors.primaryText, borderColor: colors.divider }]}
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
                            <Text style={[styles.label, { color: colors.secondaryText }]}>MONTHLY LIMIT (VND)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.surface, color: colors.primaryText, borderColor: colors.divider }]}
                                value={limit}
                                onChangeText={setLimit}
                                keyboardType="numeric"
                                placeholderTextColor={colors.secondaryText}
                            />
                        </View>

                        {/* Role Selector */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.secondaryText }]}>ROLE</Text>
                            {isOwner ? (
                                <View style={[styles.disabledInput, { backgroundColor: colors.background, borderColor: colors.divider }]}>
                                    <Text style={{ color: colors.secondaryText }}>Owner (Cannot change)</Text>
                                    <MaterialCommunityIcons name="lock" size={16} color={colors.secondaryText} />
                                </View>
                            ) : (
                                <View style={[styles.segmentContainer, { backgroundColor: colors.surface }]}>
                                    {['Partner', 'Child'].map(r => (
                                        <TouchableOpacity
                                            key={r}
                                            style={[styles.segmentBtn, role === r && { backgroundColor: colors.background, shadowOpacity: 0.1 }]}
                                            onPress={() => setRole(r)}
                                        >
                                            <Text style={[styles.segmentText, { color: role === r ? colors.primaryText : colors.secondaryText }]}>{r}</Text>
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
                                style={[styles.input, { marginTop: 8, backgroundColor: colors.surface, color: colors.primaryText, borderColor: colors.divider }]}
                                value={pin}
                                onChangeText={setPin}
                                placeholder={hasPin ? "••••••" : "Set a 6-digit PIN"}
                                placeholderTextColor={colors.secondaryText}
                                keyboardType="numeric"
                                secureTextEntry={true}
                                maxLength={6}
                            />
                        </View>

                        {/* Remove PIN Button */}
                        {hasPin && (
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.divider }]}
                                onPress={async () => {
                                    setLoading(true);
                                    await updateProfile(auth.currentUser.uid, profile.id, { pin: '' });
                                    await refreshProfiles();
                                    setLoading(false);
                                    Alert.alert("Success", "PIN removed");
                                    navigation.goBack();
                                }}
                            >
                                <Text style={[styles.actionText, { color: colors.primaryAction }]}>Remove PIN Requirement</Text>
                            </TouchableOpacity>
                        )}

                        {/* Delete Profile Button */}
                        {!isNew && !isOwner && (
                            <TouchableOpacity style={[styles.actionButton, { marginTop: 20, backgroundColor: colors.surface, borderColor: colors.error }]} onPress={handleDelete}>
                                <Text style={[styles.actionText, { color: colors.error }]}>Delete Profile</Text>
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
