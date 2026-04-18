import React from "react";
import Card from "@/components/ui/Card.jsx";
import Button from "@/components/ui/Button.jsx";
import { Input } from "@/components/ui/Field.jsx";
import { useChatbot } from "./chatbotContext.js";
import chatbotAvatar from "@/assets/BulldogFinance.png";

export default function ChatbotPanel({
    embedded = false,
    className = "",
    title = "Bulldog Finance chat",
    description = "Ask questions about your portfolio, transactions, or the latest report.",
    prompts = [],
}) {
    const { messages, draft, error, isSending, isLoadingHistory, setDraft, submitMessage } = useChatbot();

    const handleSubmit = async (event) => {
        event.preventDefault();
        await submitMessage();
    };

    return (
        <Card className={`flex h-full min-h-0 flex-col overflow-hidden ${className}`}>
            <div className="flex items-start gap-3">
                <img
                    src={chatbotAvatar}
                    alt="Bulldog Finance assistant"
                    className="h-11 w-11 rounded-2xl border border-[var(--card-border)] bg-white object-cover p-1"
                />
                <div className="min-w-0">
                    <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
                        Assistant
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-[var(--text-main)]">
                        {title}
                    </h2>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                        {description}
                    </p>
                </div>
            </div>

            <div className="mt-6 flex min-h-0 flex-1 flex-col overflow-hidden">
                <div
                    className={`min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 ${
                        embedded ? "max-h-full" : "max-h-[360px]"
                    }`}
                >
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                                    message.role === "user"
                                        ? "bg-[var(--accent)] text-white"
                                        : "border border-[var(--card-border)] bg-[var(--bg-main)] text-[var(--text-main)]"
                                }`}
                            >
                                {message.text}
                            </div>
                        </div>
                    ))}
                    {isLoadingHistory ? (
                        <div className="flex justify-start">
                            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--bg-main)] px-4 py-3 text-sm text-[var(--text-soft)]">
                                Loading chat history...
                            </div>
                        </div>
                    ) : null}
                    {isSending ? (
                        <div className="flex justify-start">
                            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--bg-main)] px-4 py-3 text-sm text-[var(--text-soft)]">
                                Thinking...
                            </div>
                        </div>
                    ) : null}
                </div>

                {error ? (
                    <p className="mt-4 text-sm font-medium text-[var(--color-error-500)]">{error}</p>
                ) : null}

                {prompts.length > 0 ? (
                    <div className="mt-5 shrink-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">
                            Suggested prompts
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {prompts.map((prompt) => (
                                <button
                                    key={prompt}
                                    type="button"
                                    onClick={() => submitMessage(prompt)}
                                    disabled={isSending || isLoadingHistory}
                                    className="rounded-full border border-[var(--card-border)] bg-[var(--bg-main)] px-3 py-2 text-left text-sm font-medium text-[var(--text-main)] transition hover:border-[#b2ddff] hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>

            <form className="mt-5 flex shrink-0 gap-3 border-t border-[var(--card-border)] pt-5" onSubmit={handleSubmit}>
                <Input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Ask Bulldog Finance..."
                    disabled={isSending || isLoadingHistory}
                />
                <Button type="submit" className="shrink-0" disabled={isSending || isLoadingHistory || !draft.trim()}>
                    Send
                </Button>
            </form>
        </Card>
    );
}
