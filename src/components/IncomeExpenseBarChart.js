import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { VictoryBar, VictoryChart, VictoryAxis } from 'victory-native';

export default function IncomeExpenseBarChart({ income, expense }) {
    const data = [
        { x: 'Income', y: income, fill: '#4CD964' },
        { x: 'Expense', y: expense, fill: '#FF3B30' },
    ];

    const screenWidth = Dimensions.get('window').width;

    return (
        <View style={styles.container}>

            <View pointerEvents="none" style={{ marginLeft: -20 }}>
                <VictoryChart
                    domainPadding={{ x: 80 }}
                    height={220}
                    width={screenWidth - 64}
                    padding={{ top: 20, bottom: 40, left: 20, right: 20 }}
                >
                    <VictoryAxis
                        style={{
                            axis: { stroke: "#eee" },
                            tickLabels: { fill: "#666", fontSize: 14, fontWeight: '500' }
                        }}
                    />
                    <VictoryBar
                        data={data}
                        style={{
                            data: { fill: ({ datum }) => datum.fill },
                            labels: { fill: "#666", fontSize: 12 }
                        }}
                        barWidth={60}
                        cornerRadius={{ top: 8 }}
                        labels={({ datum }) => datum.y > 0 ? datum.y.toLocaleString() : ''}
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
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 0,
        color: '#1a1a1a',
    },
});
