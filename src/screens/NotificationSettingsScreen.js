
import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, Switch, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import { useTheme } from '../components/context/ThemeContext';
import { useAuth } from '../components/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { registerForPushNotificationsAsync, unregisterPushNotificationsAsync } from '../services/notificationService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function NotificationSettingsScreen({ navigation }) {
    const { theme } = useTheme();
    const colors = COLORS[theme];
    const { user, profile } = useAuth();

    const [enabled, setEnabled] = useState(false);
    const [loading, setLoading] = useState(true);

    useLayoutEffect(() => {
        navigation.setOptions({ headerShown: false });
    }, [navigation]);

    useEffect(() => {
        checkStatus();
    }, [profile]);

    const checkStatus = async () => {
        if (!user || !profile) return;
        try {
            // Read status from the PROFILE document, not the main user
            const profileDoc = await getDoc(doc(db, 'users', user.uid, 'profiles', profile.id));
            if (profileDoc.exists()) {
                const data = profileDoc.data();
                // Check if manually enabled AND has a token
                const isEnabled = data.notificationsEnabled === true && !!data.pushToken;
                setEnabled(isEnabled);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const toggleSwitch = async (value) => {
        setEnabled(value); // Optimistic update
        try {
            if (value) {
                // Register for THIS profile
                const token = await registerForPushNotificationsAsync(user.uid, profile.id);
                if (!token) {
                    setEnabled(false); // Revert
                    Alert.alert("Permission Required", "Please enable notifications in your device settings.");
                }
            } else {
                // Unregister for THIS profile
                await unregisterPushNotificationsAsync(user.uid, profile.id);
            }
        } catch (e) {
            console.error(e);
            setEnabled(!value); // Revert on error
            Alert.alert("Error", "Failed to update settings");
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.divider }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.primaryText }]}>Notifications</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                <View style={[styles.card, { backgroundColor: colors.surface }]}>
                    <View style={styles.row}>
                        <View style={{ flex: 1, paddingRight: 16 }}>
                            <Text style={[styles.label, { color: colors.primaryText }]}>Allow Notifications</Text>
                            <Text style={[styles.description, { color: colors.secondaryText }]}>
                                Receive alerts for budget limits, new transactions, and family updates.
                            </Text>
                        </View>
                        {loading ? (
                            <ActivityIndicator size="small" color={colors.primaryAction} />
                        ) : (
                            <Switch
                                trackColor={{ false: "#767577", true: colors.primaryAction }}
                                thumbColor={enabled ? "#ffffff" : "#f4f3f4"}
                                ios_backgroundColor="#3e3e3e"
                                onValueChange={toggleSwitch}
                                value={enabled}
                            />
                        )}
                    </View>
                </View>

                {/* Additional Info / Future Settings */}
                <View style={{ padding: SPACING.m }}>
                    <Text style={{ fontSize: 13, color: colors.secondaryText, lineHeight: 20 }}>
                        <Ionicons name="information-circle-outline" size={14} />
                        {' '}More specific controls (e.g. Budget Alerts only) will be available in a future update.
                    </Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.screenPadding,
        paddingVertical: SPACING.m,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.size.h3,
        fontWeight: TYPOGRAPHY.weight.bold,
    },
    content: {
        padding: SPACING.local,
    },
    card: {
        borderRadius: 12,
        padding: SPACING.l,
        marginBottom: SPACING.m,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    label: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    description: {
        fontSize: TYPOGRAPHY.size.caption,
        lineHeight: 18,
    },
});
