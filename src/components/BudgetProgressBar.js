import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import CurrencyText from './CurrencyText';

export default function BudgetProgressBar({ spent, limit, label, showAmount = true, compact = false, boxed = false }) {
    const theme = useColorScheme() || 'light';
    const colors = COLORS[theme];

    const usage = limit > 0 ? (spent / limit) : 0;
    const percentage = Math.min(usage * 100, 100);

    // Functional Colors
    // Default to Primary Theme (Black/White) for Spending Progress
    let barColor = colors.primaryAction || colors.primaryText;

    if (usage >= 1.0) barColor = colors.error; // Red if over budget
    else if (usage >= 0.8) barColor = '#F59E0B'; // Amber - Warning near limit

    // Track Color (Subtle)
    const trackColor = theme === 'dark' ? '#333' : '#F3F4F6';

    const containerStyle = boxed ? [styles.container, styles.boxedContainer, { backgroundColor: colors.surface, borderColor: colors.divider }] : [styles.container, compact && { marginBottom: 6 }];

    return (
        <View style={containerStyle}>
            <View style={styles.labelRow}>
                {label && <Text style={[styles.label, { color: colors.primaryText }]}>{label}</Text>}
                {showAmount && (
                    <Text style={[styles.amount, { color: colors.secondaryText }]}>
                        <CurrencyText amount={spent} /> <Text style={{ fontSize: 10 }}>/</Text> <CurrencyText amount={limit} />
                    </Text>
                )}
            </View>

            <View style={[styles.track, { backgroundColor: trackColor, height: compact ? 3 : 4 }]}>
                <View
                    style={[
                        styles.fill,
                        { width: `${percentage}%`, backgroundColor: barColor }
                    ]}
                />
            </View>

            {/* Percentage readout */}
            {!compact && (
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 }}>
                    <Text style={[styles.percentageText, { color: barColor }]}>
                        {Math.round(usage * 100)}% Used
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.m,
    },
    boxedContainer: {
        padding: SPACING.m,
        borderRadius: SPACING.cardBorderRadius,
        borderWidth: 1,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8, // Slightly more space for boxed look
        alignItems: 'baseline',
    },
    label: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: TYPOGRAPHY.weight.medium,
    },
    amount: {
        fontSize: TYPOGRAPHY.size.caption,
        fontVariant: ['tabular-nums'],
    },
    track: {
        borderRadius: 2,
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
        borderRadius: 2,
    },
    percentageText: {
        fontSize: TYPOGRAPHY.size.small,
        fontWeight: TYPOGRAPHY.weight.bold,
    }
});
