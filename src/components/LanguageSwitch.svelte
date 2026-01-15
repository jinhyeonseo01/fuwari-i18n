<script lang="ts">
import { onMount } from "svelte";
import { url } from "@utils/url-utils";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, getTranslation } from "@i18n/translation";
import I18nKey from "@i18n/i18nKey";
import Icon from "@iconify/svelte";

let { ...props } = $props();

let currentLang = $state(DEFAULT_LOCALE);

onMount(() => {
    const pathname = window.location.pathname;
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length > 0 && (SUPPORTED_LOCALES as any).includes(parts[0])) {
        currentLang = parts[0];
    } else {
        currentLang = DEFAULT_LOCALE;
    }
});

function showPanel() {
    if (window.innerWidth < 1024) return;
    const panel = document.querySelector("#language-panel");
    if (panel) panel.classList.remove("float-panel-closed");
}

function hidePanel() {
    if (window.innerWidth < 1024) return;
    const panel = document.querySelector("#language-panel");
    if (panel) panel.classList.add("float-panel-closed");
}

function togglePanel() {
    const panel = document.querySelector("#language-panel");
    panel.classList.toggle("float-panel-closed");
}

function setLang(targetLang: string) {
    if (targetLang === currentLang) return;

    const pathname = window.location.pathname;
    const search = window.location.search;
    const hash = window.location.hash;

    const parts = pathname.split('/').filter(Boolean);
    const hasLangPrefix = parts.length > 0 && (SUPPORTED_LOCALES as any).includes(parts[0]);

    let newParts = [...parts];
    if (hasLangPrefix) {
        if (targetLang === DEFAULT_LOCALE) {
            newParts.shift();
        } else {
            newParts[0] = targetLang;
        }
    } else {
        if (targetLang !== DEFAULT_LOCALE) {
            newParts.unshift(targetLang);
        }
    }

    let newPath = '/' + newParts.join('/');
    if (pathname.endsWith('/') && !newPath.endsWith('/')) {
        newPath += '/';
    }
    if (newPath === '//') newPath = '/';

    window.location.href = url(newPath) + search + hash;
}
</script>

<!-- z-50 make the panel higher than other float panels -->
<!-- z-50 make the panel higher than other float panels -->
<div class="relative z-50" onmouseleave={hidePanel}>
    <button aria-label="Language" aria-haspopup="menu" aria-expanded={!document.querySelector("#language-panel")?.classList.contains("float-panel-closed")} class="relative btn-plain scale-animation rounded-lg h-11 w-11 active:scale-90" id="language-switch" onclick={togglePanel} onmouseenter={showPanel}>
        <div class="absolute">
            <Icon icon="material-symbols:translate-rounded" class="text-[1.25rem]"></Icon>
        </div>
    </button>

    <div id="language-panel" class="absolute transition float-panel-closed top-11 -right-2 pt-5" role="menu">
        <div class="card-base float-panel p-2">
            {#each SUPPORTED_LOCALES as lang}
                <button class="flex transition whitespace-nowrap items-center !justify-start w-full btn-plain scale-animation rounded-lg h-9 px-3 font-medium active:scale-95 mb-0.5"
                        role="menuitem"
                        class:current-theme-btn={currentLang === lang}
                        onclick={() => setLang(lang)}
                >
                    {getTranslation(lang)[I18nKey.langName]}
                </button>
            {/each}
        </div>
    </div>
</div>
