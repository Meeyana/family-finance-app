import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Platform, DeviceEventEmitter } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../components/context/AuthContext';
import { getRequests, rejectRequest, processTransfer } from '../services/firestoreRepository';

export default function RequestListScreen({ navigation }) {
    const { user, profile } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

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
            case 'APPROVED': return '#34C759';
            case 'REJECTED': return '#FF3B30';
            default: return '#FF9500'; // Pending
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                {/* For Admin/Parents: Show who requested. For Child: Hide name (it's me) */}
                {!isAdmin ? (
                    // CHILD VIEW
                    <View style={styles.childHeaderLeft}>
                        <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                        {item.status === 'APPROVED' && item.approvedByName && (
                            <Text style={styles.approvedByText}>Approved by {item.approvedByName}</Text>
                        )}
                    </View>
                ) : (
                    // ADMIN VIEW
                    <View style={styles.userRow}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{item.createdByName?.[0] || '?'}</Text>
                        </View>
                        <View>
                            <Text style={styles.userName}>{item.createdByName}</Text>
                            <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                        </View>
                    </View>
                )}

                <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                </View>
            </View>

            <Text style={styles.amount}>{item.amount.toLocaleString()} ₫</Text>
            {item.categoryData && (
                <View style={styles.catTag}>
                    <Text style={styles.catText}>{item.categoryData.icon} {item.categoryData.name}</Text>
                </View>
            )}
            <Text style={styles.reason}>{item.reason}</Text>

            {/* Admin Actions for PENDING requests */}
            {isAdmin && item.status === 'PENDING' && (
                <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleReject(item)}>
                        <Text style={styles.rejectText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleApprove(item)}>
                        <Text style={styles.approveText}>Approve</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
                </TouchableOpacity>
                <Text style={styles.title}>Money Requests</Text>
                {/* Only Users can Create */}
                {!isAdmin ? (
                    <TouchableOpacity onPress={() => navigation.navigate('MoneyRequest')}>
                        <Ionicons name="add-circle" size={32} color="#007AFF" />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={() => navigation.navigate('GrantMoney')}>
                        <Ionicons name="gift" size={28} color="#28a745" />
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={requests}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                ListEmptyComponent={
                    !loading && (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No requests found.</Text>
                        </View>
                    )
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },
    title: { fontSize: 20, fontWeight: 'bold' },
    list: { padding: 16 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    userRow: { flexDirection: 'row', alignItems: 'center' },
    avatar: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginRight: 12
    },
    avatarText: { fontSize: 18, fontWeight: 'bold', color: '#666' },
    userName: { fontWeight: '600', fontSize: 16 },
    date: { fontSize: 12, color: '#999' },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    badgeText: { fontSize: 12, fontWeight: 'bold' },
    amount: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 },
    reason: { fontSize: 16, color: '#666', lineHeight: 22 },
    actionRow: { flexDirection: 'row', marginTop: 16, gap: 12 },
    actionBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
    rejectBtn: { backgroundColor: '#FF3B3015' },
    rejectText: { color: '#FF3B30', fontWeight: '600' },
    approveBtn: { backgroundColor: '#34C759' },
    approveText: { color: 'white', fontWeight: '600' },
    emptyContainer: { alignItems: 'center', marginTop: 60 },
    emptyText: { color: '#999', fontSize: 16 },
    catTag: { alignSelf: 'flex-start', backgroundColor: '#f0f0f0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginBottom: 4 },
    catText: { fontSize: 12, color: '#666' },
    childHeaderLeft: { flexDirection: 'column', gap: 2 },
    approvedByText: { fontSize: 12, color: '#28a745', fontWeight: 'bold' }
});
