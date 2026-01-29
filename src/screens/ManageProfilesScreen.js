import React, { useLayoutEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, useColorScheme } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../components/context/AuthContext';
import { useTheme } from '../components/context/ThemeContext';
import Avatar from '../components/Avatar';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';

export default function ManageProfilesScreen({ navigation }) {
    const { userProfiles } = useAuth(); // Live data from Context
    const { theme } = useTheme();
    const colors = COLORS[theme];

    useLayoutEffect(() => {
        navigation.setOptions({ headerShown: false });
    }, [navigation]);

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.itemContainer, { borderBottomColor: colors.divider }]}
            onPress={() => navigation.navigate('EditProfile', { profile: item })}
        >
            <View style={styles.itemLeft}>
                <Avatar
                    name={item.name}
                    avatarId={item.avatarId}
                    size={48}
                    backgroundColor={colors.surface}
                    textColor={colors.primaryText}
                />
                <View>
                    <Text style={[styles.name, { color: colors.primaryText }]}>{item.name}</Text>
                    <Text style={[styles.role, { color: colors.secondaryText }]}>{item.role}</Text>
                </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.divider} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.divider, backgroundColor: colors.background }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.primaryText }]}>Manage Profiles</Text>
                {/* Header Add Icon Removed */}
                <View style={{ width: 28 }} />
            </View>

            {/* MAIN ACTION BUTTON */}
            <View style={{ paddingHorizontal: SPACING.screenPadding, marginTop: 8, marginBottom: SPACING.m }}>
                <TouchableOpacity
                    onPress={() => navigation.navigate('EditProfile', { isNew: true, profile: {} })}
                    style={{
                        backgroundColor: colors.primaryAction,
                        borderRadius: 12,
                        paddingVertical: 12,
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 8,
                        shadowColor: colors.primaryAction,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 6
                    }}
                >
                    <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                    <Text style={{ fontSize: TYPOGRAPHY.size.body, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFFFFF' }}>Add New Profile</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={userProfiles}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.screenPadding,
        paddingVertical: SPACING.m,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: TYPOGRAPHY.size.h3,
        fontWeight: TYPOGRAPHY.weight.bold,
    },
    list: { paddingBottom: 100 },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.m,
        paddingHorizontal: SPACING.screenPadding,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.m,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: TYPOGRAPHY.size.h3,
        fontWeight: TYPOGRAPHY.weight.bold,
    },
    name: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: TYPOGRAPHY.weight.medium,
    },
    role: {
        fontSize: TYPOGRAPHY.size.caption,
    },
});
