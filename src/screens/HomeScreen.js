// Purpose: Profile Selection Screen
// Connected Flow: GLOBAL_FLOW (Select_Profile)
// Navigation: AppStack (Initial Route) -> ProfileDashboard | AccountDashboard

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, DeviceEventEmitter, Modal, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../components/context/AuthContext';
import { updateProfile } from '../services/firestoreRepository';
import { canViewAccountDashboard } from '../services/permissionService';

export default function HomeScreen({ navigation }) {
    const { userProfiles, selectProfile, user, refreshProfiles } = useAuth(); // Added user, refreshProfiles

    // Check if any available profile has Owner/Partner role to show the dashboard button
    const showAccountDashboard = useMemo(() => {
        return userProfiles.some(p => canViewAccountDashboard(p.role));
    }, [userProfiles]);

    const [profileStats, setProfileStats] = useState({});

    // Fetch stats for "Who is spending?"
    React.useEffect(() => {
        const loadStats = async () => {
            // Accessing as Owner to get global view
            try {
                const { getAccountData } = require('../services/dataService');
                const data = await getAccountData('Owner', new Date());
                setProfileStats(data.budgets.profiles);
            } catch (e) {
                console.log("No stats available", e);
            }
        };
        loadStats();

        const sub = DeviceEventEmitter.addListener('refresh_profile_dashboard', loadStats);
        return () => sub.remove();
    }, []);

    // PIN Logic
    const [authModalVisible, setAuthModalVisible] = useState(false);
    const [createPinModalVisible, setCreatePinModalVisible] = useState(false); // NEW: Create PIN
    const [selectedProfileForAuth, setSelectedProfileForAuth] = useState(null);
    const [enteredPin, setEnteredPin] = useState('');
    const [newPin, setNewPin] = useState(''); // NEW: For creation
    const [pinError, setPinError] = useState('');
    const [creatingPin, setCreatingPin] = useState(false);

    const handleProfileSelect = (profile) => {
        if (profile.pin && profile.pin.length > 0) {
            // Case A: Protected -> Auth
            setSelectedProfileForAuth(profile);
            setEnteredPin('');
            setPinError('');
            setAuthModalVisible(true);
        } else if (!profile.hasSkippedPin) {
            // Case B: Unprotected -> Suggest PIN for everyone (Netflix Style)
            // If they haven't explicitly skipped it.
            setSelectedProfileForAuth(profile);
            setNewPin('');
            setCreatePinModalVisible(true);
        } else {
            // Case C: Open Access (Skipped PIN)
            console.log(`👤 Navigation: Selecting profile [${profile.name}]`);
            selectProfile(profile);
        }
    };

    const handlePinSubmit = () => {
        if (!enteredPin) return;

        if (enteredPin === selectedProfileForAuth.pin) {
            setAuthModalVisible(false);
            selectProfile(selectedProfileForAuth);
        } else {
            setPinError('Incorrect PIN');
            setEnteredPin('');
        }
    };

    const handleCreatePinSubmit = async () => {
        if (newPin.length < 4) {
            Alert.alert("Invalid PIN", "PIN must be 4-6 digits");
            return;
        }

        setCreatingPin(true);
        try {
            // Save PIN to Firestore
            await updateProfile(user.uid, selectedProfileForAuth.id, {
                pin: newPin
            });

            // Refresh local state
            await refreshProfiles();

            setCreatePinModalVisible(false);

            // Update the selected profile object locally to continue login immediately
            const updatedProfile = { ...selectedProfileForAuth, pin: newPin };
            selectProfile(updatedProfile);

            Alert.alert("Secure", "Profile PIN set successfully!");
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to save PIN");
        } finally {
            setCreatingPin(false);
        }
    };

    const handleSkipPin = async () => {
        try {
            // Persist that they skipped so we don't ask again
            await updateProfile(user.uid, selectedProfileForAuth.id, {
                hasSkippedPin: true
            });
            await refreshProfiles();
        } catch (error) {
            console.log("Error saving skip preference", error);
        } finally {
            setCreatePinModalVisible(false);
            selectProfile(selectedProfileForAuth);
        }
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

    const renderProfileItem = ({ item }) => {
        const stats = profileStats[item.id];
        const status = stats?.financialStatus || '';

        return (
            <TouchableOpacity
                style={styles.profileCard}
                onPress={() => handleProfileSelect(item)}
            >
                <View style={styles.avatarPlaceholder}>
                    <Text style={{ fontSize: 24 }}>{item.avatar || '👤'}</Text>
                </View>
                <Text style={styles.profileName}>{item.name}</Text>
                <Text style={styles.profileRole}>{item.role}</Text>
                {status ? <Text style={styles.statusText}>{status}</Text> : null}
            </TouchableOpacity>
        );
    };

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

            {/* PIN Entry Modal (Login) */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={authModalVisible}
                onRequestClose={() => setAuthModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.modalOverlay}>
                        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Enter PIN</Text>
                            <Text style={styles.modalSubtitle}>for {selectedProfileForAuth?.name}</Text>

                            <TextInput
                                style={[styles.pinInput, pinError ? styles.inputError : null]}
                                value={enteredPin}
                                onChangeText={setEnteredPin}
                                placeholder="****"
                                placeholderTextColor="#ccc"
                                keyboardType="numeric"
                                secureTextEntry
                                maxLength={6}
                                autoFocus={true}
                            />
                            {pinError ? <Text style={styles.errorText}>{pinError}</Text> : null}

                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={styles.cancelButton} onPress={() => setAuthModalVisible(false)}>
                                    <Text style={styles.cancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.enterButton} onPress={handlePinSubmit}>
                                    <Text style={styles.enterText}>Enter</Text>
                                </TouchableOpacity>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Create PIN Modal (Setup) */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={createPinModalVisible}
                onRequestClose={() => setCreatePinModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.modalOverlay}>
                        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.modalContent, { backgroundColor: '#f0f9ff' }]}>
                            <MaterialCommunityIcons name="shield-check" size={48} color="#007AFF" style={{ marginBottom: 16 }} />
                            <Text style={styles.modalTitle}>Protect your Profile</Text>
                            <Text style={[styles.modalSubtitle, { textAlign: 'center', marginBottom: 24 }]}>
                                Set a PIN for {selectedProfileForAuth?.name} to prevent unauthorized access.
                            </Text>

                            <TextInput
                                style={styles.pinInput}
                                value={newPin}
                                onChangeText={setNewPin}
                                placeholder="Create PIN (4-6 digits)"
                                placeholderTextColor="#999"
                                keyboardType="numeric"
                                secureTextEntry
                                maxLength={6}
                                autoFocus={true}
                            />

                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={styles.cancelButton} onPress={handleSkipPin}>
                                    <Text style={styles.cancelText}>Not Now</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.enterButton} onPress={handleCreatePinSubmit} disabled={creatingPin}>
                                    <Text style={styles.enterText}>{creatingPin ? 'Saving...' : 'Set PIN'}</Text>
                                </TouchableOpacity>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
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
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 4,
        color: '#333',
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
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
    },
    pinInput: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        padding: 16,
        fontSize: 24,
        textAlign: 'center',
        letterSpacing: 8,
        marginBottom: 10,
    },
    inputError: {
        borderColor: '#dc2626',
        backgroundColor: '#fee2e2'
    },
    errorText: {
        color: '#dc2626',
        marginBottom: 10,
    },
    modalButtons: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
        marginTop: 10,
    },
    cancelButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#f5f5f5',
        alignItems: 'center',
    },
    enterButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#007AFF',
        alignItems: 'center',
    },
    cancelText: {
        color: '#666',
        fontWeight: '600',
    },
    enterText: {
        color: 'white',
        fontWeight: 'bold',
    }
});
