import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function MonthPicker({ date, onMonthChange }) {
    const formattedDate = date.toLocaleString('default', { month: 'long', year: 'numeric' });

    const changeMonth = (offset) => {
        const newDate = new Date(date);
        newDate.setMonth(newDate.getMonth() + offset);
        onMonthChange(newDate);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.button}>
                <Ionicons name="chevron-back" size={24} color="#007AFF" />
            </TouchableOpacity>

            <Text style={styles.dateText}>{formattedDate}</Text>

            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.button}>
                <Ionicons name="chevron-forward" size={24} color="#007AFF" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        // Removed gray background
    },
    button: {
        paddingHorizontal: 24,
    },
    arrow: {
        fontSize: 24,
        color: '#007AFF', // You can swap this for Ionicons in next step if text arrow is too simple
        fontWeight: '300'
    },
    dateText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1a1a1a',
        letterSpacing: 0.5,
        minWidth: 140,
        textAlign: 'center',
    },
});
