import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import Logo from '../components/common/Logo';

const DEMO_CREDENTIALS = {
    email: 'demo@quanlychitieu.com',
    password: 'demo@quanlychitieu.com'
};

const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Vui lòng nhập email và mật khẩu');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await signInWithEmailAndPassword(auth, email, password);
            // No need to create profile, user said "Input later"
        } catch (err) {
            console.error(err);
            setError('Đăng nhập thất bại: ' + err.message);
            setLoading(false);
        }
    };

    const handleDemoLogin = async () => {
        setLoading(true);
        setError('');
        try {
            await signInWithEmailAndPassword(
                auth,
                DEMO_CREDENTIALS.email,
                DEMO_CREDENTIALS.password
            );
        } catch (err) {
            console.error('Demo Error:', err);
            setError('Lỗi Demo: ' + err.message);
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.card}>
                    <View style={styles.logoContainer}>
                        <Logo size={32} showText={true} />
                    </View>

                    <View style={styles.form}>
                        {error ? (
                            <View style={styles.errorBanner}>
                                <Feather name="alert-circle" size={16} color="#DC2626" />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email</Text>
                            <View style={styles.inputContainer}>
                                <View style={styles.inputIcon}>
                                    <Feather name="user" size={20} color="#9CA3AF" />
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="name@example.com"
                                    value={email}
                                    onChangeText={setEmail}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Mật khẩu</Text>
                            <View style={styles.inputContainer}>
                                <View style={styles.inputIcon}>
                                    <Feather name="lock" size={20} color="#9CA3AF" />
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="******"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowPassword(!showPassword)}
                                    style={styles.eyeIcon}
                                >
                                    <Feather name={showPassword ? "eye-off" : "eye"} size={20} color="#9CA3AF" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={handleLogin}
                            disabled={loading}
                            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.loginButtonText}>Đăng Nhập</Text>
                            )}
                        </TouchableOpacity>

                        {/* DEMO BUTTON RESTORED */}
                        <TouchableOpacity
                            onPress={handleDemoLogin}
                            disabled={loading}
                            style={styles.demoButton}
                        >
                            <Text style={styles.demoText}>Dùng thử Demo</Text>
                            <Feather name="arrow-right" size={14} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: '#F8FAFC', // slate-50
        justifyContent: 'center',
        padding: 16,
    },
    card: {
        backgroundColor: 'white',
        padding: 32,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#F1F5F9', // slate-100
    },
    logoContainer: {
        marginBottom: 32,
        alignItems: 'center'
    },
    form: {
        gap: 20,
    },
    errorBanner: {
        backgroundColor: '#FEF2F2', // red-50
        padding: 12,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    errorText: {
        color: '#DC2626', // red-600
        fontSize: 14,
        flex: 1,
    },
    inputGroup: {},
    label: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#6B7280', // gray-500
        textTransform: 'uppercase',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputContainer: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
    },
    inputIcon: {
        position: 'absolute',
        left: 16,
        zIndex: 1,
    },
    input: {
        flex: 1,
        paddingLeft: 48,
        paddingRight: 48,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0', // slate-200
        borderRadius: 12,
        fontSize: 16,
        color: '#1E293B',
        backgroundColor: '#FFFFFF',
    },
    eyeIcon: {
        position: 'absolute',
        right: 16,
        padding: 4,
    },
    loginButton: {
        backgroundColor: '#111827', // gray-900
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#E5E7EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 10,
        elevation: 2,
    },
    loginButtonDisabled: {
        opacity: 0.7,
    },
    loginButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    demoButton: {
        marginTop: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 10
    },
    demoText: {
        color: '#64748B',
        fontWeight: '600',
        fontSize: 14
    }
});

export default LoginScreen;
