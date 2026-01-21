import React, { useLayoutEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, useColorScheme } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../components/context/AuthContext';
import Avatar from '../components/Avatar';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';

export default function ManageProfilesScreen({ navigation }) {
    const { userProfiles } = useAuth(); // Live data from Context
    const theme = useColorScheme() || 'light';
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
        <SafeAreaView style={[styles.container, { backgroundColor: '#ffffff' }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.divider, backgroundColor: '#ffffff' }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="arrow-back" size={24} color="#3e2723" />
                </TouchableOpacity>
                <Text style={[styles.title, { color: '#3e2723' }]}>Manage Profiles</Text>
                <TouchableOpacity onPress={() => navigation.navigate('EditProfile', { isNew: true, profile: {} })} >
                    <Ionicons name="add" size={28} color={colors.primaryAction} />
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
