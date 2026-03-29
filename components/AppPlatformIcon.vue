<template>
    <img :src="iconSrc" :alt="platform" class="platform-icon" loading="lazy" />
</template>

<script setup lang="ts">
const props = defineProps<{
    platform: 'luogu' | 'atcoder' | 'codeforces' | 'github' | 'google' | 'clist';
}>();

const baseUrl = computed(() => {
    const configured = useRuntimeConfig().app.baseURL || '/';
    return configured.endsWith('/') ? configured : `${configured}/`;
});

const iconSrc = computed(() => {
    if (props.platform === 'atcoder') {
        return `${baseUrl.value}icons/atcoder.svg`;
    }
    if (props.platform === 'codeforces') {
        return `${baseUrl.value}icons/codeforces-tricolor.svg`;
    }
    if (props.platform === 'clist') {
        return `${baseUrl.value}icons/clist.svg`;
    }
    if (props.platform === 'github') {
        return 'https://cdn.simpleicons.org/github/24292f';
    }
    if (props.platform === 'google') {
        return `${baseUrl.value}icons/google.svg`;
    }
    return 'https://cdn.simpleicons.org/luogu/24A0ED';
});
</script>

<style scoped lang="scss">
.platform-icon {
    width: 16px;
    height: 16px;
    display: inline-block;
    flex-shrink: 0;
}
</style>
