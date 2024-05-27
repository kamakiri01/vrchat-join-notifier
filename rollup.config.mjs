const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const json = require('@rollup/plugin-json'); // node_modules\iconv-lite\encodings\tables\gb18030-ranges.json の解決
const replace = require('@rollup/plugin-replace'); // binpackのtwoToThe32変数定義が宣言されていない箇所を修正

export default (async () => ({
	input: 'lib/winExeStandalone.js',
	plugins: [
		resolve(),
		commonjs(),
		json(),
		replace({
			"twoToThe32 =": "var twoToThe32=", // 置き換え後を再マッチしないよう空白を入れない
			delimiters: ['', ''] // 空白を挟む箇所を置き換えるため、単語で区切らせない
		}),
	],
	output: {
		file: 'tmp/bundle.js',
		format: 'cjs',
		globals: {
			twoToThe32: 0
		}
	},
	bundleConfigAsCjs: true,

}))();
