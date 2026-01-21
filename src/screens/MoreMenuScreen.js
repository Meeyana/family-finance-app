import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../components/context/AuthContext';
import Avatar from '../components/Avatar';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import { useTheme } from '../components/context/ThemeContext';

export default function MoreMenuScreen({ navigation }) {
    const { profile, switchProfile, pendingRequestCount } = useAuth();
    const { theme } = useTheme();
    const colors = COLORS[theme];

    const handleLogout = async () => {
        const title = "Log Out";
        const message = "Are you sure you want to log out?";
        const execute = async () => await signOut(auth);

        if (Platform.OS === 'web') {
            if (confirm(message)) execute();
        } else {
            Alert.alert(title, message, [
                { text: "Cancel", style: "cancel" },
                { text: "Log Out", style: "destructive", onPress: execute }
            ]);
        }
    };

    const handleSwitchUser = () => {
        const execute = () => switchProfile();
        if (Platform.OS === 'web') {
            if (confirm("Switch profile?")) execute();
        } else {
            Alert.alert("Switch Profile", "Go back to profile selection?", [
                { text: "Cancel", style: "cancel" },
                { text: "Switch", onPress: execute }
            ]);
        }
    };

    const SectionHeader = ({ title }) => (
        <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>{title}</Text>
    );

    const MenuOption = ({ icon, label, onPress, subtext, isDestructive, badge }) => (
        <TouchableOpacity
            style={[styles.option, { borderBottomColor: colors.divider }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.optionContent}>
                <View style={styles.leftContent}>
                    <View style={[styles.iconBox, { backgroundColor: '#f7f7f7' }]}>
                        <Ionicons
                            name={icon}
                            size={22}
                            color={isDestructive ? colors.error : '#3e2723'}
                        />
                    </View>
                    <View>
                        <Text style={[
                            styles.optionText,
                            { color: isDestructive ? colors.error : colors.primaryText }
                        ]}>
                            {label}
                        </Text>
                        {subtext && (
                            <Text style={[styles.subtext, { color: colors.secondaryText }]}>
                                {subtext}
                            </Text>
                        )}
                    </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {badge > 0 && (
                        <View style={[styles.badge, { backgroundColor: colors.error }]}>
                            <Text style={styles.badgeText}>{badge}</Text>
                        </View>
                    )}
                    <Ionicons name="chevron-forward" size={20} color={colors.secondaryText} />
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
            <View style={{ backgroundColor: '#f7ede2' }}>
                <SafeAreaView edges={['top', 'left', 'right']} />
            </View>

            {/* Header */}
            <View style={[styles.header, { backgroundColor: '#f7ede2', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, borderBottomColor: 'transparent' }]}>
                <Text style={[styles.headerTitle, { color: '#3e2723' }]}>More</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} bounces={false}>

                {/* Profile Summary Card */}
                <TouchableOpacity
                    style={[styles.profileCard, { backgroundColor: '#e8f5e9', elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }]}
                    onPress={() => navigation.navigate('EditProfile', { profile, isNew: false })}
                >
                    {/* Ensure Avatar is Circle */}
                    <Avatar
                        name={profile?.name}
                        avatarId={profile?.avatarId}
                        size={48}
                        backgroundColor="#ffffff"
                        textColor="#3e2723"
                        fontSize={24}
                    />

                    <View>
                        <Text style={[styles.profileName, { color: '#111111' }]}>{profile?.name}</Text>
                        <Text style={[styles.profileRole, { color: '#9e9e9e' }]}>{profile?.role}</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={[styles.editLink, { color: colors.primaryAction }]}>Edit</Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.section}>
                    <SectionHeader title="Management" />
                    {profile?.role !== 'Child' && (
                        <MenuOption
                            icon="cash-outline"
                            label="Money Requests"
                            subtext={pendingRequestCount > 0 ? "Pending approvals" : null}
                            badge={pendingRequestCount}
                            onPress={() => navigation.navigate('RequestList')}
                        />
                    )}
                    <MenuOption
                        icon="calendar-outline"
                        label="Recurring Transactions"
                        onPress={() => navigation.navigate('Recurring')}
                    />
                    <MenuOption
                        icon="wallet-outline"
                        label="Savings Goals"
                        onPress={() => navigation.navigate('Goals')}
                    />
                    <MenuOption
                        icon="pricetags-outline"
                        label="Categories"
                        onPress={() => navigation.navigate('ManageCategories')}
                    />
                    {profile?.role === 'Owner' && (
                        <MenuOption
                            icon="people-outline"
                            label="Manage Profiles"
                            onPress={() => navigation.navigate('ManageProfiles')}
                        />
                    )}
                </View>

                <View style={styles.section}>
                    <SectionHeader title="App" />
                    <MenuOption
                        icon="settings-outline"
                        label="Settings"
                        onPress={() => navigation.navigate('Settings')}
                    />
                </View>

                {/* Footer Actions */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.footerButton, {
                            backgroundColor: colors.surface,
                            borderWidth: 1,
                            borderColor: colors.primaryAction,
                            flex: 1,
                            marginRight: SPACING.s,
                            borderRadius: 12
                        }]}
                        onPress={handleSwitchUser}
                    >
                        <Ionicons name="swap-horizontal-outline" size={20} color={colors.primaryAction} />
                        <Text style={[styles.footerButtonText, { color: colors.primaryAction }]}>Switch Profile</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.footerButton, {
                            backgroundColor: colors.primaryAction,
                            borderRadius: 12,
                            flex: 1,
                            marginLeft: SPACING.s,
                            borderWidth: 1,
                            borderColor: colors.primaryAction
                        }]}
                        onPress={handleLogout}
                    >
                        <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
                        <Text style={[styles.footerButtonText, { color: '#FFFFFF' }]}>Log Out</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />

            </ScrollView>
        </View>
    );
}




const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: SPACING.screenPadding,
        paddingVertical: SPACING.m,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.size.h2,
        fontWeight: TYPOGRAPHY.weight.bold,
        letterSpacing: -0.5,
    },
    content: {
        padding: SPACING.screenPadding,
    },
    section: {
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        fontSize: TYPOGRAPHY.size.small,
        fontWeight: TYPOGRAPHY.weight.semiBold,
        textTransform: 'uppercase',
        marginBottom: SPACING.s,
        letterSpacing: 1,
        opacity: 0.8,
    },
    option: {
        paddingVertical: SPACING.m,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    leftContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.m,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionText: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: TYPOGRAPHY.weight.medium,
        letterSpacing: -0.2, // Inter style tightness
    },
    subtext: {
        fontSize: TYPOGRAPHY.size.small,
        marginTop: 2,
    },
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        marginRight: 8,
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    // Contextual Profile Card
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.l,
        borderRadius: SPACING.cardBorderRadius,
        marginBottom: SPACING.xl,
        gap: SPACING.m,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileName: {
        fontSize: TYPOGRAPHY.size.h3,
        fontWeight: TYPOGRAPHY.weight.bold,
    },
    profileRole: {
        fontSize: TYPOGRAPHY.size.caption,
    },
    editLink: {
        fontSize: TYPOGRAPHY.size.caption,
        fontWeight: TYPOGRAPHY.weight.semiBold,
    },
    footer: {
        flexDirection: 'row',
        marginTop: SPACING.xl,
        gap: SPACING.m,
    },
    footerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.m,
        borderRadius: 12,
        gap: 8,
    },
    footerButtonText: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: TYPOGRAPHY.weight.semiBold,
    },
    version: {
        textAlign: 'center',
        fontSize: TYPOGRAPHY.size.small,
        marginTop: SPACING.xl,
        opacity: 0.5,
    },
});
