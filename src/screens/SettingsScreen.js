import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../components/context/AuthContext';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import { useTheme } from '../components/context/ThemeContext';

export default function SettingsScreen({ navigation }) {
    const { profile } = useAuth();
    const { theme, themeMode, setTheme } = useTheme();
    const colors = COLORS[theme];

    const handleShare = async () => {
        try {
            await Share.share({
                message: 'Check out this Family Finance App!',
            });
        } catch (error) {
            console.error(error);
        }
    };

    const MenuItem = ({ icon, label, onPress, subtext, rightElement }) => (
        <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.divider }]}
            onPress={onPress}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.m }}>
                <View style={[styles.iconBox, { backgroundColor: colors.surface }]}>
                    <Ionicons name={icon} size={22} color={colors.primaryText} />
                </View>
                <View>
                    <Text style={[styles.menuText, { color: colors.primaryText }]}>{label}</Text>
                    {subtext && <Text style={{ fontSize: 12, color: colors.secondaryText }}>{subtext}</Text>}
                </View>
            </View>
            {rightElement || <Ionicons name="chevron-forward" size={22} color={colors.divider} />}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.divider }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.primaryText }]}>Settings</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Account Section */}
                <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>ACCOUNT</Text>
                <MenuItem
                    icon="person-outline"
                    label="My Profile"
                    subtext="Edit personal details"
                    onPress={() => navigation.navigate('ProfileDashboard', { profile })}
                />

                {/* Preferences Section */}
                <Text style={[styles.sectionTitle, { color: colors.secondaryText, marginTop: SPACING.xl }]}>PREFERENCES</Text>

                <MenuItem
                    icon="notifications-outline"
                    label="Notifications"
                    onPress={() => Alert.alert('Coming Soon', 'Notification settings are under development.')}
                />

                <MenuItem
                    icon="language-outline"
                    label="Language"
                    subtext="English"
                    onPress={() => Alert.alert('Coming Soon', 'Multi-language support is coming.')}
                />

                {/* Appearance (Theme) */}
                <View style={{ marginTop: SPACING.xl }}>
                    <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>APPEARANCE</Text>
                    <View style={styles.themeContainer}>
                        {['light', 'dark', 'system'].map((mode) => (
                            <TouchableOpacity
                                key={mode}
                                style={[
                                    styles.themeButton,
                                    {
                                        backgroundColor: themeMode === mode ? colors.primaryAction : 'transparent',
                                        borderColor: colors.divider,
                                    }
                                ]}
                                onPress={() => setTheme(mode)}
                            >
                                <Text style={[
                                    styles.themeText,
                                    {
                                        color: themeMode === mode ? '#FFFFFF' : colors.primaryText,
                                        fontWeight: themeMode === mode ? 'bold' : 'normal'
                                    }
                                ]}>
                                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* About Section */}
                <Text style={[styles.sectionTitle, { color: colors.secondaryText, marginTop: SPACING.xl }]}>ABOUT</Text>

                <MenuItem
                    icon="share-social-outline"
                    label="Share App"
                    onPress={handleShare}
                />

                <MenuItem
                    icon="information-circle-outline"
                    label="Version"
                    rightElement={<Text style={{ color: colors.secondaryText }}>1.1.0</Text>}
                    onPress={() => { }} // No action
                />

                {/* Footer Padding */}
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.screenPadding,
        paddingVertical: SPACING.m,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.size.h3,
        fontWeight: TYPOGRAPHY.weight.bold,
    },
    content: {
        paddingTop: SPACING.l,
    },
    sectionTitle: {
        fontSize: TYPOGRAPHY.size.small,
        fontWeight: '600',
        marginBottom: SPACING.s,
        marginLeft: SPACING.screenPadding,
        letterSpacing: 1,
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.m,
        paddingHorizontal: SPACING.screenPadding,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuText: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: TYPOGRAPHY.weight.medium,
    },
    themeContainer: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.screenPadding,
        gap: SPACING.s,
    },
    themeButton: {
        flex: 1,
        paddingVertical: SPACING.s,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        borderWidth: 1,
    },
    themeText: {
        fontSize: TYPOGRAPHY.size.body,
    },
});
