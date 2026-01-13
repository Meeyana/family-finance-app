import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, PanResponder, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './context/ThemeContext';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';

export default function SwipeDateFilter({ date, onMonthChange }) {
    const { theme } = useTheme();
    const colors = COLORS[theme];

    // Formatting: "January 2026"
    const formattedDate = date.toLocaleString('default', { month: 'long', year: 'numeric' });

    // Swipe Logic using PanResponder
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderRelease: (evt, gestureState) => {
                const SWIPE_THRESHOLD = 50;
                if (gestureState.dx > SWIPE_THRESHOLD) {
                    // Swipe Right -> Previous Month
                    onMonthChange(new Date(date.getFullYear(), date.getMonth() - 1, 1));
                } else if (gestureState.dx < -SWIPE_THRESHOLD) {
                    // Swipe Left -> Next Month
                    onMonthChange(new Date(date.getFullYear(), date.getMonth() + 1, 1));
                }
            },
        })
    ).current;

    const changeMonth = (offset) => {
        const newDate = new Date(date);
        newDate.setMonth(newDate.getMonth() + offset);
        onMonthChange(newDate);
    };

    return (
        <View
            style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.divider }]}
            {...panResponder.panHandlers}
        >
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.button} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="chevron-back" size={20} color={colors.secondaryText} />
            </TouchableOpacity>

            <View style={styles.textContainer}>
                <Text style={[styles.dateText, { color: colors.primaryText }]}>
                    {formattedDate}
                </Text>

            </View>

            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.button} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="chevron-forward" size={20} color={colors.secondaryText} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 6, // Reduced from 12
        paddingHorizontal: SPACING.m,
        borderRadius: 16,
        borderWidth: 1,
        // Shadow for depth (optional, keeping minimal as per guidelines)
        // shadowColor: "#000",
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.05,
        // shadowRadius: 3.84,
        // elevation: 2,
    },
    button: {
        padding: 4,
    },
    textContainer: {
        alignItems: 'center',
    },
    dateText: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: TYPOGRAPHY.weight.regular, // Changed from bold
        fontFamily: TYPOGRAPHY.fontFamily.medium,
    },
    hintText: {
        fontSize: 10,
        marginTop: 2,
        opacity: 0.6,
    }
});
