
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { db } from './firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';

// Configure how notifications behave when the app is foregrounded
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export async function registerForPushNotificationsAsync(userId, profileId) {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            // alert('Failed to get push token for push notification!');
            return null;
        }

        try {
            // Get the token (use projectId if configured, otherwise default)
            const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;

            if (!projectId) {
                console.warn("⚠️ No EAS Project ID found. Push Notifications require an EAS Project ID.");
                console.warn("👉 Run 'npx eas-cli init' to configure it.");
                // alert("Project ID missing. Run 'npx eas-cli init'"); // Optional: Alert dev
                return null;
            }

            token = (await Notifications.getExpoPushTokenAsync({
                projectId,
            })).data;

            console.log("🔔 Push Token:", token);

            // Save to Firestore if userId AND profileId provided
            if (userId && profileId && token) {
                // Update specific PROFILE document (Use setDoc with merge to create if missing)
                const profileRef = doc(db, 'users', userId, 'profiles', profileId);
                await setDoc(profileRef, {
                    pushToken: token,
                    notificationsEnabled: true,
                    lastTokenUpdate: new Date().toISOString()
                }, { merge: true });
            }
        } catch (e) {
            console.error("Error getting push token:", e);
            // Allow app to continue even if token fails
            return null;
        }
    } else {
        console.log('Must use physical device for Push Notifications');
    }

    return token;
}

export async function unregisterPushNotificationsAsync(userId, profileId) {
    if (userId && profileId) {
        try {
            const profileRef = doc(db, 'users', userId, 'profiles', profileId);
            await updateDoc(profileRef, {
                notificationsEnabled: false,
                pushToken: null
            });
            console.log("🔕 Notifications disabled for profile");
        } catch (e) {
            console.error("Error disabling notifications:", e);
        }
    }
}
