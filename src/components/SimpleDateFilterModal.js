import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/context/ThemeContext';
import { COLORS } from '../constants/theme';

export default function SimpleDateFilterModal({ visible, onClose, onApply, initialDate }) {
    const { theme } = useTheme();
    const colors = COLORS[theme];

    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

    useEffect(() => {
        if (visible && initialDate) {
            setSelectedYear(initialDate.getFullYear());
            setSelectedMonth(initialDate.getMonth());
        }
    }, [visible, initialDate]);

    const handleApply = () => {
        // Construct start and end dates for the selected month
        const start = new Date(selectedYear, selectedMonth, 1);
        const end = new Date(selectedYear, selectedMonth + 1, 0);
        onApply(start, end, 'month');
    };

    const months = [
        'Jan', 'Feb', 'Mar',
        'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep',
        'Oct', 'Nov', 'Dec'
    ];

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} onPress={onClose} />
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.primaryText }]}>Select Month</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.primaryText} />
                        </TouchableOpacity>
                    </View>

                    {/* Year Selector */}
                    <View style={[styles.yearSelector, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
                        <TouchableOpacity onPress={() => setSelectedYear(y => y - 1)}>
                            <Ionicons name="chevron-back" size={20} color={colors.primaryText} />
                        </TouchableOpacity>
                        <Text style={[styles.yearText, { color: colors.primaryText }]}>{selectedYear}</Text>
                        <TouchableOpacity onPress={() => setSelectedYear(y => y + 1)}>
                            <Ionicons name="chevron-forward" size={20} color={colors.primaryText} />
                        </TouchableOpacity>
                    </View>

                    {/* Month Grid */}
                    <View style={styles.gridContainer}>
                        {months.map((m, index) => {
                            const isSelected = selectedMonth === index;
                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.gridItem,
                                        { backgroundColor: isSelected ? colors.primaryAction : colors.surface, borderWidth: 1, borderColor: colors.divider }
                                    ]}
                                    onPress={() => setSelectedMonth(index)}
                                >
                                    <Text style={[
                                        styles.gridText,
                                        { color: isSelected ? colors.background : colors.primaryText, fontWeight: isSelected ? 'bold' : 'normal' }
                                    ]}>{m}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Footer Actions */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={[styles.clearButton, { borderColor: colors.divider }]} onPress={onClose}>
                            <Text style={[styles.clearButtonText, { color: colors.primaryText }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.applyButton, { backgroundColor: colors.primaryAction }]} onPress={handleApply}>
                            <Text style={[styles.applyButtonText, { color: colors.background }]}>Apply</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)'
    },
    backdrop: {
        flex: 1
    },
    modalContainer: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 16,
        paddingBottom: 32,
        minHeight: 400
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    yearSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginBottom: 20
    },
    yearText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12
    },
    gridItem: {
        width: '30%',
        paddingVertical: 16,
        alignItems: 'center',
        borderRadius: 8,
        marginBottom: 8
    },
    gridText: {
        fontSize: 14,
    },
    footer: {
        flexDirection: 'row',
        marginTop: 32,
        gap: 12
    },
    clearButton: {
        flex: 1,
        paddingVertical: 14,
        borderWidth: 1,
        borderRadius: 12,
        alignItems: 'center'
    },
    clearButtonText: {
        fontWeight: 'bold',
        fontSize: 16
    },
    applyButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center'
    },
    applyButtonText: {
        fontWeight: 'bold',
        fontSize: 16
    }
});
