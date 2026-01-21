const AVATAR_IMAGES = {
    'profile-1': require('../images/profile-1.jpg'),
    'profile-2': require('../images/profile-2.jpg'),
    'profile-3': require('../images/profile-3.jpg'),
    'profile-4': require('../images/profile-4.jpg'),
};

export const getAvatarSource = (avatarId) => {
    return AVATAR_IMAGES[avatarId] || null;
};

export const AVAILABLE_AVATARS = Object.keys(AVATAR_IMAGES);
