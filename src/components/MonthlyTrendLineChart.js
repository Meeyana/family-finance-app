import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { VictoryLine, VictoryChart, VictoryAxis, VictoryArea } from 'victory-native';

export default function MonthlyTrendLineChart({ data, currentMonth, filterCategory }) {
    // 1. Determine days in month
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 2. Aggregate daily spending
    const dailySpending = new Array(daysInMonth).fill(0);

    data.forEach(t => {
        if (filterCategory && t.category !== filterCategory) return;
        if ((t.type || 'expense') !== 'expense') return;

        const date = new Date(t.date);
        if (date.getMonth() === month && date.getFullYear() === year) {
            const day = date.getDate() - 1;
            if (day >= 0 && day < daysInMonth) {
                dailySpending[day] += t.amount;
            }
        }
    });

    // 3. Prepare data for chart
    const chartData = dailySpending.map((amount, index) => ({
        x: index + 1,
        y: amount
    }));

    const color = filterCategory ? "#FF9500" : "#007AFF";
    const fillColor = filterCategory ? "rgba(255, 149, 0, 0.2)" : "rgba(0, 122, 255, 0.2)";
    const screenWidth = Dimensions.get('window').width;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>
                    {filterCategory ? `${filterCategory} Trend` : 'Monthly Spending Trend'}
                </Text>
            </View>

            <View pointerEvents="none" style={{ marginLeft: -30 }}>
                <VictoryChart
                    height={220}
                    width={screenWidth - 50}
                    padding={{ top: 20, bottom: 30, left: 35, right: 35 }}
                >
                    <VictoryAxis
                        tickValues={[5, 10, 15, 20, 25, 30]}
                        style={{
                            axis: { stroke: "#eee" },
                            tickLabels: { fill: "#999", fontSize: 10 },
                            grid: { stroke: "#f5f5f5" }
                        }}
                    />
                    <VictoryArea
                        data={chartData}
                        interpolation="natural"
                        style={{
                            data: { fill: fillColor }
                        }}
                    />
                    <VictoryLine
                        data={chartData}
                        interpolation="natural"
                        style={{
                            data: { stroke: color, strokeWidth: 2 }
                        }}
                    />
                </VictoryChart>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginVertical: 8,
        marginHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 0,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
});
