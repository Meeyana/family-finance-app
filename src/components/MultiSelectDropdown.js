import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, FlatList, SafeAreaView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from './context/ThemeContext';
import { COLORS } from '../constants/theme';

export default function MultiSelectDropdown({ label, options, selectedValues, onSelectionChange, compact = false, emptyLabel = null }) {
    const { theme } = useTheme();
    const colors = COLORS[theme];

    const [visible, setVisible] = useState(false);

    // Internal state for pending selection before "Apply"
    const [tempSelected, setTempSelected] = useState(selectedValues);

    const openModal = () => {
        setTempSelected(selectedValues);
        setVisible(true);
    };

    const toggleSelection = (value) => {
        if (tempSelected.includes(value)) {
            setTempSelected(tempSelected.filter(item => item !== value));
        } else {
            setTempSelected([...tempSelected, value]);
        }
    };

    const applySelection = () => {
        onSelectionChange(tempSelected);
        setVisible(false);
    };

    // Helper to get display text
    const getDisplayText = () => {
        if (selectedValues.length === 0) {
            if (emptyLabel) return emptyLabel;
            const plural = label.endsWith('y') ? label.slice(0, -1) + 'ies' : label + 's';
            return `All ${plural}`;
        }

        const selectedNames = options
            .filter(opt => selectedValues.includes(opt.id || opt.value))
            .map(opt => opt.name || opt.label);

        if (selectedNames.length <= 2) {
            return selectedNames.join(', ');
        }
        return `${selectedNames[0]}, ${selectedNames[1]} +${selectedNames.length - 2}`;
    };

    return (
        <View style={[styles.container, compact && { marginRight: 0 }]}>
            {!compact && <Text style={[styles.label, { color: colors.secondaryText }]}>{label}</Text>}
            <TouchableOpacity
                style={[
                    styles.dropdown,
                    { backgroundColor: colors.surface, borderColor: colors.divider },
                    compact && { paddingVertical: 8, borderWidth: 1 }
                ]}
                onPress={openModal}
            >
                <Text style={[
                    styles.dropdownText,
                    { color: selectedValues.length > 0 ? colors.primaryText : colors.secondaryText },
                    selectedValues.length > 0 && { fontWeight: 'bold' }
                ]}>
                    {getDisplayText()}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color={colors.secondaryText} />
            </TouchableOpacity>

            <Modal visible={visible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
                            <Text style={[styles.modalTitle, { color: colors.primaryText }]}>Select {label}</Text>
                            <TouchableOpacity onPress={() => setVisible(false)}>
                                <MaterialCommunityIcons name="close" size={24} color={colors.primaryText} />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={options}
                            keyExtractor={item => (item.id || item.value)}
                            renderItem={({ item }) => {
                                const val = item.id || item.value;
                                const isSelected = tempSelected.includes(val);
                                return (
                                    <TouchableOpacity
                                        style={[styles.optionItem, { borderBottomColor: colors.divider }]}
                                        onPress={() => toggleSelection(val)}
                                    >
                                        <Text style={[
                                            styles.optionText,
                                            { color: isSelected ? colors.primaryText : colors.primaryText, fontWeight: isSelected ? 'bold' : 'normal' }
                                        ]}>
                                            {item.name || item.label}
                                        </Text>
                                        {isSelected && (
                                            <MaterialCommunityIcons name="check" size={20} color={colors.primaryAction} />
                                        )}
                                    </TouchableOpacity>
                                );
                            }}
                        />

                        <View style={[styles.footer, { borderTopColor: colors.divider }]}>
                            <TouchableOpacity
                                style={[styles.clearButton, { backgroundColor: colors.surface }]}
                                onPress={() => setTempSelected([])}
                            >
                                <Text style={[styles.clearText, { color: colors.secondaryText }]}>Clear All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.applyButton, { backgroundColor: colors.primaryAction }]}
                                onPress={applySelection}
                            >
                                <Text style={[styles.applyText, { color: colors.white }]}>Apply Filter</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginRight: 10,
    },
    label: {
        fontSize: 12,
        textTransform: 'uppercase',
        marginBottom: 4,
        fontWeight: '600'
    },
    dropdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
    },
    dropdownText: {
        fontSize: 14,
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '60%',
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: 1,
        paddingBottom: 15,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    optionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    optionText: {
        fontSize: 16,
    },
    footer: {
        flexDirection: 'row',
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        gap: 12,
    },
    clearButton: {
        flex: 1,
        padding: 14,
        alignItems: 'center',
        borderRadius: 12,
    },
    clearText: {
        fontWeight: '600',
    },
    applyButton: {
        flex: 2,
        padding: 14,
        alignItems: 'center',
        borderRadius: 12,
    },
    applyText: {
        fontWeight: 'bold',
    },
});
