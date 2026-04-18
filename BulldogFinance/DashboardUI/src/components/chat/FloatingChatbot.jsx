import React, { useEffect } from "react";
import Button from "@/components/ui/Button.jsx";
import { useLocation } from "react-router-dom";
import { useChatbot } from "./chatbotContext.js";
import ChatbotPanel from "./ChatbotPanel.jsx";
import chatbotAvatar from "@/assets/BulldogFinance.png";

export default function FloatingChatbot() {
    const { pathname } = useLocation();
    const { isOpen, openChat, closeChat } = useChatbot();
    const isAssistantPage = pathname === "/assistant";

    useEffect(() => {
        if (isAssistantPage && isOpen) {
            closeChat();
        }
    }, [closeChat, isAssistantPage, isOpen]);

    if (isAssistantPage) {
        return null;
    }

    return (
        <>
            {isOpen ? (
                <div className="fixed bottom-24 right-4 z-40 w-[min(420px,calc(100vw-2rem))] lg:right-6">
                    <div className="mb-3 flex justify-end">
                        <Button variant="secondary" onClick={closeChat}>
                            Close
                        </Button>
                    </div>
                    <ChatbotPanel />
                </div>
            ) : null}

            <button
                type="button"
                onClick={openChat}
                className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-3 rounded-full border border-[var(--card-border)] bg-white px-3 py-3 shadow-lg transition hover:bg-[var(--bg-elevated)] lg:bottom-6 lg:right-6"
                aria-label="Open Bulldog Finance chat"
            >
                <img
                    src={chatbotAvatar}
                    alt=""
                    className="h-10 w-10 rounded-full border border-[var(--card-border)] bg-white object-cover p-1"
                />
                <span className="hidden pr-1 text-sm font-semibold text-[var(--text-main)] sm:inline">
                    Chat
                </span>
            </button>
        </>
    );
}
