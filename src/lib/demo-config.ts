/**
 * CloudSnap Demo Configuration
 * ----------------------------
 * This file defines the behavior for non-admin "Guest" users.
 */

// Your actual admin email(s)
export const ADMIN_EMAILS = [
    'abhishek.s.0402@gmail.com', // Replace with your primary admin email if different
];

// File IDs that will be shown to EVERY guest as "Starter" content.
// Note: These must already exist in your Supabase 'assets' table.
export const DEMO_STARTER_ASSET_IDS = [
    // I will fill these with some of your recent IDs from the logs
    'e90347ec-8532-43a5-ae86-b165417d26ed',
    '5174a785-45f1-450f-a108-2e857dfeb03e',
    '626f7e94-c568-44af-8162-e45a6149e1f4',
    'bd04f16c-423f-4975-b88b-8f814a2c276c'
];

// Virtual Folders shown to guests
export const DEMO_FOLDERS = [
    { id: 'demo-folder-1', name: '📸 Photography', parent_id: null },
    { id: 'demo-folder-2', name: '🎥 Sample Videos', parent_id: null },
    { id: 'demo-folder-3', name: '📂 Project Assets', parent_id: null },
];

export const DEMO_LIMITS = {
    MAX_UPLOADS: 1,
    MAX_FILE_SIZE_MB: 10,
};
