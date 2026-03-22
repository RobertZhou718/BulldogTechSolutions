import React from "react";
import Card from "@/components/ui/Card.jsx";
import Button from "@/components/ui/Button.jsx";
import { Input } from "@/components/ui/Field.jsx";
import { useChatbot } from "./ChatbotContext.jsx";
import chatbotAvatar from "@/assets/BulldogFinance.png";

export default function ChatbotPanel({
    embedded = false,
    className = "",
    title = "Bulldog Finance chat",
    description = "Ask questions about your portfolio, transactions, or the latest report.",
}) {
    const { messages, draft, error, isSending, setDraft, submitMessage } = useChatbot();

    const handleSubmit = async (event) => {
        event.preventDefault();
        await submitMessage();
    };

    return (
        <Card className={`flex h-full flex-col ${className}`}>
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

            <div
                className={`mt-6 flex-1 space-y-3 overflow-y-auto pr-1 ${
                    embedded ? "min-h-[420px]" : "max-h-[360px]"
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

            <form className="mt-5 flex gap-3" onSubmit={handleSubmit}>
                <Input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Ask Bulldog Finance..."
                    disabled={isSending}
                />
                <Button type="submit" className="shrink-0" disabled={isSending || !draft.trim()}>
                    Send
                </Button>
            </form>
        </Card>
    );
}
