import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
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
    const { sendChatMessage, getChatConversations, getChatConversation } = useApiClient();
    const [messages, setMessages] = useState(starterMessages);
    const [conversationId, setConversationId] = useState("");
    const [conversations, setConversations] = useState([]);
    const [activeConversationTitle, setActiveConversationTitle] = useState("");
    const [draft, setDraft] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const items = await getChatConversations();
                if (!cancelled) {
                    setConversations(Array.isArray(items) ? items : []);
                }
            } catch (err) {
                console.error("Failed to load chat conversations", err);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [getChatConversations]);

    const refreshConversations = async (preferredConversationId = "") => {
        const items = await getChatConversations();
        const nextItems = Array.isArray(items) ? items : [];
        setConversations(nextItems);

        if (preferredConversationId) {
            const active = nextItems.find((item) =>
                (item?.conversationId ?? item?.ConversationId) === preferredConversationId
            );
            setActiveConversationTitle(active?.title ?? active?.Title ?? "");
        }
    };

    const startNewConversation = () => {
        setConversationId("");
        setActiveConversationTitle("");
        setMessages(starterMessages);
        setDraft("");
        setError("");
        setIsOpen(true);
    };

    const openConversation = async (nextConversationId) => {
        if (!nextConversationId) {
            startNewConversation();
            return;
        }

        setIsLoadingHistory(true);
        setError("");
        setIsOpen(true);

        try {
            const response = await getChatConversation(nextConversationId);
            const responseConversationId = response?.conversationId ?? response?.ConversationId ?? nextConversationId;
            const responseTitle = response?.title ?? response?.Title ?? "";
            const responseMessages = Array.isArray(response?.messages ?? response?.Messages)
                ? (response?.messages ?? response?.Messages)
                : [];

            setConversationId(responseConversationId);
            setActiveConversationTitle(responseTitle);
            setMessages(responseMessages.length > 0
                ? responseMessages.map((message, index) => ({
                    id: `${responseConversationId}-${index}`,
                    role: message?.role ?? message?.Role ?? "assistant",
                    text: message?.content ?? message?.Content ?? "",
                }))
                : starterMessages);
        } catch (err) {
            console.error("Failed to load conversation", err);
            setError(err.message || "Failed to load chat history.");
        } finally {
            setIsLoadingHistory(false);
        }
    };

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
            await refreshConversations(nextConversationId);
        } catch (err) {
            console.error("Failed to send chat message", err);
            setError(err.message || "Failed to contact the finance assistant.");
        } finally {
            setIsSending(false);
            setIsOpen(true);
        }
    };

    const value = useMemo(() => ({
        conversations,
        conversationId,
        activeConversationTitle,
        messages,
        draft,
        error,
        isOpen,
        isSending,
        isLoadingHistory,
        setDraft,
        setIsOpen,
        openChat: () => setIsOpen(true),
        closeChat: () => setIsOpen(false),
        openConversation,
        startNewConversation,
        refreshConversations,
        submitMessage,
    }), [
        activeConversationTitle,
        conversationId,
        conversations,
        draft,
        error,
        isLoadingHistory,
        isOpen,
        isSending,
        messages,
    ]);

    return <ChatbotContext.Provider value={value}>{children}</ChatbotContext.Provider>;
}

export function useChatbot() {
    const context = useContext(ChatbotContext);
    if (!context) {
        throw new Error("useChatbot must be used within ChatbotProvider");
    }

    return context;
}
