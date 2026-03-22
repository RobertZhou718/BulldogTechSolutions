import React, { createContext, useContext, useMemo, useState } from "react";
import { useApiClient } from "@/services/apiClient";

const ChatbotContext = createContext(null);

const starterMessages = [
    {
        id: "welcome",
        role: "assistant",
        text: "Ask about your portfolio, transactions, accounts, or market context.",
    },
];

export function ChatbotProvider({ children }) {
    const { sendChatMessage } = useApiClient();
    const [messages, setMessages] = useState(starterMessages);
    const [conversationId, setConversationId] = useState("");
    const [draft, setDraft] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState("");

    const submitMessage = async (customMessage) => {
        const message = String(customMessage ?? draft).trim();
        if (!message || isSending) {
            return;
        }

        const userMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            text: message,
        };

        setMessages((current) => [...current, userMessage]);
        setDraft("");
        setError("");
        setIsSending(true);

        try {
            const response = await sendChatMessage({
                message,
                conversationId: conversationId || undefined,
            });

            const reply = response?.reply ?? response?.Reply ?? "";
            const nextConversationId =
                response?.conversationId ?? response?.ConversationId ?? conversationId ?? "";

            setConversationId(nextConversationId);
            setMessages((current) => [
                ...current,
                {
                    id: `assistant-${Date.now()}`,
                    role: "assistant",
                    text: reply || "No reply received.",
                },
            ]);
        } catch (err) {
            console.error("Failed to send chat message", err);
            setError(err.message || "Failed to contact the finance assistant.");
        } finally {
            setIsSending(false);
            setIsOpen(true);
        }
    };

    const value = useMemo(() => ({
        messages,
        draft,
        error,
        isOpen,
        isSending,
        setDraft,
        setIsOpen,
        openChat: () => setIsOpen(true),
        closeChat: () => setIsOpen(false),
        submitMessage,
    }), [draft, error, isOpen, isSending, messages]);

    return <ChatbotContext.Provider value={value}>{children}</ChatbotContext.Provider>;
}

export function useChatbot() {
    const context = useContext(ChatbotContext);
    if (!context) {
        throw new Error("useChatbot must be used within ChatbotProvider");
    }

    return context;
}
