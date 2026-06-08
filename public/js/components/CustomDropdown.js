/**
 * Custom Dropdown Enhancer
 * Replaces native single-select dropdown popups with a themed custom menu.
 */

(function () {
  const instances = new WeakMap();

  const isEnhanceable = (select) => {
    if (!(select instanceof HTMLSelectElement)) return false;
    if (instances.has(select)) return false;
    if (select.multiple) return false;
    if ((select.size || 0) > 1) return false;
    if (select.dataset.nativeSelect === "true") return false;
    return true;
  };

  const closeAll = (except) => {
    document.querySelectorAll(".custom-select.is-open").forEach((el) => {
      if (except && el === except) return;
      const nativeSelect = el.querySelector("select.custom-select-native");
      const instance = nativeSelect ? instances.get(nativeSelect) : null;
      if (instance) {
        instance.close();
      } else {
        el.classList.remove("is-open");
        const trigger = el.querySelector(".custom-select-trigger");
        trigger?.setAttribute("aria-expanded", "false");
      }
    });
  };

  const getSelectedOption = (select) => {
    const selected = select.options[select.selectedIndex];
    if (selected) return selected;
    return select.options[0] || null;
  };

  const createOptionButton = (instance, option, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "custom-select-option";
    btn.setAttribute("role", "option");
    btn.setAttribute("data-index", String(index));
    btn.textContent = option.textContent || "";

    if (option.disabled) {
      btn.disabled = true;
      btn.setAttribute("aria-disabled", "true");
    }

    if (option.selected) {
      btn.classList.add("is-selected");
      btn.setAttribute("aria-selected", "true");
    }

    btn.addEventListener("click", () => {
      if (option.disabled) return;
      if (instance.select.value !== option.value) {
        instance.select.value = option.value;
        instance.select.dispatchEvent(new Event("change", { bubbles: true }));
        instance.select.dispatchEvent(new Event("input", { bubbles: true }));
      } else {
        instance.syncFromSelect();
      }
      instance.close();
    });

    return btn;
  };

  const buildMenu = (instance) => {
    const { select, menu } = instance;
    menu.innerHTML = "";

    const children = Array.from(select.children);
    let optionCounter = 0;

    children.forEach((child) => {
      if (child instanceof HTMLOptGroupElement) {
        const group = document.createElement("div");
        group.className = "custom-select-group";

        const groupLabel = document.createElement("div");
        groupLabel.className = "custom-select-group-label";
        groupLabel.textContent = child.label || "";
        group.appendChild(groupLabel);

        const groupOptions = document.createElement("div");
        groupOptions.className = "custom-select-group-options";

        Array.from(child.children).forEach((opt) => {
          if (!(opt instanceof HTMLOptionElement)) return;
          groupOptions.appendChild(
            createOptionButton(instance, opt, optionCounter),
          );
          optionCounter += 1;
        });

        group.appendChild(groupOptions);
        menu.appendChild(group);
        return;
      }

      if (child instanceof HTMLOptionElement) {
        menu.appendChild(createOptionButton(instance, child, optionCounter));
        optionCounter += 1;
      }
    });
  };

  const createInstance = (select) => {
    const wrapper = document.createElement("div");
    wrapper.className = "custom-select";
    select.classList.forEach((cls) => wrapper.classList.add(cls));
    if (select.id) {
      wrapper.dataset.selectId = select.id;
    }

    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);

    select.classList.add("custom-select-native");
    select.setAttribute("tabindex", "-1");

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "custom-select-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");

    const label = document.createElement("span");
    label.className = "custom-select-label";
    trigger.appendChild(label);

    const icon = document.createElement("span");
    icon.className = "custom-select-icon";
    icon.innerHTML = "&#9662;";
    trigger.appendChild(icon);

    const menu = document.createElement("div");
    menu.className = "custom-select-menu";
    menu.setAttribute("role", "listbox");

    wrapper.appendChild(trigger);
    wrapper.appendChild(menu);

    const instance = {
      select,
      wrapper,
      trigger,
      menu,
      label,
      repositionMenu() {
        const rect = trigger.getBoundingClientRect();
        const viewportHeight =
          window.innerHeight || document.documentElement.clientHeight;
        const spaceBelow = viewportHeight - rect.bottom - 8;
        const spaceAbove = rect.top - 8;
        const maxMenuHeight = 320;
        const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
        const height = Math.max(
          120,
          Math.min(maxMenuHeight, openUp ? spaceAbove : spaceBelow),
        );

        menu.style.position = "fixed";
        menu.style.left = `${Math.max(8, rect.left)}px`;
        menu.style.width = `${Math.max(160, rect.width)}px`;
        menu.style.maxHeight = `${height}px`;
        menu.style.top = openUp
          ? `${Math.max(8, rect.top - height - 6)}px`
          : `${Math.min(viewportHeight - height - 8, rect.bottom + 6)}px`;
      },
      syncFromSelect() {
        const selected = getSelectedOption(select);
        label.textContent = selected ? selected.textContent || "" : "";
        trigger.disabled = select.disabled;
        wrapper.classList.toggle("is-disabled", select.disabled);

        menu.querySelectorAll(".custom-select-option").forEach((btn) => {
          const idx = Number(btn.getAttribute("data-index"));
          const opt = select.options[idx];
          if (!opt) return;

          const isSelected = opt.selected;
          btn.classList.toggle("is-selected", isSelected);
          btn.setAttribute("aria-selected", isSelected ? "true" : "false");
          btn.disabled = Boolean(opt.disabled);
        });
      },
      open() {
        if (select.disabled) return;
        closeAll(wrapper);
        wrapper.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
        instance.repositionMenu();
        window.addEventListener("resize", instance.handleViewportChange);
        window.addEventListener("scroll", instance.handleViewportChange, true);
      },
      close() {
        wrapper.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
        menu.style.top = "";
        menu.style.left = "";
        menu.style.width = "";
        menu.style.maxHeight = "";
        menu.style.position = "";
        window.removeEventListener("resize", instance.handleViewportChange);
        window.removeEventListener(
          "scroll",
          instance.handleViewportChange,
          true,
        );
      },
      rebuild() {
        buildMenu(instance);
        instance.syncFromSelect();
      },
      handleViewportChange() {
        if (wrapper.classList.contains("is-open")) {
          instance.repositionMenu();
        }
      },
    };

    trigger.addEventListener("click", () => {
      if (wrapper.classList.contains("is-open")) {
        instance.close();
      } else {
        instance.open();
      }
    });

    trigger.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        instance.open();
        const target = menu.querySelector(
          ".custom-select-option:not(:disabled)",
        );
        target?.focus();
      }
    });

    menu.addEventListener("keydown", (e) => {
      const options = Array.from(
        menu.querySelectorAll(".custom-select-option:not(:disabled)"),
      );
      if (options.length === 0) return;

      const currentIndex = options.indexOf(document.activeElement);

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next =
          options[(currentIndex + 1 + options.length) % options.length];
        next.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev =
          options[(currentIndex - 1 + options.length) % options.length];
        prev.focus();
      } else if (e.key === "Escape") {
        e.preventDefault();
        instance.close();
        trigger.focus();
      }
    });

    select.addEventListener("change", () => {
      instance.syncFromSelect();
    });

    const observer = new MutationObserver(() => {
      instance.rebuild();
    });
    observer.observe(select, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled", "label", "selected"],
    });

    instance.rebuild();
    instances.set(select, instance);
  };

  const enhanceRoot = (root) => {
    root.querySelectorAll("select").forEach((select) => {
      if (isEnhanceable(select)) {
        createInstance(select);
      }
    });
  };

  const init = () => {
    enhanceRoot(document);

    document.addEventListener("click", (e) => {
      const custom = e.target.closest(".custom-select");
      closeAll(custom);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeAll();
      }
    });

    const rootObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches?.("select")) {
            if (isEnhanceable(node)) {
              createInstance(node);
            }
          }
          enhanceRoot(node);
        });
      });
    });

    if (document.body) {
      rootObserver.observe(document.body, { childList: true, subtree: true });
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
