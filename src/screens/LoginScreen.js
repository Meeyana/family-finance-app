import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Modal } from 'react-native';
import { useTheme } from '../components/context/ThemeContext';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import { Alert } from 'react-native';

const DEMO_CREDENTIALS = {
    email: 'demo@quanlychitieu.com',
    password: 'demo@quanlychitieu.com'
};

export default function LoginScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Forgot Password State
    const [resetModalVisible, setResetModalVisible] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    const [resetSent, setResetSent] = useState(false);

    // Theme
    const { theme } = useTheme();
    const colors = COLORS[theme];

    // Open Modal
    const handleForgotPassword = () => {
        setResetEmail(email); // Pre-fill if they typed it already
        setResetModalVisible(true);
    };

    const handleSendResetEmail = async () => {
        if (!resetEmail) {
            Alert.alert("Required", "Please enter your email address.");
            return;
        }

        setResetLoading(true);
        try {
            await sendPasswordResetEmail(auth, resetEmail);
            // Close modal first
            // setResetModalVisible(false); // Keep modal open to show success message
            // Then show success
            setResetSent(true); // Show inline success message
        } catch (error) {
            console.error("Forgot Password Error:", error);
            Alert.alert("Error", error.message);
        } finally {
            setResetLoading(false);
        }
    };

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please fill in both fields');
            return;
        }
        await performLogin(email, password);
    };

    const handleDemoLogin = async () => {
        console.log("Demo Login: Initiating...");
        setLoading(true);
        setError('');
        try {
            await signInWithEmailAndPassword(auth, DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
            console.log("Demo Login: Success");
        } catch (err) {
            console.log("Demo Login Failed:", err.code, err.message);
            // If user doesn't exist, create it on the fly
            if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') {
                try {
                    console.log("Demo User not found, creating new Demo User...");
                    await createUserWithEmailAndPassword(auth, DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
                    console.log("Demo User Created & Logged In");
                } catch (createErr) {
                    console.error("Failed to create demo user:", createErr);
                    setError("Could not initialize Demo User. " + createErr.message);
                }
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const performLogin = async (loginEmail, loginPassword) => {
        console.log(`Login: Attempting login for ${loginEmail}`);
        setLoading(true);
        setError('');

        try {
            await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
            console.log(`Login: Success for ${loginEmail}`);
            // Navigation is handled by RootNavigator observing auth state
        } catch (err) {
            console.log(`Login: Failed`, err.message);
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
                        <TouchableOpacity
                            onPress={() => {
                                if (navigation.canGoBack()) {
                                    navigation.goBack();
                                } else {
                                    navigation.navigate('Welcome');
                                }
                            }}
                            style={styles.backButton}
                        >
                            <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
                        </TouchableOpacity>
                        <View style={styles.headerTitleContainer}>
                            <Text style={[styles.title, { color: colors.primaryText }]}>Log in</Text>
                        </View>
                        {/* Empty view to balance header */}
                        <View style={{ width: 24 }} />
                    </View>

                    <View style={styles.form}>
                        {error ? (
                            <View style={[styles.errorContainer, { backgroundColor: colors.error + '10' }]}>
                                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                            </View>
                        ) : null}

                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.secondaryText }]}>Email</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.primaryText, borderColor: colors.divider }]}
                                placeholder="name@example.com"
                                placeholderTextColor={colors.secondaryText}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                textContentType="username"
                                autoComplete="email"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.secondaryText }]}>Password</Text>
                            <View style={[styles.passwordContainer, {
                                backgroundColor: colors.inputBackground,
                                borderColor: colors.divider
                            }]}>
                                <TextInput
                                    style={[styles.passwordInput, {
                                        color: colors.primaryText,
                                    }]}
                                    placeholder="••••••••"
                                    placeholderTextColor={colors.secondaryText}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    textContentType="password"
                                    autoComplete="password"
                                />
                                <TouchableOpacity
                                    style={styles.eyeIcon}
                                    onPress={() => setShowPassword(!showPassword)}
                                >
                                    <Ionicons
                                        name={showPassword ? "eye" : "eye-off"}
                                        size={24}
                                        color={colors.secondaryText}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPassword}>
                            <Text style={[styles.forgotPasswordText, { color: colors.secondaryText }]}>Forgot your password?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: colors.primaryAction }]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Log in</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.demoButton}
                            onPress={handleDemoLogin}
                            disabled={loading}
                        >
                            <Text style={[styles.demoText, { color: colors.secondaryText }]}>Use Demo User</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Forgot Password Modal - Full Screen */}
                    <Modal
                        animationType="slide"
                        transparent={false}
                        visible={resetModalVisible}
                        onRequestClose={() => setResetModalVisible(false)}
                    >
                        <View style={[styles.modalFullScreen, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
                            <KeyboardAvoidingView
                                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                                style={styles.modalKeyboardView}
                            >
                                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                                    <View style={styles.modalInnerContent}>
                                        <View style={styles.modalHeader}>
                                            <Text style={[styles.modalTitle, { color: colors.primaryText }]}>Forgot Password</Text>
                                            <TouchableOpacity onPress={() => { setResetModalVisible(false); setResetSent(false); }}>
                                                <Ionicons name="close" size={24} color={colors.primaryText} />
                                            </TouchableOpacity>
                                        </View>

                                        {resetSent ? (
                                            <View style={{ alignItems: 'center', paddingHorizontal: 10 }}>
                                                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.success + '20', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
                                                    <Ionicons name="mail-open-outline" size={40} color={colors.success} />
                                                </View>
                                                <Text style={[styles.successTitle, { color: colors.success, marginBottom: 12 }]}>Email Sent Successfully!</Text>
                                                <Text style={[styles.modalText, { color: colors.primaryText, textAlign: 'center', lineHeight: 22 }]}>
                                                    We've sent a password reset link to <Text style={{ fontWeight: 'bold' }}>{resetEmail}</Text>.
                                                </Text>

                                                <View style={[styles.tipBox, { backgroundColor: colors.surface, borderColor: colors.divider, borderWidth: 1 }]}>
                                                    <Ionicons name="information-circle-outline" size={20} color={colors.warning} />
                                                    <Text style={[styles.tipText, { color: colors.secondaryText }]}>
                                                        Don't see it? Check your <Text style={{ fontWeight: 'bold', color: colors.warning }}>Spam</Text> or Junk folder.
                                                    </Text>
                                                </View>

                                                <TouchableOpacity
                                                    style={[styles.button, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider, marginTop: 24, width: '100%' }]}
                                                    onPress={() => { setResetModalVisible(false); setResetSent(false); }}
                                                >
                                                    <Text style={[styles.buttonText, { color: colors.primaryText }]}>Back to Login</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <>
                                                <Text style={[styles.modalSubtitle, { color: colors.secondaryText }]}>
                                                    Enter your email address and we'll send you a link to reset your password.
                                                </Text>

                                                <View style={styles.inputContainer}>
                                                    <Text style={[styles.label, { color: colors.secondaryText }]}>Email</Text>
                                                    <TextInput
                                                        style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.primaryText, borderColor: colors.divider }]}
                                                        placeholder="name@example.com"
                                                        placeholderTextColor={colors.secondaryText}
                                                        value={resetEmail}
                                                        onChangeText={setResetEmail}
                                                        autoCapitalize="none"
                                                        keyboardType="email-address"
                                                        autoFocus
                                                    />
                                                </View>

                                                <TouchableOpacity
                                                    style={[styles.button, { backgroundColor: colors.primaryAction, marginTop: SPACING.l }]}
                                                    onPress={handleSendResetEmail}
                                                    disabled={resetLoading}
                                                >
                                                    {resetLoading ? (
                                                        <ActivityIndicator color="#fff" />
                                                    ) : (
                                                        <Text style={styles.buttonText}>Recover Password</Text>
                                                    )}
                                                </TouchableOpacity>
                                            </>
                                        )}
                                    </View>
                                </TouchableWithoutFeedback>
                            </KeyboardAvoidingView>
                        </View>
                    </Modal>

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
        paddingHorizontal: SPACING.l,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: SPACING.m,
        marginBottom: SPACING.xl,
    },
    backButton: {
    },
    headerTitleContainer: {
        // flex: 1,
        // alignItems: 'center',
    },
    title: {
        fontSize: TYPOGRAPHY.size.h2,
        fontWeight: 'bold',
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
        height: 50,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: TYPOGRAPHY.size.body,
        width: '100%',
    },
    modalText: {
        marginBottom: 16,
        fontSize: TYPOGRAPHY.size.body,
    },
    successTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    tipBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginTop: 16,
        borderWidth: 1,
        gap: 8,
        width: '100%',
    },
    tipText: {
        fontSize: 13,
        flex: 1,
        lineHeight: 18,
    },
    passwordInput: {
        flex: 1,
        fontSize: TYPOGRAPHY.size.body,
        paddingHorizontal: 16,
        paddingVertical: 12,
        height: '100%',
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        height: 50,
        overflow: 'hidden',
    },
    eyeIcon: {
        paddingHorizontal: 12,
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
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
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: SPACING.m,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    demoButton: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        padding: 12,
    },
    demoText: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: '500',
        textDecorationLine: 'underline',
    },
    forgotPassword: {
        alignItems: 'flex-start',
        marginBottom: SPACING.m,
    },
    forgotPasswordText: {
        fontSize: 14,
        fontWeight: '500',
    },
    // Modal Styles - Full Screen
    modalFullScreen: {
        flex: 1,
    },
    modalKeyboardView: {
        flex: 1,
    },
    modalInnerContent: {
        flex: 1,
        paddingHorizontal: SPACING.l,
        paddingTop: SPACING.m,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    modalTitle: {
        fontSize: TYPOGRAPHY.size.h2,
        fontWeight: 'bold',
    },
    modalSubtitle: {
        fontSize: TYPOGRAPHY.size.body,
        marginBottom: SPACING.xl,
        lineHeight: 22,
    }
});
