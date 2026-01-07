import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../components/context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';

export default function MoreMenuScreen({ navigation }) {
    const { profile, switchProfile, pendingRequestCount } = useAuth();

    const handleLogout = async () => {
        if (Platform.OS === 'web') {
            if (window.confirm("Are you sure you want to log out completely?")) {
                await signOut(auth);
            }
        } else {
            Alert.alert("Logout", "Are you sure you want to log out completely?", [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Logout",
                    style: "destructive",
                    onPress: async () => {
                        await signOut(auth);
                    }
                }
            ]);
        }
    };

    const handleSwitchUser = () => {
        if (Platform.OS === 'web') {
            if (window.confirm("Go back to profile selection?")) {
                switchProfile();
            }
        } else {
            Alert.alert("Switch Profile", "Go back to profile selection?", [
                { text: "Cancel", style: "cancel" },
                { text: "Switch", onPress: switchProfile }
            ]);
        }
    };

    const MenuOption = ({ icon, label, onPress, color = '#1a1a1a', subtext }) => (
        <TouchableOpacity style={styles.option} onPress={onPress}>
            <View style={styles.optionLeft}>
                <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
                    <MaterialCommunityIcons name={icon} size={24} color={color} />
                </View>
                <View>
                    <Text style={styles.optionText}>{label}</Text>
                    {subtext && <Text style={styles.subtext}>{subtext}</Text>}
                </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>More</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Profile Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    <MenuOption
                        icon="account-circle-outline"
                        label="My Profile"
                        subtext={`Logged in as ${profile?.name || 'User'}`}
                        onPress={() => navigation.navigate('ProfileDashboard', { profile })}
                        color="#007AFF"
                    />
                    <MenuOption
                        icon="cog-outline"
                        label="Settings"
                        onPress={() => navigation.navigate('Settings')}
                        color="#666"
                    />
                </View>


                {/* Family Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Family</Text>
                    {profile?.role !== 'Child' && (
                        <MenuOption
                            icon="hand-coin-outline"
                            label="Money Requests"
                            onPress={() => navigation.navigate('RequestList')}
                            color="#34C759"
                            subtext={pendingRequestCount > 0 ? `${pendingRequestCount} Pending` : "Approvals & History"}
                        />
                    )}
                    <MenuOption
                        icon="account-switch-outline"
                        label="Switch User"
                        onPress={handleSwitchUser}
                        color="#FF9500"
                    />
                </View>

                {/* App Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>App</Text>
                    <MenuOption
                        icon="logout"
                        label="Log Out"
                        onPress={handleLogout}
                        color="#FF3B30"
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    header: { padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    title: { fontSize: 28, fontWeight: 'bold' },
    content: { padding: 16 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8, marginLeft: 8, textTransform: 'uppercase' },
    option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 8, elevation: 1 },
    optionLeft: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    optionText: { fontSize: 16, fontWeight: '500', color: '#1a1a1a' },
    subtext: { fontSize: 12, color: '#999', marginTop: 2 }
});
