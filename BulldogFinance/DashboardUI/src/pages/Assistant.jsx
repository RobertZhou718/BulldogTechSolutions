import React from "react";
import ChatbotPanel from "@/components/chat/ChatbotPanel.jsx";
import { useChatbot } from "@/components/chat/chatbotContext.js";
import Card from "@/components/ui/Card.jsx";
import PageHeader from "@/components/ui/PageHeader.jsx";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const starterPrompts = [
    "Summarize my latest spending patterns.",
    "What changed most in my portfolio today?",
    "What should I review from my latest report?",
    "Show me the biggest expense categories recently.",
];

export default function AssistantPage() {
    const {
        conversations,
        conversationId,
        activeConversationTitle,
        openConversation,
        startNewConversation,
        isLoadingHistory,
        isLoadingConversations,
    } = useChatbot();

    return (
        <div className="space-y-8">
            <PageHeader
                eyebrow="Assistant"
                title="Bulldog assistance"
                description="Use the finance assistant to explore portfolio activity, transaction trends, and report insights from one dedicated workspace."
            />

            <div className="grid gap-6 xl:grid-cols-12">
                <div className="xl:col-span-4">
                    <Card className="flex h-[720px] min-h-0 flex-col">
                        <div>
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
                                    Chat history
                                </p>
                                <Button variant="secondary" className="shrink-0 whitespace-nowrap" onClick={startNewConversation}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                    New chat
                                </Button>
                            </div>
                            <h2 className="mt-2 text-xl font-semibold text-[var(--text-main)]">
                                Open a previous thread
                            </h2>
                        </div>

                        <div className="mt-6 flex-1 space-y-3 overflow-y-auto pr-1">
                            {isLoadingConversations ? (
                                <div className="space-y-3">
                                    <Skeleton className="h-16 rounded-2xl" />
                                    <Skeleton className="h-16 rounded-2xl" />
                                    <Skeleton className="h-16 rounded-2xl" />
                                    <Skeleton className="h-16 rounded-2xl" />
                                </div>
                            ) : conversations.length === 0 ? (
                                <p className="rounded-2xl border border-[var(--card-border)] bg-[var(--bg-main)] px-4 py-4 text-sm text-[var(--text-muted)]">
                                    No saved chats yet.
                                </p>
                            ) : (
                                conversations.map((conversation) => {
                                    const itemConversationId = conversation?.conversationId ?? conversation?.ConversationId ?? "";
                                    const itemTitle = conversation?.title ?? conversation?.Title ?? "Untitled chat";
                                    const updatedAtUtc = conversation?.updatedAtUtc ?? conversation?.UpdatedAtUtc;
                                    const isActive = itemConversationId === conversationId;

                                    return (
                                        <button
                                            key={itemConversationId}
                                            type="button"
                                            onClick={() => openConversation(itemConversationId)}
                                            disabled={isLoadingHistory}
                                            className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                                                isActive
                                                    ? "border-[#b2ddff] bg-white"
                                                    : "border-[var(--card-border)] bg-[var(--bg-main)] hover:border-[#b2ddff] hover:bg-white"
                                            }`}
                                        >
                                            <p className="text-sm font-semibold text-[var(--text-main)]">
                                                {itemTitle}
                                            </p>
                                            <p className="mt-1 text-xs text-[var(--text-soft)]">
                                                {updatedAtUtc ? `Updated ${new Date(updatedAtUtc).toLocaleString()}` : "Saved chat"}
                                            </p>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </Card>
                </div>

                <div className="xl:col-span-8">
                    <ChatbotPanel
                        embedded
                        className="h-[720px]"
                        title={activeConversationTitle || "Ask Bulldog Finance"}
                        description="Chat with your assistant about recent account movement, portfolio changes, and report takeaways."
                        prompts={starterPrompts}
                    />
                </div>
            </div>
        </div>
    );
}
