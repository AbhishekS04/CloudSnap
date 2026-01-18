import { forwardRef, useImperativeHandle } from "react";
import type { AnimatedIconHandle, AnimatedIconProps } from "./types";
import { motion, useAnimate } from "framer-motion";

const RefreshIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
    (
        { size = 24, color = "currentColor", strokeWidth = 2, className = "" },
        ref,
    ) => {
        const [scope, animate] = useAnimate();

        const start = async () => {
            // Full spin for refresh (automatic or click)
            await animate(
                scope.current,
                { rotate: 360 },
                { duration: 0.8, ease: "easeInOut" }
            );
            // Reset instantly
            scope.current.style.transform = "rotate(0deg)";
        };

        const stop = async () => {
            // Stop logic if needed, but for one-shot animations we usually just let them finish
            // or we could animate back to 0.
            // For now, let's ensure it resets if interrupted.
            await animate(scope.current, { rotate: 0 }, { duration: 0.3 });
        };

        useImperativeHandle(ref, () => ({
            startAnimation: start,
            stopAnimation: stop,
        }));

        const handleHoverStart = async () => {
            // "Animates a little" - subtle 90 degree rotation
            await animate(scope.current, { rotate: 90 }, { duration: 0.3 });
        };

        const handleHoverEnd = async () => {
            // Return to 0
            await animate(scope.current, { rotate: 0 }, { duration: 0.3 });
        };

        return (
            <motion.svg
                ref={scope}
                onHoverStart={handleHoverStart}
                onHoverEnd={handleHoverEnd}
                xmlns="http://www.w3.org/2000/svg"
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`cursor-pointer ${className}`}
                style={{ transformOrigin: "50% 50%" }}
            >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
                <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
            </motion.svg>
        );
    },
);

RefreshIcon.displayName = "RefreshIcon";

export default RefreshIcon;
