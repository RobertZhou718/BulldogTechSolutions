import React from "react";
import ChatbotPanel from "@/components/chat/ChatbotPanel.jsx";
import { useChatbot } from "@/components/chat/ChatbotContext.jsx";
import Card from "@/components/ui/Card.jsx";
import PageHeader from "@/components/ui/PageHeader.jsx";
import Button from "@/components/ui/Button.jsx";

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
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
                                    Chat history
                                </p>
                                <h2 className="mt-2 text-xl font-semibold text-[var(--text-main)]">
                                    Open a previous thread
                                </h2>
                            </div>
                            <Button variant="secondary" onClick={startNewConversation}>
                                New chat
                            </Button>
                        </div>

                        <div className="mt-6 flex-1 space-y-3 overflow-y-auto pr-1">
                            {conversations.length === 0 ? (
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
