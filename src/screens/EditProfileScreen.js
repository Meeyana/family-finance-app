import React, { useState, useLayoutEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { updateProfile, addProfile, deleteProfile } from '../services/firestoreRepository';
import { auth } from '../services/firebase';
import { useAuth } from '../components/context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function EditProfileScreen({ route, navigation }) {
    const { profile, isNew } = route.params;
    const { refreshProfiles } = useAuth();

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
            <SafeAreaView style={styles.container}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <MaterialCommunityIcons name="arrow-left" size={24} color="#666" />
                        </TouchableOpacity>
                        <Text style={styles.title}>{isNew ? 'New Profile' : 'Edit Profile'}</Text>
                        <TouchableOpacity onPress={handleSave} disabled={loading}>
                            {loading ? <ActivityIndicator color="#007AFF" /> : <Text style={styles.saveText}>Save</Text>}
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps='handled'>
                        <Text style={styles.label}>Profile Name</Text>
                        {isNew ? (
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Enter Name"
                            />
                        ) : (
                            <View style={styles.disabledInput}>
                                <Text style={{ fontSize: 16, color: '#666' }}>{name}</Text>
                                <Text style={{ fontSize: 12, color: '#999' }}>(Managed by user)</Text>
                            </View>
                        )}

                        <Text style={styles.label}>Monthly Limit (VND)</Text>
                        <TextInput
                            style={styles.input}
                            value={limit}
                            onChangeText={setLimit}
                            keyboardType="numeric"
                        />

                        <Text style={styles.label}>Role</Text>
                        {isOwner ? (
                            <View style={styles.disabledInput}>
                                <Text style={styles.disabledText}>Owner (Cannot change)</Text>
                                <MaterialCommunityIcons name="lock" size={16} color="#999" />
                            </View>
                        ) : (
                            <View style={styles.roleContainer}>
                                {['Partner', 'Child'].map(r => (
                                    <TouchableOpacity
                                        key={r}
                                        style={[styles.roleButton, role === r && styles.roleButtonActive]}
                                        onPress={() => setRole(r)}
                                    >
                                        <Text style={[styles.roleText, role === r && styles.roleTextActive]}>{r}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        <Text style={styles.label}>Profile PIN (Optional)</Text>
                        <Text style={styles.label}>Profile PIN</Text>
                        <View style={styles.pinContainer}>
                            <TextInput
                                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                value={pin}
                                onChangeText={setPin}
                                placeholder={hasPin ? "Enter new PIN to reset" : "Set a PIN"}
                                keyboardType="numeric"
                                secureTextEntry={true} // Always secure
                                maxLength={6}
                            />
                        </View>
                        <Text style={styles.helperText}>{hasPin ? "Leave empty to keep current PIN" : "Leave empty for no PIN"}</Text>

                        {hasPin && (
                            <TouchableOpacity
                                style={[styles.deleteButton, { marginTop: 10, backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }]}
                                onPress={async () => {
                                    setLoading(true);
                                    await updateProfile(auth.currentUser.uid, profile.id, { pin: '' });
                                    await refreshProfiles();
                                    setLoading(false);
                                    Alert.alert("Success", "PIN removed");
                                    navigation.goBack();
                                }}
                            >
                                <Text style={[styles.deleteText, { color: '#0284c7' }]}>Remove PIN Requirement</Text>
                            </TouchableOpacity>
                        )}

                        {!isNew && !isOwner && (
                            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                                <Text style={styles.deleteText}>Delete Profile</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </TouchableWithoutFeedback>
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
    saveText: { fontSize: 16, fontWeight: 'bold', color: '#007AFF' },
    title: { fontSize: 18, fontWeight: 'bold' },
    form: { padding: 20 },
    label: { fontSize: 14, color: '#666', marginTop: 20, marginBottom: 8, fontWeight: '600' },
    input: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    roleContainer: { flexDirection: 'row', marginBottom: 20 },
    roleButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
        marginHorizontal: 4,
        backgroundColor: 'white'
    },
    roleButtonActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
    roleText: { color: '#333' },
    roleTextActive: { color: 'white', fontWeight: 'bold' },
    disabledInput: {
        backgroundColor: '#f0f0f0',
        padding: 12,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd'
    },
    disabledText: { color: '#999' },
    deleteButton: {
        marginTop: 40,
        backgroundColor: '#fee2e2',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#fecaca'
    },
    deleteText: {
        color: '#dc2626',
        fontWeight: 'bold',
        fontSize: 16
    },
    helperText: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
        marginLeft: 4
    },
    pinContainer: {
        flexDirection: 'row',
        alignItems: 'center'
    }
});
