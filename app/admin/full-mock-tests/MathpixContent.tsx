"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const MATHPIX_STYLE_ID = "Mathpix-styles";

const MATHPIX_OPTIONS = {
  htmlTags: true,
  breaks: true,
  typographer: false,
  htmlSanitize: {},
};

type MathpixMarkdownModelType = {
  markdownToHTML: (text: string, options?: Record<string, unknown>) => string;
  getMathpixFontsStyle: () => string;
  getMathpixStyleOnly: (useColors?: boolean) => string;
};

function ensureMathpixStyles(model: MathpixMarkdownModelType) {
  if (typeof document === "undefined") return;
  if (document.getElementById(MATHPIX_STYLE_ID)) return;

  const style = document.createElement("style");
  style.setAttribute("id", MATHPIX_STYLE_ID);
  style.innerHTML =
    model.getMathpixFontsStyle() + model.getMathpixStyleOnly(true);
  document.head.appendChild(style);
}

export function MathpixContent({
  text,
  className,
  inline = false,
}: {
  text: string;
  className?: string;
  inline?: boolean;
}) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!text) {
      setHtml(null);
      return;
    }

    let cancelled = false;

    const render = async () => {
      try {
        const { MathpixMarkdownModel } = await import("mathpix-markdown-it");
        ensureMathpixStyles(MathpixMarkdownModel);
        const rendered = MathpixMarkdownModel.markdownToHTML(
          text,
          MATHPIX_OPTIONS
        );
        if (!cancelled) {
          setHtml(rendered);
        }
      } catch {
        if (!cancelled) {
          setHtml(null);
        }
      }
    };

    void render();

    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!text) return null;

  const Tag = inline ? "span" : "div";
  const classes = cn(
    "mathpix-content",
    inline && "mathpix-content-inline",
    className
  );

  if (html) {
    return (
      <Tag
        className={classes}
        data-mathpix="true"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return <Tag className={classes}>{text}</Tag>;
}
