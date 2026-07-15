function openAuthModal(tab) {
  if (!tab) tab = "login";
  const modal = document.querySelector("[data-auth-modal]");
  if (!modal) return;
  if (modal.classList.contains("open")) return;
  const card = modal.querySelector(".auth-card");

  document.querySelector("[data-login-form]")?.reset();
  document.querySelector("[data-register-form]")?.reset();

  document.querySelectorAll(".input-field.error").forEach((el) => el.classList.remove("error"));

  gsap.killTweensOf([modal, card]);

  gsap.set(modal, { display: "grid", opacity: 0, visibility: "visible", pointerEvents: "auto" });
  gsap.set(card, { scale: 0.92, y: 40, opacity: 0, transformOrigin: "50% 50%" });

  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
  tl.to(modal, { opacity: 1, duration: 0.3, ease: "power2.out" })
    .to(card, {
      scale: 1, y: 0, opacity: 1,
      duration: 0.55,
      ease: "back.out(1.7)",
    }, "-=0.1");

  modal.classList.add("open");
  setAuthTab(tab);
}

function closeAuthModal() {
  const modal = document.querySelector("[data-auth-modal]");
  if (!modal || !modal.classList.contains("open")) return;
  const card = modal.querySelector(".auth-card");

  gsap.killTweensOf([modal, card]);

  const tl = gsap.timeline({
    defaults: { ease: "power2.in" },
    onComplete() {
      modal.classList.remove("open");
      gsap.set(modal, { visibility: "hidden", pointerEvents: "none" });
    },
  });
  tl.to(card, { scale: 0.95, y: 25, opacity: 0, duration: 0.22 })
    .to(modal, { opacity: 0, duration: 0.18 }, "-=0.08");
}

function setAuthTab(tab) {
  const track = document.querySelector("[data-auth-slider]");
  const buttons = document.querySelectorAll("[data-auth-tab]");
  const indicator = document.querySelector("[data-auth-indicator]");

  buttons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.authTab === tab);
  });

  if (track) {
    gsap.killTweensOf(track);
    gsap.to(track, {
      x: tab === "register" ? "-50%" : "0%",
      duration: 0.45,
      ease: "power3.inOut",
    });
  }

  if (indicator) {
    gsap.killTweensOf(indicator);
    const activeBtn = document.querySelector(`[data-auth-tab="${tab}"]`);
    if (activeBtn) {
      gsap.to(indicator, {
        x: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
        duration: 0.4,
        ease: "power3.out",
      });
    }
  }
}

function wireAuthIndicator() {
  const activeBtn = document.querySelector("[data-auth-tab].active");
  const indicator = document.querySelector("[data-auth-indicator]");
  if (!activeBtn || !indicator) return;
  gsap.set(indicator, {
    x: activeBtn.offsetLeft,
    width: activeBtn.offsetWidth,
  });
}

function wirePasswordToggles() {
  document.querySelectorAll("[data-password-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn.closest(".input-group").querySelector("input");
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      btn.innerHTML = isPassword
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
    });
  });
}

