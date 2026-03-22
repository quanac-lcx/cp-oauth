<template>
    <el-card class="luogu-login-card" shadow="never">
        <h1 class="luogu-login-card__title">{{ $t('auth.login.luogu_guide_title') }}</h1>
        <p class="luogu-login-card__desc">{{ $t('auth.login.with_luogu_tip') }}</p>

        <el-form @submit.prevent="handleLuoguLogin">
            <el-form-item>
                <el-input
                    v-model="pasteId"
                    :placeholder="$t('auth.login.luogu_paste_id')"
                    size="large"
                />
            </el-form-item>
            <div v-if="turnstileEnabled" ref="turnstileEl" class="luogu-login-card__turnstile" />
            <p
                v-if="turnstileEnabled && !thirdPartyCaptchaReady"
                class="luogu-login-card__turnstile-hint"
            >
                {{ $t('auth.login.turnstile_required_for_thirdparty') }}
            </p>
            <el-form-item>
                <el-button
                    class="luogu-login-card__btn"
                    type="primary"
                    native-type="submit"
                    :loading="loading"
                    :disabled="!pasteId.trim() || !thirdPartyCaptchaReady"
                    size="large"
                >
                    <span class="luogu-login-card__btn-content">
                        <AppPlatformIcon platform="luogu" />
                        <span>{{ $t('auth.login.with_luogu') }}</span>
                    </span>
                </el-button>
            </el-form-item>
        </el-form>

        <p class="luogu-login-card__back">
            <NuxtLink :to="`/login?redirect=${encodeURIComponent(redirectTarget)}`">
                {{ $t('nav.login') }}
            </NuxtLink>
        </p>
    </el-card>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { getSafeRedirectTarget } from '~/utils/auth-redirect';

definePageMeta({ layout: 'auth' });

const { t } = useI18n();
useHead({ title: () => `${t('auth.login.luogu_guide_title')} - CP OAuth` });

const route = useRoute();
const loading = ref(false);
const pasteId = ref('');
const redirectTarget = getSafeRedirectTarget(route.query.redirect);

interface PublicConfigResponse {
    turnstileEnabled?: boolean;
    turnstileSiteKey?: string;
}

const { data: publicConfig } = await useFetch<PublicConfigResponse>('/api/public/config');
const turnstileEnabled = computed(() => publicConfig.value?.turnstileEnabled || false);
const turnstileSiteKey = computed(() => publicConfig.value?.turnstileSiteKey || '');
const { token: turnstileToken, el: turnstileEl } = useTurnstile(turnstileSiteKey);
const thirdPartyCaptchaReady = computed(
    () => !turnstileEnabled.value || Boolean(turnstileToken.value)
);

async function handleLuoguLogin() {
    loading.value = true;
    try {
        const result = await $fetch<{ token: string }>('/api/auth/thirdparty/luogu/paste-login', {
            method: 'POST',
            body: {
                pasteId: pasteId.value.trim(),
                turnstileToken: turnstileToken.value || ''
            }
        });
        useCookie('auth_token').value = result.token;
        await navigateTo(redirectTarget);
    } catch (e: unknown) {
        const err = e as { data?: { message?: string } };
        ElMessage.error(err.data?.message || t('auth.login.error'));
    } finally {
        loading.value = false;
    }
}
</script>

<style scoped lang="scss">
.luogu-login-card {
    width: 100%;
    max-width: 420px;
    border: 1px solid var(--border-color);

    &__title {
        font-size: 22px;
        font-weight: 600;
        margin-bottom: 12px;
        color: var(--text-primary);
    }

    &__desc {
        font-size: 13px;
        color: var(--text-secondary);
        line-height: 1.6;
        margin-bottom: 16px;
    }

    &__btn {
        width: 100%;
    }

    &__btn-content {
        display: inline-flex;
        align-items: center;
        gap: 8px;
    }

    &__turnstile {
        display: flex;
        justify-content: center;
        margin: 4px 0 12px;
    }

    &__turnstile-hint {
        margin: -4px 0 12px;
        font-size: 12px;
        color: var(--text-muted);
        line-height: 1.4;
    }

    &__back {
        margin-top: 8px;
        text-align: center;
        font-size: 13px;

        a {
            color: var(--text-primary);
            text-decoration: underline;
        }
    }
}
</style>
