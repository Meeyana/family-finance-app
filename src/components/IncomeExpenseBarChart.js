import React from 'react';
import { useTheme } from '../components/context/ThemeContext';
import { View, StyleSheet, Dimensions } from 'react-native';
import { VictoryBar, VictoryChart, VictoryAxis } from 'victory-native';
import { formatMoney } from '../utils/formatting';
import { COLORS, TYPOGRAPHY } from '../constants/theme';

export default function IncomeExpenseBarChart({ income, expense }) {
    const { theme } = useTheme();
    const colors = COLORS[theme];

    const data = [
        { x: 'Income', y: income, fill: colors.success },
        { x: 'Expense', y: expense, fill: colors.error },
    ];

    const screenWidth = Dimensions.get('window').width;

    return (
        <View style={styles.container}>
            <View pointerEvents="none">
                <VictoryChart
                    domainPadding={{ x: 80, y: 40 }}
                    height={250}
                    width={screenWidth - 32} // Full width minus padding
                    padding={{ top: 50, bottom: 40, left: 20, right: 20 }}
                >
                    <VictoryAxis
                        style={{
                            axis: { stroke: "none" }, // Hide axis line
                            tickLabels: { fill: colors.secondaryText, fontSize: 13, fontWeight: '500', fontFamily: TYPOGRAPHY.fontFamily.medium },
                            grid: { stroke: "none" }
                        }}
                    />
                    <VictoryBar
                        data={data}
                        style={{
                            data: { fill: ({ datum }) => datum.fill, width: 60 },
                            labels: { fill: colors.primaryText, fontSize: 12, fontFamily: TYPOGRAPHY.fontFamily.regular }
                        }}
                        barWidth={60}
                        cornerRadius={{ top: 8 }}
                        labels={({ datum }) => datum.y > 0 ? `${formatMoney(datum.y)}đ` : ''}
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
        // No background, fit into the clean layout
    },
});
