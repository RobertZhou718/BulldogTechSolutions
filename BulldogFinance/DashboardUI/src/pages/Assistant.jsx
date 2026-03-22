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
    const { submitMessage } = useChatbot();

    return (
        <div className="space-y-8">
            <PageHeader
                eyebrow="Assistant"
                title="Bulldog assistance"
                description="Use the finance assistant to explore portfolio activity, transaction trends, and report insights from one dedicated workspace."
            />

            <div className="grid gap-6 xl:grid-cols-12">
                <div className="space-y-6 xl:col-span-4">
                    <Card>
                        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
                            Quick start
                        </p>
                        <h2 className="mt-2 text-xl font-semibold text-[var(--text-main)]">
                            Start with a useful question
                        </h2>
                        <p className="mt-2 text-sm text-[var(--text-muted)]">
                            These prompts are tuned to the backend tools already available in Bulldog Finance.
                        </p>

                        <div className="mt-6 space-y-3">
                            {starterPrompts.map((prompt) => (
                                <button
                                    key={prompt}
                                    type="button"
                                    onClick={() => submitMessage(prompt)}
                                    className="w-full rounded-2xl border border-[var(--card-border)] bg-[var(--bg-main)] px-4 py-4 text-left text-sm font-medium text-[var(--text-main)] transition hover:border-[#b2ddff] hover:bg-white"
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </Card>

                    <Card>
                        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
                            What it can do
                        </p>
                        <div className="mt-4 space-y-4">
                            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--bg-main)] px-4 py-4">
                                <p className="text-sm font-semibold text-[var(--text-main)]">Portfolio context</p>
                                <p className="mt-1 text-sm text-[var(--text-soft)]">
                                    Review holdings, watchlist signals, and market-related questions.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--bg-main)] px-4 py-4">
                                <p className="text-sm font-semibold text-[var(--text-main)]">Cash flow answers</p>
                                <p className="mt-1 text-sm text-[var(--text-soft)]">
                                    Ask about accounts, transactions, inflows, outflows, and category patterns.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--bg-main)] px-4 py-4">
                                <p className="text-sm font-semibold text-[var(--text-main)]">Report guidance</p>
                                <p className="mt-1 text-sm text-[var(--text-soft)]">
                                    Turn weekly or monthly report content into follow-up actions and explanations.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6">
                            <Button
                                variant="secondary"
                                className="w-full"
                                onClick={() => submitMessage("Summarize my current financial picture.")}
                            >
                                Ask for a full summary
                            </Button>
                        </div>
                    </Card>
                </div>

                <div className="xl:col-span-8">
                    <ChatbotPanel
                        embedded
                        className="min-h-[720px]"
                        title="Ask Bulldog Finance"
                        description="Chat with your assistant about recent account movement, portfolio changes, and report takeaways."
                    />
                </div>
            </div>
        </div>
    );
}
