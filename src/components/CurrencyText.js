import React from 'react';
import { Text } from 'react-native';
import { TYPOGRAPHY } from '../constants/theme';

const CURRENCIES = {
    VND: { symbol: 'đ', position: 'suffix' },
    USD: { symbol: '$', position: 'prefix' },
    EUR: { symbol: '€', position: 'suffix' },
};

export default function CurrencyText({ amount, currency = 'VND', style, symbolStyle, showSign = false }) {
    const config = CURRENCIES[currency] || CURRENCIES.VND;

    // Ensure amount is a number
    const numValue = Number(amount) || 0;
    const absValue = Math.abs(numValue);
    const formattedValue = absValue.toLocaleString();

    const sign = showSign && numValue > 0 ? '+' : (numValue < 0 ? '-' : '');
    // Note: if numValue < 0, formatting absValue removes sign, so we must add it back manually if we want controlled sign placement.
    // Actually standard toLocaleString usually handles minus, but since we split symbol, better to handle sign explicitly.

    const finalSign = numValue < 0 ? '-' : (showSign && numValue > 0 ? '+' : '');

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
