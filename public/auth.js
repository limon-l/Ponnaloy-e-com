function openAuthModal(tab) {
  if (!tab) tab = "login";
  const modal = document.querySelector("[data-auth-modal]");
  if (!modal) return;
  if (modal.classList.contains("open")) return;
  const card = modal.querySelector(".auth-card");

  document.querySelector("[data-login-form]")?.reset();
  document.querySelector("[data-register-form]")?.reset();

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

function submitAuthForm(event, type) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type=submit]");
  if (button.disabled) return;

  const originalHTML = button.innerHTML;
  const btnWidth = button.offsetWidth;

  button.disabled = true;
  gsap.set(button, { minWidth: btnWidth });

  gsap.to(button, { scale: 0.97, duration: 0.15, ease: "power2.out" });
  button.innerHTML = '<span class="spinner"></span>';

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

  const endpoint = type === "login" ? "/login" : "/register";

  api(endpoint, { method: "POST", body })
    .then(async () => {
      const check =
        '<svg class="auth-check" viewBox="0 0 24 24" fill="none" stroke="#7ef4d2" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      button.innerHTML = check;
      gsap.fromTo(
        button.querySelector(".auth-check"),
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
      gsap.fromTo(
        form,
        { x: 0 },
        { x: [-6, 6, -4, 4, -2, 2, 0], duration: 0.45, ease: "power2.out" },
      );
      showToast(
        type === "login" ? "Login failed" : "Registration failed",
        error.message,
      );
    })
    .finally(() => {
      button.disabled = false;
      button.innerHTML = originalHTML;
      gsap.set(button, { scale: 1, minWidth: "" });
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
}

function animatePageEntrance() {
  const hero = document.querySelector(".hero");
  if (!hero) return;

  const title = hero.querySelector("h1");
  const subtitle = hero.querySelector(".section-copy");
  const cta = hero.querySelector(".hero-actions");

  const tl = gsap.timeline({ defaults: { ease: "power3.out", opacity: 0 } });
  if (title) {
    gsap.set(title, { y: 40 });
    tl.fromTo(title, { y: 40 }, { y: 0, opacity: 1, duration: 0.7 }, 0.15);
  }
  if (subtitle) {
    gsap.set(subtitle, { y: 24 });
    tl.fromTo(subtitle, { y: 24 }, { y: 0, opacity: 1, duration: 0.6 }, 0.35);
  }
  if (cta) {
    gsap.set(cta, { y: 20 });
    tl.fromTo(cta, { y: 20 }, { y: 0, opacity: 1, duration: 0.5 }, 0.55);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  wireAuthIndicator();
  attachAuthEvents();
  animatePageEntrance();
});
