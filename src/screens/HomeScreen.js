// Purpose: Profile Selection Screen
// Connected Flow: GLOBAL_FLOW (Select_Profile)
// Navigation: AppStack (Initial Route) -> ProfileDashboard | AccountDashboard

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../components/context/AuthContext';
import { canViewAccountDashboard } from '../services/permissionService';

export default function HomeScreen({ navigation }) {
    const { userProfiles, selectProfile } = useAuth();

    // Check if any available profile has Owner/Partner role to show the dashboard button
    const showAccountDashboard = useMemo(() => {
        return userProfiles.some(p => canViewAccountDashboard(p.role));
    }, [userProfiles]);

    const handleProfileSelect = (profile) => {
        console.log(`👤 Navigation: Selecting profile [${profile.name}]`);
        selectProfile(profile);
    };

    const handleLogout = async () => {
        try {
            console.log('👋 Auth: Logging out...');
            await signOut(auth);
        } catch (error) {
            console.error('Logout error:', error);
            Alert.alert('Error', 'Failed to log out');
        }
    };

    const renderProfileItem = ({ item }) => (
        <TouchableOpacity
            style={styles.profileCard}
            onPress={() => handleProfileSelect(item)}
        >
            <View style={styles.avatarPlaceholder}>
                <Text style={{ fontSize: 24 }}>{item.avatar || '👤'}</Text>
            </View>
            <Text style={styles.profileName}>{item.name}</Text>
            <Text style={styles.profileRole}>{item.role}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Who is spending?</Text>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                    <MaterialCommunityIcons name="logout" size={24} color="#dc2626" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={userProfiles}
                renderItem={renderProfileItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                numColumns={2}
                columnWrapperStyle={styles.row}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        padding: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    logoutButton: {
        padding: 8,
    },
    logoutText: {
        color: '#dc2626',
        fontSize: 14,
        fontWeight: '600',
    },
    listContent: {
        padding: 16,
    },
    row: {
        justifyContent: 'space-between',
    },
    profileCard: {
        width: '48%',
        backgroundColor: '#f8f9fa',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#eee',
        // Shadow for iOS
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        // Elevation for Android
        elevation: 2,
    },
    avatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#e1e4e8',
        marginBottom: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        textAlign: 'center',
        marginBottom: 4,
    },
    profileRole: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    footer: {
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    accountButton: {
        backgroundColor: '#1a1a1a',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    accountButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
