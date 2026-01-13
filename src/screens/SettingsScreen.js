import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../components/context/AuthContext';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';

export default function SettingsScreen({ navigation }) {
    const { profile } = useAuth(); // Get current profile for role check
    const theme = useColorScheme() || 'light';
    const colors = COLORS[theme];

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

            <View style={styles.content}>
                {profile?.role === 'Owner' && (
                    <View>
                        <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>FAMILY MANAGEMENT</Text>

                        <TouchableOpacity
                            style={[styles.menuItem, { borderBottomColor: colors.divider }]}
                            onPress={() => navigation.navigate('ManageProfiles')}
                        >
                            <Text style={[styles.menuText, { color: colors.primaryText }]}>Manage Profiles</Text>
                            <Ionicons name="chevron-forward" size={20} color={colors.divider} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.menuItem, { borderBottomColor: colors.divider }]}
                            onPress={() => navigation.navigate('ManageCategories')}
                        >
                            <Text style={[styles.menuText, { color: colors.primaryText }]}>Manage Categories</Text>
                            <Ionicons name="chevron-forward" size={20} color={colors.divider} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
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
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.m,
        paddingHorizontal: SPACING.screenPadding,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    menuText: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: TYPOGRAPHY.weight.medium,
    },
});