function submitAuthForm(event, type) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type=submit]");
  const buttonText = button.querySelector(".button-text");
  if (button.disabled) return;

  const originalText = buttonText ? buttonText.textContent : button.textContent;
  const btnWidth = button.offsetWidth;

  button.disabled = true;
  gsap.set(button, { minWidth: btnWidth });
  gsap.to(button, { scale: 0.97, duration: 0.15, ease: "power2.out" });

  if (buttonText) {
    buttonText.style.display = "none";
  } else {
    button.textContent = "";
  }
  const spinner = document.createElement("span");
  spinner.className = "spinner";
  button.appendChild(spinner);
  gsap.fromTo(spinner, { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.2 });

  const formData = new FormData(form);
  let body;
  if (type === "login") {
    body = JSON.stringify({
      email: formData.get("email"),
      password: formData.get("password"),
    });
  } else {
    body = JSON.stringify({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    });
  }

  const endpoint = type === "login" ? "/auth/login" : "/auth/register";

  api(endpoint, { method: "POST", body })
    .then(async () => {
      const check = document.createElement("span");
      check.className = "auth-check";
      check.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#7ef4d2" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      spinner.remove();
      button.appendChild(check);
      gsap.fromTo(
        check,
        { scale: 0, rotation: -45 },
        { scale: 1, rotation: 0, duration: 0.35, ease: "back.out(2)" },
      );

      await refreshSession();
      await new Promise((r) => setTimeout(r, 600));

      closeAuthModal();
      form.reset();
      showToast(
        type === "login" ? "Welcome back" : "Account created",
        type === "login"
          ? "You are now signed in."
          : "Your account is ready for checkout.",
      );
    })
    .catch((error) => {
      spinner.remove();
      if (buttonText) buttonText.style.display = "";
      gsap.fromTo(
        form,
        { x: 0 },
        { x: [-6, 6, -4, 4, -2, 2, 0], duration: 0.45, ease: "power2.out" },
      );
      form.querySelectorAll(".input-field").forEach((el) => el.classList.add("error"));
      showToast(
        type === "login" ? "Login failed" : "Registration failed",
        error.message,
      );
    })
    .finally(() => {
      button.disabled = false;
      gsap.set(button, { scale: 1, minWidth: "" });
      const existingSpinner = button.querySelector(".spinner");
      if (existingSpinner) existingSpinner.remove();
      if (buttonText) buttonText.style.display = "";
    });
}

function attachAuthEvents() {
  document.addEventListener("click", (event) => {
    const tabBtn = event.target.closest("[data-auth-tab]");
    if (tabBtn) {
      setAuthTab(tabBtn.dataset.authTab);
      return;
    }

    const closeBtn = event.target.closest("[data-auth-close]");
    if (closeBtn) {
      closeAuthModal();
      return;
    }

    const modal = document.querySelector("[data-auth-modal]");
    if (modal && event.target === modal) {
      closeAuthModal();
    }
  });

  document
    .querySelector("[data-login-form]")
    ?.addEventListener("submit", (e) => submitAuthForm(e, "login"));

  document
    .querySelector("[data-register-form]")
    ?.addEventListener("submit", (e) => submitAuthForm(e, "register"));

  wirePasswordToggles();
}

function animatePageEntrance() {
  const hero = document.querySelector(".hero");
  if (!hero) return;

  const badge = hero.querySelector(".kicker");
  const title = hero.querySelector("h1");
  const subtitle = hero.querySelector(".section-copy");
  const cta = hero.querySelector(".hero-actions");
  const stats = hero.querySelector(".hero-stats");

  const tl = gsap.timeline({ defaults: { ease: "power3.out", opacity: 0 } });

  if (badge) {
    gsap.set(badge, { y: 16, scale: 0.96 });
    tl.fromTo(badge, { y: 16, scale: 0.96 }, { y: 0, scale: 1, opacity: 1, duration: 0.5 }, 0.1);
  }
  if (title) {
    gsap.set(title, { y: 36 });
    tl.fromTo(title, { y: 36 }, { y: 0, opacity: 1, duration: 0.7 }, 0.2);
  }
  if (subtitle) {
    gsap.set(subtitle, { y: 24 });
    tl.fromTo(subtitle, { y: 24 }, { y: 0, opacity: 1, duration: 0.6 }, 0.35);
  }
  if (cta) {
    gsap.set(cta, { y: 20 });
    tl.fromTo(cta, { y: 20 }, { y: 0, opacity: 1, duration: 0.5 }, 0.5);
  }
  if (stats) {
    gsap.set(stats, { y: 24 });
    tl.fromTo(stats, { y: 24 }, { y: 0, opacity: 1, duration: 0.6 }, 0.6);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  wireAuthIndicator();
  attachAuthEvents();
  if (document.querySelector(".hero")) animatePageEntrance();
});
