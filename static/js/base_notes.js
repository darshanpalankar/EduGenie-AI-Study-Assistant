/* =========================================================================
   EduGenie — base.js
   Shared behavior across every page: mobile nav toggle + toast helper.
   ========================================================================= */

(function () {
    const navToggle = document.getElementById('navToggle');
    const siteNav = document.getElementById('siteNav');

    // Re-parent the mobile nav drawer to be a direct child of <body>.
    // .site-header uses backdrop-filter for its glass effect, and a
    // backdrop-filter ancestor becomes the containing block for any
    // position:fixed descendant - which collapses this drawer's height
    // instead of letting it fill the viewport. Moving it out of the
    // header avoids that entirely.
    if (siteNav && siteNav.parentElement !== document.body) {
        document.body.appendChild(siteNav);
    }

    if (navToggle && siteNav) {
        navToggle.addEventListener('click', () => {
            const isOpen = siteNav.classList.toggle('is-open');
            navToggle.setAttribute('aria-expanded', String(isOpen));
            navToggle.innerHTML = isOpen ? '<i class="ri-close-line"></i>' : '<i class="ri-menu-3-line"></i>';
        });

        siteNav.querySelectorAll('.site-nav__link').forEach((link) => {
            link.addEventListener('click', () => {
                siteNav.classList.remove('is-open');
                navToggle.setAttribute('aria-expanded', 'false');
                navToggle.innerHTML = '<i class="ri-menu-3-line"></i>';
            });
        });
    }

    // Exposed so page-specific scripts can show a toast without duplicating markup logic.
    window.EduGenie = window.EduGenie || {};
    window.EduGenie.showToast = function (message, duration = 2200) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('is-visible');
        clearTimeout(toast._hideTimer);
        toast._hideTimer = setTimeout(() => toast.classList.remove('is-visible'), duration);
    };
})();