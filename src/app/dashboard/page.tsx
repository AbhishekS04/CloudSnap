import { isUserAdmin } from "@/lib/auth";
import DashboardClient from "./DashboardClient";
import { GuestView } from "@/components/GuestView";
import fs from 'fs';
import path from 'path';

export default async function DashboardPage() {
    const isAdmin = await isUserAdmin();

    if (isAdmin) {
        return <DashboardClient />;
    }

    // Read documentation content
    const docPath = path.join(process.cwd(), 'src', 'content', 'guest-documentation.md');
    let docContent = '';
    try {
        docContent = fs.readFileSync(docPath, 'utf-8');
    } catch (e) {
        docContent = '# Documentation Not Found\n\nPlease contact the administrator.';
    }

    // Get Admin Email safely
    const adminEmail = process.env.ADMIN_EMAIL?.split(',')[0] || '';

    return <GuestView content={docContent} adminEmail={adminEmail} />;
}
