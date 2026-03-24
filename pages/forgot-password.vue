<template>
    <el-card class="auth-card" shadow="never">
        <p class="auth-card__brand">{{ siteTitle }}</p>
        <h1 class="auth-card__title">{{ $t('auth.password.forgot_title') }}</h1>
        <p class="auth-card__desc">{{ $t('auth.password.forgot_desc') }}</p>
        <el-form :model="form" @submit.prevent="handleSubmit">
            <el-form-item>
                <el-input v-model="form.email" type="email" :placeholder="$t('auth.login.email')" />
            </el-form-item>
            <el-form-item>
                <el-button
                    type="primary"
                    native-type="submit"
                    :loading="loading"
                    class="auth-card__btn"
                >
                    {{ $t('auth.password.send_reset') }}
                </el-button>
            </el-form-item>
        </el-form>
        <NuxtLink to="/login" class="auth-card__link">{{
            $t('auth.password.back_login')
        }}</NuxtLink>
    </el-card>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';

definePageMeta({ layout: 'auth' });

const { t } = useI18n();
useHead({ title: () => `${t('auth.password.forgot_title')} - CP OAuth` });

const form = reactive({ email: '' });
const loading = ref(false);

const { data: publicConfig } = await useFetch<{ siteTitle?: string }>('/api/public/config');
const siteTitle = computed(() => publicConfig.value?.siteTitle || t('app.name'));

async function handleSubmit() {
    if (!form.email) return;
    loading.value = true;
    try {
        await $fetch('/api/auth/password/forgot', {
            method: 'POST',
            body: { email: form.email }
        });
        ElMessage.success(t('auth.password.reset_sent'));
    } catch (e: unknown) {
        const err = e as { data?: { message?: string } };
        ElMessage.error(err.data?.message || t('auth.password.reset_error'));
    } finally {
        loading.value = false;
    }
}
</script>

<style scoped lang="scss">
.auth-card {
    width: 100%;
    max-width: 380px;
    border: 1px solid var(--border-color);

    &__brand {
        font-size: 13px;
        color: var(--text-muted);
        margin-bottom: 12px;
        font-weight: 600;
    }

    &__title {
        font-size: 20px;
        margin-bottom: 8px;
    }

    &__desc {
        font-size: 13px;
        color: var(--text-muted);
        margin-bottom: 14px;
        line-height: 1.6;
    }

    &__btn {
        width: 100%;
    }

    &__link {
        display: inline-block;
        margin-top: 4px;
        font-size: 13px;
        color: var(--text-secondary);
        text-decoration: underline;
    }
}
</style>
