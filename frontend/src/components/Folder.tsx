"use client";

import { useState } from "react";
import "./Folder.css";

const darkenColor = (hex: string, percent: number): string => {
  let color = hex.startsWith("#") ? hex.slice(1) : hex;
  if (color.length === 3) color = color.split("").map((c) => c + c).join("");
  const num = parseInt(color, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  r = Math.max(0, Math.min(255, Math.floor(r * (1 - percent))));
  g = Math.max(0, Math.min(255, Math.floor(g * (1 - percent))));
  b = Math.max(0, Math.min(255, Math.floor(b * (1 - percent))));
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
};

export type FolderItem = {
  id: string;
  label: string;
  icon?: string;
};

type Props = {
  color?: string;
  size?: number;
  items?: FolderItem[];
  activeId?: string;
  onItemClick?: (item: FolderItem) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

// Base folder dimensions (from Folder.css .folder__back)
const BASE_W = 100;
const BASE_H = 80;

export default function Folder({
  color = "#00f0ff",
  size = 1,
  items = [],
  activeId,
  onItemClick,
  open: openProp,
  onOpenChange,
  className = "",
}: Props) {
  const maxItems = 3;
  const papers = items.slice(0, maxItems);
  while (papers.length < maxItems) papers.push(null as unknown as FolderItem);

  const [openInternal, setOpenInternal] = useState(false);
  // If open prop is provided use it (controlled), otherwise use internal state
  const open = openProp !== undefined ? openProp : openInternal;

  const handleToggle = () => {
    const next = !open;
    setOpenInternal(next);
    onOpenChange?.(next);
  };

  const folderBackColor = darkenColor(color, 0.2);
  const paper1 = darkenColor("#1a1a2e", 0);
  const paper2 = darkenColor("#1a1a2e", -0.1);
  const paper3 = darkenColor("#1a1a2e", -0.2);

  const folderStyle = {
    "--folder-color": color,
    "--folder-back-color": folderBackColor,
    "--paper-1": paper1,
    "--paper-2": paper2,
    "--paper-3": paper3,
  } as React.CSSProperties;

  // Visual dimensions after scaling (so the wrapper occupies the correct space)
  const visualW = BASE_W * size;
  const visualH = BASE_H * size;

  return (
    // Outer wrapper with correct visual dimensions — fixes text overlap caused by transform: scale
    <div
      className={className}
      style={{ width: visualW, height: visualH, position: "relative" }}
    >
      <div
        style={{
          transform: `scale(${size})`,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        <div
          className={`folder ${open ? "open" : ""}`.trim()}
          style={folderStyle}
          onClick={handleToggle}
        >
          <div className="folder__back">
            {papers.map((item, i) => (
              <div
                key={i}
                className={`paper${item && activeId === item.id ? " paper--active" : ""}`}
                onClick={(e) => {
                  if (!open || !item) return;
                  e.stopPropagation();
                  onItemClick?.(item);
                }}
              >
                {item && (
                  <>
                    <span style={{ fontSize: 16, lineHeight: 1 }}>{item.icon ?? "📄"}</span>
                    <span
                      style={{
                        fontSize: 7,
                        color: "rgba(255,255,255,0.7)",
                        textAlign: "center",
                        lineHeight: 1.2,
                        padding: "0 4px",
                        fontFamily: "monospace",
                      }}
                    >
                      {item.label}
                    </span>
                  </>
                )}
              </div>
            ))}
            <div className="folder__front" />
            <div className="folder__front right" />
          </div>
        </div>
      </div>
    </div>
  );
}
