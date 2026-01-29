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

    // Check if next month is in the future
    const isFuture = (d) => {
        const now = new Date();
        const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        return nextMonth > now;
    };

    // Check if prev month is before 6 months ago
    const isPastLimit = (d) => {
        const now = new Date();
        // Limit is 6 months ago from 1st of current month
        const limit = new Date(now.getFullYear(), now.getMonth() - 6, 1);

        // Calculate prev month date
        const prevMonth = new Date(d.getFullYear(), d.getMonth() - 1, 1);

        // Disable if prev month is BEFORE the limit month
        return prevMonth < limit;
    };

    const isNextMonthFuture = isFuture(date);
    const isPrevMonthRestricted = isPastLimit(date);

    // Swipe Logic using PanResponder
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderRelease: (evt, gestureState) => {
                const SWIPE_THRESHOLD = 50;
                if (gestureState.dx > SWIPE_THRESHOLD) {
                    // Swipe Right -> Previous Month
                    if (!isPrevMonthRestricted) {
                        onMonthChange(new Date(date.getFullYear(), date.getMonth() - 1, 1));
                    }
                } else if (gestureState.dx < -SWIPE_THRESHOLD) {
                    // Swipe Left -> Next Month
                    if (!isNextMonthFuture) {
                        onMonthChange(new Date(date.getFullYear(), date.getMonth() + 1, 1));
                    }
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
            <TouchableOpacity
                onPress={() => changeMonth(-1)}
                style={[styles.button, { opacity: isPrevMonthRestricted ? 0 : 1 }]}
                disabled={isPrevMonthRestricted}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Ionicons name="chevron-back" size={20} color={colors.secondaryText} />
            </TouchableOpacity>

            <View style={styles.textContainer}>
                <Text style={[styles.dateText, { color: colors.primaryText }]}>
                    {formattedDate}
                </Text>

            </View>

            <TouchableOpacity
                onPress={() => changeMonth(1)}
                style={[styles.button, { opacity: isNextMonthFuture ? 0 : 1 }]}
                disabled={isNextMonthFuture}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
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
        paddingHorizontal: SPACING.m,
        borderRadius: 16,
        backgroundColor: '#F3F4F6', // Match Analysis Date Button
        height: 48, // Fixed height to match Filter Button
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
