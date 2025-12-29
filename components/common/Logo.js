import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';

const Logo = ({ size = 32, showText = true, isPremium = false, style }) => {
    return (
        <View style={[styles.container, style]}>
            <View style={{ position: 'relative' }}>
                <View style={[
                    styles.iconBg,
                    { width: size * 2, height: size * 2, borderRadius: size * 0.5 },
                    isPremium && styles.premiumRing
                ]}>
                    <Feather name="briefcase" size={size} color="white" />
                </View>
                {isPremium && (
                    <View style={styles.crownBadge}>
                        <FontAwesome5 name="crown" size={size * 0.4} color="#78350F" />
                    </View>
                )}
            </View>

            {showText && (
                <View style={{ alignItems: 'center', marginTop: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.title}>Quản Lý Chi Tiêu</Text>
                        {isPremium && (
                            <View style={styles.premiumTag}>
                                <Text style={styles.premiumText}>PREMIUM</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.subtitle}>Đăng nhập để truy cập dữ liệu cá nhân</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    iconBg: {
        backgroundColor: '#2563EB',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6
    },
    premiumRing: {
        borderWidth: 2,
        borderColor: '#FACC15',
    },
    crownBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: '#FACC15',
        padding: 4,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: 'white',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
    },
    subtitle: {
        color: '#6B7280',
        fontSize: 14,
        marginTop: 4
    },
    premiumTag: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FDE68A'
    },
    premiumText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#B45309'
    }
});

export default Logo;
