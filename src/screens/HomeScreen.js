import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, DeviceEventEmitter, Modal, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../components/context/AuthContext';
import { updateProfile } from '../services/firestoreRepository';
import { canViewAccountDashboard } from '../services/permissionService';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';

export default function HomeScreen({ navigation }) {
    const { userProfiles, selectProfile, user, refreshProfiles } = useAuth();
    const theme = useColorScheme() || 'light';
    const colors = COLORS[theme];

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
    const [createPinModalVisible, setCreatePinModalVisible] = useState(false);
    const [selectedProfileForAuth, setSelectedProfileForAuth] = useState(null);
    const [enteredPin, setEnteredPin] = useState('');
    const [newPin, setNewPin] = useState('');
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
                style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.divider }]}
                onPress={() => handleProfileSelect(item)}
            >
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.background }]}>
                    <Text style={{ fontSize: 24, paddingBottom: 2 }}>{item.avatar || '👤'}</Text>
                </View>
                <Text style={[styles.profileName, { color: colors.primaryText }]}>{item.name}</Text>
                <Text style={[styles.profileRole, { color: colors.secondaryText }]}>{item.role}</Text>
                {status ? (
                    <View style={{ marginTop: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, backgroundColor: colors.background }}>
                        <Text style={[styles.statusText, { color: colors.primaryText }]}>{status}</Text>
                    </View>
                ) : null}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.title, { color: colors.primaryText }]}>Who is spending?</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                    <Ionicons name="log-out-outline" size={24} color={colors.error} />
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
                        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                            <Text style={[styles.modalTitle, { color: colors.primaryText }]}>Enter PIN</Text>
                            <Text style={[styles.modalSubtitle, { color: colors.secondaryText }]}>for {selectedProfileForAuth?.name}</Text>

                            <TextInput
                                style={[styles.pinInput, { color: colors.primaryText, borderColor: pinError ? colors.error : colors.divider }]}
                                value={enteredPin}
                                onChangeText={setEnteredPin}
                                placeholder="****"
                                placeholderTextColor={colors.secondaryText}
                                keyboardType="numeric"
                                secureTextEntry
                                maxLength={6}
                                autoFocus={true}
                            />
                            {pinError ? <Text style={[styles.errorText, { color: colors.error }]}>{pinError}</Text> : null}

                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={[styles.cancelButton, { backgroundColor: colors.background }]} onPress={() => setAuthModalVisible(false)}>
                                    <Text style={[styles.cancelText, { color: colors.secondaryText }]}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.enterButton, { backgroundColor: colors.primaryAction }]} onPress={handlePinSubmit}>
                                    <Text style={[styles.enterText, { color: '#fff' }]}>Enter</Text>
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
                        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.modalContent, { backgroundColor: colors.background }]}>
                            <MaterialCommunityIcons name="shield-check" size={48} color={colors.primaryAction} style={{ marginBottom: 16 }} />
                            <Text style={[styles.modalTitle, { color: colors.primaryText }]}>Protect your Profile</Text>
                            <Text style={[styles.modalSubtitle, { textAlign: 'center', marginBottom: 24, color: colors.secondaryText }]}>
                                Set a PIN for {selectedProfileForAuth?.name} to prevent unauthorized access.
                            </Text>

                            <TextInput
                                style={[styles.pinInput, { color: colors.primaryText, borderColor: colors.divider, backgroundColor: colors.surface }]}
                                value={newPin}
                                onChangeText={setNewPin}
                                placeholder="Create PIN (4-6 digits)"
                                placeholderTextColor={colors.secondaryText}
                                keyboardType="numeric"
                                secureTextEntry
                                maxLength={6}
                                autoFocus={true}
                            />

                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={[styles.cancelButton, { backgroundColor: colors.surface }]} onPress={handleSkipPin}>
                                    <Text style={[styles.cancelText, { color: colors.secondaryText }]}>Not Now</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.enterButton, { backgroundColor: colors.primaryAction }]} onPress={handleCreatePinSubmit} disabled={creatingPin}>
                                    <Text style={[styles.enterText, { color: '#fff' }]}>{creatingPin ? 'Saving...' : 'Set PIN'}</Text>
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
    },
    header: {
        padding: SPACING.l,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: TYPOGRAPHY.size.h2,
        fontWeight: TYPOGRAPHY.weight.bold,
    },
    logoutButton: {
        padding: 8,
    },
    listContent: {
        padding: SPACING.screenPadding,
    },
    row: {
        justifyContent: 'space-between',
        gap: SPACING.m,
    },
    profileCard: {
        width: '47%',
        paddingVertical: 24,
        paddingHorizontal: 16,
        borderRadius: 16,
        marginBottom: 16,
        alignItems: 'center',
        borderWidth: 1,
        // No shadow, neo-bank minimal
    },
    avatarPlaceholder: {
        width: 64,
        height: 64,
        borderRadius: 32,
        marginBottom: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileName: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: TYPOGRAPHY.weight.bold,
        marginBottom: 4,
        textAlign: 'center',
    },
    profileRole: {
        fontSize: TYPOGRAPHY.size.caption,
        textAlign: 'center',
    },
    statusText: {
        fontSize: TYPOGRAPHY.size.caption,
        fontWeight: 'bold',
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)', // Darker overlay for focus
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 10,
    },
    modalTitle: {
        fontSize: TYPOGRAPHY.size.h3,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: TYPOGRAPHY.size.body,
        marginBottom: 24,
    },
    pinInput: {
        width: '100%',
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        fontSize: 24,
        textAlign: 'center',
        letterSpacing: 8,
        marginBottom: 16,
        height: 60,
    },
    errorText: {
        marginBottom: 16,
        fontWeight: 'bold',
    },
    modalButtons: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    enterButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelText: {
        fontWeight: '600',
    },
    enterText: {
        fontWeight: 'bold',
    }
});
