import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { VictoryLine, VictoryChart, VictoryAxis, VictoryArea } from 'victory-native';
import { COLORS, TYPOGRAPHY } from '../constants/theme';

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
        // Monthly Aggregation
        const months = [];
        let cursor = new Date(start);
        while (cursor <= end) {
            months.push(new Date(cursor)); // Clone
            cursor.setMonth(cursor.getMonth() + 1);
        }

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
            y: monthMap[`${m.getFullYear()}-${m.getMonth()}`] || 0
        }));
    }

    const color = filterCategory ? "#F59E0B" : "#6ca749"; // Main Green
    const fillColor = filterCategory ? "rgba(245, 158, 11, 0.1)" : "rgba(108, 167, 73, 0.1)";
    const screenWidth = Dimensions.get('window').width;

    return (
        <View style={styles.container}>
            <View pointerEvents="none">
                <VictoryChart
                    domainPadding={{ y: 30 }}
                    height={250}
                    width={screenWidth - 32}
                    padding={{ top: 40, bottom: 30, left: 35, right: 35 }}
                >
                    {/* X-Axis: Minimalist */}
                    <VictoryAxis
                        tickValues={isMonthlyView ? chartData.map(d => d.x) : [5, 10, 15, 20, 25, 30]}
                        style={{
                            axis: { stroke: "none" },
                            tickLabels: { fill: "#9CA3AF", fontSize: 10, fontFamily: TYPOGRAPHY.fontFamily.regular },
                            grid: { stroke: "none" }
                        }}
                    />

                    {/* Y-Axis: Hidden */}
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
        marginBottom: 8,
        alignItems: 'center',
        // Transparent, no card
    },
});
