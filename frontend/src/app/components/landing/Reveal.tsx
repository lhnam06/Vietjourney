import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "../../lib/utils";

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  distance?: number;
  animate?: boolean;
}

export function Reveal({ children, className, delay = 0, distance = 34, animate = true }: RevealProps) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !animate) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        element.classList.add("is-visible");
        observer.disconnect();
      },
      { threshold: 0.16, rootMargin: "0px 0px -7%" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [animate]);

  return (
    <div
      ref={elementRef}
      className={cn("landing-reveal", !animate && "is-visible", className)}
      style={{ "--reveal-delay": `${delay}ms`, "--reveal-distance": `${distance}px` } as CSSProperties}
    >
      {children}
    </div>
  );
}
