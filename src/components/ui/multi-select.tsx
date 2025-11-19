import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: readonly MultiSelectOption[] | MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    onChange(newSelected);
  };

  const handleRemove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((item) => item !== value));
  };

  const selectedLabels = selected
    .map((value) => options.find((opt) => opt.value === value)?.label)
    .filter(Boolean);

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="truncate">
              {selected.length > 0
                ? `${selected.length} selected`
                : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 bg-background border shadow-lg" align="start">
          <div className="p-2 border-b">
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="max-h-64 overflow-auto p-1">
            {filteredOptions.length === 0 ? (
              <p className="p-2 text-sm text-muted-foreground text-center">
                No options found
              </p>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-sm hover:bg-accent",
                    selected.includes(option.value) && "bg-accent"
                  )}
                  onClick={() => handleSelect(option.value)}
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      selected.includes(option.value)
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50"
                    )}
                  >
                    {selected.includes(option.value) && (
                      <Check className="h-3 w-3" />
                    )}
                  </div>
                  <span className="text-sm">{option.label}</span>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected Items as Badges */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedLabels.map((label, index) => (
            <Badge
              key={selected[index]}
              variant="secondary"
              className="text-xs pl-2 pr-1 py-0.5"
            >
              {label}
              <button
                className="ml-1 hover:bg-muted rounded-full p-0.5"
                onClick={(e) => handleRemove(selected[index], e)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
