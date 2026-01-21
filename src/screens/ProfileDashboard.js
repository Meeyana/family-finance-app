import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../components/context/AuthContext';
import { updateProfile } from '../services/firestoreRepository';
import { auth } from '../services/firebase';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import { useTheme } from '../components/context/ThemeContext';
import Avatar from '../components/Avatar';

export default function ProfileDashboard({ route, navigation }) {
    const { profile: authProfile, userProfiles, refreshProfiles } = useAuth();
    const { theme } = useTheme();
    const colors = COLORS[theme];

    // Use live data from userProfiles if possible, falling back to params/authProfile
    const targetId = route.params?.profile?.id || authProfile?.id;
    const profileData = userProfiles.find(p => p.id === targetId) || route.params?.profile || authProfile || {};

    const [name, setName] = useState(profileData.name || '');
    const [pin, setPin] = useState(profileData.pin || '');
    const [showPin, setShowPin] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (profileData.name) setName(profileData.name);
    }, [profileData]);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert("Error", "Name cannot be empty");
            return;
        }
        setLoading(true);
        try {
            await updateProfile(auth.currentUser.uid, profileData.id, {
                name: name.trim(),
                pin: pin.trim()
            });
            await refreshProfiles();
            Alert.alert("Success", "Profile updated");
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to update");
        } finally {
            setLoading(false);
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
                <View style={{ backgroundColor: '#ffffff' }}>
                    <SafeAreaView edges={['top', 'left', 'right']} />
                </View>

                {/* Header */}
                <View style={[styles.header, { backgroundColor: '#ffffff', borderBottomColor: colors.divider, borderBottomWidth: 1 }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#3e2723" />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: '#3e2723' }]}>My Profile</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.content}>
                    <View style={styles.avatarContainer}>
                        <Avatar
                            name={name}
                            avatarId={profileData.avatarId}
                            size={100}
                            backgroundColor={colors.surface}
                            textColor={colors.primaryText}
                            style={{ borderWidth: 1, borderColor: colors.divider }}
                            fontSize={40}
                        />
                        {/* Placeholder for future image upload */}
                        <TouchableOpacity style={[styles.editIconBadge, { backgroundColor: colors.primaryAction }]} onPress={() => Alert.alert("Coming Soon", "Image upload not implemented yet")}>
                            <MaterialCommunityIcons name="camera" size={16} color="white" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.form}>
                        <Text style={[styles.label, { color: colors.secondaryText }]}>DISPLAY NAME</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.surface, color: colors.primaryText, borderColor: colors.divider }]}
                            value={name}
                            onChangeText={setName}
                            placeholder="Enter your name"
                            placeholderTextColor={colors.secondaryText}
                        />

                        <View style={[styles.disabledInput, { backgroundColor: colors.background, borderColor: colors.divider }]}>
                            <Text style={[styles.disabledText, { color: colors.secondaryText }]}>{profileData.role || 'User'}</Text>
                            <MaterialCommunityIcons name="lock" size={16} color={colors.secondaryText} />
                        </View>

                        <Text style={[styles.label, { color: colors.secondaryText }]}>PROFILE PIN</Text>
                        <View style={styles.pinContainer}>
                            <TextInput
                                style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: colors.surface, color: colors.primaryText, borderColor: colors.divider }]}
                                value={pin}
                                onChangeText={setPin}
                                placeholder="Enter 4-digit PIN"
                                placeholderTextColor={colors.secondaryText}
                                keyboardType="numeric"
                                secureTextEntry={!showPin}
                                maxLength={4}
                            />
                            <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPin(!showPin)}>
                                <MaterialCommunityIcons name={showPin ? "eye-off" : "eye"} size={24} color={colors.secondaryText} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.helperText, { color: colors.secondaryText }]}>Leave empty for no PIN protection</Text>

                        <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primaryAction }]} onPress={handleSave} disabled={loading}>
                            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.saveText}>Save Changes</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: SPACING.screenPadding,
        paddingBottom: SPACING.m,
        paddingTop: SPACING.s,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 4,
    },
    title: {
        fontSize: TYPOGRAPHY.size.h3,
        fontWeight: TYPOGRAPHY.weight.bold,
    },
    content: {
        flex: 1,
        padding: SPACING.screenPadding,
        marginTop: SPACING.l,
    },
    avatarContainer: {
        alignSelf: 'center',
        marginBottom: 32,
        position: 'relative',
    },
    editIconBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    form: {
        flex: 1,
    },
    label: {
        fontSize: TYPOGRAPHY.size.small,
        fontWeight: '600',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        fontSize: TYPOGRAPHY.size.body,
        marginBottom: 20,
    },
    disabledInput: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    disabledText: {
        fontSize: TYPOGRAPHY.size.body,
    },
    saveButton: {
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
        marginTop: SPACING.l,
    },
    saveText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: TYPOGRAPHY.size.body,
    },
    helperText: {
        fontSize: TYPOGRAPHY.size.caption,
        marginTop: 4,
        marginBottom: 20,
        marginLeft: 4
    },
    pinContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4
    },
    eyeButton: {
        position: 'absolute',
        right: 12,
        padding: 4
    }
});
