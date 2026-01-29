import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Platform, DeviceEventEmitter, useColorScheme, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/context/ThemeContext';
import { useAuth } from '../components/context/AuthContext';
import { getRequests, rejectRequest, processTransfer } from '../services/firestoreRepository';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import Avatar from '../components/Avatar';
import CurrencyText from '../components/CurrencyText';
import { formatMoney } from '../utils/formatting';

export default function RequestListScreen({ navigation }) {
    const { user, profile } = useAuth();
    const { theme } = useTheme();
    const colors = COLORS[theme];

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, PENDING, APPROVED, REJECTED, SENT
    const [lastVisible, setLastVisible] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // simple check: if role is Owner/Partner, they are Admin
    const strRole = profile?.role?.toLowerCase() || '';
    const isAdmin = strRole === 'owner' || strRole === 'partner';

    const loadRequests = async (isLoadMore = false) => {
        if (isLoadMore && (!hasMore || loadingMore)) return;

        try {
            if (isLoadMore) setLoadingMore(true);
            else setLoading(true);

            // If refresh/initial, reset cursor
            const cursor = isLoadMore ? lastVisible : null;

            const { data, lastVisible: nextCursor } = await getRequests(user.uid, profile.id, profile.role, cursor);

            if (data.length < 25) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }

            setLastVisible(nextCursor);

            if (isLoadMore) {
                setRequests(prev => {
                    const existingIds = new Set(prev.map(r => r.id));
                    const newUniqueData = data.filter(r => !existingIds.has(r.id));
                    return [...prev, ...newUniqueData];
                });
            } else {
                setRequests(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadRequests();
        const sub = DeviceEventEmitter.addListener('refresh_profile_dashboard', () => loadRequests(false));
        return () => sub.remove();
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        setHasMore(true);
        setLastVisible(null);
        loadRequests(false);
    };

    const handleLoadMore = () => {
        loadRequests(true);
    };

    const handleApprove = (req) => {
        if (!isAdmin) return;

        // Confirm Approval
        if (Platform.OS === 'web') {
            if (window.confirm(`Approve sending ${formatMoney(req.amount)} VND to ${req.createdByName}?`)) {
                executeApprove(req);
            }
        } else {
            Alert.alert(
                'Approve Request?',
                `Send ${formatMoney(req.amount)} VND to ${req.createdByName}?`,
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
            DeviceEventEmitter.emit('refresh_profile_dashboard');
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
            case 'SENT': return colors.primaryAction; // Blue for Sent
            default: return '#EAB308'; // Warning Yellow for Pending
        }
    };



    // Filter out goal_withdraw requests - they have their own screen
    const filteredRequests = requests.filter(req => {
        // Exclude goal withdrawal requests
        if (req.type === 'goal_withdraw') return false;
        // Then apply status filter
        if (statusFilter === 'ALL') return true;
        return req.status === statusFilter;
    });

    const renderItem = ({ item }) => (
        <View style={[styles.itemContainer, { borderColor: colors.divider }]}>
            <View style={styles.topRow}>


                {/* Center: Details */}
                <View style={styles.detailsColumn}>
                    <View style={styles.titleRow}>
                        <Text style={[styles.reason, { color: colors.primaryText }]} numberOfLines={1}>
                            {isAdmin ? (
                                item.status === 'SENT' ? `Sent to ${item.toProfileName}` : (item.createdByName || 'Unknown')
                            ) : (
                                item.reason || 'Money Request'
                            )}
                        </Text>
                        <CurrencyText amount={item.amount} style={[styles.amount, { color: colors.primaryText }]} />
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
            {
                isAdmin && item.status === 'PENDING' && (
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={[styles.actionBtn, { borderColor: '#EAB308' }]} onPress={() => handleReject(item)}>
                            <Text style={[styles.actionText, { color: '#EAB308' }]}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primaryAction, borderColor: colors.primaryAction }]} onPress={() => handleApprove(item)}>
                            <Text style={[styles.actionText, { color: '#fff' }]}>Approve</Text>
                        </TouchableOpacity>
                    </View>
                )
            }
        </View >
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.divider }]}>
                {/* Center Title */}
                <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: -1 }}>
                    <Text style={[styles.title, { color: colors.primaryText }]}>Money Requests</Text>
                </View>

                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
                </TouchableOpacity>

                {/* Icons Removed - Moved to Body */}
                <View style={{ width: 24 }} />
            </View>

            {/* MAIN ACTION BUTTON */}
            <View style={{ paddingHorizontal: SPACING.screenPadding, marginTop: 8, marginBottom: SPACING.m }}>
                {!isAdmin ? (
                    <TouchableOpacity
                        onPress={() => navigation.navigate('MoneyRequest')}
                        style={{
                            backgroundColor: colors.primaryAction,
                            borderRadius: 12, // Compact radius
                            paddingVertical: 12, // Compact padding
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
                        <Text style={{ fontSize: TYPOGRAPHY.size.body, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFFFFF' }}>New Money Request</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        onPress={() => navigation.navigate('GrantMoney')}
                        style={{
                            backgroundColor: colors.primaryAction,
                            borderRadius: 12, // Compact radius
                            paddingVertical: 12, // Compact padding
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
                        <Ionicons name="gift" size={20} color="#FFFFFF" />
                        <Text style={{ fontSize: TYPOGRAPHY.size.body, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFFFFF' }}>Grant Money</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
                    {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'SENT'].map(status => (
                        <TouchableOpacity
                            key={status}
                            style={[
                                styles.filterChip,
                                { borderColor: colors.divider, backgroundColor: colors.inputBackground },
                                statusFilter === status && { backgroundColor: colors.primaryAction, borderColor: colors.primaryAction }
                            ]}
                            onPress={() => setStatusFilter(status)}
                        >
                            <Text style={[
                                styles.filterText,
                                { color: colors.secondaryText },
                                statusFilter === status && { color: '#ffffff', fontWeight: 'bold' }
                            ]}>
                                {status.charAt(0) + status.slice(1).toLowerCase()}
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
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primaryText} />}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                    loadingMore ? (
                        <ActivityIndicator size="small" color={colors.primaryText} style={{ marginVertical: 20 }} />
                    ) : null
                }
                ListEmptyComponent={
                    !loading && (
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No requests found.</Text>
                        </View>
                    )
                }
            />
        </SafeAreaView >
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
    filterContainer: {
        paddingVertical: SPACING.m,
    },
    filterContent: {
        paddingHorizontal: SPACING.screenPadding,
        gap: SPACING.m
    },
    filterChip: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 24,
        borderWidth: 1,
    },
    filterText: {
        fontSize: TYPOGRAPHY.size.caption,
        fontWeight: '600'
    }
});
