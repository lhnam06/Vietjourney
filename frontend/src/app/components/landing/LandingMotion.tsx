import { useLayoutEffect, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface LandingMotionProps {
  rootRef: RefObject<HTMLElement>;
}

export function LandingMotion({ rootRef }: LandingMotionProps) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const context = gsap.context(() => {
      const heroMedia = root.querySelector<HTMLElement>(".landing-hero-media");
      const routePaths = root.querySelectorAll<SVGPathElement>(".landing-demo-road-main");

      if (heroMedia) {
        gsap.fromTo(
          heroMedia,
          { autoAlpha: 0, y: 34, scale: 0.985 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.9, delay: 0.16, ease: "power3.out" },
        );
      }

      routePaths.forEach((path) => {
        const length = path.getTotalLength();
        gsap.fromTo(
          path,
          { strokeDasharray: length, strokeDashoffset: length },
          { strokeDashoffset: 0, duration: 1.1, delay: 0.45, ease: "power2.out" },
        );
      });

      gsap.utils.toArray<HTMLElement>(".landing-proof-card", root).forEach((card) => {
        gsap.fromTo(
          card,
          { autoAlpha: 0, y: 30 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.7,
            ease: "power3.out",
            scrollTrigger: { trigger: card, start: "top 88%", once: true },
          },
        );
      });
    }, root);

    ScrollTrigger.refresh();
    return () => context.revert();
  }, [rootRef]);

  return null;
}
