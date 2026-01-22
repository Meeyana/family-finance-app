import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Modal } from 'react-native';
import { useTheme } from '../components/context/ThemeContext';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import { Alert } from 'react-native';

const DEMO_CREDENTIALS = {
    email: 'demo@quanlychitieu.com',
    password: 'demo@quanlychitieu.com'
};

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Forgot Password State
    const [resetModalVisible, setResetModalVisible] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

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
            setResetModalVisible(false);
            // Then show success
            Alert.alert(
                "Check your email",
                "We have sent a password recover instructions to your email.",
                [{ text: "OK" }]
            );
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
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
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
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.secondaryText }]}>Password</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.primaryText, borderColor: colors.divider }]}
                                placeholder="••••••••"
                                placeholderTextColor={colors.secondaryText}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>

                        <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPassword}>
                            <Text style={[styles.forgotPasswordText, { color: colors.secondaryText }]}>Forgot your password?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: '#6ca749' }]} // Primary Action Green
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

                    {/* Forgot Password Modal */}
                    <Modal
                        animationType="slide"
                        transparent={true}
                        visible={resetModalVisible}
                        onRequestClose={() => setResetModalVisible(false)}
                    >
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
                                <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
                                    <View style={styles.modalHeader}>
                                        <Text style={[styles.modalTitle, { color: colors.primaryText }]}>Forgot Password</Text>
                                        <TouchableOpacity onPress={() => setResetModalVisible(false)}>
                                            <Ionicons name="close" size={24} color={colors.primaryText} />
                                        </TouchableOpacity>
                                    </View>

                                    <Text style={[styles.modalSubtitle, { color: colors.secondaryText }]}>
                                        Enter your email address and we'll send you a link to reset your password.
                                    </Text>

                                    <TextInput
                                        style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.primaryText, borderColor: colors.divider, marginBottom: 24 }]}
                                        placeholder="name@example.com"
                                        placeholderTextColor={colors.secondaryText}
                                        value={resetEmail}
                                        onChangeText={setResetEmail}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                        autoFocus
                                    />

                                    <TouchableOpacity
                                        style={[styles.button, { backgroundColor: '#6ca749', marginTop: 0 }]}
                                        onPress={handleSendResetEmail}
                                        disabled={resetLoading}
                                    >
                                        {resetLoading ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <Text style={styles.buttonText}>Recover Password</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
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
    // Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end', // Bottom sheet style or center
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 48,
        minHeight: '40%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    modalSubtitle: {
        fontSize: 14,
        marginBottom: 24,
        lineHeight: 20,
    }
});
