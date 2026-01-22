import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// Placeholder for the background image
const BACKGROUND_IMAGE = { uri: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=2071&auto=format&fit=crop' };

export default function WelcomeScreen() {
    const navigation = useNavigation();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <View style={styles.container}>
            {/* Background Image with Animation */}
            <Animated.Image
                source={BACKGROUND_IMAGE}
                style={[
                    styles.backgroundImage,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: 1.1 }] // Slight zoom effect
                    }
                ]}
                resizeMode="cover"
            />

            {/* Gradient Overlay for text readability */}
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
                style={styles.gradient}
            />

            <SafeAreaView style={styles.contentContainer}>
                <Animated.View style={[styles.headerContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    {/* Brand Logo - Placeholder Icon */}
                    <View style={styles.logoContainer}>
                        <Text style={styles.logoText}>FF</Text>
                    </View>
                    <Text style={styles.title}>Create a life you love</Text>
                    <Text style={styles.subtitle}>Manage your family finances with ease.</Text>
                </Animated.View>

                <Animated.View style={[styles.bottomContent, { opacity: fadeAnim }]}>
                    <TouchableOpacity
                        style={[styles.button, styles.signUpButton]}
                        onPress={() => navigation.navigate('SignUp')}
                    >
                        <Text style={styles.signUpText}>Sign up</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.loginButton]}
                        onPress={() => navigation.navigate('Login')}
                    >
                        <Text style={styles.loginText}>Log in</Text>
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            By continuing, you agree to Pinterest's{' '}
                            <Text style={styles.linkText}>Terms of Service</Text> and acknowledge you've read our{' '}
                            <Text style={styles.linkText}>Privacy Policy</Text>.
                        </Text>
                    </View>
                </Animated.View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000', // Fallback
    },
    backgroundImage: {
        position: 'absolute',
        width: width,
        height: height,
    },
    gradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: height * 0.6,
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.l,
        paddingBottom: SPACING.xl,
    },
    headerContent: {
        alignItems: 'center',
        marginTop: height * 0.15,
    },
    logoContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.light.primaryAction, // Use light theme green for logo bg
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.l,
    },
    logoText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: SPACING.s,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
    },
    bottomContent: {
        width: '100%',
        paddingBottom: SPACING.l,
    },
    button: {
        height: 54,
        borderRadius: 27,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.m,
    },
    signUpButton: {
        backgroundColor: '#6ca749', // Primary Action Green
    },
    loginButton: {
        backgroundColor: '#F7F7F7', // Surface
    },
    signUpText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    loginText: {
        color: '#111111',
        fontSize: 16,
        fontWeight: 'bold',
    },
    footer: {
        marginTop: SPACING.s,
    },
    footerText: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
        lineHeight: 16,
    },
    linkText: {
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
});
