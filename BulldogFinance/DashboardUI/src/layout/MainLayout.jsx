import React from "react";
import FloatingChatbot from "@/components/chat/FloatingChatbot.jsx";
import { ChatbotProvider } from "@/components/chat/ChatbotContext.jsx";
import SideNav from "./SideNav.jsx";
import TopBar from "./TopBar.jsx";

export default function MainLayout({ children }) {
    return (
        <ChatbotProvider>
            <div className="min-h-screen bg-transparent text-[var(--text-main)]">
                <TopBar />
                <div className="mx-auto flex max-w-[1600px] gap-6 px-4 pb-24 pt-6 lg:px-6">
                    <SideNav />
                    <main className="min-w-0 flex-1">{children}</main>
                </div>
                <FloatingChatbot />
            </div>
        </ChatbotProvider>
    );
}
