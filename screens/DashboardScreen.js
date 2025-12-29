import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

const DashboardScreen = ({ user }) => {
    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Logout Error:', error);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Welcome!</Text>
                <Text style={styles.subtitle}>{user?.email}</Text>
                <Text style={styles.info}>Dashboard is under construction.</Text>

                <TouchableOpacity onPress={handleLogout} style={styles.button}>
                    <Text style={styles.buttonText}>Logout</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        gap: 16,
        padding: 20
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0F172A'
    },
    subtitle: {
        fontSize: 16,
        color: '#64748B',
    },
    info: {
        fontSize: 14,
        color: '#94A3B8',
        marginBottom: 20
    },
    button: {
        backgroundColor: '#EF4444',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    }
});

export default DashboardScreen;
