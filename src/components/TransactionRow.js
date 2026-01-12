import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import CurrencyText from './CurrencyText';

const TransactionRow = ({ item, onPress }) => {
    const theme = useColorScheme() || 'light';
    const colors = COLORS[theme];

    const isExpense = (item.type || 'expense') === 'expense';
    const isTransfer = item.type === 'transfer';

    // Determine Color and Sign
    let amountColor = isExpense ? colors.primaryText : colors.success; // Default expenses to primaryText (neutral) for minimalism, or keep red?
    // User requested Neo-Bank Minimal -> Usually Black for expense, Green for Income. Or Red for expense.
    // Let's stick to Red/Green for clarity but maybe muted.
    // Actually, "Neo-Bank Minimal" often uses Black for expenses and Green for Income.
    if (isExpense) amountColor = colors.primaryText;
    if (!isExpense) amountColor = colors.success;

    let sign = isExpense ? '-' : '+';
    if (isTransfer) {
        amountColor = colors.secondaryText;
        sign = '';
    }

    // Icon Logic (Passed from parent usually, or we determine here?)
    // Ideally the parent passes a resolved 'icon' prop, but item might have it.
    const icon = item.icon || item.categoryIcon || (isExpense ? '💸' : '💰');

    return (
        <TouchableOpacity style={styles.container} onPress={onPress}>
            {/* Icon Circle */}
            <View style={[styles.iconBox, { backgroundColor: colors.surface }]}>
                <Text style={{ fontSize: 20 }}>{icon}</Text>
            </View>

            {/* Content */}
            <View style={styles.content}>
                <View style={styles.row}>
                    <Text style={[styles.title, { color: colors.primaryText }]}>
                        {item.category || 'Uncategorized'}
                    </Text>
                    <CurrencyText
                        amount={isExpense ? -item.amount : item.amount}
                        showSign={!isExpense && !isTransfer}
                        style={[styles.amount, { color: amountColor }]}
                    />
                </View>

                {/* Variable subtitle: Note or Time */}
                <View style={styles.row}>
                    <Text style={[styles.subtitle, { color: colors.secondaryText }]} numberOfLines={1}>
                        {item.note || 'No note'}
                    </Text>
                    {/* If we have time, show it. Else show date if needed, but usually grouped by date. */}
                    {/* Assuming daily view, we might not need full date here if grouped. */}
                </View>
            </View>
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
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.m,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        gap: 2, // Tiny gap between title/subtitle
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
