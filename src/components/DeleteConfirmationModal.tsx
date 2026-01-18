"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Trash2, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    itemName: string;
}

export function DeleteConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    itemName
}: DeleteConfirmationModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl"
                    >
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                                    <AlertCircle className="w-6 h-6 text-red-500" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">{title}</h3>
                                    <p className="text-zinc-400 text-sm mt-1">Think before you delete</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="ml-auto p-2 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800/50 mb-8">
                                <p className="text-zinc-300 text-sm leading-relaxed">
                                    {message} <span className="text-white font-semibold">"{itemName}"</span>? This action cannot be undone.
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-medium transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        onConfirm();
                                        onClose();
                                    }}
                                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-medium shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
