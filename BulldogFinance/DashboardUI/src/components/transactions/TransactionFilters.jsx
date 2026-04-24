import React from "react";
import { Button } from "@/components/ui/button";
import Card from "@/components/ui/Card.jsx";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, Input } from "@/components/ui/Field.jsx";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const TYPE_FILTER_OPTIONS = [
    { value: "ALL", label: "All" },
    { value: "EXPENSE", label: "Expense" },
    { value: "INCOME", label: "Income" },
];

export default function TransactionFilters({ filters, onChange, onReset }) {
    const handleChange = (field, value) => {
        onChange({
            ...filters,
            [field]: value,
        });
    };

    return (
        <Card>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
                Filters
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--text-main)]">
                Refine the transaction feed
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
                Slice by type, date window, or category keyword.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Type">
                    <Select
                        value={filters.type}
                        onValueChange={(value) => handleChange("type", value)}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {TYPE_FILTER_OPTIONS.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>

                <Field label="From">
                    <DatePicker
                        value={filters.from}
                        onChange={(value) => handleChange("from", value)}
                    />
                </Field>

                <Field label="To">
                    <DatePicker
                        value={filters.to}
                        onChange={(value) => handleChange("to", value)}
                    />
                </Field>

                <Field label="Category">
                    <Input
                        placeholder="Any"
                        value={filters.category}
                        onChange={(e) => handleChange("category", e.target.value)}
                    />
                </Field>
            </div>

            <div className="mt-4 flex justify-end">
                <Button variant="ghost" onClick={onReset}>
                    Reset filters
                </Button>
            </div>
        </Card>
    );
}
