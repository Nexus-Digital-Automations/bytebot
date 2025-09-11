"use client";

import React, { useEffect, useRef, useState } from "react";
import { logError } from "@/utils/logger";

interface VncViewerProps {
  viewOnly?: boolean;
}

export function VncViewer({ viewOnly = true }: VncViewerProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [VncComponent, setVncComponent] = useState<React.ComponentType<{
    rfbOptions?: Record<string, unknown>;
    url?: string;
    scaleViewport?: boolean;
    viewOnly?: boolean;
    style?: React.CSSProperties;
  }> | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);

  useEffect(() => {
    // Dynamically import the VncScreen component only on the client side
    import("react-vnc")
      .then(({ VncScreen }) => {
        setVncComponent(
          () =>
            VncScreen as React.ComponentType<{
              rfbOptions?: Record<string, unknown>;
              url?: string;
              scaleViewport?: boolean;
              viewOnly?: boolean;
              style?: React.CSSProperties;
            }>,
        );
      })
      .catch((_error: unknown) => {
        logError("Failed to load VNC component", _error, "VncViewer");
      });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    } // SSR safety‑net
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    setWsUrl(`${proto}://${window.location.host}/api/proxy/websockify`);
  }, []);

  return (
    <div ref={containerRef} className="h-full w-full">
      {VncComponent != null && wsUrl != null && (
        <VncComponent
          rfbOptions={{
            secure: false,
            shared: true,
            wsProtocols: ["binary"],
          }}
          // autoConnect={true}
          key={viewOnly ? "view-only" : "interactive"}
          url={wsUrl}
          scaleViewport
          viewOnly={viewOnly}
          style={{ width: "100%", height: "100%" }}
        />
      )}
    </div>
  );
}
