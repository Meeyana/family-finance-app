import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { updateProfile } from '../services/firestoreRepository';
import { auth } from '../services/firebase';
import { useAuth } from '../components/context/AuthContext';

export default function EditProfileScreen({ route, navigation }) {
    const { profile } = route.params;
    const { refreshProfiles } = useAuth(); // To update context after save

    const [name, setName] = useState(profile.name);
    const [limit, setLimit] = useState(String(profile.limit || 0));
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) {
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
            await updateProfile(auth.currentUser.uid, profile.id, {
                name: name.trim(),
                limit: numLimit
            });

            await refreshProfiles(); // Update global state

            Alert.alert("Success", "Profile updated!", [
                { text: "OK", onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            Alert.alert("Error", "Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Text style={styles.backText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Edit Profile</Text>
                    <TouchableOpacity onPress={handleSave} disabled={loading}>
                        {loading ? <ActivityIndicator color="#007AFF" /> : <Text style={styles.saveText}>Save</Text>}
                    </TouchableOpacity>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Profile Name</Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                    />

                    <Text style={styles.label}>Monthly Limit (VND)</Text>
                    <TextInput
                        style={styles.input}
                        value={limit}
                        onChangeText={setLimit}
                        keyboardType="numeric"
                    />

                    <Text style={styles.hint}>
                        Role: {profile.role} (Cannot be changed)
                    </Text>
                </View>
            </KeyboardAvoidingView>
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
    hint: { marginTop: 20, fontSize: 13, color: '#999', fontStyle: 'italic' },
});
