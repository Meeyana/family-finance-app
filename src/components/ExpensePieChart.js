// Purpose: Display spending distribution by category
// Used by: AccountDashboard

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

const COLORS = ['#007AFF', '#FF9500', '#FF2D55', '#5856D6', '#4CD964', '#FFCC00'];

export default function ExpensePieChart({ data }) {
    // Transform transaction data into chart data
    const categoryTotals = {};
    data.transactions.forEach(t => {
        if (!categoryTotals[t.category]) categoryTotals[t.category] = 0;
        categoryTotals[t.category] += t.amount;
    });

    const chartData = Object.keys(categoryTotals).map((cat, index) => ({
        value: categoryTotals[cat],
        color: COLORS[index % COLORS.length],
        text: `${Math.round((categoryTotals[cat] / data.totalSpent) * 100)}%`,
        category: cat
    }));

    if (chartData.length === 0) {
        return <Text style={styles.noData}>No data to display</Text>;
    }

    return (
        <View style={styles.container}>
            <PieChart
                data={chartData}
                donut
                showText
                textColor="white"
                radius={120}
                innerRadius={60}
                textSize={12}
                focusOnPress
            />
            <View style={styles.legend}>
                {chartData.map((item, index) => (
                    <View key={index} style={styles.legendItem}>
                        <View style={[styles.dot, { backgroundColor: item.color }]} />
                        <Text style={styles.legendText}>{item.category}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'white',
        borderRadius: 16,
        margin: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    noData: {
        textAlign: 'center',
        color: '#999',
        padding: 20,
    },
    legend: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: 20,
        gap: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 6,
    },
    legendText: {
        fontSize: 12,
        color: '#333',
    }
});
