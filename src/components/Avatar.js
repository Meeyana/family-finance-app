import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { getAvatarSource } from '../utils/avatars';

const Avatar = React.memo(({ name, avatarId, size = 44, backgroundColor = '#e0e0e0', textColor = '#5d4037', style, fontSize, borderRadius }) => {
    const initial = name ? name.charAt(0).toUpperCase() : '?';
    const effectiveFontSize = fontSize || size * 0.45;
    const imageSource = avatarId ? getAvatarSource(avatarId) : null;

    // Default to circle if borderRadius not provided
    const effectiveBorderRadius = borderRadius !== undefined ? borderRadius : size / 2;

    const containerStyle = React.useMemo(() => [
        styles.container,
        {
            width: size,
            height: size,
            borderRadius: effectiveBorderRadius,
            backgroundColor: backgroundColor,
        },
        style
    ], [size, backgroundColor, style, effectiveBorderRadius]);

    const imageStyle = React.useMemo(() => ({
        width: size,
        height: size,
        borderRadius: effectiveBorderRadius
    }), [size, effectiveBorderRadius]);

    if (imageSource) {
        return (
            <View style={containerStyle}>
                <Image
                    source={imageSource}
                    style={imageStyle}
                    resizeMode="cover"
                />
            </View>
        );
    }

    return (
        <View style={containerStyle}>
            <Text style={[styles.text, { fontSize: effectiveFontSize, color: textColor }]}>
                {initial}
            </Text>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    text: {
        fontWeight: 'bold',
    },
});

export default Avatar;
