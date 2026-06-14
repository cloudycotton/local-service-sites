const checkoutUrl = "https://whop.com/demosprint/demosprint-pro/";

document.querySelectorAll("[data-checkout-link]").forEach((link) => {
  if (!checkoutUrl) {
    link.setAttribute("aria-disabled", "true");
    link.addEventListener("click", (event) => event.preventDefault());
    return;
  }

  link.href = checkoutUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 },
);

document.querySelectorAll(".reveal").forEach((element, index) => {
  element.style.transitionDelay = `${Math.min(index % 4, 3) * 70}ms`;
  observer.observe(element);
});
