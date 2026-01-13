import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, FlatList, SafeAreaView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function MultiSelectDropdown({ label, options, selectedValues, onSelectionChange, compact = false, emptyLabel = null }) {
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
            // User requested "All Profiles" / "All Categories" even in compact mode
            const plural = label.endsWith('y') ? label.slice(0, -1) + 'ies' : label + 's';
            return `All ${plural}`;
        }

        // Find names for selected values
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
            {!compact && <Text style={styles.label}>{label}</Text>}
            <TouchableOpacity
                style={[
                    styles.dropdown,
                    compact && { paddingVertical: 8, borderWidth: 1 } // Match Search Input Height (approx 40px)
                ]}
                onPress={openModal}
            >
                <Text style={[styles.dropdownText, selectedValues.length > 0 && styles.dropdownTextSelected]}>
                    {getDisplayText()}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>

            <Modal visible={visible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select {label}</Text>
                            <TouchableOpacity onPress={() => setVisible(false)}>
                                <MaterialCommunityIcons name="close" size={24} color="#333" />
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
                                        style={styles.optionItem}
                                        onPress={() => toggleSelection(val)}
                                    >
                                        <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                                            {item.name || item.label}
                                        </Text>
                                        {isSelected && (
                                            <MaterialCommunityIcons name="check" size={20} color="#111111" />
                                        )}
                                    </TouchableOpacity>
                                );
                            }}
                        />

                        <View style={styles.footer}>
                            <TouchableOpacity
                                style={styles.clearButton}
                                onPress={() => setTempSelected([])}
                            >
                                <Text style={styles.clearText}>Clear All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.applyButton}
                                onPress={applySelection}
                            >
                                <Text style={styles.applyText}>Apply Filter</Text>
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
        color: '#999',
        textTransform: 'uppercase',
        marginBottom: 4,
        fontWeight: '600'
    },
    dropdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#eee',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
    },
    dropdownText: {
        fontSize: 14,
        color: '#666',
        flex: 1,
    },
    dropdownTextSelected: {
        color: '#111111',
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
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
        borderBottomColor: '#eee',
        paddingBottom: 15,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    optionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    optionText: {
        fontSize: 16,
        color: '#333',
    },
    optionTextSelected: {
        color: '#111111',
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        gap: 12,
    },
    clearButton: {
        flex: 1,
        padding: 14,
        alignItems: 'center',
        borderRadius: 12,
        backgroundColor: '#f5f5f5',
    },
    clearText: {
        color: '#666',
        fontWeight: '600',
    },
    applyButton: {
        flex: 2,
        padding: 14,
        alignItems: 'center',
        borderRadius: 12,
        backgroundColor: '#111111',
    },
    applyText: {
        color: 'white',
        fontWeight: 'bold',
    },
});
