import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, parse, isValid } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

function toDate(value) {
    if (!value) return undefined;
    if (value instanceof Date) return isValid(value) ? value : undefined;
    const parsed = parse(value, "yyyy-MM-dd", new Date());
    return isValid(parsed) ? parsed : undefined;
}

function toString(date) {
    return date ? format(date, "yyyy-MM-dd") : "";
}

export function DatePicker({
    value,
    onChange,
    placeholder = "Pick a date",
    disabled,
    className,
    id,
    "aria-label": ariaLabel,
}) {
    const selected = toDate(value);
    const [open, setOpen] = React.useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    id={id}
                    variant="outline"
                    disabled={disabled}
                    aria-label={ariaLabel}
                    className={cn(
                        "w-full justify-between font-normal",
                        !selected && "text-muted-foreground",
                        className
                    )}
                >
                    <span>{selected ? format(selected, "yyyy/MM/dd") : placeholder}</span>
                    <CalendarIcon className="h-4 w-4 opacity-60" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={selected}
                    onSelect={(date) => {
                        onChange?.(toString(date));
                        setOpen(false);
                    }}
                    autoFocus
                />
            </PopoverContent>
        </Popover>
    );
}
