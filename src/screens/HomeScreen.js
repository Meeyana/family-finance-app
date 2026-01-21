import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, DeviceEventEmitter, Modal, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, useColorScheme, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../components/context/AuthContext';
import { updateProfile } from '../services/firestoreRepository';
import { canViewAccountDashboard } from '../services/permissionService';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import Avatar from '../components/Avatar';
import { Asset } from 'expo-asset'; // Import Asset
import { getAvatarSource } from '../utils/avatars'; // Import helper
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
// Increased padding and gap to slightly shrink the avatars as requested
const SCREEN_PADDING = SPACING.xxl; // 32
const ROW_GAP = SPACING.l; // 16
const ITEM_WIDTH = (width - (SCREEN_PADDING * 2) - ROW_GAP) / 2;

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
    const [isLoggingIn, setIsLoggingIn] = useState(false);

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
            // Show loading state
            setIsLoggingIn(true);

            const performLogin = async () => {
                try {
                    // Preload Avatar if exists
                    if (selectedProfileForAuth.avatarId) {
                        const source = getAvatarSource(selectedProfileForAuth.avatarId);
                        if (source) {
                            console.log(`🖼️ Preloading avatar: ${selectedProfileForAuth.avatarId}`);
                            await Asset.fromModule(source).downloadAsync();
                        }
                    }
                } catch (e) {
                    console.warn("Failed to preload avatar", e);
                } finally {
                    setAuthModalVisible(false);
                    setIsLoggingIn(false);
                    selectProfile(selectedProfileForAuth);
                }
            };

            performLogin();
        } else {
            setPinError('Incorrect PIN');
            setEnteredPin('');
        }
    };

    const handleCreatePinSubmit = async () => {
        if (newPin.length !== 4) {
            Alert.alert("Invalid PIN", "PIN must be exactly 4 digits");
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

    const getStatusColor = (status) => {
        if (!status) return colors.secondaryText;
        const s = status.toLowerCase();
        if (s.includes('healthy') || s.includes('good')) return '#10B981'; // Emerald
        if (s.includes('deficit')) return '#F97316'; // Orange
        if (s.includes('risk') || s.includes('warning')) return '#F59E0B'; // Amber
        if (s.includes('critical') || s.includes('danger') || s.includes('over')) return '#EF4444'; // Red
        return '#6B7280'; // Gray
    };

    const renderProfileItem = ({ item }) => {
        const stats = profileStats[item.id];
        const status = stats?.financialStatus || '';
        const statusColor = getStatusColor(status);

        return (
            <TouchableOpacity
                style={styles.profileCard}
                onPress={() => handleProfileSelect(item)}
            >
                <View style={styles.avatarContainer}>
                    <Avatar
                        name={item.name}
                        avatarId={item.avatarId}
                        size={ITEM_WIDTH}
                        backgroundColor={item.avatarId ? 'transparent' : '#E0E0E0'}
                        textColor="#333333"
                        borderRadius={16}
                        fontSize={48}
                    />
                    {status ? (
                        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                            {/* Strip emojis/symbols and trim */}
                            <Text style={styles.statusBadgeText}>
                                {status.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{238C}\u{2B05}-\u{2B07}\u{2190}-\u{2195}\u{200D}]/gu, '').trim()}
                            </Text>
                        </View>
                    ) : null}
                </View>

                <Text style={[styles.profileName, { color: colors.primaryText }]}>{item.name}</Text>
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
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.modalOverlay}
                    >
                        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                            <Text style={[styles.modalTitle, { color: colors.primaryText }]}>Enter PIN</Text>
                            <Text style={[styles.modalSubtitle, { color: colors.secondaryText }]}>for {selectedProfileForAuth?.name}</Text>

                            {isLoggingIn ? (
                                <View style={{ alignItems: 'center', marginVertical: 20 }}>
                                    <ActivityIndicator size="large" color={colors.primaryAction} />
                                    <Text style={{ marginTop: 12, color: colors.secondaryText, fontWeight: '500' }}>Accessing Profile...</Text>
                                </View>
                            ) : (
                                <>
                                    <TextInput
                                        style={[styles.pinInput, { color: colors.primaryText, borderColor: pinError ? colors.error : colors.divider }]}
                                        value={enteredPin}
                                        onChangeText={setEnteredPin}
                                        placeholder="****"
                                        placeholderTextColor={colors.secondaryText}
                                        keyboardType="numeric"
                                        secureTextEntry
                                        maxLength={4}
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
                                </>
                            )}
                        </View>
                    </KeyboardAvoidingView>
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
                                placeholder="Create PIN (4 digits)"
                                placeholderTextColor={colors.secondaryText}
                                keyboardType="numeric"
                                secureTextEntry
                                maxLength={4}
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
        paddingHorizontal: SPACING.xxl, // Match the logic above
        paddingVertical: SPACING.screenPadding,
    },
    row: {
        justifyContent: 'space-between',
        gap: SPACING.l, // Match logic above
    },
    profileCard: {
        width: ITEM_WIDTH,
        paddingVertical: 0, // Removed padding to allow full flush
        paddingHorizontal: 0,
        borderRadius: 16,
        marginBottom: 24,
        alignItems: 'center',
        // Removed borders and background for clean look
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 16,
        marginBottom: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileName: {
        fontSize: 18, // Slightly larger
        fontWeight: '600',
        marginBottom: 4,
        textAlign: 'center',
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 12,
    },
    statusBadge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: '#10B981', // Dynamic color overrides this
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        // Optional shadow for visibility on images
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    statusBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },

    // Modal Styles
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)', // Slightly lighter overlay
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%', // Slightly narrower
        borderRadius: 28, // iOS style large radius
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 40, // Increased bottom padding significantly
        alignItems: 'center',
        backgroundColor: '#FFFFFF', // Force white/surface
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
        color: '#111827',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 24,
    },
    pinInput: {
        width: '100%',
        backgroundColor: '#F3F4F6', // Filled background
        borderRadius: 16,
        padding: 16,
        fontSize: 24,
        textAlign: 'center',
        letterSpacing: 12, // Wider spacing for PIN
        marginBottom: 24,
        height: 64,
        borderWidth: 0, // Remove border
        color: '#111827',
    },
    errorText: {
        marginBottom: 16,
        fontWeight: '600',
        color: '#EF4444',
    },
    modalButtons: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
    },
    enterButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        backgroundColor: '#10B981', // Emerald Green
    },
    cancelText: {
        fontWeight: '600',
        color: '#4B5563',
        fontSize: 16,
    },
    enterText: {
        fontWeight: '600',
        color: '#FFFFFF',
        fontSize: 16,
    }
});
