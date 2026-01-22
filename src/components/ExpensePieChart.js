import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { VictoryPie } from 'victory-native';
import { TYPOGRAPHY, COLORS } from '../constants/theme';
import { useTheme } from './context/ThemeContext';

const CHART_COLORS = ['#007AFF', '#FF9500', '#FF2D55', '#5856D6', '#4CD964', '#FFCC00'];

export default function ExpensePieChart({ data }) {
    const { theme } = useTheme();
    const colors = COLORS[theme];

    // Transform transaction data
    const categoryTotals = {};
    let totalExpenseFiltered = 0;

    data.transactions.forEach(t => {
        if ((t.type || 'expense') === 'expense') {
            if (!categoryTotals[t.category]) categoryTotals[t.category] = 0;
            categoryTotals[t.category] += t.amount;
            totalExpenseFiltered += t.amount;
        }
    });

    const chartData = Object.keys(categoryTotals).map((cat, index) => {
        const value = categoryTotals[cat];
        const percentage = Math.round((value / totalExpenseFiltered) * 100);
        return {
            x: cat,
            y: value,
            label: percentage > 4 ? `${percentage}%` : '',
            percentage: percentage,
            color: CHART_COLORS[index % CHART_COLORS.length]
        };
    });

    if (chartData.length === 0) {
        return <Text style={[styles.noData, { color: colors.secondaryText }]}>No data to display</Text>;
    }

    const screenWidth = Dimensions.get('window').width;

    return (
        <View style={styles.container}>
            <View pointerEvents="none">
                <VictoryPie
                    data={chartData}
                    colorScale={chartData.map(d => d.color)}
                    innerRadius={60}
                    radius={120}
                    labelRadius={90}
                    labels={({ datum }) => datum.percentage > 4 ? `${datum.x}\n${datum.percentage}%` : ''}
                    style={{
                        labels: { fill: "white", fontSize: 11, fontWeight: "bold", textAlign: "center", fontFamily: TYPOGRAPHY.fontFamily.bold },
                        data: { stroke: colors.background, strokeWidth: 2 }
                    }}
                    padAngle={2}
                    height={260}
                    width={screenWidth - 32}
                />
            </View>

            <View style={styles.legend}>
                {chartData
                    .filter(item => item.percentage > 4)
                    .map((item, index) => (
                        <View key={index} style={styles.legendItem}>
                            <View style={[styles.dot, { backgroundColor: item.color }]} />
                            <Text style={[styles.legendText, { color: colors.primaryText }]}>{item.x}</Text>
                        </View>
                    ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        padding: 10,
        marginBottom: 16,
    },
    noData: {
        textAlign: 'center',
        padding: 20,
        fontFamily: TYPOGRAPHY.fontFamily.regular
    },
    legend: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: 0,
        gap: 12,
        paddingBottom: 10
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
        fontFamily: TYPOGRAPHY.fontFamily.medium
    }
});
