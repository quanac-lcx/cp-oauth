import prettierConfig from 'eslint-config-prettier';
import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt(prettierConfig, {
    ignores: ['generated/**'],
    rules: {
        'vue/no-v-html': 'off'
    }
});
