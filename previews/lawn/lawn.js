const form = document.querySelector("#demo-form");
const toast = document.querySelector("#demo-toast");
let toastTimer;

form.addEventListener("submit", (event) => {
  event.preventDefault();
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 4200);
});

