import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../components/context/AuthContext';
import { updateProfile } from '../services/firestoreRepository';
import { auth } from '../services/firebase';

export default function ProfileDashboard({ route, navigation }) {
    const { profile: authProfile, userProfiles, refreshProfiles } = useAuth();

    // Use live data from userProfiles if possible, falling back to params/authProfile
    const targetId = route.params?.profile?.id || authProfile?.id;
    const profileData = userProfiles.find(p => p.id === targetId) || route.params?.profile || authProfile || {};

    const [name, setName] = useState(profileData.name || '');
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
                name: name.trim()
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
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.title}>My Profile</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                        <MaterialCommunityIcons name="account" size={60} color="white" />
                    </View>
                    {/* Placeholder for future image upload */}
                    <TouchableOpacity style={styles.editIconBadge} onPress={() => Alert.alert("Coming Soon", "Image upload not implemented yet")}>
                        <MaterialCommunityIcons name="camera" size={16} color="white" />
                    </TouchableOpacity>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Display Name</Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Enter your name"
                    />

                    <Text style={styles.label}>Role</Text>
                    <View style={styles.disabledInput}>
                        <Text style={styles.disabledText}>{profileData.role || 'User'}</Text>
                        <MaterialCommunityIcons name="lock" size={16} color="#999" />
                    </View>

                    <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
                        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.saveText}>Save Changes</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        paddingRight: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        padding: 24,
    },
    avatarContainer: {
        alignSelf: 'center',
        marginBottom: 32,
        position: 'relative',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editIconBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#007AFF',
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
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        marginBottom: 20,
        color: '#333',
    },
    disabledInput: {
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 12,
        padding: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    disabledText: {
        fontSize: 16,
        color: '#999',
    },
    saveButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    saveText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    }
});
