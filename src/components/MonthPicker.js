import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

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
                <Text style={styles.arrow}>◀</Text>
            </TouchableOpacity>

            <Text style={styles.dateText}>{formattedDate}</Text>

            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.button}>
                <Text style={styles.arrow}>▶</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f7fa',
        paddingVertical: 12,
        borderRadius: 12,
        marginVertical: 8,
    },
    button: {
        paddingHorizontal: 20,
    },
    arrow: {
        fontSize: 18,
        color: '#007AFF',
    },
    dateText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        minWidth: 120,
        textAlign: 'center',
    },
});
