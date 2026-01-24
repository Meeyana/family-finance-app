import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../components/context/ThemeContext';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import { setDoc, doc, updateDoc } from 'firebase/firestore'; // Added doc, updateDoc
import { auth, db, getFirestorePaths } from '../services/firebase'; // Ensure db imported
import { initializeFamily, initializeCategories, updateProfile as updateRepoProfile, initializeUserLicense } from '../services/firestoreRepository'; // Import repo functions
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

const validatePassword = (password) => {
    // Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};

export default function SignUpScreen({ navigation }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0); // 0: None, 1: Weak, 2: Medium, 3: Strong
    const [passwordError, setPasswordError] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [loading, setLoading] = useState(false);
    const { theme } = useTheme();
    const colors = COLORS[theme];

    const calculateStrength = (pass) => {
        let score = 0;
        if (!pass) return 0;

        if (pass.length >= 8) score += 1;
        if (/[A-Z]/.test(pass)) score += 0.5;
        if (/[a-z]/.test(pass)) score += 0.5;
        if (/[0-9]/.test(pass)) score += 0.5;
        if (/[@$!%*?&]/.test(pass)) score += 0.5;

        // Normalize to 1-3 levels for UI
        if (score < 2) return 1; // Weak
        if (score < 3) return 2; // Medium
        if (score >= 3) return 3; // Strong (Strictly >= 3 means Length + 4 other criteria = 3, wait. 1 + 0.5*4 = 3. So checks all.)

        // Let's simplify the scoring to match user request "3 levels"
        // Weak: < 8 chars
        // Medium: >= 8 chars
        // Strong: >= 8 chars + (Upper + Lower + Number + Special) - maybe too strict?
        // Let's use the validatePassword logic for 'Strong' and degrade gracefully.

        if (pass.length < 8) return 1; // Weak

        const hasUpper = /[A-Z]/.test(pass);
        const hasLower = /[a-z]/.test(pass);
        const hasNum = /[0-9]/.test(pass);
        const hasSpecial = /[@$!%*?&]/.test(pass);

        const complexity = [hasUpper, hasLower, hasNum, hasSpecial].filter(Boolean).length;

        if (complexity < 3) return 2; // Medium
        return 3; // Strong
    };

    const handlePasswordChange = (text) => {
        setPassword(text);
        setPasswordStrength(calculateStrength(text));
        setPasswordError(''); // Clear error on type
    };

    const handleConfirmPasswordChange = (text) => {
        setConfirmPassword(text);
        setConfirmPasswordError('');
    };

    const handleSignUp = async () => {
        // Reset errors
        setPasswordError('');
        setConfirmPasswordError('');

        if (!name || !email || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (!agreedToTerms) {
            Alert.alert('Required', 'You must agree to the Terms of Service and Privacy Policy to continue.');
            return;
        }

        if (password !== confirmPassword) {
            setConfirmPasswordError('Passwords do not match');
            return;
        }

        // Enforce at least Medium strength for UX, or strictly Strong? 
        // User said: "avoid user use password so easy to find".
        // Let's require at least Medium (Length >= 8) and maybe some complexity.
        // If Strength is 1 (Weak), block.
        if (passwordStrength < 2) {
            setPasswordError('Password is too weak. It must have at least 8 characters, include an uppercase letter, a lowercase letter, a number, and a special character.');
            return;
        }

        // If we want to enforce full strong password:
        // if (!validatePassword(password)) { ... }
        // But user asked to show *levels*. If it is Strong (Level 3), it's good.
        // If it is Medium (Level 2), is it acceptable? 
        // Let's block only Weak (< 8 chars) for now, or strictly follow the regex if requested "strict".
        // The previous goal was "Strict password policy".
        // Let's allow Medium but encourage Strong, OR block if it doesn't meet the regex.
        // Let's assume Level 2 is passing but Level 1 is failing.
        // Actually, checking the regex `validatePassword` is the gold standard we set.

        if (!validatePassword(password)) {
            setPasswordError('Password must contain uppercase, lowercase, number, and special character.');
            return;
        }

        setLoading(true);
        try {
            // 1. Create Auth User
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Update Display Name
            await updateProfile(user, { displayName: name });

            // 3. Send Verification Email
            await sendEmailVerification(user);

            // 4. Initialize Family Data
            // We do this EARLY so it's ready when they eventually login
            await initializeUserLicense(user.uid, user.email);
            await initializeFamily(user.uid, user.email);
            await initializeCategories(user.uid);

            console.log('User created. Waiting for verification...');

            // 5. WAIT FOR VERIFICATION (Polling)
            // We use a localized Alert to tell them to verify.
            // We start a loop to check verification status.

            Alert.alert(
                'Verification Sent',
                `We have sent an email to ${email}. Please check your inbox and verify your account.\n\nWe are waiting for you here...`
            );

            // Start Polling
            const intervalId = setInterval(async () => {
                try {
                    await user.reload(); // Refresh token
                    if (user.emailVerified) {
                        clearInterval(intervalId);
                        console.log('✅ Email Verified!');
                        await auth.signOut(); // Clean up session

                        Alert.alert(
                            'Verified!',
                            'Your account is now verified. Please log in.',
                            [{ text: 'Go to Login', onPress: () => navigation.navigate('Login') }]
                        );
                    }
                } catch (pollErr) {
                    console.warn("Polling error:", pollErr);
                }
            }, 3000); // Check every 3 seconds

        } catch (error) {
            console.error('Sign Up Error:', error);
            Alert.alert('Sign Up Failed', error.message);
            setLoading(false); // Stop loading only on error. On success, we keep loading "visual" or just let the poller run.
        }
        // Note: We intentionally DO NOT set loading(false) on success immediately 
        // because we want to show we are "processing/waiting". 
        // OR we can set it false and just let the modal/alert sit there.
        // Let's set false so they can interact if needed (e.g. Back).
        setLoading(false);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
                        </TouchableOpacity>
                        <Text style={[styles.title, { color: colors.primaryText }]}>Create Account</Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.secondaryText }]}>Full Name</Text>
                            <TextInput
                                style={[styles.input, {
                                    backgroundColor: colors.inputBackground,
                                    color: colors.primaryText,
                                    borderColor: colors.divider
                                }]}
                                placeholder="John Doe"
                                placeholderTextColor={colors.secondaryText}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.secondaryText }]}>Email</Text>
                            <TextInput
                                style={[styles.input, {
                                    backgroundColor: colors.inputBackground,
                                    color: colors.primaryText,
                                    borderColor: colors.divider
                                }]}
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
                            <View style={[styles.passwordContainer, {
                                backgroundColor: colors.inputBackground,
                                borderColor: passwordError ? colors.error : colors.divider
                            }]}>
                                <TextInput
                                    style={[styles.passwordInput, {
                                        color: colors.primaryText,
                                    }]}
                                    placeholder="••••••••"
                                    placeholderTextColor={colors.secondaryText}
                                    value={password}
                                    onChangeText={handlePasswordChange}
                                    secureTextEntry={!showPassword}
                                    textContentType="newPassword"
                                    autoComplete="password-new"
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
                            {/* Strength Indicator */}
                            {passwordError ? (
                                <Text style={[styles.errorText, { color: colors.error }]}>{passwordError}</Text>
                            ) : null}
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.secondaryText }]}>Confirm Password</Text>
                            <View style={[styles.passwordContainer, {
                                backgroundColor: colors.inputBackground,
                                borderColor: confirmPasswordError ? colors.error : colors.divider
                            }]}>
                                <TextInput
                                    style={[styles.passwordInput, {
                                        color: colors.primaryText,
                                    }]}
                                    placeholder="••••••••"
                                    placeholderTextColor={colors.secondaryText}
                                    value={confirmPassword}
                                    onChangeText={handleConfirmPasswordChange}
                                    secureTextEntry={!showConfirmPassword}
                                    textContentType="newPassword"
                                    autoComplete="password-new"
                                />
                                <TouchableOpacity
                                    style={styles.eyeIcon}
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    <Ionicons
                                        name={showConfirmPassword ? "eye" : "eye-off"}
                                        size={24}
                                        color={colors.secondaryText}
                                    />
                                </TouchableOpacity>
                            </View>
                            {confirmPasswordError ? (
                                <Text style={[styles.errorText, { color: colors.error }]}>{confirmPasswordError}</Text>
                            ) : null}
                        </View>

                        {/* Terms of Service Checkbox */}
                        <TouchableOpacity
                            style={styles.termsContainer}
                            onPress={() => setAgreedToTerms(!agreedToTerms)}
                        >
                            <Ionicons
                                name={agreedToTerms ? "checkbox" : "square-outline"}
                                size={24}
                                color={agreedToTerms ? '#6ca749' : colors.secondaryText}
                            />
                            <Text style={[styles.termsText, { color: colors.secondaryText }]}>
                                I agree to the <Text style={{ color: '#6ca749', fontWeight: 'bold' }}>Terms of Service</Text> and <Text style={{ color: '#6ca749', fontWeight: 'bold' }}>Privacy Policy</Text>
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: agreedToTerms ? '#6ca749' : colors.divider }]} // Disable visual if not agreed
                            onPress={handleSignUp}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Sign Up</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: colors.secondaryText }]}>
                            Already have an account?
                        </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={[styles.linkText, { color: '#6ca749' }]}> Log in</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: SPACING.l,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xl,
        marginTop: SPACING.m,
    },
    backButton: {
        marginRight: SPACING.m,
    },
    title: {
        fontSize: TYPOGRAPHY.size.h2,
        fontWeight: 'bold',
    },
    form: {
        flex: 1,
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
        paddingHorizontal: 16, // Use padding instead of absolute position to reserve space
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
    },
    button: {
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: SPACING.l,
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
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: SPACING.xl,
        marginBottom: SPACING.l,
    },
    footerText: {
        fontSize: TYPOGRAPHY.size.body,
    },
    linkText: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: 'bold',
    },
    strengthContainer: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    strengthBars: {
        flexDirection: 'row',
        marginRight: 10,
    },
    strengthBarChunk: {
        width: 30,
        height: 6,
        borderRadius: 3,
        marginRight: 4,
    },
    strengthText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    errorText: {
        marginTop: 4,
        fontSize: 12,
        fontWeight: '500',
    },
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.m,
        marginTop: SPACING.s,
        gap: 12,
    },
    termsText: {
        fontSize: 13,
        flex: 1,
        lineHeight: 20,
    },
});
