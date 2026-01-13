import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Platform, DeviceEventEmitter, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../components/context/AuthContext';
import { getRequests, rejectRequest, processTransfer } from '../services/firestoreRepository';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';

export default function RequestListScreen({ navigation }) {
    const { user, profile } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const theme = useColorScheme() || 'light';
    const colors = COLORS[theme];

    // simple check: if role is Owner/Partner, they are Admin
    const strRole = profile?.role?.toLowerCase() || '';
    const isAdmin = strRole === 'owner' || strRole === 'partner';

    const loadRequests = async () => {
        try {
            const data = await getRequests(user.uid, profile.id, profile.role);
            setRequests(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadRequests();
        const sub = DeviceEventEmitter.addListener('refresh_profile_dashboard', loadRequests);
        return () => sub.remove();
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        loadRequests();
    };

    const handleApprove = (req) => {
        if (!isAdmin) return;

        // Confirm Approval
        if (Platform.OS === 'web') {
            if (window.confirm(`Approve sending ${req.amount.toLocaleString()} VND to ${req.createdByName}?`)) {
                executeApprove(req);
            }
        } else {
            Alert.alert(
                'Approve Request?',
                `Send ${req.amount.toLocaleString()} VND to ${req.createdByName}?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Approve',
                        onPress: () => executeApprove(req)
                    }
                ]
            );
        }
    };

    const executeApprove = async (req) => {
        try {
            setLoading(true);
            // Use the requested category logic
            const categoryToUse = req.categoryData || { name: 'Allowance', icon: '💰' };

            await processTransfer(
                user.uid,
                profile.id, // Admin
                req.createdByProfileId, // Requester
                req.amount,
                { name: 'Present', icon: '🎁', id: 'present' }, // Hardcoded Category
                `Request: ${req.reason}`,
                req.id // Link Query
            );

            DeviceEventEmitter.emit('refresh_profile_dashboard');

            Alert.alert('Success', 'Request approved!');
            loadRequests();
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to approve.');
        } finally {
            setLoading(false);
        }
    };

    const handleReject = (req) => {
        if (!isAdmin) return;

        if (Platform.OS === 'web') {
            if (window.confirm('Reject this request? This cannot be undone.')) {
                executeReject(req);
            }
        } else {
            Alert.alert(
                'Reject Request?',
                'This cannot be undone.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Reject',
                        style: 'destructive',
                        onPress: () => executeReject(req)
                    }
                ]
            );
        }
    };

    const executeReject = async (req) => {
        try {
            setLoading(true);
            await rejectRequest(user.uid, req.id, 'Admin Rejected');
            loadRequests();
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to reject.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'APPROVED': return colors.success;
            case 'REJECTED': return colors.error;
            default: return colors.warning; // Pending
        }
    };

    const renderItem = ({ item }) => (
        <View style={[styles.itemContainer, { borderColor: colors.divider }]}>
            <View style={styles.topRow}>
                {/* Left: Icon/Avatar */}
                {!isAdmin ? (
                    // CHILD VIEW
                    <View style={[styles.iconBox, { backgroundColor: colors.surface }]}>
                        <Text style={{ fontSize: 20 }}>{item.categoryData?.icon || '💰'}</Text>
                    </View>
                ) : (
                    // ADMIN VIEW
                    <View style={[styles.avatarBox, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.avatarText, { color: colors.primaryText }]}>{item.createdByName?.[0] || '?'}</Text>
                    </View>
                )}

                {/* Center: Details */}
                <View style={styles.detailsColumn}>
                    <View style={styles.titleRow}>
                        <Text style={[styles.reason, { color: colors.primaryText }]} numberOfLines={1}>
                            {isAdmin ? (item.createdByName || 'Unknown') : (item.reason || 'Money Request')}
                        </Text>
                        <Text style={[styles.amount, { color: colors.primaryText }]}>{item.amount.toLocaleString()}</Text>
                    </View>

                    <View style={styles.metaRow}>
                        <Text style={[styles.date, { color: colors.secondaryText }]} numberOfLines={1}>
                            {new Date(item.createdAt).toLocaleDateString()}
                            {isAdmin && ` • ${item.reason}`}
                        </Text>
                        <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                            <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Admin Actions for PENDING requests */}
            {isAdmin && item.status === 'PENDING' && (
                <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.error }]} onPress={() => handleReject(item)}>
                        <Text style={[styles.actionText, { color: colors.error }]}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primaryAction, borderColor: colors.primaryAction }]} onPress={() => handleApprove(item)}>
                        <Text style={[styles.actionText, { color: '#fff' }]}>Approve</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.divider }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.primaryText }]}>Money Requests</Text>

                {/* Only Users can Create */}
                {!isAdmin ? (
                    <TouchableOpacity onPress={() => navigation.navigate('MoneyRequest')}>
                        <Ionicons name="add-circle-outline" size={28} color={colors.primaryAction} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={() => navigation.navigate('GrantMoney')}>
                        <Ionicons name="gift-outline" size={24} color={colors.primaryAction} />
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={requests}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primaryText} />}
                ListEmptyComponent={
                    !loading && (
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No requests found.</Text>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.screenPadding,
        paddingVertical: SPACING.m,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    title: { fontSize: TYPOGRAPHY.size.h3, fontWeight: '600' },
    list: { padding: SPACING.screenPadding },
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
        width: 48, height: 48, borderRadius: 24,
        justifyContent: 'center', alignItems: 'center', marginRight: SPACING.m
    },
    avatarBox: {
        width: 48, height: 48, borderRadius: 24,
        justifyContent: 'center', alignItems: 'center', marginRight: SPACING.m
    },
    avatarText: { fontSize: 18, fontWeight: 'bold' },
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
    emptyContainer: { alignItems: 'center', marginTop: 60 },
    emptyText: { fontSize: TYPOGRAPHY.size.body },
});
