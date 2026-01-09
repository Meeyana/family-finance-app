import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { VictoryLine, VictoryChart, VictoryAxis, VictoryArea } from 'victory-native';

export default function MonthlyTrendLineChart({ data, startDate, endDate, filterCategory }) {
    // 1. Determine Range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const msPerDay = 1000 * 60 * 60 * 24;
    const totalDays = Math.ceil((end - start) / msPerDay) + 1;

    // 2. Choose Mode: Daily (< 35 days) vs Monthly (> 35 days)
    const isMonthlyView = totalDays > 35;

    let chartData = [];

    if (!isMonthlyView) {
        // Daily View (Standard)
        const dailySpending = new Array(totalDays).fill(0);

        data.forEach(t => {
            if (filterCategory && t.category !== filterCategory) return;
            if ((t.type || 'expense') !== 'expense') return;

            const tDate = new Date(t.date);
            const dayIndex = Math.ceil((tDate - start) / msPerDay);

            if (dayIndex >= 0 && dayIndex < totalDays) {
                dailySpending[dayIndex] += t.amount;
            }
        });

        chartData = dailySpending.map((amount, index) => ({
            x: index + 1,
            y: amount
        }));
    } else {
        // Monthly Aggregation (e.g. Jan, Feb, Mar)
        const months = [];
        let cursor = new Date(start);
        while (cursor <= end) {
            months.push(new Date(cursor)); // Clone
            cursor.setMonth(cursor.getMonth() + 1);
        }

        // Map: 'YYYY-MM' -> Amount
        const monthMap = {};
        months.forEach(m => {
            const key = `${m.getFullYear()}-${m.getMonth()}`;
            monthMap[key] = 0;
        });

        data.forEach(t => {
            if (filterCategory && t.category !== filterCategory) return;
            if ((t.type || 'expense') !== 'expense') return;
            const tDate = new Date(t.date);
            if (tDate >= start && tDate <= end) {
                const key = `${tDate.getFullYear()}-${tDate.getMonth()}`;
                if (monthMap[key] !== undefined) {
                    monthMap[key] += t.amount;
                }
            }
        });

        chartData = months.map((m, i) => ({
            x: i + 1,
            // User requested to remove T1-T12 labels
            y: monthMap[`${m.getFullYear()}-${m.getMonth()}`] || 0
        }));
    }

    const color = filterCategory ? "#FF9500" : "#007AFF";
    const fillColor = filterCategory ? "rgba(255, 149, 0, 0.2)" : "rgba(0, 122, 255, 0.2)";
    const screenWidth = Dimensions.get('window').width;

    return (
        <View style={styles.container}>
            <View pointerEvents="none" style={{ marginLeft: -30 }}>
                <VictoryChart
                    height={220}
                    width={screenWidth - 50}
                    padding={{ top: 20, bottom: 30, left: 35, right: 35 }}
                >

                    {/* X-Axis: Clean 1-12 or 5-30 */}
                    <VictoryAxis
                        tickValues={isMonthlyView ? chartData.map(d => d.x) : [5, 10, 15, 20, 25, 30]}
                        style={{
                            axis: { stroke: "#eee" },
                            tickLabels: { fill: "#999", fontSize: 10 },
                            grid: { stroke: "#f5f5f5" }
                        }}
                    />

                    {/* Y-Axis: Hidden as requested */}
                    <VictoryAxis
                        dependentAxis
                        style={{
                            axis: { stroke: "none" },
                            tickLabels: { fill: "none" },
                            grid: { stroke: "none" }
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
