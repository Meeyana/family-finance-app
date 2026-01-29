import React from 'react';
import { Text } from 'react-native';
import { TYPOGRAPHY } from '../constants/theme';
import { useVisibility } from './context/VisibilityContext';
import { useSettings } from './context/SettingsContext';

const CURRENCIES = {
    VND: { symbol: 'đ', position: 'suffix', rate: 1 },
    USD: { symbol: '$', position: 'prefix', rate: 0.000041 }, // Approx rate
};

export default function CurrencyText({ amount, currency: propCurrency, style, symbolStyle, showSign = false, hideable = false }) {
    const { currency: globalCurrency } = useSettings();
    const targetCurrency = propCurrency || globalCurrency || 'VND';
    const config = CURRENCIES[targetCurrency] || CURRENCIES.VND;

    // TODO: Implement real exchange rate conversion if needed.
    // For now, we assume the amount passed in is ALREADY in the target currency
    // OR we just display the symbol. 
    // If the storage is always VND, we might need conversion here.
    // Assumption: The App stores numbers. If user switches currency, 
    // we should ideally convert all numbers or just show the new symbol?
    // User request: "Choose currency (vnd default)" implying the Whole App uses that currency.
    // So we just format the number with that symbol.

    // Ensure amount is a number
    const numValue = Number(amount) || 0;
    const absValue = Math.abs(numValue);

    // Format: VND usually no decimals, USD has 2
    const digits = targetCurrency === 'VND' ? 0 : 2;
    const formattedValue = absValue.toLocaleString('vi-VN', { minimumFractionDigits: digits, maximumFractionDigits: digits });

    const finalSign = numValue < 0 ? '-' : (showSign && numValue > 0 ? '+' : '');

    const { isValuesHidden } = useVisibility();

    if (isValuesHidden && hideable) {
        return <Text style={style}>******</Text>;
    }

    return (
        <Text style={style} numberOfLines={1}>
            {finalSign}
            {config.position === 'prefix' && (
                <Text style={symbolStyle || { fontSize: (style?.fontSize || 14) * 0.8 }}>{config.symbol}</Text>
            )}
            {formattedValue}
            {config.position === 'suffix' && (
                <Text style={symbolStyle || { fontSize: (style?.fontSize || 14) * 0.8 }}>{config.symbol}</Text>
            )}
        </Text>
    );
}
