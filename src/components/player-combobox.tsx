"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface PlayerOption {
  id: string;
  name: string;
  username: string | null;
  active: boolean;
}

interface Props {
  players: PlayerOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  /** 显示「全部」选项;用于筛选场景 */
  allowAll?: boolean;
  className?: string;
}

/**
 * 陪玩选择器:支持文字搜索的下拉框。
 * - 输入按姓名/用户名子串匹配
 * - 键盘 ↑↓ 选择,Enter 确认,Esc 关闭
 * - 停用陪玩排在后面并加灰底
 */
export function PlayerCombobox({
  players,
  value,
  onChange,
  placeholder = "搜索陪玩…",
  allowAll = false,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => players.find((p) => p.id === value),
    [players, value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...players].sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return a.name.localeCompare(b.name, "zh-Hans-CN");
    });
    if (!q) return sorted;
    return sorted.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.username ?? "").toLowerCase().includes(q)
    );
  }, [players, query]);

  // 加上「全部」虚拟选项后的最终列表
  const items = useMemo(() => {
    if (allowAll) {
      return [
        { id: "", name: "全部陪玩", username: null, active: true } as PlayerOption,
        ...filtered,
      ];
    }
    return filtered;
  }, [allowAll, filtered]);

  // 关闭时点击外部
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // 打开时重置高亮 / 输入
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
    }
  }, [open]);

  // 高亮项滚动到可见
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-idx="${activeIdx}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [open, activeIdx]);

  function pick(id: string) {
    onChange(id);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[activeIdx]) pick(items[activeIdx].id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  const displayLabel = selected
    ? `${selected.name}${selected.active ? "" : "（已停用）"}`
    : allowAll && value === ""
      ? "全部陪玩"
      : "";

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      {/* 触发器:已选时显示已选项,未选时显示占位 */}
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors hover:bg-accent/40",
            !selected && !(allowAll && value === "") && "text-muted-foreground"
          )}
        >
          <span className="truncate">{displayLabel || placeholder}</span>
          <div className="flex items-center gap-1 shrink-0">
            {selected && !allowAll && (
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
                className="inline-flex size-4 items-center justify-center rounded hover:bg-muted"
                aria-label="清除"
              >
                <X className="size-3" />
              </span>
            )}
            <ChevronsUpDown className="size-3.5 opacity-50" />
          </div>
        </button>
      ) : (
        <Input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIdx(0);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="h-9"
        />
      )}

      {open && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-md border bg-popover p-1 text-sm shadow-md"
        >
          {items.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              没找到匹配的陪玩
            </div>
          ) : (
            items.map((p, idx) => {
              const isAll = allowAll && p.id === "";
              const isSelected = value === p.id;
              const isActive = idx === activeIdx;
              return (
                <div
                  key={p.id || "__all__"}
                  data-idx={idx}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(p.id);
                  }}
                  onMouseEnter={() => setActiveIdx(idx)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5",
                    isActive && "bg-accent",
                    !p.active && !isAll && "opacity-60"
                  )}
                >
                  <Check
                    className={cn(
                      "size-3.5 shrink-0",
                      isSelected ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex-1 truncate">
                    {p.name}
                    {!p.active && !isAll && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        (已停用)
                      </span>
                    )}
                  </span>
                  {p.username && !isAll && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      @{p.username}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
