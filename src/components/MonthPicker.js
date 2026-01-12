import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY } from '../constants/theme';

export default function MonthPicker({ date, onMonthChange }) {
    const theme = useColorScheme() || 'light';
    const colors = COLORS[theme];

    const formattedDate = date.toLocaleString('default', { month: 'long', year: 'numeric' });

    const changeMonth = (offset) => {
        const newDate = new Date(date);
        newDate.setMonth(newDate.getMonth() + offset);
        onMonthChange(newDate);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.button}>
                <Ionicons name="chevron-back" size={20} color={colors.secondaryText} />
            </TouchableOpacity>

            <Text style={[styles.dateText, { color: colors.primaryText }]}>{formattedDate}</Text>

            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.button}>
                <Ionicons name="chevron-forward" size={20} color={colors.secondaryText} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center', // Centered Date for Dashboard
        paddingVertical: 8,
    },
    button: {
        paddingHorizontal: 16,
    },
    dateText: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: TYPOGRAPHY.weight.medium,
        letterSpacing: 0.5,
        minWidth: 140,
        textAlign: 'center',
    },
});
