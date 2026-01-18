import { currentUser } from "@clerk/nextjs/server";

const ADMIN_EMAILS = (process.env.ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase());

export async function isUserAdmin(): Promise<boolean> {
    // If no admin email configured, fail safe (or maybe allow all in dev? No, strictly fail safe)
    if (ADMIN_EMAILS.length === 0 || (ADMIN_EMAILS.length === 1 && ADMIN_EMAILS[0] === '')) {
        console.warn('ADMIN_EMAIL not configured.');
        return false;
    }

    const user = await currentUser();
    if (!user) return false;

    const userEmail = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress.toLowerCase();

    if (!userEmail) return false;

    return ADMIN_EMAILS.includes(userEmail);
}

export async function requireAdmin() {
    const isAdmin = await isUserAdmin();
    if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
    }
}
