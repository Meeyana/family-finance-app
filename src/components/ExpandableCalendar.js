import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import { useTheme } from './context/ThemeContext';
import CurrencyText from './CurrencyText';

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ExpandableCalendar({ baseDate, selectedDate, onSelectDate, transactions = [], onToggle }) {
    const { theme } = useTheme();
    const colors = COLORS[theme];

    const [expanded, setExpanded] = useState(false);

    // Group transactions by date (YYYY-MM-DD)
    const dailyStats = useMemo(() => {
        const stats = {};

        const isInternalTransfer = (t) => t.isTransfer || t.type === 'transfer' || t.category === 'Granted' || t.category === 'Present' || (t.note && t.note.includes('(Granted)'));

        transactions.forEach(t => {
            const date = t.date; // YYYY-MM-DD
            if (!stats[date]) {
                stats[date] = { income: 0, expense: 0, balance: 0 };
            }

            const isGiven = (t.note && (t.note.includes('Transfer to') || t.note.startsWith('To '))) || t.category === 'Transfer Out' || t.categoryIcon === '💸';
            const isReceived = (t.note && (t.note.includes('Received from') || t.note.startsWith('From '))) || t.category === 'Allowance' || t.categoryIcon === '💰';

            let amount = t.amount;
            let isIncome = false;

            if (isReceived) {
                isIncome = true;
            } else if (isGiven) {
                isIncome = false;
            } else if (t.type === 'income') {
                isIncome = true;
            } else if ((t.type || 'expense') === 'expense' && !isInternalTransfer(t)) {
                isIncome = false;
            } else if (isInternalTransfer(t)) {
                isIncome = false;
            } else {
                isIncome = false;
            }

            if (isIncome) {
                stats[date].income += amount;
                stats[date].balance += amount;
            } else {
                stats[date].expense += amount;
                stats[date].balance -= amount;
            }
        });
        return stats;
    }, [transactions]);

    const generateCalendar = () => {
        // Use baseDate to determine the month to render
        const targetDate = baseDate || new Date();
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const days = [];
        const numDays = lastDay.getDate();

        let startDayOfWeek = firstDay.getDay() - 1;
        if (startDayOfWeek === -1) startDayOfWeek = 6;

        // Previous month padding
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push({ day: null }); // Empty slot
        }

        // Current month days
        for (let i = 1; i <= numDays; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            days.push({
                day: i,
                date: new Date(year, month, i),
                dateStr: dateStr,
                stats: dailyStats[dateStr]
            });
        }

        return days;
    };

    const calendarDays = generateCalendar();

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        const newState = !expanded;
        setExpanded(newState);
        if (onToggle) onToggle(newState);
    };

    const renderDay = (item, index) => {
        if (!item.day) return <View key={`empty-${index}`} style={styles.dayCell} />;

        // Highlight logic
        const isSelected = selectedDate &&
            item.date.getFullYear() === selectedDate.getFullYear() &&
            item.date.getMonth() === selectedDate.getMonth() &&
            item.date.getDate() === selectedDate.getDate();

        // Color Logic
        const now = new Date();
        const isToday = item.date.getFullYear() === now.getFullYear() &&
            item.date.getMonth() === now.getMonth() &&
            item.date.getDate() === now.getDate();

        const dayOfWeek = item.date.getDay(); // 0 = Sun, 6 = Sat
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        let dayColor = colors.primaryText;
        if (isToday) {
            dayColor = colors.error; // Red per user request
        } else if (isWeekend) {
            dayColor = colors.success; // Green per user request
        }

        return (
            <TouchableOpacity
                key={index}
                style={[
                    styles.dayCell,
                    isSelected && { backgroundColor: colors.primaryAction + '20', borderRadius: 8 }
                ]}
                onPress={() => onSelectDate(item.date)}
            >
                <Text style={{
                    fontSize: 13,
                    fontWeight: isSelected || isToday ? 'bold' : 'normal',
                    color: dayColor
                }}>
                    {item.day}
                </Text>
            </TouchableOpacity>
        );
    };

    const getSelectedDayStats = () => {
        if (!selectedDate) return null;
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        return dailyStats[dateStr];
    };

    const selectedStats = getSelectedDayStats();

    return (
        <View style={[styles.container, {
            backgroundColor: expanded ? colors.cardBackground : 'transparent',
            marginBottom: expanded ? SPACING.m : 0
        }]}>
            {/* Toggle Button - Absolute overlaps top border */}
            <View style={{
                position: 'absolute',
                top: -12, // Half of height (24/2)
                left: 0,
                right: 0,
                alignItems: 'center',
                zIndex: 10
            }}>
                <TouchableOpacity
                    onPress={toggleExpand}
                    activeOpacity={0.8}
                    style={{
                        width: 64,
                        height: 24,
                        backgroundColor: '#FFC107',
                        borderRadius: 12,
                        justifyContent: 'center',
                        alignItems: 'center',
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.2,
                        shadowRadius: 1.41,
                        elevation: 2,
                    }}
                >
                    <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color="#1A3C34" />
                </TouchableOpacity>
            </View>

            {/* Calendar Content */}
            {expanded && (
                <View style={styles.calendarContent}>
                    {/* Days Header */}
                    <View style={styles.weekRow}>
                        {DAYS_OF_WEEK.map(d => (
                            <Text key={d} style={[styles.weekDayText, { color: colors.secondaryText }]}>{d}</Text>
                        ))}
                    </View>

                    {/* Grid */}
                    <View style={styles.grid}>
                        {calendarDays.map((item, index) => renderDay(item, index))}
                    </View>

                    {/* Summary for Selected Day */}
                    <View style={[styles.footerInfo, { borderTopColor: colors.divider }]}>
                        {selectedDate ? (
                            selectedStats ? (
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Ionicons name="arrow-down" size={12} color={colors.success} />
                                        <CurrencyText
                                            amount={selectedStats.income}
                                            style={{ color: colors.success, fontSize: 13, fontWeight: 'bold', marginLeft: 4 }}
                                            showSign
                                        />
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Ionicons name="arrow-up" size={12} color={colors.error} />
                                        <CurrencyText
                                            amount={-selectedStats.expense}
                                            style={{ color: colors.error, fontSize: 13, fontWeight: 'bold', marginLeft: 4 }}
                                        />
                                    </View>
                                </View>
                            ) : (
                                <Text style={{ color: colors.secondaryText, fontSize: 12 }}>No transactions on this date</Text>
                            )
                        ) : (
                            <Text style={{ color: colors.secondaryText, fontSize: 12 }}>Select a date to filter</Text>
                        )}
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: SPACING.screenPadding,
        borderRadius: 12,
        position: 'relative', // For absolute button positioning
        marginTop: 10, // Minimal spacing as requested
    },
    calendarContent: {
        paddingBottom: 16,
        paddingTop: 16, // Increased from 8 to give more room below the button
        paddingHorizontal: 12,
    },
    weekRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 4,
        marginTop: 4,
    },
    weekDayText: {
        fontSize: 12,
        width: 40,
        textAlign: 'center',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: '14.28%', // 100% / 7
        height: 38,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerInfo: {
        marginTop: 4,
        paddingTop: 4,
        borderTopWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
        minHeight: 24,
        justifyContent: 'center'
    }
});
