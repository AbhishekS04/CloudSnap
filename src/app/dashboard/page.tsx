import { getAppUser } from "@/lib/auth";
import DashboardClient from "./DashboardClient";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-server";

export default async function DashboardPage() {
    const appUser = await getAppUser();

    if (!appUser) {
        redirect("/sign-in");
    }

    // Fetch initial upload count for Demo users to prevent UI race conditions
    let initialUploadCount = 0;
    if (appUser.role === 'DEMO') {
        const { count } = await supabaseAdmin
            .from('assets')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', appUser.id);
        initialUploadCount = count || 0;
    }

    return <DashboardClient userRole={appUser.role} initialUploadCount={initialUploadCount} />;
}


