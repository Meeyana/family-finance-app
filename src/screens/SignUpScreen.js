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

export default function SignUpScreen({ navigation }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { theme } = useTheme();
    const colors = COLORS[theme];

    const handleSignUp = async () => {
        if (!name || !email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
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
                            <TextInput
                                style={[styles.input, {
                                    backgroundColor: colors.inputBackground,
                                    color: colors.primaryText,
                                    borderColor: colors.divider
                                }]}
                                placeholder="••••••••"
                                placeholderTextColor={colors.secondaryText}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: '#6ca749' }]} // Primary Action Green
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
});
