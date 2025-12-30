import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../components/context/AuthContext';

export default function SettingsScreen({ navigation }) {
    const { profile } = useAuth(); // Get current profile for role check

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.title}>Settings</Text>
                <View style={{ width: 24 }} />
            </View>


            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Family Management</Text>

                {profile?.role === 'Owner' && (
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => navigation.navigate('ManageProfiles')}
                    >
                        <Text style={styles.menuText}>Manage Profiles</Text>
                        <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
                    </TouchableOpacity>
                )}

                {profile?.role === 'Owner' && (
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => navigation.navigate('ManageCategories')}
                    >
                        <Text style={styles.menuText}>Manage Categories</Text>
                        <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
                    </TouchableOpacity>
                )}
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
