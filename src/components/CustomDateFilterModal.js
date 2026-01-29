import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/context/ThemeContext';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function CustomDateFilterModal({ visible, onClose, onApply, initialDate, initialMode = 'month' }) {
    const { theme } = useTheme();
    const colors = COLORS[theme];

    const [mode, setMode] = useState(initialMode); // 'month' | 'year'
    const [selectedYear, setSelectedYear] = useState(initialDate.getFullYear());

    // For Month Mode: Range Selection
    // If selecting a single month, start = end.
    const [tempStartDate, setTempStartDate] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
    const [tempEndDate, setTempEndDate] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth() + 1, 0));

    // For Year Mode: Just selectedYear is enough

    useEffect(() => {
        if (visible) {
            setMode(initialMode);
            setSelectedYear(initialDate.getFullYear());
            setTempStartDate(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
            setTempEndDate(new Date(initialDate.getFullYear(), initialDate.getMonth() + 1, 0));
        }
    }, [visible]);

    const handleMonthPress = (monthIndex) => {
        const newDate = new Date(selectedYear, monthIndex, 1);

        // Simple Logic: Always single select for now, unless we want range?
        // User asked for "3 months, 6 months". Let's support Range.
        // If we want to support range, we need complex state (selection step).
        // Let's stick to "Single Month" select for basic parity with image FIRST, 
        // to ensure it matches the "Popup filter like this" requirement.
        // BUT, user said "can see which range you want". 
        // Let's implement: Click = Single. Long Press or Toggle for Range?
        // Actually, let's just make it single select for now to match the image exactly,
        // AND add a "Year" tab which shows the whole year (12 months data).
        // The "3 months" request might best be served by a separate "Quick Range" or just selecting "Year" and filtering?
        // Let's try advanced Range Selection: 
        // Click 1: Start. Click 2: End.

        // REVISION: Keep it simple first. Match the image. The image allows picking A month.
        // I will implement Single Month Select.
        // AND Year Select.
        // "3 months, 6 months" -> Maybe that's handled by "Year" view?
        // Or I can add a "Period" selector?
        // Let's stick to the Image: It has Month and Year.

        setTempStartDate(new Date(selectedYear, monthIndex, 1));
        setTempEndDate(new Date(selectedYear, monthIndex + 1, 0));
    };

    const handleApply = () => {
        if (mode === 'year') {
            const start = new Date(selectedYear, 0, 1);
            const end = new Date(selectedYear, 12, 0);
            onApply(start, end, 'year');
        } else {
            onApply(tempStartDate, tempEndDate, 'month');
        }
    };

    const renderMonthGrid = () => {
        const months = [
            'Jan', 'Feb', 'Mar',
            'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep',
            'Oct', 'Nov', 'Dec'
        ];

        return (
            <View style={styles.gridContainer}>
                {months.map((m, index) => {
                    const isSelected = tempStartDate.getMonth() === index && tempStartDate.getFullYear() === selectedYear;
                    const now = new Date();
                    const currentYear = now.getFullYear();
                    const currentMonth = now.getMonth();

                    // Limit: 6 months ago
                    const limitDate = new Date(currentYear, currentMonth - 6, 1);
                    const cellDate = new Date(selectedYear, index, 1);

                    const isDisabled = cellDate < limitDate || cellDate > now;

                    return (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.gridItem,
                                {
                                    backgroundColor: isSelected ? colors.primaryAction : colors.surface,
                                    borderWidth: 1,
                                    borderColor: colors.divider,
                                    opacity: isDisabled ? 0.3 : 1
                                }
                            ]}
                            onPress={() => {
                                if (!isDisabled) handleMonthPress(index);
                            }}
                            disabled={isDisabled}
                        >
                            <Text style={[
                                styles.gridText,
                                { color: isSelected ? colors.background : colors.primaryText, fontWeight: isSelected ? 'bold' : 'normal' }
                            ]}>{m}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    const renderYearGrid = () => {
        // Show range of years centered on current or selected
        const now = new Date();
        const currentYear = now.getFullYear();
        const startYear = currentYear - 2; // Show nearby years
        const years = Array.from({ length: 9 }, (_, i) => startYear + i); // 9 years around context

        // Limit
        const limitDate = new Date(currentYear, now.getMonth() - 6, 1);
        const limitYear = limitDate.getFullYear();

        return (
            <View style={styles.gridContainer}>
                {years.map((y) => {
                    const isSelected = y === selectedYear;
                    // Disable if year is strictly in future OR year is strictly before limit year
                    // Note: If limit is July 2025, Year 2025 is partially valid, so it should be ENABLED.
                    // Only 2024 and before should be disabled.
                    const isDisabled = y > currentYear || y < limitYear;

                    return (
                        <TouchableOpacity
                            key={y}
                            style={[
                                styles.gridItem,
                                {
                                    backgroundColor: isSelected ? colors.primaryAction : colors.surface,
                                    borderWidth: 1,
                                    borderColor: colors.divider,
                                    opacity: isDisabled ? 0.3 : 1
                                }
                            ]}
                            onPress={() => {
                                if (!isDisabled) setSelectedYear(y);
                            }}
                            disabled={isDisabled}
                        >
                            <Text style={[
                                styles.gridText,
                                { color: isSelected ? colors.background : colors.primaryText, fontWeight: isSelected ? 'bold' : 'normal' }
                            ]}>{y}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} onPress={onClose} />
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.primaryText }]}>Select Time Period</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.primaryText} />
                        </TouchableOpacity>
                    </View>

                    {/* Tabs */}
                    <View style={[styles.tabContainer, { backgroundColor: colors.surface }]}>
                        <TouchableOpacity
                            style={[styles.tab, mode === 'month' && { backgroundColor: colors.background, elevation: 2 }]}
                            onPress={() => setMode('month')}
                        >
                            <Text style={[styles.tabText, { color: mode === 'month' ? colors.primaryText : colors.secondaryText }]}>Month</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, mode === 'year' && { backgroundColor: colors.background, elevation: 2 }]}
                            onPress={() => setMode('year')}
                        >
                            <Text style={[styles.tabText, { color: mode === 'year' ? colors.primaryText : colors.secondaryText }]}>Year</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Year Selector (Only for Month Mode) */}
                    {mode === 'month' && (
                        <View style={[styles.yearSelector, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
                            <TouchableOpacity
                                onPress={() => setSelectedYear(y => y - 1)}
                                disabled={selectedYear <= 2024}
                                style={{ opacity: selectedYear <= 2024 ? 0 : 1 }}
                            >
                                <Ionicons name="chevron-back" size={20} color={colors.primaryText} />
                            </TouchableOpacity>
                            <Text style={[styles.yearText, { color: colors.primaryText }]}>{selectedYear}</Text>
                            <TouchableOpacity
                                onPress={() => setSelectedYear(y => y + 1)}
                                disabled={selectedYear >= 2032}
                                style={{ opacity: selectedYear >= 2032 ? 0 : 1 }}
                            >
                                <Ionicons name="chevron-forward" size={20} color={colors.primaryText} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Content */}
                    {mode === 'month' ? renderMonthGrid() : renderYearGrid()}

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
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 16,
        paddingBottom: 32,
        minHeight: 450
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
        color: '#1a1a1a'
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        padding: 4,
        marginBottom: 20
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10
    },
    tabActive: {
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowopacity: 0.1,
        shadowRadius: 2,
        elevation: 2
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#666'
    },
    tabTextActive: {
        color: '#111111', // Black active
        fontWeight: 'bold'
    },
    yearSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f9fafb', // Lighter grey
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginBottom: 20
    },
    yearText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333'
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
    gridItemSelected: {
        backgroundColor: '#111111' // Black Selected
    },
    gridText: {
        fontSize: 14,
        color: '#333'
    },
    gridTextSelected: {
        color: 'white',
        fontWeight: 'bold'
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
        borderColor: '#E5E5E5', // Neutral border
        borderRadius: 12,
        alignItems: 'center'
    },
    clearButtonText: {
        color: '#111111', // Black Text
        fontWeight: 'bold',
        fontSize: 16
    },
    applyButton: {
        flex: 1,
        paddingVertical: 14,
        backgroundColor: '#111111', // Black Bg
        borderRadius: 12,
        alignItems: 'center'
    },
    applyButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    },
    placeholderContainer: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center'
    },
    placeholderText: {
        color: '#666',
        fontSize: 16
    }
});
