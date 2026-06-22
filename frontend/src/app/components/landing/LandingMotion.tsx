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

    const pointerCleanups: Array<() => void> = [];
    const context = gsap.context(() => {
      const heroMedia = root.querySelector<HTMLElement>(".landing-hero-media");
      const heroImage = root.querySelector<HTMLElement>(".landing-hero-image-wrap");
      const hero = root.querySelector<HTMLElement>(".landing-hero");
      const capabilityStrip = root.querySelector<HTMLElement>(".landing-capability-strip");
      const auroras = gsap.utils.toArray<HTMLElement>(".landing-aurora", root);
      const capabilityItems = gsap.utils.toArray<HTMLElement>(".landing-capability-grid span", root);
      const featureCards = gsap.utils.toArray<HTMLElement>(".landing-feature", root);
      const howImage = root.querySelector<HTMLElement>(".landing-how-photo img");
      const communityPanel = root.querySelector<HTMLElement>(".landing-community-panel");
      const communityImage = root.querySelector<HTMLElement>(".landing-community-panel > img");
      const communityCopy = root.querySelector<HTMLElement>(".landing-community-copy");

      if (heroMedia && hero) {
        gsap.fromTo(
          heroMedia,
          { autoAlpha: 0, x: 72, z: -100, rotationY: -13, rotationX: 4, scale: 0.94 },
          { autoAlpha: 1, x: 0, z: 0, rotationY: 0, rotationX: 0, scale: 1, duration: 1.25, ease: "power4.out" },
        );

        gsap.to(heroMedia, {
          yPercent: 14,
          rotationY: -4,
          scale: 0.97,
          ease: "none",
          scrollTrigger: {
            trigger: hero,
            start: "top top",
            end: "bottom top",
            scrub: 1,
          },
        });
      }

      if (hero) {
        auroras.forEach((aurora, index) => {
          gsap.to(aurora, {
            yPercent: index === 0 ? 22 : -16,
            xPercent: index === 0 ? -8 : 10,
            scale: index === 0 ? 1.12 : 0.92,
            ease: "none",
            scrollTrigger: {
              trigger: hero,
              start: "top top",
              end: "bottom top",
              scrub: 1.4,
            },
          });
        });
      }

      if (capabilityItems.length && capabilityStrip) {
        gsap.fromTo(
          capabilityItems,
          { autoAlpha: 0, y: 26, rotationX: -68, transformOrigin: "50% 0%", transformPerspective: 800 },
          {
            autoAlpha: 1,
            y: 0,
            rotationX: 0,
            duration: 0.8,
            stagger: 0.09,
            ease: "power3.out",
            scrollTrigger: {
              trigger: capabilityStrip,
              start: "top 88%",
              once: true,
            },
          },
        );
      }

      featureCards.forEach((card, index) => {
        const direction = index % 2 === 0 ? -1 : 1;
        gsap.fromTo(
          card,
          {
            autoAlpha: 0,
            y: 76,
            z: -120,
            rotationX: 9,
            rotationY: direction * 7,
            transformPerspective: 1200,
          },
          {
            autoAlpha: 1,
            y: 0,
            z: 0,
            rotationX: 0,
            rotationY: 0,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: card,
              start: "top 88%",
              once: true,
            },
          },
        );
      });

      if (howImage) {
        gsap.fromTo(
          howImage,
          { scale: 1.16, yPercent: -7, rotationZ: -1.5 },
          {
            scale: 1.03,
            yPercent: 7,
            rotationZ: 1.2,
            ease: "none",
            scrollTrigger: {
              trigger: ".landing-how-photo",
              start: "top bottom",
              end: "bottom top",
              scrub: 1.2,
            },
          },
        );
      }

      if (communityPanel && communityImage) {
        gsap.fromTo(
          communityImage,
          { scale: 1.18, yPercent: -5 },
          {
            scale: 1.03,
            yPercent: 5,
            ease: "none",
            scrollTrigger: {
              trigger: communityPanel,
              start: "top bottom",
              end: "bottom top",
              scrub: 1.15,
            },
          },
        );
      }

      if (communityPanel && communityCopy) {
        gsap.fromTo(
          communityCopy,
          { autoAlpha: 0, y: 64, z: -80, rotationX: 7, transformPerspective: 1000 },
          {
            autoAlpha: 1,
            y: 0,
            z: 0,
            rotationX: 0,
            duration: 1.05,
            ease: "power3.out",
            scrollTrigger: {
              trigger: communityPanel,
              start: "top 72%",
              once: true,
            },
          },
        );
      }

      if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        if (heroImage) pointerCleanups.push(bindTilt(heroImage, 5, 0));
        featureCards.forEach((card) => pointerCleanups.push(bindTilt(card, 6.5, -6)));
      }
    }, root);

    ScrollTrigger.refresh();

    return () => {
      pointerCleanups.forEach((cleanup) => cleanup());
      context.revert();
    };
  }, [rootRef]);

  return null;
}

function bindTilt(element: HTMLElement, strength: number, lift: number) {
  gsap.set(element, { transformPerspective: 1200, transformOrigin: "50% 50%" });
  const rotateX = gsap.quickTo(element, "rotationX", { duration: 0.45, ease: "power3.out" });
  const rotateY = gsap.quickTo(element, "rotationY", { duration: 0.45, ease: "power3.out" });
  const moveY = gsap.quickTo(element, "y", { duration: 0.4, ease: "power3.out" });

  const handlePointerMove = (event: PointerEvent) => {
    const bounds = element.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    rotateX(-y * strength * 2);
    rotateY(x * strength * 2);
    moveY(lift);
    element.classList.add("is-tilting");
  };

  const resetTilt = () => {
    rotateX(0);
    rotateY(0);
    moveY(0);
    element.classList.remove("is-tilting");
  };

  element.addEventListener("pointermove", handlePointerMove, { passive: true });
  element.addEventListener("pointerleave", resetTilt);

  return () => {
    element.removeEventListener("pointermove", handlePointerMove);
    element.removeEventListener("pointerleave", resetTilt);
  };
}
