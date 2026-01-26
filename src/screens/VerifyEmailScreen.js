import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { useAuth } from '../components/context/AuthContext';
import { useTheme } from '../components/context/ThemeContext';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../services/firebase';

export default function VerifyEmailScreen({ navigation }) {
    const [success, setSuccess] = useState(false);
    const { user, logout, reloadUser } = useAuth(); // Destructure reloadUser
    const { theme } = useTheme();
    const colors = COLORS[theme];
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(false);

    const handleResendEmail = async () => {
        if (!user) return;
        setLoading(true);
        try {
            await sendEmailVerification(user);
            Alert.alert("Email Sent", `A new verification email has been sent to ${user.email}. Please check your inbox.`);
        } catch (error) {
            console.error("Resend Error:", error);
            if (error.code === 'auth/too-many-requests') {
                Alert.alert("Please Wait", "We have sent a request recently. Please check your email or wait a moment before trying again.");
            } else {
                Alert.alert("Error", error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCheckVerification = async () => {
        setChecking(true);
        try {
            // Using exposed method from AuthContext to force update the user object in context
            const updatedUser = await reloadUser();

            if (updatedUser?.emailVerified) {
                setSuccess(true);
                // We keep checking=true (or just rely on success state) to show the success UI
                // AppStack will detect the change in context and re-route automatically.
                // We can add a small delay if we want them to see the tick.
            } else {
                setChecking(false);
                Alert.alert("Not Verified", "We verified your status with the server, but your email is still marked as unverified. Please check your inbox and click the link.");
            }
        } catch (error) {
            console.error(error);
            setChecking(false);
            Alert.alert("Error", "Could not check verification status.");
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.content}>
                {success ? (
                    <View style={{ alignItems: 'center', width: '100%' }}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="checkmark-circle-outline" size={100} color={colors.success || '#10B981'} />
                        </View>
                        <Text style={[styles.title, { color: colors.primaryText }]}>Email Verified!</Text>
                        <Text style={[styles.description, { color: colors.secondaryText }]}>
                            Your email has been successfully verified. Redirecting you to the app...
                        </Text>
                        <ActivityIndicator size="large" color={colors.primaryAction} style={{ marginTop: 20 }} />
                    </View>
                ) : (
                    <>
                        <View style={styles.iconContainer}>
                            <Ionicons name="mail-unread-outline" size={80} color={colors.primaryAction} />
                        </View>

                        <Text style={[styles.title, { color: colors.primaryText }]}>Verify Your Email</Text>

                        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
                            We have sent a verification email to:
                        </Text>

                        <Text style={[styles.email, { color: colors.primaryText }]}>
                            {user?.email}
                        </Text>

                        <Text style={[styles.description, { color: colors.secondaryText }]}>
                            Please check your inbox and click the verification link to continue. If you don't see it, check your spam folder.
                        </Text>

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[styles.primaryButton, { backgroundColor: colors.primaryAction }]}
                                onPress={handleCheckVerification}
                                disabled={checking}
                            >
                                {checking ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>I have verified my email</Text>}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.secondaryButton, { borderColor: colors.divider }]}
                                onPress={handleResendEmail}
                                disabled={loading}
                            >
                                {loading ? <ActivityIndicator color={colors.primaryText} /> : <Text style={[styles.secondaryButtonText, { color: colors.primaryText }]}>Resend Verification Email</Text>}
                            </TouchableOpacity>
                        </View>
                    </>
                )}

                <TouchableOpacity onPress={handleLogout} style={styles.logoutLink}>
                    <Text style={[styles.logoutText, { color: colors.error }]}>Log Out</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: SPACING.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        marginBottom: SPACING.xl,
    },
    title: {
        fontSize: TYPOGRAPHY.size.h2,
        fontWeight: 'bold',
        marginBottom: SPACING.m,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: TYPOGRAPHY.size.body,
        textAlign: 'center',
        marginBottom: SPACING.xs,
    },
    email: {
        fontSize: TYPOGRAPHY.size.h3,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: SPACING.l,
    },
    description: {
        fontSize: TYPOGRAPHY.size.body,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: SPACING.xxl,
    },
    buttonContainer: {
        width: '100%',
        gap: SPACING.m,
    },
    primaryButton: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    secondaryButton: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        backgroundColor: 'transparent',
    },
    secondaryButtonText: {
        fontWeight: '600',
        fontSize: 16,
    },
    logoutLink: {
        marginTop: SPACING.xl,
        padding: SPACING.m,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '500',
    }
});
