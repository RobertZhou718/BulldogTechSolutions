import { createContext, useContext } from "react";

export const ChatbotContext = createContext(null);

export function useChatbot() {
    const context = useContext(ChatbotContext);
    if (!context) {
        throw new Error("useChatbot must be used within ChatbotProvider");
    }

    return context;
}
