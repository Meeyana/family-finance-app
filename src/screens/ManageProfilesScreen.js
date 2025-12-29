import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../components/context/AuthContext';

export default function ManageProfilesScreen({ navigation }) {
    const { userProfiles } = useAuth(); // Live data from Context

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('EditProfile', { profile: item })}
        >
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name[0]}</Text>
            </View>
            <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.role}>{item.role}</Text>
            </View>
            <View style={styles.limitContainer}>
                <Text style={styles.limitLabel}>Limit</Text>
                <Text style={styles.limitValue}>
                    {(item.limit || 0).toLocaleString()} ð
                </Text>
            </View>
            <Text style={styles.arrow}>></Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Manage Profiles</Text>
                <View style={{ width: 50 }} />
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
    container: { flex: 1, backgroundColor: '#f5f7fa' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backText: { fontSize: 16, color: '#007AFF' },
    title: { fontSize: 18, fontWeight: 'bold' },
    list: { padding: 16 },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    avatar: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#e3f2fd',
        justifyContent: 'center', alignItems: 'center',
        marginRight: 12,
    },
    avatarText: { fontSize: 18, fontWeight: 'bold', color: '#007AFF' },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: '600', color: '#333' },
    role: { fontSize: 13, color: '#888' },
    limitContainer: { alignItems: 'flex-end', marginRight: 12 },
    limitLabel: { fontSize: 11, color: '#888' },
    limitValue: { fontSize: 14, fontWeight: 'bold', color: '#333' },
    arrow: { fontSize: 18, color: '#ccc' },
});
