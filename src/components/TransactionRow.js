import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import CurrencyText from './CurrencyText';

const TransactionRow = ({ item, onPress, iconBackgroundColor, showDate }) => {
    const theme = useColorScheme() || 'light';
    const colors = COLORS[theme];

    const isExpense = (item.type || 'expense') === 'expense';
    const isTransfer = item.type === 'transfer';

    // Transfer Direction Logic (Matches Dashboard Logic)
    let isTransferOut = false;
    let isTransferIn = false;
    if (isTransfer) {
        const n = item.note || '';
        isTransferOut = n.startsWith('To ') || n.includes('Transfer to') || item.categoryIcon === '💸';
        isTransferIn = n.startsWith('From ') || n.includes('Received from') || item.categoryIcon === '💰';

        // Fallback checks if note is unclear but category implies direction
        if (!isTransferOut && !isTransferIn) {
            if (item.category === 'Transfer Out') isTransferOut = true;
            if (item.category === 'Allowance') isTransferIn = true;
        }
    }

    // Effective Type for Visuals
    const visualIsExpense = isExpense || isTransferOut;
    const visualIsIncome = (!isExpense && !isTransfer) || isTransferIn;

    // Determine Color
    let amountColor = colors.secondaryText; // Default for neutral transfers
    if (visualIsExpense) amountColor = colors.primaryText;
    if (visualIsIncome) amountColor = colors.success;

    // Determine Amount to Display and Sign Logic
    // Expense/TransferOut -> Negative
    // Income/TransferIn -> Positive
    const displayAmount = visualIsExpense ? -Math.abs(item.amount) : Math.abs(item.amount);

    // showSign logic for CurrencyText: 
    // If true, it adds '+' for positive numbers.
    // Negative numbers always show '-' by default in CurrencyText usually, 
    // but check CurrencyText implementation. Usually standard formatting.
    // We want '+' for Income/TransferIn.
    const showSign = visualIsIncome;

    const icon = item.icon || item.categoryIcon || (visualIsExpense ? '💸' : '💰');
    return (
        <TouchableOpacity style={styles.container} onPress={onPress}>
            {/* Icon Circle */}
            <View style={[styles.iconBox, { backgroundColor: iconBackgroundColor || colors.surface }]}>
                <Text style={{ fontSize: 20 }}>{icon}</Text>
            </View>

            {/* Center: Text Details (Title, Note, Date) */}
            <View style={styles.textContainer}>
                <Text style={[styles.title, { color: colors.primaryText }]}>
                    {item.category || 'Uncategorized'}
                </Text>

                {item.note ? (
                    <Text style={[styles.subtitle, { color: colors.secondaryText }]} numberOfLines={1}>
                        {item.note}
                    </Text>
                ) : null}

                {showDate && item.date && (
                    <Text style={{ fontSize: 11, color: colors.secondaryText, marginTop: 2 }}>
                        {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                )}
            </View>

            {/* Right: Amount (Vertically Centered) */}
            <CurrencyText
                amount={displayAmount}
                showSign={showSign}
                style={[styles.amount, { color: amountColor }]}
            />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12, // slightly more breathing room
        paddingHorizontal: SPACING.screenPadding,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.m,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingRight: 8,
    },
    title: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: TYPOGRAPHY.weight.medium,
        letterSpacing: -0.2,
    },
    subtitle: {
        fontSize: TYPOGRAPHY.size.caption,
        fontWeight: TYPOGRAPHY.weight.regular,
        maxWidth: '80%',
    },
    amount: {
        fontSize: TYPOGRAPHY.size.body,
        fontWeight: TYPOGRAPHY.weight.semiBold,
        fontVariant: ['tabular-nums'],
    }
});

export default TransactionRow;
