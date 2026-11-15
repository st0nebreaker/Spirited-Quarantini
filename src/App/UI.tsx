import React, { ReactNode, useEffect, useRef } from "react";
import { Recipe } from "./recipes";

type IconName =
  | "search"
  | "bookmark"
  | "user"
  | "arrow"
  | "close"
  | "check"
  | "clock"
  | "book"
  | "menu";
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    bookmark: (
      <path d="M6 4.8A1.8 1.8 0 0 1 7.8 3h8.4A1.8 1.8 0 0 1 18 4.8V21l-6-3.6L6 21Z" />
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m14 7 5 5-5 5" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12" />
        <path d="m18 6-12 12" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    book: (
      <>
        <path d="M12 5C8 2 4 3 3 4v15c3-2 6-1 9 1 3-2 6-3 9-1V4c-3-2-6-1-9 1Z" />
        <path d="M12 5v15" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export function Dialog({
  children,
  onClose,
  label,
  className = "",
}: {
  children: ReactNode;
  onClose: () => void;
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        ref.current!.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input, a[href], [tabindex="0"]'
        )
      );
    const initial =
      ref.current!.querySelector<HTMLElement>("input") || focusable()[0];
    initial && initial.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key === "Tab") {
        const elements = focusable();
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", handleKey);
      previous && previous.focus();
    };
  }, []);
  return (
    <div
      className="dialog-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={`sc-dialog ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        <button
          className="modal-close icon-button"
          onClick={onClose}
          aria-label={`Close ${label}`}
        >
          <Icon name="close" />
        </button>
        {children}
      </div>
    </div>
  );
}

export function RecipeCard({
  recipe,
  saved,
  onOpen,
  onSave,
}: {
  recipe: Recipe;
  saved: boolean;
  onOpen: () => void;
  onSave: () => void;
}) {
  return (
    <article className="recipe-card">
      <button
        className="card-image"
        onClick={onOpen}
        aria-label={`View ${recipe.name}`}
      >
        <img
          src={recipe.image}
          alt={`${recipe.name} cocktail`}
          loading="lazy"
        />
        {recipe.time && (
          <span className="card-time">
            {recipe.time} · {recipe.difficulty}
          </span>
        )}
      </button>
      <div className="card-copy">
        <div>
          <p className="eyebrow">{recipe.spirit}</p>
          <button className="card-title" onClick={onOpen}>
            {recipe.name}
          </button>
          <p className="muted">{recipe.note}</p>
          <button className="text-button" onClick={onOpen}>
            View recipe <Icon name="arrow" size={16} />
          </button>
        </div>
        <button
          className={`icon-button ${saved ? "is-saved" : ""}`}
          onClick={onSave}
          aria-pressed={saved}
          aria-label={`${saved ? "Unsave" : "Save"} ${recipe.name}`}
        >
          <Icon name={saved ? "check" : "bookmark"} />
        </button>
      </div>
    </article>
  );
}
