import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';

export const useFinanceData = (user) => {
    // Reset - No logic yet
    return {
        loading: false,
    }
};
