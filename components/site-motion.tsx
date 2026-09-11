"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Progressive enhancement: content stays visible when motion or JS is unavailable. */
export function SiteMotion() {
  const pathname = usePathname();
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches || !("IntersectionObserver" in window)) return;
    const main = document.querySelector("main");
    if (!main) return;
    const tracked = new Set<HTMLElement>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.reveal = "visible";
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.06, rootMargin: "0px 0px -20px 0px" },
    );
    const collect = () => {
      main
        .querySelectorAll<HTMLElement>(
          ".section-head,.category-tile,.product-card,.brand-story,.order-section>div,.privacy-grid>div,.newsletter>div,.newsletter>form,.page-heading,.detail-grid>div",
        )
        .forEach((element) => {
          if (tracked.has(element)) return;
          tracked.add(element);
          if (element.getBoundingClientRect().top < window.innerHeight - 25) {
            element.dataset.reveal = "visible";
          } else {
            element.dataset.reveal = "pending";
            const siblings = Array.from(element.parentElement?.children || []);
            element.style.setProperty(
              "--reveal-delay",
              `${Math.min(siblings.indexOf(element), 3) * 70}ms`,
            );
            observer.observe(element);
          }
        });
    };
    let frame = 0;
    const scheduleCollect = () => {
      cancelAnimationFrame(frame);
      // Defer DOM decoration until streamed client islands have hydrated.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(collect);
      });
    };
    // Catalog results arrive asynchronously and replace their cards on filtering.
    const mutations = new MutationObserver(scheduleCollect);
    mutations.observe(main, { childList: true, subtree: true });
    scheduleCollect();
    const stopMotion = () => {
      if (!preference.matches) return;
      observer.disconnect();
      mutations.disconnect();
      tracked.forEach((element) => {
        element.dataset.reveal = "visible";
      });
    };
    preference.addEventListener("change", stopMotion);
    return () => {
      observer.disconnect();
      mutations.disconnect();
      cancelAnimationFrame(frame);
      preference.removeEventListener("change", stopMotion);
      tracked.forEach((element) => {
        delete element.dataset.reveal;
      });
    };
  }, [pathname]);
  return null;
}
