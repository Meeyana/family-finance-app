import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Badge = ({ children, color = '#6B7280' }) => {
    return (
        <View style={[styles.badge, { backgroundColor: color + '20' }]}>
            <Text style={[styles.text, { color: color }]}>{children}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        alignSelf: 'flex-start',
    },
    text: {
        fontSize: 12,
        fontWeight: '600',
    }
});

export default Badge;
