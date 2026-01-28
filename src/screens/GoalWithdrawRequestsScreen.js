import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, Alert, DeviceEventEmitter, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../components/context/AuthContext';
import { getAllGoalWithdrawRequests, approveGoalWithdrawRequest, rejectGoalWithdrawRequest } from '../services/firestoreRepository';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import { formatMoney } from '../utils/formatting';
import CurrencyText from '../components/CurrencyText';
import { useTheme } from '../components/context/ThemeContext';

export default function GoalWithdrawRequestsScreen({ navigation }) {
    const { user, profile } = useAuth();
    const { theme } = useTheme();
    const colors = COLORS[theme];

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL'); // 'ALL', 'PENDING', 'APPROVED', 'REJECTED'

    useLayoutEffect(() => {
        navigation.setOptions({ headerShown: false });
    }, [navigation]);

    useEffect(() => {
        if (user && profile) {
            loadRequests();
        }
    }, [user, profile]);

    const loadRequests = async () => {
        try {
            setLoading(true);
            const data = await getAllGoalWithdrawRequests(user.uid, profile?.id);
            setRequests(data);
        } catch (error) {
            console.error('Failed to load withdrawal requests:', error);
            Alert.alert('Error', 'Failed to load requests');
        } finally {
            setLoading(false);
        }
    };

    const filteredRequests = filter === 'ALL'
        ? requests
        : requests.filter(r => r.status === filter);

    const handleApprove = async (request) => {
        Alert.alert(
            'Approve Withdrawal',
            `Approve ${request.createdByName}'s request to withdraw ${formatMoney(request.amount)} from "${request.goalName}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Approve',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await approveGoalWithdrawRequest(user.uid, request.id, profile.id);
                            // Refresh all dashboard screens
                            DeviceEventEmitter.emit('refresh_profile_dashboard');
                            Alert.alert('Approved', 'Withdrawal has been processed.');
                            loadRequests();
                        } catch (error) {
                            console.error(error);
                            Alert.alert('Error', 'Failed to approve request');
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleReject = (request) => {
        Alert.prompt(
            'Reject Withdrawal',
            'Provide a reason for rejection (optional):',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: async (reason) => {
                        try {
                            setLoading(true);
                            await rejectGoalWithdrawRequest(user.uid, request.id, reason, profile.id);
                            // Refresh all dashboard screens
                            DeviceEventEmitter.emit('refresh_profile_dashboard');
                            Alert.alert('Rejected', 'Request has been rejected.');
                            loadRequests();
                        } catch (error) {
                            console.error(error);
                            Alert.alert('Error', 'Failed to reject request');
                            setLoading(false);
                        }
                    }
                }
            ],
            'plain-text'
        );
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'PENDING': return colors.warning;
            case 'APPROVED': return colors.success;
            case 'REJECTED': return colors.error;
            default: return colors.secondaryText;
        }
    };

    const renderItem = ({ item }) => (
        <View style={[styles.itemContainer, { borderColor: colors.divider }]}>
            <View style={styles.topRow}>
                {/* Icon */}
                <View style={[styles.iconBox, { backgroundColor: colors.iconBackground }]}>
                    <Text style={{ fontSize: 24 }}>{item.goalIcon || '🎯'}</Text>
                </View>

                {/* Details */}
                <View style={styles.detailsColumn}>
                    <View style={styles.titleRow}>
                        <Text style={[styles.reason, { color: colors.primaryText }]} numberOfLines={1}>
                            {item.goalName}
                        </Text>
                        <Text style={[styles.amount, { color: colors.primaryText }]}>{formatMoney(item.amount)}</Text>
                    </View>

                    <View style={styles.metaRow}>
                        <Text style={[styles.date, { color: colors.secondaryText }]} numberOfLines={1}>
                            {item.createdByName} • {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                        <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                            <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                        </View>
                    </View>

                    {/* Reason text below date if exists */}
                    {item.reason ? (
                        <Text style={{ fontSize: 13, color: colors.secondaryText, marginTop: 4, fontStyle: 'italic' }}>
                            {item.reason}
                        </Text>
                    ) : null}

                    {/* Rejection Reason (Left Aligned below note) */}
                    {item.status === 'REJECTED' && item.rejectionReason && (
                        <Text style={{ color: colors.error, fontSize: 12, marginTop: 4 }}>
                            Reject Reason: {item.rejectionReason}
                        </Text>
                    )}
                </View>
            </View>

            {/* Admin Actions for PENDING requests */}
            {item.status === 'PENDING' && (
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { borderColor: '#EAB308' }]}
                        onPress={() => handleReject(item)}
                    >
                        <Text style={[styles.actionText, { color: '#EAB308' }]}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.success, borderColor: colors.success }]}
                        onPress={() => handleApprove(item)}
                    >
                        <Text style={[styles.actionText, { color: '#fff' }]}>Approve</Text>
                    </TouchableOpacity>
                </View>
            )}


        </View>
    );

    const pendingCount = requests.filter(r => r.status === 'PENDING').length;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.divider }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.primaryText }]}>Withdrawal Requests</Text>
                <View style={{ width: 28 }} />
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
                    {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(f => (
                        <TouchableOpacity
                            key={f}
                            style={[
                                styles.filterTab,
                                { borderColor: colors.divider, backgroundColor: colors.inputBackground },
                                filter === f && { backgroundColor: colors.primaryAction, borderColor: colors.primaryAction }
                            ]}
                            onPress={() => setFilter(f)}
                        >
                            <Text style={[
                                styles.filterText,
                                { color: filter === f ? colors.primaryAction : colors.secondaryText },
                                filter === f && { color: '#ffffff', fontWeight: 'bold' }
                            ]}>
                                {f.charAt(0) + f.slice(1).toLowerCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <FlatList
                data={filteredRequests}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadRequests} tintColor={colors.primaryText} />}
                ListEmptyComponent={
                    !loading && (
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
                                No {filter.toLowerCase()} requests
                            </Text>
                        </View>
                    )
                }
            />
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
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.size.h3,
        fontWeight: TYPOGRAPHY.weight.bold,
    },
    // Filter Styles (Matches Money Request)
    filterContainer: {
        paddingVertical: SPACING.m,
    },
    filterContent: {
        paddingHorizontal: SPACING.screenPadding,
        gap: SPACING.m
    },
    filterTab: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 24,
        borderWidth: 1,
    },
    filterText: {
        fontSize: TYPOGRAPHY.size.caption,
        fontWeight: '600',
    },
    list: {
        padding: SPACING.screenPadding,
    },
    // Item Styles
    itemContainer: {
        marginBottom: SPACING.m,
        paddingBottom: SPACING.m,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.m
    },
    detailsColumn: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    reason: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: '600',
        flex: 1,
        marginRight: 8,
    },
    amount: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: 'bold',
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    date: {
        fontSize: TYPOGRAPHY.size.caption,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    actionRow: {
        flexDirection: 'row',
        marginTop: SPACING.m,
        justifyContent: 'flex-end',
        gap: SPACING.m,
    },
    actionBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
        minWidth: 80,
    },
    actionText: {
        fontSize: TYPOGRAPHY.size.caption,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: SPACING.xl * 2,
    },
    emptyText: {
        fontSize: TYPOGRAPHY.size.body,
    },
});
