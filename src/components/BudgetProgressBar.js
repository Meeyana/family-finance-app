// Purpose: Visual bar showing budget usage
// Used by: AccountDashboard, ProfileDashboard

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function BudgetProgressBar({ spent, limit, label, showAmount = true }) {
    const usage = limit > 0 ? (spent / limit) : 0;
    const percentage = Math.min(usage * 100, 100);

    // Determine Color based on Web Design rules (Green < 70%, Yellow < 100%, Red >= 100%)
    let barColor = '#34C759'; // Green (IOS Safe)
    if (usage >= 1.0) barColor = '#FF3B30'; // Red
    else if (usage >= 0.7) barColor = '#FFCC00'; // Yellow

    return (
        <View style={styles.container}>
            <View style={styles.labelRow}>
                {label && <Text style={styles.label}>{label}</Text>}
                {showAmount && (
                    <Text style={styles.amount}>
                        {spent.toLocaleString()} / {limit.toLocaleString()}
                    </Text>
                )}
            </View>
            <View style={styles.track}>
                <View
                    style={[
                        styles.fill,
                        { width: `${percentage}%`, backgroundColor: barColor }
                    ]}
                />
            </View>
            <Text style={[styles.percentageText, { color: barColor }]}>
                {Math.round(usage * 100)}% Used
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    amount: {
        fontSize: 12,
        color: '#666',
    },
    track: {
        height: 8,
        backgroundColor: '#E5E5EA',
        borderRadius: 4,
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
        borderRadius: 4,
    },
    percentageText: {
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'right',
        marginTop: 4,
    }
});
