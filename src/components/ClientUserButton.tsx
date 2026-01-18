'use client';

import { UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export const ClientUserButton = (props: React.ComponentProps<typeof UserButton>) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />;
    }

    return <UserButton {...props} />;
};
