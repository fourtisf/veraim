export const scrollToSection = (selector: string) =>
  document.querySelector(selector)?.scrollIntoView({ behavior: "smooth" });
