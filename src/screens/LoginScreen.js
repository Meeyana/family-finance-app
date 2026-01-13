import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, useColorScheme } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';

const DEMO_CREDENTIALS = {
    email: 'demo@quanlychitieu.com',
    password: 'demo@quanlychitieu.com'
};

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Theme
    const theme = useColorScheme() || 'light';
    const colors = COLORS[theme];

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please fill in both fields');
            return;
        }
        await performLogin(email, password);
    };

    const handleDemoLogin = async () => {
        console.log("🔐 Demo Login: Initiating...");
        await performLogin(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
    };

    const performLogin = async (loginEmail, loginPassword) => {
        console.log(`🔐 Login: Attempting login for ${loginEmail}`);
        setLoading(true);
        setError('');

        try {
            await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
            console.log(`🔐 Login: Success for ${loginEmail}`);
            // Navigation is handled by RootNavigator observing auth state
        } catch (err) {
            console.log(`🔐 Login: Failed`, err.message);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <View style={styles.header}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.primaryAction + '10' }]}>
                            <Ionicons name="wallet-outline" size={40} color={colors.primaryAction} />
                        </View>
                        <Text style={[styles.title, { color: colors.primaryText }]}>Family Finance</Text>
                        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>Sign in to manage your wealth</Text>
                    </View>

                    <View style={styles.form}>
                        {error ? (
                            <View style={[styles.errorContainer, { backgroundColor: colors.error + '10' }]}>
                                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                            </View>
                        ) : null}

                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.secondaryText }]}>EMAIL</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.surface, color: colors.primaryText, borderColor: colors.divider }]}
                                placeholder="name@example.com"
                                placeholderTextColor={colors.secondaryText}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.secondaryText }]}>PASSWORD</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.surface, color: colors.primaryText, borderColor: colors.divider }]}
                                placeholder="••••••••"
                                placeholderTextColor={colors.secondaryText}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: colors.primaryAction }]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Sign In</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.demoButton}
                            onPress={handleDemoLogin}
                            disabled={loading}
                        >
                            <Text style={[styles.demoText, { color: colors.secondaryText }]}>Try Demo User</Text>
                            <Feather name="arrow-right" size={16} color={colors.secondaryText} />
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: SPACING.screenPadding,
    },
    header: {
        marginBottom: 48,
        alignItems: 'center',
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.l,
    },
    title: {
        fontSize: TYPOGRAPHY.size.h1,
        fontWeight: TYPOGRAPHY.weight.bold,
        marginBottom: SPACING.xs,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: TYPOGRAPHY.size.body,
        textAlign: 'center',
    },
    form: {
        width: '100%',
    },
    inputContainer: {
        marginBottom: SPACING.l,
    },
    label: {
        fontSize: TYPOGRAPHY.size.caption,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        height: 56,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: TYPOGRAPHY.size.body,
    },
    errorContainer: {
        padding: 12,
        borderRadius: 8,
        marginBottom: SPACING.l,
        alignItems: 'center',
    },
    errorText: {
        fontSize: TYPOGRAPHY.size.caption,
        fontWeight: '600',
    },
    button: {
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: SPACING.m,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    buttonText: {
        color: '#fff',
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: 'bold',
    },
    demoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        padding: 12,
    },
    demoText: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: '500',
        marginRight: 8,
    }
});
