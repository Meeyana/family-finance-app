import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';

export default function SettingsScreen({ navigation }) {

    const handleLogout = async () => {
        try {
            await signOut(auth);
            // AuthContext will auto-redirect to Login
        } catch (error) {
            Alert.alert("Error", "Failed to logout");
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Settings</Text>
                <View style={{ width: 50 }} />
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Family Management</Text>

                <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => navigation.navigate('ManageProfiles')}
                >
                    <Text style={styles.menuText}>Manage Profiles</Text>
                    <Text style={styles.arrow}>></Text>
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account</Text>

                <TouchableOpacity
                    style={[styles.menuItem, styles.logoutButton]}
                    onPress={handleLogout}
                >
                    <Text style={[styles.menuText, styles.logoutText]}>Log Out</Text>
                </TouchableOpacity>
            </View>
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
    backText: { fontSize: 16, color: '#007AFF' },
    title: { fontSize: 18, fontWeight: 'bold' },
    section: { marginTop: 24, backgroundColor: 'white', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#eee' },
    sectionTitle: { padding: 16, fontSize: 13, color: '#666', textTransform: 'uppercase', backgroundColor: '#f5f7fa' },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    menuText: { fontSize: 16, color: '#333' },
    arrow: { fontSize: 18, color: '#ccc' },
    logoutButton: { borderBottomWidth: 0 },
    logoutText: { color: '#dc2626' },
});
